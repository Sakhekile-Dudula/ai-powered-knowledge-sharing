-- Auto-create or update connection when users message each other
-- This ensures that messaging and connections stay in sync

-- First, add missing columns and constraints to user_connections table if needed
ALTER TABLE user_connections 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add unique constraint if it doesn't exist (prevents duplicate connections)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_connections_user_id_connected_with_key'
  ) THEN
    ALTER TABLE user_connections 
    ADD CONSTRAINT user_connections_user_id_connected_with_key 
    UNIQUE (user_id, connected_with);
  END IF;
END $$;

-- Update send_message function to auto-create connections
CREATE OR REPLACE FUNCTION send_message(
    p_sender_id uuid,
    p_recipient_id uuid,
    p_content text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conversation_id uuid;
    v_message_id uuid;
    result json;
BEGIN
    -- Auto-create or update connection status to 'connected'
    -- Check if connection exists in either direction
    INSERT INTO user_connections (user_id, connected_with, status, updated_at)
    VALUES (p_sender_id, p_recipient_id, 'connected', NOW())
    ON CONFLICT (user_id, connected_with) 
    DO UPDATE SET status = 'connected', updated_at = NOW();
    
    -- Also ensure the reverse connection exists (bidirectional)
    INSERT INTO user_connections (user_id, connected_with, status, updated_at)
    VALUES (p_recipient_id, p_sender_id, 'connected', NOW())
    ON CONFLICT (user_id, connected_with) 
    DO UPDATE SET status = 'connected', updated_at = NOW();
    
    -- Find existing conversation between these two users
    SELECT c.id INTO v_conversation_id
    FROM conversations c
    WHERE EXISTS (
        SELECT 1 FROM conversation_participants cp1
        WHERE cp1.conversation_id = c.id AND cp1.user_id = p_sender_id
    )
    AND EXISTS (
        SELECT 1 FROM conversation_participants cp2
        WHERE cp2.conversation_id = c.id AND cp2.user_id = p_recipient_id
    )
    AND (
        SELECT COUNT(*) FROM conversation_participants cp3
        WHERE cp3.conversation_id = c.id
    ) = 2
    LIMIT 1;
    
    -- If no conversation exists, create one
    IF v_conversation_id IS NULL THEN
        INSERT INTO conversations DEFAULT VALUES
        RETURNING id INTO v_conversation_id;
        
        -- Add both participants
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES 
            (v_conversation_id, p_sender_id),
            (v_conversation_id, p_recipient_id);
    END IF;
    
    -- Insert the message
    INSERT INTO messages (conversation_id, sender_id, content)
    VALUES (v_conversation_id, p_sender_id, p_content)
    RETURNING id INTO v_message_id;
    
    -- Update conversation timestamp
    UPDATE conversations
    SET updated_at = NOW()
    WHERE id = v_conversation_id;
    
    -- Build result
    SELECT json_build_object(
        'id', v_message_id,
        'conversationId', v_conversation_id,
        'content', p_content,
        'timestamp', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$;
