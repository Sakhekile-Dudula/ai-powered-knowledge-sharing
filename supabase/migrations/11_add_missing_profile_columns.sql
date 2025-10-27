-- Add missing columns to profiles table for smart dashboard features

-- Add team column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS team text;

-- Add expertise column (array of text for multiple skills)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS expertise text[];

-- Add skills column if needed (can be used interchangeably with expertise)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS skills text[];

-- Add avatar_url if not exists (some migrations may have already added it)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_team ON profiles(team);
CREATE INDEX IF NOT EXISTS idx_profiles_expertise ON profiles USING GIN(expertise);
CREATE INDEX IF NOT EXISTS idx_profiles_skills ON profiles USING GIN(skills);

-- Update the handle_new_user function to handle the new fields
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY definer set search_path = public
AS $$
begin
  insert into public.profiles (id, full_name, email, role, team, department, expertise, skills)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'User'),
    new.raw_user_meta_data->>'team',
    new.raw_user_meta_data->>'department',
    CASE 
      WHEN new.raw_user_meta_data->>'expertise' IS NOT NULL 
      THEN string_to_array(new.raw_user_meta_data->>'expertise', ',')
      ELSE NULL
    END,
    CASE 
      WHEN new.raw_user_meta_data->>'skills' IS NOT NULL 
      THEN string_to_array(new.raw_user_meta_data->>'skills', ',')
      ELSE NULL
    END
  );
  return new;
end;
$$;
