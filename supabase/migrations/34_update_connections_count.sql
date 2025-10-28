-- Update dashboard stats to count active connections as number of people messaged
-- This counts unique conversation participants instead of user_connections table

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
    -- Count active connections as number of people you've messaged (conversation participants)
    COALESCE((
      SELECT COUNT(DISTINCT other_cp.user_id)
      FROM conversation_participants cp
      INNER JOIN conversation_participants other_cp 
        ON cp.conversation_id = other_cp.conversation_id 
        AND other_cp.user_id != current_user_id
      WHERE cp.user_id = current_user_id
    ), 0)::bigint as active_connections,
    
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
