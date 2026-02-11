-- MasteringReady - Pricing Restructure for Launch
-- Version: 2.0.0
-- Date: 2026-01-25
--
-- Changes:
-- - Free: 2 lifetime analyses (not 3/month)
-- - Pro: 30/month with no rollover (not unlimited)
-- - Single Purchase: $5.99 for 1 analysis
-- - Add-on Pack: $3.99 for 10 analyses (Pro only, max 2/cycle)
-- - Studio: Hidden (kept for future use)

-- ============================================================================
-- STEP 1: Add new plan types to enum
-- ============================================================================

-- Add 'single' and 'addon' to plan_type enum
ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'single';
ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'addon';

-- ============================================================================
-- STEP 2: Add new columns to plans table
-- ============================================================================

-- Add columns for new pricing model
ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_lifetime_limit BOOLEAN DEFAULT FALSE;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS analyses_total INTEGER; -- For lifetime/one-off limits
ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_addon BOOLEAN DEFAULT FALSE;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS requires_subscription_type plan_type; -- For add-ons that require a base plan
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_per_cycle INTEGER; -- Max purchases per billing cycle
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_usd_benchmark DECIMAL(10,2); -- Base USD price for regional pricing

-- ============================================================================
-- STEP 3: Add columns to profiles for lifetime tracking
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS analyses_lifetime_used INTEGER DEFAULT 0;

-- ============================================================================
-- STEP 4: Add columns to subscriptions for add-on and cycle tracking
-- ============================================================================

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS addon_packs_this_cycle INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS addon_analyses_remaining INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS analyses_used_this_cycle INTEGER DEFAULT 0;

-- ============================================================================
-- STEP 5: Create purchases table for one-off purchases (single, addon)
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),

    -- Stripe data
    stripe_payment_intent_id VARCHAR(100),
    stripe_checkout_session_id VARCHAR(100),

    -- Purchase details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    country_code VARCHAR(2), -- For regional pricing tracking

    -- Analyses granted
    analyses_granted INTEGER NOT NULL DEFAULT 0,
    analyses_used INTEGER NOT NULL DEFAULT 0,

    -- Status
    status payment_status NOT NULL DEFAULT 'pending',

    -- For add-on packs, link to subscription
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- For add-on packs (end of billing cycle)

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for purchases
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session ON purchases(stripe_checkout_session_id);

-- RLS for purchases
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
    ON purchases FOR SELECT
    USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: Update existing plans
-- ============================================================================

-- Update FREE plan: 2 lifetime analyses
UPDATE plans SET
    analyses_per_month = 0,  -- Not used anymore for free
    is_lifetime_limit = TRUE,
    analyses_total = 2,
    price_usd_benchmark = 0,
    description_es = 'Prueba MasteringReady con 2 análisis gratuitos',
    description_en = 'Try MasteringReady with 2 free analyses',
    features_es = '["2 análisis gratuitos de por vida", "Análisis rápido y resumen", "Resultados visuales en dashboard", "Historial guardado"]'::jsonb,
    features_en = '["2 free analyses for life", "Fast and summary analysis", "Visual results in dashboard", "Saved history"]'::jsonb,
    updated_at = NOW()
WHERE type = 'free';

-- Update PRO plan: 30/month, no rollover
UPDATE plans SET
    analyses_per_month = 30,
    is_lifetime_limit = FALSE,
    analyses_total = NULL,
    price_usd_benchmark = 9.99,
    description_es = 'Para productores serios que necesitan análisis frecuentes',
    description_en = 'For serious producers who need frequent analysis',
    features_es = '["30 análisis por mes", "Análisis completo con PDF", "Procesamiento prioritario", "Historial ilimitado", "Sin rollover de análisis"]'::jsonb,
    features_en = '["30 analyses per month", "Complete analysis with PDF", "Priority processing", "Unlimited history", "No analysis rollover"]'::jsonb,
    updated_at = NOW()
WHERE type = 'pro';

-- Hide STUDIO plan (keep for future)
UPDATE plans SET
    is_active = FALSE,
    updated_at = NOW()
WHERE type = 'studio';

-- ============================================================================
-- STEP 7: Insert new plans (Single Purchase, Add-on Pack)
-- ============================================================================

