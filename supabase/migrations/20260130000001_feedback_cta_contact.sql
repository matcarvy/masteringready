-- MasteringReady - Feedback Enhancements + CTA Tracking + Contact Requests
-- Version: 1.0.0
-- Date: 2026-01-30

-- ============================================================================
-- 1) ALTER user_feedback: add rating_bool, client_country, feedback_type
-- ============================================================================

ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS rating_bool BOOLEAN;
ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS client_country VARCHAR(5);
ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS feedback_type TEXT NOT NULL DEFAULT 'general';

CREATE INDEX IF NOT EXISTS idx_feedback_rating_bool ON user_feedback(rating_bool) WHERE rating_bool IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_type ON user_feedback(feedback_type);

-- ============================================================================
-- 2) CREATE cta_clicks: tracks CTA button clicks from analysis results
-- ============================================================================

CREATE TABLE IF NOT EXISTS cta_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    cta_type TEXT NOT NULL,                -- 'mastering', 'mix_help', 'pro_upgrade'
    score_at_click INTEGER,                -- score at the time of click
    client_country VARCHAR(5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cta_clicks_type ON cta_clicks(cta_type);
CREATE INDEX idx_cta_clicks_user ON cta_clicks(user_id);
CREATE INDEX idx_cta_clicks_analysis ON cta_clicks(analysis_id);
CREATE INDEX idx_cta_clicks_created ON cta_clicks(created_at DESC);

ALTER TABLE cta_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (including anonymous)
CREATE POLICY "Anyone can insert cta_clicks"
    ON cta_clicks FOR INSERT
    WITH CHECK (true);

-- Only admin can select (via service role client, bypasses RLS)
CREATE POLICY "Users can view own cta_clicks"
    ON cta_clicks FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================================================
-- 3) CREATE contact_requests: tracks contact method selections from modal
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    name TEXT,
    email TEXT,
    message TEXT,
    cta_source TEXT,                        -- which CTA led here: 'mastering', 'mix_help'
    contact_method TEXT NOT NULL,           -- 'whatsapp', 'email', 'instagram'
    client_country VARCHAR(5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contact_requests_method ON contact_requests(contact_method);
CREATE INDEX idx_contact_requests_source ON contact_requests(cta_source);
CREATE INDEX idx_contact_requests_user ON contact_requests(user_id);
CREATE INDEX idx_contact_requests_created ON contact_requests(created_at DESC);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (including anonymous)
CREATE POLICY "Anyone can insert contact_requests"
    ON contact_requests FOR INSERT
    WITH CHECK (true);

-- Only admin can select (via service role client, bypasses RLS)
CREATE POLICY "Users can view own contact_requests"
    ON contact_requests FOR SELECT
    USING (auth.uid() = user_id);
