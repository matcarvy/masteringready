-- ============================================================================
-- Purchase Credit Fallback for can_user_analyze (C2)
-- ============================================================================
-- The $5.99 Single purchase inserts a `purchases` row (analyses_granted:1) but
-- the live can_user_analyze never read it, so a free user who paid stayed
-- blocked with FREE_LIMIT_REACHED. This rebuilds can_user_analyze (from the
-- live def in 20260214000001) with a purchase-credit fallback that fires ONLY
-- at would-be-block points, so free/cycle analyses are spent first and purchase
-- credit second. Also adds a FIFO consume_purchase_credit() so the frontend can
-- decrement the oldest purchase without tracking purchase IDs.

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
        SELECT analyses_lifetime_used INTO v_lifetime_used FROM profiles WHERE id = p_user_id;
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
    SELECT analyses_lifetime_used INTO v_lifetime_used
    FROM profiles WHERE id = p_user_id;

    -- Unused one-off purchase credit (Single analyses), spent only after the
    -- plan's own allowance is exhausted.
    SELECT COALESCE(SUM(analyses_used), 0), COALESCE(SUM(analyses_granted), 0)
    INTO v_purchase_used, v_purchase_granted
    FROM purchases
    WHERE user_id = p_user_id AND status = 'succeeded';

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

-- FIFO consume: decrement the oldest succeeded purchase that still has credit.
-- Wraps the existing use_single_purchase() so the frontend never tracks IDs.
-- FOR UPDATE SKIP LOCKED prevents two concurrent analyses draining the same row.
CREATE OR REPLACE FUNCTION consume_purchase_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_purchase_id UUID;
BEGIN
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
