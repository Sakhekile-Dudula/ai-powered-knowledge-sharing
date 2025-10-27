-- Remove foreign key constraint from profiles table
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Make sure profiles.id is the primary key
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_pkey;

ALTER TABLE profiles 
ADD PRIMARY KEY (id);
