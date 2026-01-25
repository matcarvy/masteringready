-- ============================================================================
-- Anonymous Sessions - IP Rate Limiting for Anonymous Users
-- ============================================================================
-- Tracks IP addresses of anonymous users to limit free analyses to 1 per IP
-- Rastrea direcciones IP de usuarios anónimos para limitar a 1 análisis gratis por IP

-- ----------------------------------------------------------------------------
-- ANONYMOUS_SESSIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE anonymous_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- IP Information
    ip_address VARCHAR(45) NOT NULL,  -- Supports both IPv4 and IPv6
    ip_hash VARCHAR(64) NOT NULL,     -- SHA-256 hash for privacy

    -- Analysis tracking
    analyses_count INTEGER NOT NULL DEFAULT 0,
    first_analysis_at TIMESTAMPTZ,
    last_analysis_at TIMESTAMPTZ,

    -- VPN/Proxy detection
    is_vpn_detected BOOLEAN DEFAULT FALSE,
    is_proxy_detected BOOLEAN DEFAULT FALSE,
    is_tor_detected BOOLEAN DEFAULT FALSE,
    vpn_check_at TIMESTAMPTZ,
    vpn_service_name VARCHAR(100),  -- Name of detected VPN service if any

    -- Geolocation (optional, for analytics)
    country_code VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),

    -- User agent info
    user_agent TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint on IP hash
    UNIQUE(ip_hash)
);

-- ----------------------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX idx_anonymous_sessions_ip_hash ON anonymous_sessions(ip_hash);
CREATE INDEX idx_anonymous_sessions_ip_address ON anonymous_sessions(ip_address);
CREATE INDEX idx_anonymous_sessions_created_at ON anonymous_sessions(created_at DESC);
CREATE INDEX idx_anonymous_sessions_vpn ON anonymous_sessions(is_vpn_detected, is_proxy_detected, is_tor_detected);

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_anonymous_sessions_updated_at
    BEFORE UPDATE ON anonymous_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function to check if IP has already used free analysis
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

    -- Check if limit reached (1 free analysis)
    IF v_session.analyses_count >= 1 THEN
        RETURN QUERY SELECT FALSE, v_session.analyses_count, FALSE, 'LIMIT_REACHED'::TEXT;
        RETURN;
    END IF;

    -- Can analyze
    RETURN QUERY SELECT TRUE, v_session.analyses_count, FALSE, 'OK'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record anonymous analysis
CREATE OR REPLACE FUNCTION record_anonymous_analysis(
    p_ip_address VARCHAR(45),
    p_ip_hash VARCHAR(64),
    p_user_agent TEXT DEFAULT NULL,
    p_is_vpn BOOLEAN DEFAULT FALSE,
    p_is_proxy BOOLEAN DEFAULT FALSE,
    p_is_tor BOOLEAN DEFAULT FALSE,
    p_vpn_service VARCHAR(100) DEFAULT NULL,
    p_country VARCHAR(2) DEFAULT NULL,
    p_region VARCHAR(100) DEFAULT NULL,
    p_city VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    INSERT INTO anonymous_sessions (
        ip_address,
        ip_hash,
        analyses_count,
        first_analysis_at,
        last_analysis_at,
        is_vpn_detected,
        is_proxy_detected,
        is_tor_detected,
        vpn_service_name,
        vpn_check_at,
        country_code,
        region,
        city,
        user_agent
    ) VALUES (
        p_ip_address,
        p_ip_hash,
        1,
        NOW(),
        NOW(),
        p_is_vpn,
        p_is_proxy,
        p_is_tor,
        p_vpn_service,
        NOW(),
        p_country,
        p_region,
        p_city,
        p_user_agent
    )
    ON CONFLICT (ip_hash) DO UPDATE SET
        analyses_count = anonymous_sessions.analyses_count + 1,
        last_analysis_at = NOW(),
        user_agent = COALESCE(p_user_agent, anonymous_sessions.user_agent),
        updated_at = NOW()
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- RLS POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE anonymous_sessions ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (backend only)
-- No public access for privacy
CREATE POLICY "Service role only"
    ON anonymous_sessions
    FOR ALL
    USING (FALSE)
    WITH CHECK (FALSE);

-- Allow service role full access
CREATE POLICY "Service role full access"
    ON anonymous_sessions
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

-- ----------------------------------------------------------------------------
-- COMMENTS
-- ----------------------------------------------------------------------------
COMMENT ON TABLE anonymous_sessions IS 'Tracks anonymous user sessions by IP for rate limiting (1 free analysis per IP)';
COMMENT ON COLUMN anonymous_sessions.ip_hash IS 'SHA-256 hash of IP for privacy-preserving lookups';
COMMENT ON COLUMN anonymous_sessions.analyses_count IS 'Number of analyses performed from this IP';
COMMENT ON COLUMN anonymous_sessions.is_vpn_detected IS 'Whether VPN was detected during analysis';
