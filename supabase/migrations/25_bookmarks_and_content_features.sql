-- Migration: Add bookmarks and enhanced content features
-- Created: 2025-10-27

-- 1. Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  knowledge_item_id INTEGER NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(user_id, knowledge_item_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_knowledge_item_id ON bookmarks(knowledge_item_id);

-- Enable RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bookmarks
CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks"
  ON bookmarks FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. Add share tracking to knowledge_items
ALTER TABLE knowledge_items
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS public_share_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_share_token UUID DEFAULT uuid_generate_v4();

-- Create index for public shares
CREATE INDEX IF NOT EXISTS idx_knowledge_items_share_token ON knowledge_items(public_share_token);

-- 3. Create export logs table
CREATE TABLE IF NOT EXISTS export_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  knowledge_item_id INTEGER NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'word', 'print')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for export logs
CREATE INDEX IF NOT EXISTS idx_export_logs_user_id ON export_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_knowledge_item_id ON export_logs(knowledge_item_id);

-- Enable RLS
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for export logs
CREATE POLICY "Users can view their own export logs"
  ON export_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own export logs"
  ON export_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Function to get user bookmarks with details
CREATE OR REPLACE FUNCTION get_user_bookmarks(p_user_id UUID)
RETURNS TABLE (
  bookmark_id UUID,
  knowledge_item_id INTEGER,
  title TEXT,
  description TEXT,
  category TEXT,
  tags TEXT[],
  author_name TEXT,
  author_department TEXT,
  author_avatar TEXT,
  bookmarked_at TIMESTAMPTZ,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as bookmark_id,
    ki.id as knowledge_item_id,
    ki.title,
    ki.description,
    ki.category,
    ki.tags,
    p.full_name as author_name,
    p.department as author_department,
    p.avatar_url as author_avatar,
    b.created_at as bookmarked_at,
    b.notes
  FROM bookmarks b
  JOIN knowledge_items ki ON b.knowledge_item_id = ki.id
  JOIN profiles p ON ki.author_id = p.id
  WHERE b.user_id = p_user_id
  ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to toggle bookmark
CREATE OR REPLACE FUNCTION toggle_bookmark(
  p_user_id UUID,
  p_knowledge_item_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if bookmark exists
  SELECT EXISTS(
    SELECT 1 FROM bookmarks
    WHERE user_id = p_user_id AND knowledge_item_id = p_knowledge_item_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove bookmark
    DELETE FROM bookmarks
    WHERE user_id = p_user_id AND knowledge_item_id = p_knowledge_item_id;
    RETURN false;
  ELSE
    -- Add bookmark
    INSERT INTO bookmarks (user_id, knowledge_item_id)
    VALUES (p_user_id, p_knowledge_item_id);
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to log export
CREATE OR REPLACE FUNCTION log_export(
  p_user_id UUID,
  p_knowledge_item_id INTEGER,
  p_export_type TEXT
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO export_logs (user_id, knowledge_item_id, export_type)
  VALUES (p_user_id, p_knowledge_item_id, p_export_type)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to generate public share link
CREATE OR REPLACE FUNCTION enable_public_share(
  p_knowledge_item_id INTEGER,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_token UUID;
BEGIN
  -- Verify user owns the knowledge item
  IF NOT EXISTS(
    SELECT 1 FROM knowledge_items
    WHERE id = p_knowledge_item_id AND author_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Generate or return existing token
  UPDATE knowledge_items
  SET 
    public_share_enabled = true,
    share_count = share_count + 1
  WHERE id = p_knowledge_item_id
  RETURNING public_share_token INTO v_token;
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to get public shared item
CREATE OR REPLACE FUNCTION get_public_shared_item(p_share_token UUID)
RETURNS TABLE (
  id INTEGER,
  title TEXT,
  description TEXT,
  category TEXT,
  tags TEXT[],
  author_name TEXT,
  author_department TEXT,
  created_at TIMESTAMPTZ,
  views INTEGER
) AS $$
BEGIN
  -- Increment view count
  UPDATE knowledge_items
  SET views = views + 1
  WHERE public_share_token = p_share_token
    AND public_share_enabled = true;

  RETURN QUERY
  SELECT 
    ki.id,
    ki.title,
    ki.description,
    ki.category,
    ki.tags,
    p.full_name as author_name,
    p.department as author_department,
    ki.created_at,
    ki.views
  FROM knowledge_items ki
  JOIN profiles p ON ki.author_id = p.id
  WHERE ki.public_share_token = p_share_token
    AND ki.public_share_enabled = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_bookmarks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_bookmark(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION log_export(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION enable_public_share(INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_shared_item(UUID) TO anon, authenticated;
