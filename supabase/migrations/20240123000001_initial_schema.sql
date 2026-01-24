-- MasteringReady Database Schema
-- Supabase PostgreSQL
-- Version: 1.0.0

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Subscription plan types
CREATE TYPE plan_type AS ENUM ('free', 'pro', 'studio');

-- Subscription status
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'paused');

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

-- Analysis verdict
CREATE TYPE analysis_verdict AS ENUM ('ready', 'almost_ready', 'needs_work', 'critical');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PLANS: Subscription tiers
-- ----------------------------------------------------------------------------
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    type plan_type NOT NULL UNIQUE,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2),
    stripe_price_id_monthly VARCHAR(100),
    stripe_price_id_yearly VARCHAR(100),

    -- Limits
    analyses_per_month INTEGER NOT NULL DEFAULT 3,  -- -1 = unlimited
    reference_comparisons_per_day INTEGER NOT NULL DEFAULT 0,  -- -1 = unlimited
    batch_processing BOOLEAN NOT NULL DEFAULT FALSE,
    api_access BOOLEAN NOT NULL DEFAULT FALSE,
    priority_processing BOOLEAN NOT NULL DEFAULT FALSE,
    social_media_optimizer BOOLEAN NOT NULL DEFAULT FALSE,
    white_label_reports BOOLEAN NOT NULL DEFAULT FALSE,

    -- Display
    description_es TEXT,
    description_en TEXT,
    features_es JSONB,  -- Array of feature strings
    features_en JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- PROFILES: Extends auth.users with additional data
-- ----------------------------------------------------------------------------
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    preferred_language VARCHAR(2) DEFAULT 'es' CHECK (preferred_language IN ('es', 'en')),

    -- Usage tracking
    total_analyses INTEGER NOT NULL DEFAULT 0,
    analyses_this_month INTEGER NOT NULL DEFAULT 0,
    last_analysis_at TIMESTAMPTZ,

    -- Preferences
    default_strict_mode BOOLEAN NOT NULL DEFAULT FALSE,
    default_report_mode VARCHAR(10) DEFAULT 'write' CHECK (default_report_mode IN ('short', 'write', 'visual')),
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- SUBSCRIPTIONS: User subscription records
-- ----------------------------------------------------------------------------
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),

    -- Stripe data
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),

    -- Status
    status subscription_status NOT NULL DEFAULT 'active',
    is_yearly BOOLEAN NOT NULL DEFAULT FALSE,

    -- Dates
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_end TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id)  -- One active subscription per user
);

-- ----------------------------------------------------------------------------
-- ANALYSES: Analysis history
-- ----------------------------------------------------------------------------
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL for anonymous

    -- File info
    filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    file_format VARCHAR(10),  -- wav, mp3, aiff
    duration_seconds DECIMAL(10,2),
    sample_rate INTEGER,
    bit_depth INTEGER,
    channels INTEGER,

    -- Analysis parameters
    lang VARCHAR(2) NOT NULL DEFAULT 'es',
    strict_mode BOOLEAN NOT NULL DEFAULT FALSE,
    report_mode VARCHAR(10) NOT NULL DEFAULT 'write',

    -- Results
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    verdict analysis_verdict NOT NULL,

    -- Detailed metrics (JSONB for flexibility)
    metrics JSONB,
    interpretations JSONB,

    -- Reports (stored for history)
    report_short TEXT,
    report_write TEXT,
    report_visual TEXT,

    -- Processing info
    processing_time_seconds DECIMAL(10,2),
    used_chunked_analysis BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Privacy: analyses can be marked for deletion
    scheduled_deletion_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- USAGE_TRACKING: Daily usage counters per user
-- ----------------------------------------------------------------------------
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Counters
    analyses_count INTEGER NOT NULL DEFAULT 0,
    reference_comparisons_count INTEGER NOT NULL DEFAULT 0,
    pdf_downloads_count INTEGER NOT NULL DEFAULT 0,

    -- Reset tracking
    last_reset_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, date)
);

