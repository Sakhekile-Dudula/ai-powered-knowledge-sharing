-- Fix duplicate conversations - ensure each participant appears only once
-- Group multiple conversations with the same person into one entry

CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Get conversations grouped by participant (one entry per person)
    WITH ranked_conversations AS (
        SELECT DISTINCT ON (other_user.id)
            c.id,
            other_user.id as participant_id,
            other_user.full_name,
            other_user.avatar_url,
            other_user.email,
            last_msg.content as last_message,
            last_msg.created_at as last_message_time,
            (
                SELECT COUNT(*)
                FROM messages m2
                WHERE m2.conversation_id = c.id
                AND m2.sender_id != p_user_id
                AND m2.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamp)
            ) as unread_count
        FROM conversations c
        INNER JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = p_user_id
        INNER JOIN conversation_participants other_cp ON c.id = other_cp.conversation_id AND other_cp.user_id != p_user_id
        INNER JOIN profiles other_user ON other_cp.user_id = other_user.id
        -- Only show conversations with connected users
        INNER JOIN user_connections uc ON (
            (uc.user_id = p_user_id AND uc.connected_with = other_user.id)
            OR (uc.connected_with = p_user_id AND uc.user_id = other_user.id)
        ) AND uc.status IN ('connected', 'accepted')
        LEFT JOIN LATERAL (
            SELECT content, created_at
            FROM messages
            WHERE conversation_id = c.id
            ORDER BY created_at DESC
            LIMIT 1
        ) last_msg ON true
        ORDER BY other_user.id, last_msg.created_at DESC NULLS LAST
    )
    SELECT json_agg(
        json_build_object(
            'id', id,
            'participantName', full_name,
            'participantEmail', email,
            'participantAvatar', avatar_url,
            'participantRole', 'Team Member',
            'lastMessage', last_message,
            'timestamp', last_message_time,
            'unreadCount', unread_count
        )
        ORDER BY last_message_time DESC NULLS LAST
    )
    INTO result
    FROM ranked_conversations;
    
    IF result IS NULL THEN
        result := '[]'::json;
    END IF;
    
    RETURN result;
END;
$$;
