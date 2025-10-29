-- Check the conversation_participants table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'conversation_participants'
ORDER BY ordinal_position;

-- Check if there are any existing rows
SELECT * FROM conversation_participants LIMIT 10;
