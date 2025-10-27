-- Fix for ambiguous column reference error in get_smart_suggested_connections
-- Run this in Supabase SQL Editor to replace the function

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
    SELECT 
      p.department as user_department, 
      p.expertise as user_expertise, 
      p.team as user_team
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
        WHEN p.department = (SELECT user_department FROM user_profile) 
         AND p.expertise && (SELECT user_expertise FROM user_profile) THEN 
          'Same department and shared expertise'
        -- Same department
        WHEN p.department = (SELECT user_department FROM user_profile) THEN 
          'Same department'
        -- Shared skills
        WHEN p.expertise && (SELECT user_expertise FROM user_profile) THEN 
          'Shared expertise: ' || array_to_string(
            (SELECT array_agg(skill) FROM unnest(p.expertise) skill 
             WHERE skill = ANY((SELECT user_expertise FROM user_profile))), ', '
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
        WHEN p.department = (SELECT user_department FROM user_profile) 
         AND p.expertise && (SELECT user_expertise FROM user_profile) THEN 100
        WHEN p.department = (SELECT user_department FROM user_profile) THEN 80
        WHEN p.expertise && (SELECT user_expertise FROM user_profile) THEN 70
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
    CROSS JOIN user_profile up
    WHERE p.id != p_user_id
      AND p.id NOT IN (SELECT connected_id FROM user_connections)
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
