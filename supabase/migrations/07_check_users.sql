-- Check if users exist and create them if needed
-- First, let's see what users we have
SELECT id, email, full_name FROM profiles;

-- If the users don't exist, we need to create profiles for them
-- Note: In production, profiles should be created automatically when users sign up
-- For now, you'll need to manually insert profiles for users who have authenticated but don't have profiles yet

-- Example: Insert profile if it doesn't exist
-- Replace the UUIDs with actual user IDs from auth.users table
-- You can get these from: SELECT id, email FROM auth.users;

-- Once you have the user IDs, create profiles like this:
-- INSERT INTO profiles (id, email, full_name) 
-- VALUES 
--   ('your-user-id-1', 'sakhekile.dudula@mrisoftware.com', 'Sakhekile Dudula'),
--   ('your-user-id-2', 'kamvelihledudula@gmail.com', 'Kamvelihle Dudula')
-- ON CONFLICT (id) DO NOTHING;
