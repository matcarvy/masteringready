-- ============================================================================
-- HOTFIX: can_user_analyze 42702 "column reference analyses_used is ambiguous"
-- ============================================================================
-- The purchase-credit SUM added in 20260630000001 referenced purchases.analyses_used
-- without qualification, clashing with the analyses_used OUT column of RETURNS TABLE.
-- The statement runs before any branching, so every non-admin call errored; the
-- admin bypass returns earlier, which is why admin smoke tests passed.
-- Only change: the purchases query is table-aliased. Logic is otherwise identical.

CREATE OR REPLACE FUNCTION can_user_analyze(p_user_id UUID)
RETURNS TABLE (
    can_analyze BOOLEAN,
    reason TEXT,
    analyses_used INTEGER,
    analyses_limit INTEGER,
    is_lifetime BOOLEAN
) AS $$
DECLARE
    v_plan_type plan_type;
    v_plan_limit INTEGER;
    v_is_lifetime BOOLEAN;
    v_lifetime_used INTEGER;
    v_cycle_used INTEGER;
    v_addon_remaining INTEGER;
    v_subscription_status subscription_status;
    v_purchase_used INTEGER;
    v_purchase_granted INTEGER;
    v_purchase_remaining INTEGER;
BEGIN
    -- Admin bypass: unlimited analyses
    IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND is_admin = true) THEN
        SELECT pr.analyses_lifetime_used INTO v_lifetime_used FROM profiles pr WHERE pr.id = p_user_id;
        RETURN QUERY SELECT TRUE, 'ADMIN'::TEXT, COALESCE(v_lifetime_used, 0), -1, FALSE;
        RETURN;
    END IF;

    -- Get user's plan info
    SELECT p.type, p.analyses_per_month, p.is_lifetime_limit, p.analyses_total,
           s.status, s.analyses_used_this_cycle, s.addon_analyses_remaining
    INTO v_plan_type, v_plan_limit, v_is_lifetime, v_plan_limit,
         v_subscription_status, v_cycle_used, v_addon_remaining
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.user_id = p_user_id;

    -- Get lifetime used from profile
    SELECT pr.analyses_lifetime_used INTO v_lifetime_used
    FROM profiles pr WHERE pr.id = p_user_id;

    -- Unused one-off purchase credit (Single analyses), spent only after the
    -- plan's own allowance is exhausted.
    SELECT COALESCE(SUM(pu.analyses_used), 0), COALESCE(SUM(pu.analyses_granted), 0)
    INTO v_purchase_used, v_purchase_granted
    FROM purchases pu
    WHERE pu.user_id = p_user_id AND pu.status = 'succeeded';

    -- Default values
    v_lifetime_used := COALESCE(v_lifetime_used, 0);
    v_cycle_used := COALESCE(v_cycle_used, 0);
    v_addon_remaining := COALESCE(v_addon_remaining, 0);
    v_purchase_remaining := COALESCE(v_purchase_granted, 0) - COALESCE(v_purchase_used, 0);

    -- FREE plan: 2 lifetime full analyses
    IF v_plan_type = 'free' THEN
        IF v_lifetime_used >= 2 THEN
            IF v_purchase_remaining > 0 THEN
                RETURN QUERY SELECT TRUE, 'USING_PURCHASE'::TEXT, v_purchase_used, v_purchase_granted, FALSE;
                RETURN;
            END IF;
            RETURN QUERY SELECT FALSE, 'FREE_LIMIT_REACHED'::TEXT, v_lifetime_used, 2, TRUE;
            RETURN;
        END IF;
        RETURN QUERY SELECT TRUE, 'OK'::TEXT, v_lifetime_used, 2, TRUE;
        RETURN;
    END IF;

    -- PRO plan: monthly limit + add-ons
    IF v_plan_type = 'pro' THEN
        -- Check subscription is active
        IF v_subscription_status != 'active' THEN
            IF v_purchase_remaining > 0 THEN
                RETURN QUERY SELECT TRUE, 'USING_PURCHASE'::TEXT, v_purchase_used, v_purchase_granted, FALSE;
                RETURN;
            END IF;
            RETURN QUERY SELECT FALSE, 'SUBSCRIPTION_INACTIVE'::TEXT, v_cycle_used, 30, FALSE;
            RETURN;
        END IF;

        -- Check if within monthly limit, has add-on analyses, or purchase credit
        IF v_cycle_used < 30 THEN
            RETURN QUERY SELECT TRUE, 'OK'::TEXT, v_cycle_used, 30, FALSE;
            RETURN;
        ELSIF v_addon_remaining > 0 THEN
            RETURN QUERY SELECT TRUE, 'USING_ADDON'::TEXT, v_cycle_used, 30 + v_addon_remaining, FALSE;
            RETURN;
        ELSIF v_purchase_remaining > 0 THEN
            RETURN QUERY SELECT TRUE, 'USING_PURCHASE'::TEXT, v_purchase_used, v_purchase_granted, FALSE;
            RETURN;
        ELSE
            RETURN QUERY SELECT FALSE, 'PRO_LIMIT_REACHED'::TEXT, v_cycle_used, 30, FALSE;
            RETURN;
        END IF;
    END IF;

    -- STUDIO plan (if re-enabled): unlimited
    IF v_plan_type = 'studio' THEN
        RETURN QUERY SELECT TRUE, 'UNLIMITED'::TEXT, v_cycle_used, -1, FALSE;
        RETURN;
    END IF;

    -- No subscription row (or single/addon-only): purchase credit is the only access.
    IF v_purchase_remaining > 0 THEN
        RETURN QUERY SELECT TRUE, 'USING_PURCHASE'::TEXT, v_purchase_used, v_purchase_granted, FALSE;
        RETURN;
    END IF;

    -- Default: no access
    RETURN QUERY SELECT FALSE, 'NO_PLAN'::TEXT, 0, 0, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
