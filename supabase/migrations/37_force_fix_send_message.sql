-- Drop and recreate send_message function with correct parameters
-- This ensures we completely replace any old versions

-- First, drop all versions of the function
DROP FUNCTION IF EXISTS send_message(uuid, uuid, text);
DROP FUNCTION IF EXISTS send_message(text, text, text);
DROP FUNCTION IF EXISTS send_message(sender_id uuid, recipient_id uuid, content text);

-- Now create the correct version
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
    -- Validate inputs
    IF p_sender_id IS NULL THEN
        RAISE EXCEPTION 'sender_id cannot be null';
    END IF;
    
    IF p_recipient_id IS NULL THEN
        RAISE EXCEPTION 'recipient_id cannot be null';
    END IF;
    
    IF p_content IS NULL OR trim(p_content) = '' THEN
        RAISE EXCEPTION 'content cannot be empty';
    END IF;
    
    -- Auto-create or update connection status to 'connected'
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
        INSERT INTO conversations (id, created_at, updated_at)
        VALUES (gen_random_uuid(), NOW(), NOW())
        RETURNING id INTO v_conversation_id;
        
        -- Add both participants with explicit values
        INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
        VALUES 
            (v_conversation_id, p_sender_id, NOW(), NOW()),
            (v_conversation_id, p_recipient_id, NOW(), NOW());
    END IF;
    
    -- Insert the message
    INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
    VALUES (gen_random_uuid(), v_conversation_id, p_sender_id, p_content, NOW())
    RETURNING id INTO v_message_id;
    
    -- Update conversation timestamp
    UPDATE conversations
    SET updated_at = NOW()
    WHERE id = v_conversation_id;
    
    -- Build result
    SELECT json_build_object(
        'message_id', v_message_id,
        'conversation_id', v_conversation_id,
        'content', p_content,
        'timestamp', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION send_message(uuid, uuid, text) TO authenticated;
