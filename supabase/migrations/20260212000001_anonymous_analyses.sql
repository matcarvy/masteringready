-- Anonymous analysis tracking
-- Captures lightweight analysis data for users who don't sign up
-- Allows funnel analysis: anonymous → registered → paid

CREATE TABLE IF NOT EXISTS anonymous_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,              -- Browser session ID (groups analyses from same visit)
  filename TEXT,
  score INTEGER,
  verdict TEXT,
  duration_seconds FLOAT,
  sample_rate INTEGER,
  bit_depth INTEGER,
  format TEXT,                           -- WAV, MP3, AIFF, etc.
  lang TEXT DEFAULT 'es',
  client_country TEXT,
  is_chunked BOOLEAN DEFAULT FALSE,
  converted_to_user BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for admin queries
CREATE INDEX idx_anonymous_analyses_created_at ON anonymous_analyses(created_at DESC);
CREATE INDEX idx_anonymous_analyses_session_id ON anonymous_analyses(session_id);
CREATE INDEX idx_anonymous_analyses_converted ON anonymous_analyses(converted_to_user);

-- RLS: anonymous users can INSERT, only admin can SELECT
ALTER TABLE anonymous_analyses ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (anon key)
CREATE POLICY "anon_insert_anonymous_analyses"
  ON anonymous_analyses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow admin to read all
CREATE POLICY "admin_read_anonymous_analyses"
  ON anonymous_analyses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Allow updating converted_to_user when user signs up
CREATE POLICY "update_anonymous_on_signup"
  ON anonymous_analyses
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
