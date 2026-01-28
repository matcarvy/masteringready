-- Fix: Remove UNIQUE constraint on full_name if it exists
-- The full_name field should NOT be unique (many people share names)
-- Only email should be unique (enforced by auth.users)

-- Drop the constraint if it exists (safe to run even if it doesn't exist)
DO $$
BEGIN
    -- Check for any unique constraint on full_name in profiles
    IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'profiles'::regclass
        AND c.contype = 'u'
        AND a.attname = 'full_name'
    ) THEN
        -- Find and drop the constraint dynamically
        EXECUTE (
            SELECT 'ALTER TABLE profiles DROP CONSTRAINT ' || c.conname
            FROM pg_constraint c
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
            WHERE c.conrelid = 'profiles'::regclass
            AND c.contype = 'u'
            AND a.attname = 'full_name'
            LIMIT 1
        );
        RAISE NOTICE 'Dropped UNIQUE constraint on profiles.full_name';
    ELSE
        RAISE NOTICE 'No UNIQUE constraint found on profiles.full_name (already correct)';
    END IF;
END $$;

-- Also drop any unique index on full_name if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'profiles'
        AND indexdef LIKE '%UNIQUE%'
        AND indexdef LIKE '%full_name%'
    ) THEN
        EXECUTE (
            SELECT 'DROP INDEX IF EXISTS ' || indexname
            FROM pg_indexes
            WHERE tablename = 'profiles'
            AND indexdef LIKE '%UNIQUE%'
            AND indexdef LIKE '%full_name%'
            LIMIT 1
        );
        RAISE NOTICE 'Dropped UNIQUE index on profiles.full_name';
    ELSE
        RAISE NOTICE 'No UNIQUE index found on profiles.full_name (already correct)';
    END IF;
END $$;
