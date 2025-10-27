# Database Migration Instructions

## Problem
The application shows error: **"column p.expertise does not exist"**

This occurs because the `get_smart_suggested_connections` function expects columns (`team`, `expertise`, `skills`) that don't exist in the `profiles` table.

## Solution

### Option 1: Supabase Dashboard (Recommended)

1. **Log into your Supabase Project Dashboard**
2. Navigate to **SQL Editor** (left sidebar)
3. **Copy and run this SQL:**

```sql
-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS team text,
ADD COLUMN IF NOT EXISTS expertise text[],
ADD COLUMN IF NOT EXISTS skills text[];

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_team ON profiles(team);
CREATE INDEX IF NOT EXISTS idx_profiles_expertise ON profiles USING GIN(expertise);
CREATE INDEX IF NOT EXISTS idx_profiles_skills ON profiles USING GIN(skills);
```

4. **Verify the changes:**

```sql
-- Check that columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';
```

5. **Refresh your application** at http://localhost:3000/

### Option 2: Using Supabase CLI (if Docker is running)

```bash
# Start Supabase locally
npm run supabase:start

# Apply migrations
npx supabase db push
```

## Expected Result

After applying the migration:
- ✅ Dashboard loads without errors
- ✅ `get_smart_suggested_connections` function works
- ✅ No "column does not exist" errors in Network tab

## Files Created

- `supabase/migrations/11_add_missing_profile_columns.sql` - Complete migration file

## Notes

- The migration uses `IF NOT EXISTS` to prevent errors if columns already exist
- GIN indexes are used for array columns (expertise, skills) for efficient querying
- The migration is backwards-compatible and won't affect existing data
