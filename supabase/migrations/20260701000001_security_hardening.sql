-- Security hardening pass (2026-07-01)
-- Closes findings verified against live call sites so no legitimate flow breaks:
--   #1 privilege escalation via the column-blind profiles UPDATE policy
--   #5 credit-RPC IDOR (SECURITY DEFINER functions taking an arbitrary p_user_id)
--   #7 anonymous_analyses UPDATE open to any authenticated user
--   #4 deleted_accounts world-readable/writable (PII enumeration + quota poisoning)

-- --- 1. profiles: block admin self-promotion + usage-counter reset ---
-- is_admin and country_code are never written by the browser client (admins are
-- promoted via service role; country_code is server-set), so revoking them is a
-- no-op for real flows and closes the admin-takeover vector outright.
REVOKE UPDATE (is_admin) ON public.profiles FROM authenticated, anon;
REVOKE UPDATE (country_code) ON public.profiles FROM authenticated, anon;

-- The signup anti-abuse carryover legitimately RAISES analyses_lifetime_used /
-- total_analyses from 0 (client-side). A cheater instead LOWERS them to regain
-- free analyses. Rejecting only decreases (and any is_admin change) from
-- non-service callers preserves the carryover while killing the reset bypass.
CREATE OR REPLACE FUNCTION public.enforce_profile_write_guard()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
        RAISE EXCEPTION 'is_admin is not user-modifiable';
    END IF;
    IF COALESCE(NEW.analyses_lifetime_used, 0) < COALESCE(OLD.analyses_lifetime_used, 0)
       OR COALESCE(NEW.total_analyses, 0) < COALESCE(OLD.total_analyses, 0) THEN
        RAISE EXCEPTION 'usage counters cannot be decreased';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_profile_write_guard_trg ON public.profiles;
CREATE TRIGGER enforce_profile_write_guard_trg
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_write_guard();

