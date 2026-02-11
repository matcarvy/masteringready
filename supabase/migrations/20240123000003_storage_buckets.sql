-- MasteringReady - Storage Buckets Configuration
-- Version: 1.0.0
--
-- NOTE: This creates storage buckets for optional features.
-- Audio files are processed in-memory (privacy-first), but we may
-- store PDF reports and user avatars.

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create bucket for PDF reports (optional, for users who want to save them)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'reports',
    'reports',
    FALSE,  -- Private bucket
    10485760,  -- 10MB limit
    ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create bucket for user avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    TRUE,  -- Public bucket for avatars
    2097152,  -- 2MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Reports: Users can only access their own reports
CREATE POLICY "Users can view own reports"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'reports' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can upload own reports"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'reports' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own reports"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'reports' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Avatars: Public read, authenticated upload own
CREATE POLICY "Avatars are publicly viewable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );
