-- Create messages and conversations tables

-- Drop existing tables if they exist
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Create conversations table
CREATE TABLE conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Create conversation_participants table (many-to-many relationship)
CREATE TABLE conversation_participants (
    id serial PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at timestamp DEFAULT now(),
    last_read_at timestamp DEFAULT now(),
    UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp DEFAULT now(),
    read_at timestamp,
    deleted_at timestamp
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);

-- Function to get conversations for a user
CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', c.id,
            'participantName', other_user.full_name,
            'participantAvatar', other_user.avatar_url,
            'participantRole', 'Team Member',
            'lastMessage', last_msg.content,
            'timestamp', last_msg.created_at,
            'unreadCount', (
                SELECT COUNT(*)
                FROM messages m2
                WHERE m2.conversation_id = c.id
                AND m2.sender_id != p_user_id
                AND m2.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamp)
            )
        )
        ORDER BY last_msg.created_at DESC
    )
    INTO result
    FROM conversations c
    INNER JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = p_user_id
    INNER JOIN conversation_participants other_cp ON c.id = other_cp.conversation_id AND other_cp.user_id != p_user_id
    INNER JOIN profiles other_user ON other_cp.user_id = other_user.id
    LEFT JOIN LATERAL (
        SELECT content, created_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
    ) last_msg ON true;
    
    IF result IS NULL THEN
        result := '[]'::json;
    END IF;
    
    RETURN result;
END;
$$;

-- Function to get messages in a conversation
CREATE OR REPLACE FUNCTION get_conversation_messages(p_conversation_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Check if user is participant in the conversation
    IF NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = p_conversation_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;
    
    -- Get messages
    SELECT json_agg(
        json_build_object(
            'id', m.id,
            'sender', p.full_name,
            'senderAvatar', p.avatar_url,
            'content', m.content,
            'timestamp', m.created_at,
            'isCurrentUser', m.sender_id = p_user_id
        )
        ORDER BY m.created_at ASC
    )
    INTO result
    FROM messages m
    INNER JOIN profiles p ON m.sender_id = p.id
    WHERE m.conversation_id = p_conversation_id
    AND m.deleted_at IS NULL;
    
    -- Update last_read_at
    UPDATE conversation_participants
    SET last_read_at = NOW()
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
    
    IF result IS NULL THEN
        result := '[]'::json;
    END IF;
    
    RETURN result;
END;
$$;

-- Function to send a message
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

-- Function to find a user by email or name
CREATE OR REPLACE FUNCTION find_user_by_identifier(p_identifier text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'id', id,
        'full_name', full_name,
        'email', email,
        'avatar_url', avatar_url
    )
    INTO result
    FROM profiles
    WHERE email ILIKE p_identifier OR full_name ILIKE '%' || p_identifier || '%'
    LIMIT 1;
    
    RETURN result;
END;
$$;
