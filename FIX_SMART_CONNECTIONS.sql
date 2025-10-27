-- Complete fix for get_smart_suggested_connections function
-- Full version with all matching logic including mutual connections

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
DECLARE
  v_user_department text;
  v_user_expertise text[];
  v_user_team text;
BEGIN
  -- Get user profile data
  SELECT p.department, p.expertise, p.team
  INTO v_user_department, v_user_expertise, v_user_team
  FROM profiles p
  WHERE p.id = p_user_id;

  RETURN QUERY
  WITH user_projects AS (
    SELECT DISTINCT knowledge_item_id
    FROM collaborations
    WHERE user_id = p_user_id
  ),
  already_connected AS (
    SELECT connected_with as connected_id
    FROM user_connections
    WHERE user_connections.user_id = p_user_id
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
        WHEN p.department IS NOT NULL 
         AND p.department = v_user_department
         AND p.expertise IS NOT NULL 
         AND v_user_expertise IS NOT NULL
         AND p.expertise && v_user_expertise THEN 
          'Same department and shared expertise'
        -- Same department
        WHEN p.department IS NOT NULL 
         AND p.department = v_user_department THEN 
          'Same department: ' || p.department
        -- Shared skills
        WHEN p.expertise IS NOT NULL 
         AND v_user_expertise IS NOT NULL
         AND p.expertise && v_user_expertise THEN 
          'Shared expertise'
        -- Same team
        WHEN p.team IS NOT NULL
         AND p.team = v_user_team THEN
          'Same team: ' || p.team
        -- Working on same projects
        WHEN EXISTS (
          SELECT 1 FROM collaborations c
          WHERE c.user_id = p.id 
            AND c.knowledge_item_id IN (SELECT knowledge_item_id FROM user_projects)
        ) THEN 'Working on similar projects'
        -- Mutual connections
        WHEN EXISTS (
          SELECT 1 FROM user_connections uc
          WHERE (uc.user_id = p.id OR uc.connected_with = p.id)
            AND (uc.user_id IN (SELECT connected_id FROM already_connected)
                 OR uc.connected_with IN (SELECT connected_id FROM already_connected))
            AND uc.status = 'connected'
        ) THEN 'Mutual connections'
        ELSE 'Recommended for you'
      END as match_reason,
      CASE
        WHEN p.department IS NOT NULL 
         AND p.department = v_user_department
         AND p.expertise IS NOT NULL 
         AND v_user_expertise IS NOT NULL
         AND p.expertise && v_user_expertise THEN 100
        WHEN p.department IS NOT NULL 
         AND p.department = v_user_department THEN 80
        WHEN p.expertise IS NOT NULL 
         AND v_user_expertise IS NOT NULL
         AND p.expertise && v_user_expertise THEN 70
        WHEN p.team IS NOT NULL
         AND p.team = v_user_team THEN 65
        WHEN EXISTS (
          SELECT 1 FROM collaborations c
          WHERE c.user_id = p.id 
            AND c.knowledge_item_id IN (SELECT knowledge_item_id FROM user_projects)
        ) THEN 60
        WHEN EXISTS (
          SELECT 1 FROM user_connections uc
          WHERE (uc.user_id = p.id OR uc.connected_with = p.id)
            AND (uc.user_id IN (SELECT connected_id FROM already_connected)
                 OR uc.connected_with IN (SELECT connected_id FROM already_connected))
            AND uc.status = 'connected'
        ) THEN 50
        ELSE 30
      END as match_score
    FROM profiles p
    WHERE p.id != p_user_id
      AND p.id NOT IN (SELECT connected_id FROM already_connected)
  )
  SELECT 
    sp.id,
    sp.full_name,
    sp.email,
    sp.avatar_url,
    sp.role,
    sp.team,
    sp.expertise,
    sp.department,
    sp.match_reason,
    sp.match_score
  FROM scored_profiles sp
  ORDER BY sp.match_score DESC, sp.full_name
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;
