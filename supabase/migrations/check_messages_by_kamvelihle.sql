-- Check all people messaged by kamvelihledudula@gmail.com

-- Get all conversations and messages for this user
SELECT DISTINCT
    other_user.email as messaged_person,
    other_user.full_name,
    COUNT(m.id) as total_messages,
    MAX(m.created_at) as last_message_time,
    MAX(m.content) as last_message_content
FROM profiles sender
JOIN conversation_participants cp1 ON cp1.user_id = sender.id
JOIN conversations c ON c.id = cp1.conversation_id
JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id != sender.id
JOIN profiles other_user ON other_user.id = cp2.user_id
LEFT JOIN messages m ON m.conversation_id = c.id
WHERE sender.email = 'kamvelihledudula@gmail.com'
GROUP BY other_user.id, other_user.email, other_user.full_name
ORDER BY last_message_time DESC;

-- Also check the connections for this user
SELECT 
    p.email as connected_with,
    p.full_name,
    uc.status,
    uc.created_at
FROM user_connections uc
JOIN profiles sender ON sender.id = uc.user_id
JOIN profiles p ON p.id = uc.connected_with
WHERE sender.email = 'kamvelihledudula@gmail.com'
ORDER BY uc.created_at DESC;
