-- Create dashboard functions to calculate real-time statistics

-- Function to get current dashboard stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    active_connections_count integer;
    knowledge_items_count integer;
    team_collaborations_count integer;
    hours_saved_count integer;
BEGIN
    -- Count active connections (accepted user connections)
    SELECT COUNT(*) INTO active_connections_count
    FROM user_connections
    WHERE status = 'accepted';
    
    -- Count total knowledge items
    SELECT COUNT(*) INTO knowledge_items_count
    FROM knowledge_items;
    
    -- Count team collaborations
    SELECT COUNT(*) INTO team_collaborations_count
    FROM collaborations;
    
    -- Calculate hours saved (estimate: 2 hours per collaboration)
    hours_saved_count := team_collaborations_count * 2;
    
    -- Build result JSON
    result := json_build_object(
        'active_connections', COALESCE(active_connections_count, 0),
        'knowledge_items', COALESCE(knowledge_items_count, 0),
        'team_collaborations', COALESCE(team_collaborations_count, 0),
        'hours_saved', COALESCE(hours_saved_count, 0)
    );

    RETURN result;
END;
$$;

-- Function to get trending topics
CREATE OR REPLACE FUNCTION public.get_trending_topics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', id,
            'title', title,
            'views', views,
            'created_at', created_at
        )
    )
    INTO result
    FROM (
        SELECT id, title, views, created_at
        FROM knowledge_items
        ORDER BY views DESC
        LIMIT 5
    ) trending;
    
    IF result IS NULL THEN
        result := '[]'::json;
    END IF;

    RETURN result;
END;
$$;

-- Function to get recent activity
CREATE OR REPLACE FUNCTION public.get_recent_activity()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', a.id,
            'user_name', p.full_name,
            'user_avatar', p.avatar_url,
            'action', a.action,
            'topic', a.topic,
            'type', a.type,
            'created_at', a.created_at
        )
        ORDER BY a.created_at DESC
    )
    INTO result
    FROM activity_log a
    JOIN profiles p ON a.user_id = p.id
    LIMIT 10;
    
    IF result IS NULL THEN
        result := '[]'::json;
    END IF;

    RETURN result;
END;
$$;
