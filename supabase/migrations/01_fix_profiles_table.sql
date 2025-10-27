-- Fix profiles table by adding missing column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;
