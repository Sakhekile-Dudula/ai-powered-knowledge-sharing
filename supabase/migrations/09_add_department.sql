-- Add department column to profiles table

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS department text;

-- Add an index for faster filtering by department
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);

-- Update existing profiles with a default department (optional)
-- UPDATE profiles SET department = 'Engineering' WHERE department IS NULL;