-- Single Purchase plan
INSERT INTO plans (
    name,
    type,
    price_monthly,
    price_usd_benchmark,
    analyses_per_month,
    is_lifetime_limit,
    analyses_total,
    is_addon,
    reference_comparisons_per_day,
    batch_processing,
    api_access,
    priority_processing,
    social_media_optimizer,
    white_label_reports,
    description_es,
    description_en,
    features_es,
    features_en,
    display_order,
    is_active
) VALUES (
    'Single Analysis',
    'single',
    5.99,
    5.99,
    0,
    FALSE,
    1,  -- 1 analysis per purchase
    FALSE,
    0,
    FALSE,
    FALSE,
    TRUE,  -- Priority processing included
    FALSE,
    FALSE,
    'Un análisis completo cuando lo necesites',
    'One complete analysis when you need it',
    '["1 análisis completo", "Descarga PDF incluida", "Guardado permanente en dashboard", "Procesamiento prioritario"]'::jsonb,
    '["1 complete analysis", "PDF download included", "Permanently saved in dashboard", "Priority processing"]'::jsonb,
    4,
    TRUE
)
ON CONFLICT (type) DO UPDATE SET
    name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    price_usd_benchmark = EXCLUDED.price_usd_benchmark,
    analyses_total = EXCLUDED.analyses_total,
    description_es = EXCLUDED.description_es,
    description_en = EXCLUDED.description_en,
    features_es = EXCLUDED.features_es,
    features_en = EXCLUDED.features_en,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Add-on Pack (for Pro users only)
INSERT INTO plans (
    name,
    type,
    price_monthly,
    price_usd_benchmark,
    analyses_per_month,
    is_lifetime_limit,
    analyses_total,
    is_addon,
    requires_subscription_type,
    max_per_cycle,
    reference_comparisons_per_day,
    batch_processing,
    api_access,
    priority_processing,
    social_media_optimizer,
    white_label_reports,
    description_es,
    description_en,
    features_es,
    features_en,
    display_order,
    is_active
) VALUES (
    'Pro Add-on Pack',
    'addon',
    3.99,
    3.99,
    0,
    FALSE,
    10,  -- 10 analyses per pack
    TRUE,
    'pro',  -- Requires Pro subscription
    2,  -- Max 2 per billing cycle
    0,
    FALSE,
    FALSE,
    TRUE,
    FALSE,
    FALSE,
    '10 análisis extra para tu ciclo actual',
    '10 extra analyses for your current cycle',
    '["10 análisis adicionales", "Válido hasta fin del ciclo", "Máximo 2 packs por mes", "Solo para suscriptores Pro"]'::jsonb,
    '["10 additional analyses", "Valid until end of cycle", "Maximum 2 packs per month", "Pro subscribers only"]'::jsonb,
    5,
    TRUE
)
ON CONFLICT (type) DO UPDATE SET
    name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    price_usd_benchmark = EXCLUDED.price_usd_benchmark,
    analyses_total = EXCLUDED.analyses_total,
    is_addon = EXCLUDED.is_addon,
    requires_subscription_type = EXCLUDED.requires_subscription_type,
    max_per_cycle = EXCLUDED.max_per_cycle,
    description_es = EXCLUDED.description_es,
    description_en = EXCLUDED.description_en,
    features_es = EXCLUDED.features_es,
    features_en = EXCLUDED.features_en,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ============================================================================
-- STEP 8: Create regional pricing table
-- ============================================================================

CREATE TABLE IF NOT EXISTS regional_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code VARCHAR(2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    tier INTEGER NOT NULL DEFAULT 1, -- 1=Benchmark, 2=LATAM, 3=ROW
    payment_provider VARCHAR(20) NOT NULL DEFAULT 'stripe', -- stripe, dlocal, payu
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(country_code)
);

-- Seed regional pricing from spec
INSERT INTO regional_pricing (country_code, currency, multiplier, tier, payment_provider, notes) VALUES
-- Tier 1: Benchmark Markets
('US', 'USD', 1.00, 1, 'stripe', 'Benchmark market'),
('CA', 'CAD', 1.00, 1, 'stripe', 'Benchmark market'),
('GB', 'GBP', 1.00, 1, 'stripe', 'Benchmark market'),
('DE', 'EUR', 1.00, 1, 'stripe', 'Benchmark market'),
('FR', 'EUR', 1.00, 1, 'stripe', 'Benchmark market'),
('ES', 'EUR', 1.00, 1, 'stripe', 'Benchmark market'),
('IT', 'EUR', 1.00, 1, 'stripe', 'Benchmark market'),
('NL', 'EUR', 1.00, 1, 'stripe', 'Benchmark market'),

