-- Add RLS policies for user_connections table
-- This allows users to create and view connections

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can create their own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can update their own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON user_connections;

-- Allow users to view connections they're part of
CREATE POLICY "Users can view their own connections"
    ON user_connections FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = connected_with);

-- Allow users to create connections where they are the user_id
CREATE POLICY "Users can create their own connections"
    ON user_connections FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update connections where they are involved
CREATE POLICY "Users can update their own connections"
    ON user_connections FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = connected_with)
    WITH CHECK (auth.uid() = user_id OR auth.uid() = connected_with);

-- Allow users to delete connections where they are the user_id
CREATE POLICY "Users can delete their own connections"
    ON user_connections FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Verify policies are created
SELECT schemaname, tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'user_connections';
