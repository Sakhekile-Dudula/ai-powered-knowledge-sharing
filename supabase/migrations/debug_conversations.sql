-- Debug query to check conversations and connections
-- Run EACH query separately to see the data

-- STEP 1: Check all your conversations
SELECT 
    c.id as conversation_id,
    c.created_at,
    array_agg(DISTINCT p.email) as participants,
    (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
FROM conversations c
JOIN conversation_participants cp ON c.id = cp.conversation_id
JOIN profiles p ON cp.user_id = p.id
WHERE c.id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
)
GROUP BY c.id, c.created_at
ORDER BY c.created_at DESC;

-- STEP 2: Check all your connections (run this separately)
SELECT 
    uc.id,
    uc.status,
    p.email as connected_with_email,
    p.full_name as connected_with_name,
    uc.created_at
FROM user_connections uc
JOIN profiles p ON uc.connected_with = p.id
WHERE uc.user_id = auth.uid()
ORDER BY uc.created_at DESC;

/*

-- STEP 3: Check connections TO you (run this separately)
SELECT 
    uc.id,
    uc.status,
    p.email as from_user_email,
    p.full_name as from_user_name,
    uc.created_at
FROM user_connections uc
JOIN profiles p ON uc.user_id = p.id
WHERE uc.connected_with = auth.uid()
ORDER BY uc.created_at DESC;

-- STEP 4: Check all messages (run this separately)
SELECT 
    m.id,
    sender.email as sender_email,
    m.content,
    m.created_at,
    m.conversation_id
FROM messages m
JOIN profiles sender ON m.sender_id = sender.id
WHERE m.conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
)
ORDER BY m.created_at DESC
LIMIT 20;
*/
