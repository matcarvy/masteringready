-- MasteringReady Data Schema Updates v2.1.0

-- TAREA 1: UPDATE REGIONAL PRICING

UPDATE regional_pricing SET
    multiplier = 1.00,
    notes = 'Benchmark market - Full USD price',
    updated_at = NOW()
WHERE country_code IN ('US', 'CA', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL');

UPDATE regional_pricing SET multiplier = 0.50, notes = 'Colombia - Target range 45-55%', updated_at = NOW() WHERE country_code = 'CO';
UPDATE regional_pricing SET multiplier = 0.70, notes = 'Mexico - Strong middle-income', updated_at = NOW() WHERE country_code = 'MX';
UPDATE regional_pricing SET multiplier = 0.75, notes = 'Chile - Higher PPP in LATAM', updated_at = NOW() WHERE country_code = 'CL';
UPDATE regional_pricing SET multiplier = 0.55, notes = 'Peru - Similar to Colombia', updated_at = NOW() WHERE country_code = 'PE';
UPDATE regional_pricing SET multiplier = 0.60, notes = 'Brazil - Large market, mixed PPP', updated_at = NOW() WHERE country_code = 'BR';
UPDATE regional_pricing SET multiplier = 0.40, notes = 'Argentina - Volatile, review quarterly', updated_at = NOW() WHERE country_code = 'AR';
UPDATE regional_pricing SET multiplier = 0.75, notes = 'Uruguay - High PPP for LATAM', updated_at = NOW() WHERE country_code = 'UY';
UPDATE regional_pricing SET multiplier = 0.50, notes = 'Paraguay - Lower PPP', updated_at = NOW() WHERE country_code = 'PY';
UPDATE regional_pricing SET multiplier = 0.55, notes = 'Ecuador - Dollarized but LATAM pricing', updated_at = NOW() WHERE country_code = 'EC';
UPDATE regional_pricing SET multiplier = 0.55, notes = 'El Salvador - Dollarized but LATAM pricing', updated_at = NOW() WHERE country_code = 'SV';
UPDATE regional_pricing SET multiplier = 0.65, notes = 'Panama - Dollarized, higher PPP', updated_at = NOW() WHERE country_code = 'PA';

INSERT INTO regional_pricing (country_code, currency, multiplier, tier, payment_provider, notes) VALUES
('GT', 'GTQ', 0.50, 2, 'stripe', 'Guatemala - Lower PPP'),
('CR', 'CRC', 0.65, 2, 'stripe', 'Costa Rica - Higher PPP for Central America'),
('HN', 'HNL', 0.45, 2, 'stripe', 'Honduras - Lower PPP'),
('NI', 'NIO', 0.45, 2, 'stripe', 'Nicaragua - Lower PPP'),
('DO', 'DOP', 0.55, 2, 'stripe', 'Dominican Republic - Caribbean'),
('VE', 'USD', 0.40, 2, 'stripe', 'Venezuela - Dollarized, volatile'),
('BO', 'BOB', 0.45, 2, 'stripe', 'Bolivia - Lower PPP')
ON CONFLICT (country_code) DO UPDATE SET
    multiplier = EXCLUDED.multiplier,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- TAREA 2: ADD NEW FIELDS TO ANALYSES TABLE

ALTER TABLE analyses ADD COLUMN IF NOT EXISTS is_chunked_analysis BOOLEAN DEFAULT FALSE;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS chunk_count INTEGER;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS analysis_version VARCHAR(20);
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS was_compressed BOOLEAN DEFAULT FALSE;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS original_file_size_bytes BIGINT;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS compressed_file_size_bytes BIGINT;

-- TAREA 3: CREATE AGGREGATE_STATS TABLE

CREATE TABLE IF NOT EXISTS aggregate_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_type VARCHAR(10) NOT NULL DEFAULT 'daily' CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    total_analyses INTEGER NOT NULL DEFAULT 0,
    unique_users INTEGER NOT NULL DEFAULT 0,
    anonymous_analyses INTEGER NOT NULL DEFAULT 0,
    free_analyses INTEGER NOT NULL DEFAULT 0,
    pro_analyses INTEGER NOT NULL DEFAULT 0,
    single_purchase_analyses INTEGER NOT NULL DEFAULT 0,
    total_file_size_gb DECIMAL(10,2) DEFAULT 0,
    avg_file_size_mb DECIMAL(10,2) DEFAULT 0,
    avg_duration_seconds DECIMAL(10,2) DEFAULT 0,
    wav_count INTEGER DEFAULT 0,
    mp3_count INTEGER DEFAULT 0,
    aiff_count INTEGER DEFAULT 0,
    avg_score DECIMAL(5,2),
    score_90_100 INTEGER DEFAULT 0,
    score_70_89 INTEGER DEFAULT 0,
    score_50_69 INTEGER DEFAULT 0,
    score_0_49 INTEGER DEFAULT 0,
    verdict_ready INTEGER DEFAULT 0,
    verdict_almost_ready INTEGER DEFAULT 0,
    verdict_needs_work INTEGER DEFAULT 0,
    verdict_critical INTEGER DEFAULT 0,
    avg_processing_time_seconds DECIMAL(10,2),
    chunked_analyses INTEGER DEFAULT 0,
    compressed_analyses INTEGER DEFAULT 0,
    signups_count INTEGER DEFAULT 0,
    upgrades_to_pro INTEGER DEFAULT 0,
    single_purchases INTEGER DEFAULT 0,
    addon_purchases INTEGER DEFAULT 0,
    revenue_subscriptions DECIMAL(10,2) DEFAULT 0,
    revenue_single DECIMAL(10,2) DEFAULT 0,
    revenue_addon DECIMAL(10,2) DEFAULT 0,
    revenue_total DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(date, period_type)
);

CREATE INDEX IF NOT EXISTS idx_aggregate_stats_date ON aggregate_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_aggregate_stats_period ON aggregate_stats(period_type, date DESC);

ALTER TABLE aggregate_stats ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_aggregate_stats_updated_at ON aggregate_stats;
CREATE TRIGGER update_aggregate_stats_updated_at
    BEFORE UPDATE ON aggregate_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ADD TERMS ACCEPTANCE TO PROFILES

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_version VARCHAR(10);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;

-- FUNCTION: Update daily aggregate stats

CREATE OR REPLACE FUNCTION update_daily_aggregate_stats(p_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    v_stats RECORD;
BEGIN
    SELECT
        COUNT(*) as total_analyses,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
        COUNT(*) FILTER (WHERE user_id IS NULL) as anonymous_analyses,
        COALESCE(SUM(file_size_bytes) / 1073741824.0, 0) as total_file_size_gb,
        COALESCE(AVG(file_size_bytes) / 1048576.0, 0) as avg_file_size_mb,
        COALESCE(AVG(duration_seconds), 0) as avg_duration_seconds,
        COUNT(*) FILTER (WHERE file_format = 'wav') as wav_count,
        COUNT(*) FILTER (WHERE file_format = 'mp3') as mp3_count,
        COUNT(*) FILTER (WHERE file_format IN ('aiff', 'aif')) as aiff_count,
        COALESCE(AVG(score), 0) as avg_score,
        COUNT(*) FILTER (WHERE score >= 90) as score_90_100,
        COUNT(*) FILTER (WHERE score >= 70 AND score < 90) as score_70_89,
        COUNT(*) FILTER (WHERE score >= 50 AND score < 70) as score_50_69,
        COUNT(*) FILTER (WHERE score < 50) as score_0_49,
        COUNT(*) FILTER (WHERE verdict = 'ready') as verdict_ready,
        COUNT(*) FILTER (WHERE verdict = 'almost_ready') as verdict_almost_ready,
        COUNT(*) FILTER (WHERE verdict = 'needs_work') as verdict_needs_work,
        COUNT(*) FILTER (WHERE verdict = 'critical') as verdict_critical,
        COALESCE(AVG(processing_time_seconds), 0) as avg_processing_time_seconds,
        COUNT(*) FILTER (WHERE used_chunked_analysis = TRUE OR is_chunked_analysis = TRUE) as chunked_analyses,
        COUNT(*) FILTER (WHERE was_compressed = TRUE) as compressed_analyses
    INTO v_stats
    FROM analyses
    WHERE DATE(created_at) = p_date
      AND deleted_at IS NULL;

    INSERT INTO aggregate_stats (
        date, period_type, total_analyses, unique_users, anonymous_analyses,
        total_file_size_gb, avg_file_size_mb, avg_duration_seconds,
        wav_count, mp3_count, aiff_count, avg_score,
        score_90_100, score_70_89, score_50_69, score_0_49,
        verdict_ready, verdict_almost_ready, verdict_needs_work, verdict_critical,
        avg_processing_time_seconds, chunked_analyses, compressed_analyses
    ) VALUES (
        p_date, 'daily', v_stats.total_analyses, v_stats.unique_users, v_stats.anonymous_analyses,
        v_stats.total_file_size_gb, v_stats.avg_file_size_mb, v_stats.avg_duration_seconds,
        v_stats.wav_count, v_stats.mp3_count, v_stats.aiff_count, v_stats.avg_score,
        v_stats.score_90_100, v_stats.score_70_89, v_stats.score_50_69, v_stats.score_0_49,
        v_stats.verdict_ready, v_stats.verdict_almost_ready, v_stats.verdict_needs_work, v_stats.verdict_critical,
        v_stats.avg_processing_time_seconds, v_stats.chunked_analyses, v_stats.compressed_analyses
    )
    ON CONFLICT (date, period_type) DO UPDATE SET
        total_analyses = EXCLUDED.total_analyses,
        unique_users = EXCLUDED.unique_users,
        anonymous_analyses = EXCLUDED.anonymous_analyses,
        total_file_size_gb = EXCLUDED.total_file_size_gb,
        avg_file_size_mb = EXCLUDED.avg_file_size_mb,
        avg_duration_seconds = EXCLUDED.avg_duration_seconds,
        wav_count = EXCLUDED.wav_count,
        mp3_count = EXCLUDED.mp3_count,
        aiff_count = EXCLUDED.aiff_count,
        avg_score = EXCLUDED.avg_score,
        score_90_100 = EXCLUDED.score_90_100,
        score_70_89 = EXCLUDED.score_70_89,
        score_50_69 = EXCLUDED.score_50_69,
        score_0_49 = EXCLUDED.score_0_49,
        verdict_ready = EXCLUDED.verdict_ready,
        verdict_almost_ready = EXCLUDED.verdict_almost_ready,
        verdict_needs_work = EXCLUDED.verdict_needs_work,
        verdict_critical = EXCLUDED.verdict_critical,
        avg_processing_time_seconds = EXCLUDED.avg_processing_time_seconds,
        chunked_analyses = EXCLUDED.chunked_analyses,
        compressed_analyses = EXCLUDED.compressed_analyses,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
