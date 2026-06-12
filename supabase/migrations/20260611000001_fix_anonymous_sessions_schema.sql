-- ============================================================================
-- Fix anonymous_sessions schema drift
-- ============================================================================
-- The live table was created from an older schema and is missing the columns
-- that check_ip_limit() and record_anonymous_analysis() reference, so both
-- RPCs have always errored ("column ip_hash does not exist") and the backend
-- silently fell back to its in-memory store. This aligns the live table with
-- the functions and re-applies both function definitions.
-- Idempotent: safe to run more than once. No drops; old rows keep NULL ip_hash
-- (they simply never match a lookup, which is harmless).

ALTER TABLE anonymous_sessions
  ADD COLUMN IF NOT EXISTS ip_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS first_analysis_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_vpn_detected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_proxy_detected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_tor_detected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vpn_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vpn_service_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
  ADD COLUMN IF NOT EXISTS region VARCHAR(100),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ON CONFLICT (ip_hash) in record_anonymous_analysis requires a unique index.
-- Multiple NULLs (pre-existing rows) are allowed by Postgres unique indexes.
CREATE UNIQUE INDEX IF NOT EXISTS anonymous_sessions_ip_hash_key
  ON anonymous_sessions(ip_hash);
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_created_at
  ON anonymous_sessions(created_at DESC);

ALTER TABLE anonymous_sessions ENABLE ROW LEVEL SECURITY;

-- Re-apply both functions so the live definitions are guaranteed to match
-- (CREATE OR REPLACE replaces ALL modifiers — keep SECURITY DEFINER).

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
