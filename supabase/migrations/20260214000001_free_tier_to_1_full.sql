-- ============================================================================
-- Free Tier Change: 2 Rápido → 1 Full (Completo + PDF)
-- ============================================================================
-- Changes free tier from 2 lifetime Rápido-only analyses to 2 full analyses
-- (including Completo report + PDF download) for better conversion.
-- Anonymous IP limit stays at 2.

-- STEP 1: Update can_user_analyze to limit free tier to 1 analysis
-- (Preserves admin bypass that was added directly to DB)
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

    -- Default values
    v_lifetime_used := COALESCE(v_lifetime_used, 0);
    v_cycle_used := COALESCE(v_cycle_used, 0);
    v_addon_remaining := COALESCE(v_addon_remaining, 0);

    -- FREE plan: 2 lifetime full analyses
    IF v_plan_type = 'free' THEN
        IF v_lifetime_used >= 2 THEN
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
            RETURN QUERY SELECT FALSE, 'SUBSCRIPTION_INACTIVE'::TEXT, v_cycle_used, 30, FALSE;
            RETURN;
        END IF;

        -- Check if within monthly limit or has add-on analyses
        IF v_cycle_used < 30 THEN
            RETURN QUERY SELECT TRUE, 'OK'::TEXT, v_cycle_used, 30, FALSE;
            RETURN;
        ELSIF v_addon_remaining > 0 THEN
            RETURN QUERY SELECT TRUE, 'USING_ADDON'::TEXT, v_cycle_used, 30 + v_addon_remaining, FALSE;
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

    -- Default: no access
    RETURN QUERY SELECT FALSE, 'NO_PLAN'::TEXT, 0, 0, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 2: Update check_ip_limit to allow 1 anonymous analysis per IP
CREATE OR REPLACE FUNCTION check_ip_limit(p_ip_hash VARCHAR(64))
RETURNS TABLE (
    can_analyze BOOLEAN,
    analyses_used INTEGER,
    is_vpn BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_session RECORD;
BEGIN
    -- Look up existing session
    SELECT * INTO v_session
    FROM anonymous_sessions
    WHERE ip_hash = p_ip_hash;

    -- New IP - can analyze
    IF NOT FOUND THEN
        RETURN QUERY SELECT TRUE, 0, FALSE, 'OK'::TEXT;
        RETURN;
    END IF;

    -- VPN detected
    IF v_session.is_vpn_detected OR v_session.is_proxy_detected OR v_session.is_tor_detected THEN
        RETURN QUERY SELECT FALSE, v_session.analyses_count, TRUE, 'VPN_DETECTED'::TEXT;
        RETURN;
    END IF;

    -- Check if limit reached (1 free analysis per IP — funnels to signup)
    IF v_session.analyses_count >= 1 THEN
        RETURN QUERY SELECT FALSE, v_session.analyses_count, FALSE, 'LIMIT_REACHED'::TEXT;
        RETURN;
    END IF;

    -- Can analyze
    RETURN QUERY SELECT TRUE, v_session.analyses_count, FALSE, 'OK'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update table comment
COMMENT ON TABLE anonymous_sessions IS 'Tracks anonymous user sessions by IP for rate limiting (1 free analysis per IP, funnels to signup)';