-- Tier 2: LATAM (PPP Adjusted)
('CO', 'COP', 0.50, 2, 'stripe', 'Target range 45-55%'),
('MX', 'MXN', 0.70, 2, 'stripe', 'Strong middle-income'),
('CL', 'CLP', 0.75, 2, 'stripe', 'Higher PPP in LATAM'),
('PE', 'PEN', 0.55, 2, 'stripe', 'Similar to Colombia'),
('BR', 'BRL', 0.60, 2, 'stripe', 'Large market, mixed PPP'),
('AR', 'ARS', 0.40, 2, 'stripe', 'Volatile, review quarterly'),
('UY', 'UYU', 0.75, 2, 'stripe', 'High PPP for LATAM'),
('PY', 'PYG', 0.50, 2, 'stripe', 'Lower PPP'),
('EC', 'USD', 0.55, 2, 'stripe', 'Dollarized but LATAM pricing'),
('SV', 'USD', 0.55, 2, 'stripe', 'Dollarized but LATAM pricing'),
('PA', 'USD', 0.65, 2, 'stripe', 'Dollarized, higher PPP')

ON CONFLICT (country_code) DO UPDATE SET
    currency = EXCLUDED.currency,
    multiplier = EXCLUDED.multiplier,
    tier = EXCLUDED.tier,
    payment_provider = EXCLUDED.payment_provider,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- Index and RLS for regional_pricing
CREATE INDEX IF NOT EXISTS idx_regional_pricing_country ON regional_pricing(country_code);

ALTER TABLE regional_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Regional pricing is viewable by everyone"
    ON regional_pricing FOR SELECT
    USING (is_active = TRUE);

-- ============================================================================
-- STEP 9: Update can_user_analyze function
-- ============================================================================

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

    -- FREE plan: lifetime limit
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

-- ============================================================================
-- STEP 10: Update increment_analysis_count function
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_analysis_count(p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    source TEXT -- 'free', 'pro', 'addon', 'single'
) AS $$
DECLARE
    v_plan_type plan_type;
    v_cycle_used INTEGER;
    v_addon_remaining INTEGER;
BEGIN
    -- Get user's plan info
    SELECT p.type, s.analyses_used_this_cycle, s.addon_analyses_remaining
    INTO v_plan_type, v_cycle_used, v_addon_remaining
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.user_id = p_user_id;

    v_cycle_used := COALESCE(v_cycle_used, 0);
    v_addon_remaining := COALESCE(v_addon_remaining, 0);

    -- FREE plan: increment lifetime counter
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

    -- PRO plan: increment cycle counter or use addon
    IF v_plan_type = 'pro' THEN
        IF v_cycle_used < 30 THEN
            -- Use from monthly allocation
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
            -- Use from addon pack
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

    -- STUDIO: just increment (unlimited)
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

-- ============================================================================
-- STEP 11: Function to use single purchase analysis
-- ============================================================================