-- --- 2. Credit RPCs: bind to the caller, revoke from anon (IDOR fix) ---
-- Every legitimate call passes the caller's own id; service_role keeps a bypass
-- so a future server-side consume can pass an explicit user id.
CREATE OR REPLACE FUNCTION use_single_purchase(p_user_id UUID, p_purchase_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_remaining INTEGER;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id AND auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'not authorized for this user';
    END IF;

    SELECT analyses_granted - analyses_used INTO v_remaining
    FROM purchases
    WHERE id = p_purchase_id
      AND user_id = p_user_id
      AND status = 'succeeded';

    IF v_remaining IS NULL OR v_remaining <= 0 THEN
        RETURN FALSE;
    END IF;

    UPDATE purchases
    SET analyses_used = analyses_used + 1,
        updated_at = NOW()
    WHERE id = p_purchase_id;

    UPDATE profiles
    SET total_analyses = total_analyses + 1,
        last_analysis_at = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION consume_purchase_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_purchase_id UUID;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id AND auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'not authorized for this user';
    END IF;

    SELECT id INTO v_purchase_id
    FROM purchases
    WHERE user_id = p_user_id
      AND status = 'succeeded'
      AND analyses_granted - analyses_used > 0
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_purchase_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN use_single_purchase(p_user_id, v_purchase_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_analysis_count(p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    source TEXT
) AS $$
DECLARE
    v_plan_type plan_type;
    v_cycle_used INTEGER;
    v_addon_remaining INTEGER;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id AND auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'not authorized for this user';
    END IF;

    SELECT p.type, s.analyses_used_this_cycle, s.addon_analyses_remaining
    INTO v_plan_type, v_cycle_used, v_addon_remaining
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.user_id = p_user_id;

    v_cycle_used := COALESCE(v_cycle_used, 0);
    v_addon_remaining := COALESCE(v_addon_remaining, 0);

    IF v_plan_type = 'free' THEN
        UPDATE profiles
        SET analyses_lifetime_used = COALESCE(analyses_lifetime_used, 0) + 1,
            total_analyses = total_analyses + 1,
            last_analysis_at = NOW(),
            updated_at = NOW()
        WHERE id = p_user_id;

        RETURN QUERY SELECT TRUE, 'free'::TEXT;
        RETURN;
    END IF;

    IF v_plan_type = 'pro' THEN
        IF v_cycle_used < 30 THEN
            UPDATE subscriptions
            SET analyses_used_this_cycle = analyses_used_this_cycle + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;

            UPDATE profiles
            SET total_analyses = total_analyses + 1,
                last_analysis_at = NOW(),
                updated_at = NOW()
            WHERE id = p_user_id;

            RETURN QUERY SELECT TRUE, 'pro'::TEXT;
            RETURN;
        ELSIF v_addon_remaining > 0 THEN
            UPDATE subscriptions
            SET addon_analyses_remaining = addon_analyses_remaining - 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;

            UPDATE profiles
            SET total_analyses = total_analyses + 1,
                last_analysis_at = NOW(),
                updated_at = NOW()
            WHERE id = p_user_id;

            RETURN QUERY SELECT TRUE, 'addon'::TEXT;
            RETURN;
        END IF;
    END IF;

    IF v_plan_type = 'studio' THEN
        UPDATE subscriptions
        SET analyses_used_this_cycle = analyses_used_this_cycle + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id;

        UPDATE profiles
        SET total_analyses = total_analyses + 1,
            last_analysis_at = NOW(),
            updated_at = NOW()
        WHERE id = p_user_id;

        RETURN QUERY SELECT TRUE, 'studio'::TEXT;
        RETURN;
    END IF;

    RETURN QUERY SELECT FALSE, 'error'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION consume_purchase_credit(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION use_single_purchase(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION increment_analysis_count(UUID) FROM anon;

-- --- 3. anonymous_analyses: scope the signup-claim UPDATE to the caller ---
-- The only legitimate writer attaches unclaimed rows (user_id IS NULL) to the
-- new account (user_id = auth.uid()); this policy allows exactly that and no more.
DROP POLICY IF EXISTS "update_anonymous_on_signup" ON public.anonymous_analyses;
CREATE POLICY "update_anonymous_on_signup" ON public.anonymous_analyses
    FOR UPDATE TO authenticated
    USING (user_id IS NULL)
    WITH CHECK (user_id = auth.uid());

-- --- 4. deleted_accounts: move all access behind caller-bound RPCs ---
-- The table carries ex-customer emails; direct authenticated read/insert allowed
-- PII harvesting and pre-seeding a victim's future quota. Route both operations
-- through SECURITY DEFINER functions bound to the caller's own identity, then
-- drop the world-open policies.
CREATE OR REPLACE FUNCTION public.record_own_account_deletion()
RETURNS void AS $$
BEGIN
    INSERT INTO public.deleted_accounts (email, analyses_lifetime_used, total_analyses)
    SELECT email, COALESCE(analyses_lifetime_used, 0), COALESCE(total_analyses, 0)
    FROM public.profiles
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.apply_deletion_carryover()
RETURNS void AS $$
DECLARE
    v_lifetime INTEGER;
    v_total INTEGER;
BEGIN
    SELECT analyses_lifetime_used, total_analyses
    INTO v_lifetime, v_total
    FROM public.deleted_accounts
    WHERE email = auth.email()
    ORDER BY deleted_at DESC
    LIMIT 1;

    IF COALESCE(v_lifetime, 0) > 0 THEN
        UPDATE public.profiles
        SET analyses_lifetime_used = v_lifetime,
            total_analyses = COALESCE(v_total, 0)
        WHERE id = auth.uid();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.record_own_account_deletion() FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_deletion_carryover() FROM anon;

DROP POLICY IF EXISTS "Users can check deleted accounts" ON public.deleted_accounts;
DROP POLICY IF EXISTS "Users can record own deletion" ON public.deleted_accounts;

-- --- Performance: dashboard/history list scan ---
CREATE INDEX IF NOT EXISTS idx_analyses_user_created
    ON public.analyses (user_id, created_at DESC)
    WHERE deleted_at IS NULL;
