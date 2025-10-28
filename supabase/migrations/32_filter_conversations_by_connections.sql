-- Migration: Filter messaging to only show connected users
-- This updates get_user_conversations to only return conversations with users you're connected with

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
    -- NEW: Only show conversations with users you're connected with
    INNER JOIN user_connections uc ON (
        (uc.user_id = p_user_id AND uc.connected_with = other_user.id)
        OR (uc.connected_with = p_user_id AND uc.user_id = other_user.id)
    ) AND uc.status = 'connected'
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
