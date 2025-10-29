-- Test the fixed send_message function
-- First, find another user to message (not yourself)
SELECT id, email, full_name 
FROM profiles 
WHERE id != auth.uid() 
LIMIT 5;

-- Copy one of the IDs from above and use it in the test below
-- Replace 'PASTE_USER_ID_HERE' with an actual user ID from the query above

/*
-- After you have a user ID, uncomment and run this:
SELECT send_message(
    auth.uid(),  -- sender (you)
    'PASTE_USER_ID_HERE'::uuid,  -- recipient (replace with actual ID)
    'Test message - checking if messaging works!'
);

-- Then verify the conversation was created
SELECT * FROM conversations ORDER BY created_at DESC LIMIT 1;

-- Check the messages
SELECT * FROM messages ORDER BY created_at DESC LIMIT 1;

-- Check conversation participants
SELECT * FROM conversation_participants ORDER BY created_at DESC LIMIT 2;

-- Check connections were created
SELECT * FROM user_connections WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 2;
*/
