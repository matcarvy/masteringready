-- ============================================================================
-- Update IP Rate Limit: 1 → 2 free analyses per IP
-- ============================================================================
-- Actualiza el limite de analisis gratis por IP de 1 a 2

-- Replace the check_ip_limit function with updated threshold
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

    -- Check if limit reached (2 free analyses per IP)
    IF v_session.analyses_count >= 2 THEN
        RETURN QUERY SELECT FALSE, v_session.analyses_count, FALSE, 'LIMIT_REACHED'::TEXT;
        RETURN;
    END IF;

    -- Can analyze
    RETURN QUERY SELECT TRUE, v_session.analyses_count, FALSE, 'OK'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update table comment
COMMENT ON TABLE anonymous_sessions IS 'Tracks anonymous user sessions by IP for rate limiting (2 free analyses per IP)';
