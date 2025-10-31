-- Fix activity_log table structure
-- Add missing columns if they don't exist

-- Add action column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_log' AND column_name = 'action'
    ) THEN
        ALTER TABLE activity_log ADD COLUMN action text;
    END IF;
END $$;

-- Add topic column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_log' AND column_name = 'topic'
    ) THEN
        ALTER TABLE activity_log ADD COLUMN topic text;
    END IF;
END $$;

-- Add entity_type column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_log' AND column_name = 'entity_type'
    ) THEN
        ALTER TABLE activity_log ADD COLUMN entity_type text;
    END IF;
END $$;

-- Add entity_id column if missing (or fix type if wrong)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_log' AND column_name = 'entity_id'
    ) THEN
        ALTER TABLE activity_log ADD COLUMN entity_id bigint;
    ELSE
        -- Fix type to bigint (handles integer, uuid, or other types)
        BEGIN
            ALTER TABLE activity_log ALTER COLUMN entity_id TYPE bigint USING 
                CASE 
                    WHEN entity_id::text ~ '^[0-9]+$' THEN entity_id::text::bigint
                    ELSE NULL
                END;
        EXCEPTION
            WHEN OTHERS THEN
                -- If conversion fails, drop and recreate
                ALTER TABLE activity_log DROP COLUMN entity_id;
                ALTER TABLE activity_log ADD COLUMN entity_id bigint;
        END;
    END IF;
END $$;

-- Add type column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_log' AND column_name = 'type'
    ) THEN
        ALTER TABLE activity_log ADD COLUMN type text DEFAULT 'activity';
    END IF;
END $$;

-- Ensure user_id column exists and is correct type
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_log' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE activity_log ADD COLUMN user_id uuid REFERENCES profiles(id);
    END IF;
END $$;

-- Ensure created_at column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_log' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE activity_log ADD COLUMN created_at timestamp DEFAULT NOW();
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(type);

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'activity_log'
ORDER BY ordinal_position;
