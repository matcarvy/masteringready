-- MasteringReady - User Feedback Table
-- Version: 1.0.0
-- Supports bilingual feedback (Spanish/English)

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Feedback category
CREATE TYPE feedback_category AS ENUM (
    'bug',           -- Error/problema técnico
    'feature',       -- Solicitud de función
    'improvement',   -- Mejora sugerida
    'praise',        -- Comentario positivo
    'question',      -- Pregunta
    'other'          -- Otro
);

-- Feedback status
CREATE TYPE feedback_status AS ENUM (
    'new',           -- Nuevo, no revisado
    'read',          -- Leído por el equipo
    'in_progress',   -- En proceso
    'resolved',      -- Resuelto
    'wont_fix',      -- No se implementará
    'duplicate'      -- Duplicado
);

-- Feedback source
CREATE TYPE feedback_source AS ENUM (
    'web_app',       -- Desde la app web
    'api',           -- Desde API
    'email',         -- Desde email
    'social'         -- Desde redes sociales
);

-- Rating scale (1-5 stars)
CREATE TYPE satisfaction_rating AS ENUM ('1', '2', '3', '4', '5');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USER_FEEDBACK: Feedback and suggestions from users
-- ----------------------------------------------------------------------------
CREATE TABLE user_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL for anonymous

    -- Feedback content
    category feedback_category NOT NULL DEFAULT 'other',
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    lang VARCHAR(2) NOT NULL DEFAULT 'es' CHECK (lang IN ('es', 'en')),

    -- Rating (optional)
    satisfaction satisfaction_rating,

    -- Context
    source feedback_source NOT NULL DEFAULT 'web_app',
    page_url TEXT,  -- URL where feedback was submitted
    user_agent TEXT,
    browser_info JSONB,  -- Browser, OS, device info

    -- Analysis context (if feedback is about a specific analysis)
    analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,

    -- Contact info (for anonymous users who want a response)
    contact_email VARCHAR(255),
    wants_response BOOLEAN NOT NULL DEFAULT FALSE,

    -- Admin fields
    status feedback_status NOT NULL DEFAULT 'new',
    admin_notes TEXT,  -- Internal notes (not visible to user)
    response_es TEXT,  -- Response in Spanish
    response_en TEXT,  -- Response in English
    responded_at TIMESTAMPTZ,
    responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    -- Priority
    is_priority BOOLEAN NOT NULL DEFAULT FALSE,
    priority_reason TEXT,

    -- Tags for categorization
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- FEEDBACK_VOTES: Allow users to vote on feedback (feature requests)
-- ----------------------------------------------------------------------------
CREATE TABLE feedback_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id UUID NOT NULL REFERENCES user_feedback(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL DEFAULT 'upvote' CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(feedback_id, user_id)  -- One vote per user per feedback
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_feedback_category ON user_feedback(category);
CREATE INDEX idx_feedback_status ON user_feedback(status);
CREATE INDEX idx_feedback_created_at ON user_feedback(created_at DESC);
CREATE INDEX idx_feedback_lang ON user_feedback(lang);
CREATE INDEX idx_feedback_analysis ON user_feedback(analysis_id);
CREATE INDEX idx_feedback_priority ON user_feedback(is_priority) WHERE is_priority = TRUE;

CREATE INDEX idx_feedback_votes_feedback ON feedback_votes(feedback_id);
CREATE INDEX idx_feedback_votes_user ON feedback_votes(user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Count votes for a feedback item
CREATE OR REPLACE FUNCTION get_feedback_vote_count(p_feedback_id UUID)
RETURNS INTEGER AS $$
DECLARE
    upvotes INTEGER;
    downvotes INTEGER;
BEGIN
    SELECT
        COALESCE(SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN vote_type = 'downvote' THEN 1 ELSE 0 END), 0)
    INTO upvotes, downvotes
    FROM feedback_votes
    WHERE feedback_id = p_feedback_id;

    RETURN upvotes - downvotes;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_user_feedback_updated_at
    BEFORE UPDATE ON user_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;

-- Feedback: Users can view their own and public feature requests
CREATE POLICY "Users can view own feedback"
    ON user_feedback FOR SELECT
    USING (
        auth.uid() = user_id OR
        (category = 'feature' AND status != 'new')  -- Public feature requests
    );

CREATE POLICY "Users can create feedback"
    ON user_feedback FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR
        user_id IS NULL  -- Allow anonymous feedback
    );

CREATE POLICY "Users can update own feedback"
    ON user_feedback FOR UPDATE
    USING (auth.uid() = user_id);

-- Votes: Users can manage their own votes
CREATE POLICY "Users can view all votes"
    ON feedback_votes FOR SELECT
    USING (TRUE);  -- Votes are public

CREATE POLICY "Users can vote"
    ON feedback_votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change own vote"
    ON feedback_votes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can remove own vote"
    ON feedback_votes FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Public feature requests with vote counts
CREATE OR REPLACE VIEW public_feature_requests AS
SELECT
    f.id,
    f.subject,
    f.message,
    f.lang,
    f.status,
    f.created_at,
    get_feedback_vote_count(f.id) as vote_count,
    (SELECT COUNT(*) FROM feedback_votes WHERE feedback_id = f.id) as total_votes
FROM user_feedback f
WHERE f.category = 'feature'
AND f.status NOT IN ('new', 'duplicate', 'wont_fix')
ORDER BY vote_count DESC, f.created_at DESC;

-- ============================================================================
-- SAMPLE FEEDBACK CATEGORIES (bilingual reference)
-- ============================================================================
/*
Categories reference:

| Type       | Spanish              | English              |
|------------|----------------------|----------------------|
| bug        | Error/Bug            | Bug/Error            |
| feature    | Solicitud de función | Feature request      |
| improvement| Mejora sugerida      | Suggested improvement|
| praise     | Comentario positivo  | Positive feedback    |
| question   | Pregunta             | Question             |
| other      | Otro                 | Other                |

Status reference:

| Status      | Spanish          | English         |
|-------------|------------------|-----------------|
| new         | Nuevo            | New             |
| read        | Leído            | Read            |
| in_progress | En progreso      | In progress     |
| resolved    | Resuelto         | Resolved        |
| wont_fix    | No se hará       | Won't fix       |
| duplicate   | Duplicado        | Duplicate       |
*/