CREATE OR REPLACE FUNCTION use_single_purchase(p_user_id UUID, p_purchase_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_remaining INTEGER;
BEGIN
    -- Check purchase belongs to user and has remaining analyses
    SELECT analyses_granted - analyses_used INTO v_remaining
    FROM purchases
    WHERE id = p_purchase_id
      AND user_id = p_user_id
      AND status = 'succeeded';

    IF v_remaining IS NULL OR v_remaining <= 0 THEN
        RETURN FALSE;
    END IF;

    -- Decrement purchase
    UPDATE purchases
    SET analyses_used = analyses_used + 1,
        updated_at = NOW()
    WHERE id = p_purchase_id;

    -- Update profile
    UPDATE profiles
    SET total_analyses = total_analyses + 1,
        last_analysis_at = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 12: Function to check if Pro user can buy addon
-- ============================================================================

CREATE OR REPLACE FUNCTION can_buy_addon(p_user_id UUID)
RETURNS TABLE (
    can_buy BOOLEAN,
    reason TEXT,
    packs_this_cycle INTEGER,
    max_packs INTEGER
) AS $$
DECLARE
    v_plan_type plan_type;
    v_packs_used INTEGER;
    v_subscription_status subscription_status;
BEGIN
    -- Get subscription info
    SELECT p.type, s.addon_packs_this_cycle, s.status
    INTO v_plan_type, v_packs_used, v_subscription_status
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.user_id = p_user_id;

    v_packs_used := COALESCE(v_packs_used, 0);

    -- Must be Pro subscriber
    IF v_plan_type != 'pro' THEN
        RETURN QUERY SELECT FALSE, 'NOT_PRO'::TEXT, 0, 0;
        RETURN;
    END IF;

    -- Must be active
    IF v_subscription_status != 'active' THEN
        RETURN QUERY SELECT FALSE, 'SUBSCRIPTION_INACTIVE'::TEXT, v_packs_used, 2;
        RETURN;
    END IF;

    -- Check limit (max 2 per cycle)
    IF v_packs_used >= 2 THEN
        RETURN QUERY SELECT FALSE, 'MAX_PACKS_REACHED'::TEXT, v_packs_used, 2;
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, 'OK'::TEXT, v_packs_used, 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 13: Function to add addon pack to subscription
-- ============================================================================

CREATE OR REPLACE FUNCTION add_addon_pack(p_user_id UUID, p_purchase_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verify purchase
    IF NOT EXISTS (
        SELECT 1 FROM purchases
        WHERE id = p_purchase_id
          AND user_id = p_user_id
          AND status = 'succeeded'
    ) THEN
        RETURN FALSE;
    END IF;

    -- Add 10 analyses and increment pack counter
    UPDATE subscriptions
    SET addon_analyses_remaining = COALESCE(addon_analyses_remaining, 0) + 10,
        addon_packs_this_cycle = COALESCE(addon_packs_this_cycle, 0) + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 14: Function to reset Pro subscription cycle (called by webhook on renewal)
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_subscription_cycle(p_user_id UUID, p_new_period_start TIMESTAMPTZ, p_new_period_end TIMESTAMPTZ)
RETURNS VOID AS $$
BEGIN
    UPDATE subscriptions
    SET analyses_used_this_cycle = 0,
        addon_analyses_remaining = 0,
        addon_packs_this_cycle = 0,
        current_period_start = p_new_period_start,
        current_period_end = p_new_period_end,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Expire any addon purchases from previous cycle
    UPDATE purchases
    SET status = 'refunded', -- Mark as expired
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND subscription_id IS NOT NULL
      AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 15: Function to get user analysis status (for dashboard)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_analysis_status(p_user_id UUID)
RETURNS TABLE (
    plan_type plan_type,
    plan_name TEXT,
    is_lifetime BOOLEAN,
    analyses_used INTEGER,
    analyses_limit INTEGER,
    addon_remaining INTEGER,
    addon_packs_available INTEGER,
    can_analyze BOOLEAN,
    subscription_status subscription_status,
    current_period_end TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.type,
        p.name,
        p.is_lifetime_limit,
        CASE
            WHEN p.is_lifetime_limit THEN COALESCE(pr.analyses_lifetime_used, 0)
            ELSE COALESCE(s.analyses_used_this_cycle, 0)
        END,
        CASE
            WHEN p.is_lifetime_limit THEN COALESCE(p.analyses_total, 2)
            ELSE COALESCE(p.analyses_per_month, 30)
        END,
        COALESCE(s.addon_analyses_remaining, 0),
        CASE
            WHEN p.type = 'pro' THEN 2 - COALESCE(s.addon_packs_this_cycle, 0)
            ELSE 0
        END,
        CASE
            WHEN p.is_lifetime_limit THEN COALESCE(pr.analyses_lifetime_used, 0) < COALESCE(p.analyses_total, 2)
            WHEN p.type = 'pro' THEN COALESCE(s.analyses_used_this_cycle, 0) < 30 OR COALESCE(s.addon_analyses_remaining, 0) > 0
            WHEN p.type = 'studio' THEN TRUE
            ELSE FALSE
        END,
        s.status,
        s.current_period_end
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    JOIN profiles pr ON s.user_id = pr.id
    WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 16: Add country_code to profiles for regional pricing
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS detected_country_code VARCHAR(2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_detected_at TIMESTAMPTZ;

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Check plans after migration:
-- SELECT name, type, price_monthly, analyses_per_month, analyses_total, is_lifetime_limit, is_active
-- FROM plans ORDER BY display_order;

-- Check regional pricing:
-- SELECT country_code, currency, multiplier, tier, payment_provider
-- FROM regional_pricing ORDER BY tier, country_code;