-- ----------------------------------------------------------------------------
-- PAYMENTS: Payment history for Stripe
-- ----------------------------------------------------------------------------
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- Stripe data
    stripe_payment_intent_id VARCHAR(100),
    stripe_invoice_id VARCHAR(100),
    stripe_charge_id VARCHAR(100),

    -- Amount
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',

    -- Status
    status payment_status NOT NULL DEFAULT 'pending',

    -- Details
    description TEXT,
    receipt_url TEXT,

    -- Error handling
    failure_code VARCHAR(50),
    failure_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- API_KEYS: For Studio tier API access
-- ----------------------------------------------------------------------------
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Key data
    key_hash VARCHAR(64) NOT NULL,  -- SHA-256 hash of the key
    key_prefix VARCHAR(8) NOT NULL,  -- First 8 chars for display (mr_xxxxx...)
    name VARCHAR(100) NOT NULL DEFAULT 'Default',

    -- Usage
    last_used_at TIMESTAMPTZ,
    total_requests INTEGER NOT NULL DEFAULT 0,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(key_hash)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Profiles
CREATE INDEX idx_profiles_email ON profiles(email);

-- Subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Analyses
CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX idx_analyses_score ON analyses(score);
CREATE INDEX idx_analyses_verdict ON analyses(verdict);

-- Usage tracking
CREATE INDEX idx_usage_user_date ON usage_tracking(user_id, date);

-- Payments
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_stripe_customer ON payments(stripe_payment_intent_id);

-- API Keys
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    free_plan_id UUID;
BEGIN
    -- Create profile
    INSERT INTO profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );

    -- Get free plan ID
    SELECT id INTO free_plan_id FROM plans WHERE type = 'free' LIMIT 1;

    -- Create free subscription
    IF free_plan_id IS NOT NULL THEN
        INSERT INTO subscriptions (user_id, plan_id, current_period_end)
        VALUES (NEW.id, free_plan_id, NOW() + INTERVAL '100 years');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment analysis count
CREATE OR REPLACE FUNCTION increment_analysis_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Update profile counters
    UPDATE profiles
    SET
        total_analyses = total_analyses + 1,
        analyses_this_month = analyses_this_month + 1,
        last_analysis_at = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Update or insert usage tracking
    INSERT INTO usage_tracking (user_id, date, analyses_count)
    VALUES (p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        analyses_count = usage_tracking.analyses_count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can analyze
CREATE OR REPLACE FUNCTION can_user_analyze(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan_limit INTEGER;
    v_current_count INTEGER;
BEGIN
    -- Get user's plan limit
    SELECT p.analyses_per_month INTO v_plan_limit
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.user_id = p_user_id AND s.status = 'active';

    -- -1 means unlimited
    IF v_plan_limit = -1 THEN
        RETURN TRUE;
    END IF;

    -- Get current month's count
    SELECT analyses_this_month INTO v_current_count
    FROM profiles
    WHERE id = p_user_id;

    RETURN COALESCE(v_current_count, 0) < COALESCE(v_plan_limit, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly counters (call via cron)
CREATE OR REPLACE FUNCTION reset_monthly_counters()
RETURNS VOID AS $$
BEGIN
    UPDATE profiles
    SET analyses_this_month = 0, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at
    BEFORE UPDATE ON usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Plans: Everyone can read active plans
CREATE POLICY "Plans are viewable by everyone"
    ON plans FOR SELECT
    USING (is_active = TRUE);

-- Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Subscriptions: Users can only view their own
CREATE POLICY "Users can view own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Analyses: Users can view and create their own
CREATE POLICY "Users can view own analyses"
    ON analyses FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create analyses"
    ON analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own analyses"
    ON analyses FOR DELETE
    USING (auth.uid() = user_id);

-- Usage tracking: Users can only view their own
CREATE POLICY "Users can view own usage"
    ON usage_tracking FOR SELECT
    USING (auth.uid() = user_id);

-- Payments: Users can only view their own
CREATE POLICY "Users can view own payments"
    ON payments FOR SELECT
    USING (auth.uid() = user_id);

-- API Keys: Users can manage their own
CREATE POLICY "Users can view own API keys"
    ON api_keys FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create API keys"
    ON api_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
    ON api_keys FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
    ON api_keys FOR DELETE
    USING (auth.uid() = user_id);
