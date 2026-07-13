-- v7.5.0 master mode: record which rubric produced each score.
--
-- A file is now scored against one of three profiles. 'master' judges ceiling
-- compliance and dynamics; the mix profiles judge whether enough margin was left
-- for the mastering engineer. The same audio scores very differently under each,
-- by design, so a score is only meaningful next to the profile that produced it.
--
-- Existing rows are left NULL rather than backfilled to 'mix'. They were scored
-- by v7.4.2, whose weights and thresholds differ from every v7.5.0 profile, so
-- writing 'mix' onto them would assert a comparability that does not exist.
-- NULL reads as "scored before profiles existed", which is the truth. The
-- frontend already falls back to the mix rubric for display when profile is NULL.
--
-- Do not average or compare scores across profiles, or across analysis_version,
-- in any admin or analytics query.

ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS profile TEXT;

ALTER TABLE public.analyses
  DROP CONSTRAINT IF EXISTS analyses_profile_check;

ALTER TABLE public.analyses
  ADD CONSTRAINT analyses_profile_check
  CHECK (profile IS NULL OR profile IN ('mix', 'mix_strict', 'master'));

COMMENT ON COLUMN public.analyses.profile IS
  'Scoring rubric used: mix | mix_strict | master. NULL = analysed before v7.5.0 (mix rubric, different weights). Never compare scores across profiles or versions.';

-- Master-mode analyses are the mastering-service lead segment (a master scoring
-- 60 to 84 already has a master, is not happy with it, and has budget), so this
-- column gets filtered on.
CREATE INDEX IF NOT EXISTS idx_analyses_profile
  ON public.analyses (profile)
  WHERE profile IS NOT NULL;
