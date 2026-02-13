-- UTM attribution tracking on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_term TEXT;

-- Device tracking on anonymous analyses
ALTER TABLE anonymous_analyses ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE anonymous_analyses ADD COLUMN IF NOT EXISTS device_type TEXT;
