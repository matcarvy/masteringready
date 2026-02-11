-- ============================================================================
-- Anti-abuse: Track deleted accounts to prevent free analysis reset exploit
-- When a user deletes their account and re-registers with the same email,
-- their lifetime usage carries over so they can't abuse delete/recreate.
-- ============================================================================

CREATE TABLE IF NOT EXISTS deleted_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  analyses_lifetime_used integer DEFAULT 0,
  total_analyses integer DEFAULT 0,
  deleted_at timestamptz DEFAULT now()
);

-- Index for fast lookups during registration
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email ON deleted_accounts(email);

-- RLS: Only service role can read/write (frontend uses supabase client with user token)
ALTER TABLE deleted_accounts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to INSERT (for recording their own deletion)
CREATE POLICY "Users can record own deletion"
  ON deleted_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to SELECT (for checking on registration)
CREATE POLICY "Users can check deleted accounts"
  ON deleted_accounts
  FOR SELECT
  TO authenticated
  USING (true);
