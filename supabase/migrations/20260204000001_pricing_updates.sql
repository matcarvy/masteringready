-- MasteringReady Pricing Updates - February 2026
-- 1. Update Colombia multiplier: 0.50 → 0.55 (Tier 5 consistency)
-- 2. Add Australia with Tier 1 pricing

-- Update Colombia to Tier 5 (0.55x)
UPDATE regional_pricing
SET
    multiplier = 0.55,
    tier = 5,
    notes = 'Colombia - Tier 5 (0.55x), same as Peru/Ecuador',
    updated_at = NOW()
WHERE country_code = 'CO';

-- Add Australia (Tier 1)
INSERT INTO regional_pricing (country_code, currency, multiplier, tier, payment_provider, is_active, notes)
VALUES ('AU', 'AUD', 1.00, 1, 'stripe', true, 'Australia - Tier 1, charge in AUD')
ON CONFLICT (country_code) DO UPDATE SET
    currency = 'AUD',
    multiplier = 1.00,
    tier = 1,
    payment_provider = 'stripe',
    is_active = true,
    notes = 'Australia - Tier 1, charge in AUD',
    updated_at = NOW();

-- Add New Zealand (Tier 1, similar market to AU)
INSERT INTO regional_pricing (country_code, currency, multiplier, tier, payment_provider, is_active, notes)
VALUES ('NZ', 'NZD', 1.00, 1, 'stripe', true, 'New Zealand - Tier 1, charge in USD (NZD not widely supported)')
ON CONFLICT (country_code) DO UPDATE SET
    multiplier = 1.00,
    tier = 1,
    notes = 'New Zealand - Tier 1',
    updated_at = NOW();

-- Verify Eurozone countries have correct settings (Tier 1, EUR)
UPDATE regional_pricing
SET
    currency = 'EUR',
    tier = 1,
    multiplier = 1.00,
    notes = 'Eurozone - Tier 1, charge in EUR',
    updated_at = NOW()
WHERE country_code IN ('DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'GR', 'SK', 'SI', 'LT', 'LV', 'EE', 'LU', 'MT', 'CY', 'HR');

-- Insert missing Eurozone countries
INSERT INTO regional_pricing (country_code, currency, multiplier, tier, payment_provider, is_active, notes)
VALUES
    ('BE', 'EUR', 1.00, 1, 'stripe', true, 'Belgium - Eurozone'),
    ('AT', 'EUR', 1.00, 1, 'stripe', true, 'Austria - Eurozone'),
    ('PT', 'EUR', 1.00, 1, 'stripe', true, 'Portugal - Eurozone'),
    ('IE', 'EUR', 1.00, 1, 'stripe', true, 'Ireland - Eurozone'),
    ('FI', 'EUR', 1.00, 1, 'stripe', true, 'Finland - Eurozone'),
    ('GR', 'EUR', 1.00, 1, 'stripe', true, 'Greece - Eurozone'),
    ('SK', 'EUR', 1.00, 1, 'stripe', true, 'Slovakia - Eurozone'),
    ('SI', 'EUR', 1.00, 1, 'stripe', true, 'Slovenia - Eurozone'),
    ('LT', 'EUR', 1.00, 1, 'stripe', true, 'Lithuania - Eurozone'),
    ('LV', 'EUR', 1.00, 1, 'stripe', true, 'Latvia - Eurozone'),
    ('EE', 'EUR', 1.00, 1, 'stripe', true, 'Estonia - Eurozone'),
    ('LU', 'EUR', 1.00, 1, 'stripe', true, 'Luxembourg - Eurozone'),
    ('MT', 'EUR', 1.00, 1, 'stripe', true, 'Malta - Eurozone'),
    ('CY', 'EUR', 1.00, 1, 'stripe', true, 'Cyprus - Eurozone'),
    ('HR', 'EUR', 1.00, 1, 'stripe', true, 'Croatia - Eurozone (joined 2023)')
ON CONFLICT (country_code) DO UPDATE SET
    currency = 'EUR',
    multiplier = 1.00,
    tier = 1,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- Update UK to ensure correct currency
UPDATE regional_pricing
SET
    currency = 'GBP',
    tier = 1,
    multiplier = 1.00,
    notes = 'United Kingdom - Tier 1, charge in GBP',
    updated_at = NOW()
WHERE country_code = 'GB';

-- Update Canada to ensure correct currency
UPDATE regional_pricing
SET
    currency = 'CAD',
    tier = 1,
    multiplier = 1.00,
    notes = 'Canada - Tier 1, charge in CAD',
    updated_at = NOW()
WHERE country_code = 'CA';
