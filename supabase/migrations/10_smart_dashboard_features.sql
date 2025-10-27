-- Smart Dashboard Features Migration

-- 1. Function to get real active connections (people you've actually connected with)
CREATE OR REPLACE FUNCTION get_user_connections(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  avatar_url text,
  role text,
  team text,
  expertise text[],
  department text,
  connection_date timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.role,
    p.team,
    p.expertise,
    p.department,
    uc.created_at as connection_date
  FROM user_connections uc
  JOIN profiles p ON p.id = uc.connected_with
  WHERE uc.user_id = p_user_id
    AND uc.status = 'connected'
  ORDER BY uc.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to get real knowledge items for a user
CREATE OR REPLACE FUNCTION get_user_knowledge_items(p_user_id uuid)
RETURNS TABLE (
  id integer,
  title text,
  description text,
  category text,
  tags text[],
  author_name text,
  author_avatar text,
  created_at timestamptz,
  views integer,
  helpful_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ki.id,
    ki.title,
    ki.description,
    ki.category,
    ki.tags,
    p.full_name as author_name,
    p.avatar_url as author_avatar,
    ki.created_at,
    ki.views,
    ki.helpful_count
  FROM knowledge_items ki
  JOIN profiles p ON ki.author_id = p.id
  WHERE ki.author_id = p_user_id
     OR ki.id IN (
       SELECT knowledge_item_id 
       FROM collaborations 
       WHERE user_id = p_user_id
     )
  ORDER BY ki.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. Smart suggested connections function (based on department, skills, projects, mutual connections)
CREATE OR REPLACE FUNCTION get_smart_suggested_connections(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  avatar_url text,
  role text,
  team text,
  expertise text[],
  department text,
  match_reason text,
  match_score integer
) AS $$
BEGIN
  RETURN QUERY
  WITH user_profile AS (
    SELECT p.department, p.expertise, p.team
    FROM profiles p
    WHERE p.id = p_user_id
  ),
  user_projects AS (
    SELECT DISTINCT knowledge_item_id
    FROM collaborations
    WHERE user_id = p_user_id
  ),
  user_connections AS (
    SELECT connected_with as connected_id
    FROM user_connections
    WHERE user_id = p_user_id
      AND status = 'connected'
  ),
  scored_profiles AS (
    SELECT 
      p.id,
      p.full_name,
      p.email,
      p.avatar_url,
      p.role,
      p.team,
      p.expertise,
      p.department,
      CASE
        -- Same department + shared skills
        WHEN p.department = (SELECT department FROM user_profile) 
         AND p.expertise && (SELECT expertise FROM user_profile) THEN 
          'Same department and shared expertise'
        -- Same department
        WHEN p.department = (SELECT department FROM user_profile) THEN 
          'Same department'
        -- Shared skills
        WHEN p.expertise && (SELECT expertise FROM user_profile) THEN 
          'Shared expertise: ' || array_to_string(
            (SELECT array_agg(skill) FROM unnest(p.expertise) skill 
             WHERE skill = ANY((SELECT expertise FROM user_profile))), ', '
          )
        -- Working on same projects
        WHEN EXISTS (
          SELECT 1 FROM collaborations c
          WHERE c.user_id = p.id 
            AND c.knowledge_item_id IN (SELECT knowledge_item_id FROM user_projects)
        ) THEN 'Working on similar projects'
        -- Mutual connections
        WHEN EXISTS (
          SELECT 1 FROM user_connections uc2
          WHERE (uc2.user_id = p.id OR uc2.connected_with = p.id)
            AND (uc2.user_id IN (SELECT connected_id FROM user_connections)
                 OR uc2.connected_with IN (SELECT connected_id FROM user_connections))
            AND uc2.status = 'connected'
        ) THEN 'Mutual connections'
        ELSE 'Recommended for you'
      END as match_reason,
      CASE
        WHEN p.department = (SELECT department FROM user_profile) 
         AND p.expertise && (SELECT expertise FROM user_profile) THEN 100
        WHEN p.department = (SELECT department FROM user_profile) THEN 80
        WHEN p.expertise && (SELECT expertise FROM user_profile) THEN 70
        WHEN EXISTS (
          SELECT 1 FROM collaborations c
          WHERE c.user_id = p.id 
            AND c.knowledge_item_id IN (SELECT knowledge_item_id FROM user_projects)
        ) THEN 60
        WHEN EXISTS (
          SELECT 1 FROM user_connections uc2
          WHERE (uc2.user_id = p.id OR uc2.connected_with = p.id)
            AND (uc2.user_id IN (SELECT connected_id FROM user_connections)
                 OR uc2.connected_with IN (SELECT connected_id FROM user_connections))
            AND uc2.status = 'connected'
        ) THEN 50
        ELSE 30
      END as match_score
    FROM profiles p
    WHERE p.id != p_user_id
      AND p.id NOT IN (SELECT connected_id FROM user_connections)
  )
  SELECT *
  FROM scored_profiles
  ORDER BY match_score DESC, full_name
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to get trending topics with actual related items
CREATE OR REPLACE FUNCTION get_trending_topics_with_items()
RETURNS TABLE (
  topic_title text,
  views bigint,
  item_count bigint,
  category text,
  trending_score numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ki.category, 'General') as topic_title,
    SUM(ki.views)::bigint as views,
    COUNT(*)::bigint as item_count,
    ki.category,
    (SUM(ki.views) * 0.7 + COUNT(*) * 0.3)::numeric as trending_score
  FROM knowledge_items ki
  WHERE ki.created_at > NOW() - INTERVAL '30 days'
  GROUP BY ki.category
  HAVING COUNT(*) > 0
  ORDER BY trending_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to get items for a specific trending topic
CREATE OR REPLACE FUNCTION get_topic_items(p_topic text)
RETURNS TABLE (
  id integer,
  title text,
  description text,
  category text,
  tags text[],
  author_name text,
  author_avatar text,
  author_department text,
  created_at timestamptz,
  views integer,
  helpful_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ki.id,
    ki.title,
    ki.description,
    ki.category,
    ki.tags,
    p.full_name as author_name,
    p.avatar_url as author_avatar,
    p.department as author_department,
    ki.created_at,
    ki.views,
    ki.helpful_count
  FROM knowledge_items ki
  JOIN profiles p ON ki.author_id = p.id
  WHERE ki.category = p_topic
  ORDER BY ki.views DESC, ki.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to get clickable activity details
CREATE OR REPLACE FUNCTION get_activity_detail(p_activity_id uuid)
RETURNS TABLE (
  id uuid,
  user_name text,
  user_avatar text,
  user_department text,
  action text,
  topic text,
  description text,
  type text,
  created_at timestamptz,
  related_item_id integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    p.full_name as user_name,
    p.avatar_url as user_avatar,
    p.department as user_department,
    al.action,
    al.topic,
    al.description,
    al.type,
    al.created_at,
    al.related_item_id
  FROM activity_log al
  JOIN profiles p ON al.user_id = p.id
  WHERE al.id = p_activity_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Update get_dashboard_stats to use real connection count
-- Drop existing function first to change return type
DROP FUNCTION IF EXISTS get_dashboard_stats();

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  active_connections bigint,
  knowledge_items bigint,
  team_collaborations bigint,
  hours_saved bigint
) AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  -- If no user is authenticated, return zeros
  IF current_user_id IS NULL THEN
    RETURN QUERY
    SELECT 0::bigint, 0::bigint, 0::bigint, 0::bigint;
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    -- Count active connections (simple count for now)
    COALESCE((SELECT COUNT(*) 
     FROM user_connections 
     WHERE user_id = current_user_id 
       AND status = 'connected'), 0)::bigint as active_connections,
    
    -- Count knowledge items
    COALESCE((SELECT COUNT(*) 
     FROM knowledge_items 
     WHERE author_id = current_user_id
        OR id IN (
          SELECT knowledge_item_id 
          FROM collaborations 
          WHERE user_id = current_user_id
        )), 0)::bigint as knowledge_items,
    
    -- Count team collaborations
    COALESCE((SELECT COUNT(*) 
     FROM collaborations 
     WHERE user_id = current_user_id), 0)::bigint as team_collaborations,
    
    -- Sum hours saved (explicitly reference the table)
    COALESCE((SELECT COALESCE(SUM(ki.hours_saved), 0) 
     FROM knowledge_items ki
     WHERE ki.author_id = current_user_id), 0)::bigint as hours_saved;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add missing columns to knowledge_items if not exists
ALTER TABLE knowledge_items 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'General',
ADD COLUMN IF NOT EXISTS hours_saved integer DEFAULT 0;

-- Add related_item_id to activity_log for linking (handle existing column)
-- Note: Using integer type to match knowledge_items.id
DO $$ 
BEGIN
  -- Drop existing column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_log' 
    AND column_name = 'related_item_id'
  ) THEN
    ALTER TABLE activity_log DROP COLUMN related_item_id;
  END IF;
  
  -- Add column with correct type matching knowledge_items.id (integer, not uuid)
  ALTER TABLE activity_log ADD COLUMN related_item_id integer REFERENCES knowledge_items(id);
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_log_related_item ON activity_log(related_item_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_category ON knowledge_items(category);
CREATE INDEX IF NOT EXISTS idx_collaborations_knowledge_item ON collaborations(knowledge_item_id);
