-- Prospecting Leads table for automated lead discovery
-- Stores leads found by GitHub Actions scraper scanning Reddit, YouTube, etc.

CREATE TABLE IF NOT EXISTS prospecting_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Source info
  source TEXT NOT NULL,                    -- 'reddit', 'youtube', 'twitter'
  source_url TEXT NOT NULL,                -- Direct link to post/comment
  source_id TEXT NOT NULL,                 -- Platform-specific ID (reddit post id, YT comment id)
  subreddit TEXT,                          -- e.g. 'mixingmastering' (reddit only)

  -- Author
  author_username TEXT NOT NULL,

  -- Content
  title TEXT,                              -- Post title (reddit) or video title (youtube)
  content_snippet TEXT NOT NULL,           -- First ~500 chars of relevant text

  -- Classification
  pain_point_category TEXT NOT NULL,       -- 'loudness', 'lufs_targets', 'streaming_targets',
                                           -- 'mastering_quality', 'mix_readiness', 'general_mastering'
  matched_keywords TEXT[],                 -- Which keywords triggered the match
  relevance_score FLOAT NOT NULL,          -- 0.0 to 1.0

  -- Workflow
  status TEXT NOT NULL DEFAULT 'new',      -- 'new', 'contacted', 'dismissed', 'converted'
  admin_notes TEXT,
  contacted_at TIMESTAMPTZ,
  contacted_via TEXT,                      -- 'reddit_dm', 'reddit_comment', 'youtube_reply'

  -- Meta
  original_created_at TIMESTAMPTZ,         -- When the source post was created
  discovered_at TIMESTAMPTZ DEFAULT NOW(), -- When our scraper found it
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint to prevent duplicate ingestion of same source post
CREATE UNIQUE INDEX idx_prospecting_leads_source_unique
  ON prospecting_leads(source, source_id);

-- Indexes for common queries
CREATE INDEX idx_prospecting_leads_status ON prospecting_leads(status);
CREATE INDEX idx_prospecting_leads_score ON prospecting_leads(relevance_score DESC);
CREATE INDEX idx_prospecting_leads_discovered ON prospecting_leads(discovered_at DESC);
CREATE INDEX idx_prospecting_leads_category ON prospecting_leads(pain_point_category);

-- RLS: admin-only access
ALTER TABLE prospecting_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_prospecting_leads"
  ON prospecting_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Service role (used by API route with SUPABASE_SERVICE_ROLE_KEY) bypasses RLS implicitly
