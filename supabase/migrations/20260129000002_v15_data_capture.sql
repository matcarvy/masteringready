-- MasteringReady v1.5 Data Capture Schema Updates
-- Adds spectral 6-band, energy analysis, categorical flags, and client context

-- v1.5: Spectral balance 6-band breakdown (JSONB)
-- Contains: sub, low, low_mid, mid, high_mid, high (percentages)
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS spectral_6band JSONB;

-- v1.5: Energy analysis (JSONB)
-- Contains: energy_curve (array), peak_energy_time_pct, energy_distribution
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS energy_analysis JSONB;

-- v1.5: Categorical flags for analytics and filtering (JSONB)
-- Contains: headroom_ok, true_peak_safe, dynamic_ok, stereo_risk
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS categorical_flags JSONB;

-- v1.5: Client context
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS client_country VARCHAR(5);
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS client_timezone VARCHAR(50);

-- Index for categorical flag queries (analytics)
CREATE INDEX IF NOT EXISTS idx_analyses_headroom_ok
    ON analyses ((categorical_flags->>'headroom_ok'))
    WHERE categorical_flags IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analyses_stereo_risk
    ON analyses ((categorical_flags->>'stereo_risk'))
    WHERE categorical_flags IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analyses_client_country
    ON analyses (client_country)
    WHERE client_country IS NOT NULL;
