-- Fix activity_log table structure
-- The actual table has: id, user_id, action_type, entity_type, entity_id, metadata, created_at
-- No need to add action, topic, or type columns - they don't exist in the real schema

-- Ensure action_type exists (should already exist as NOT NULL)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_log' AND column_name = 'action_type'
    ) THEN
        ALTER TABLE activity_log ADD COLUMN action_type TEXT NOT NULL DEFAULT 'unknown';
    END IF;
END $$;

-- Ensure entity_type exists (should already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_log' AND column_name = 'entity_type'
    ) THEN
        ALTER TABLE activity_log ADD COLUMN entity_type TEXT;
    END IF;
END $$;

-- Fix entity_id type from uuid to bigint (to match answers.id, questions.id, etc.)
DO $$ 
DECLARE
    current_type TEXT;
BEGIN
    -- Get current type
    SELECT data_type INTO current_type
    FROM information_schema.columns 
    WHERE table_name = 'activity_log' AND column_name = 'entity_id';
    
    IF current_type IS NULL THEN
        -- Column doesn't exist, add it
        ALTER TABLE activity_log ADD COLUMN entity_id bigint;
    ELSIF current_type != 'bigint' THEN
        -- Column exists but wrong type, convert it
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

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'activity_log'
ORDER BY ordinal_position;
