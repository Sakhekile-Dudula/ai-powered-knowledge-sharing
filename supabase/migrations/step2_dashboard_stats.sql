-- Step 2: Create the dashboard stats function
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Get the most recent stats
    SELECT json_build_object(
        'active_connections', COALESCE(active_connections, 0),
        'knowledge_items', COALESCE(knowledge_items, 0),
        'team_collaborations', COALESCE(team_collaborations, 0),
        'hours_saved', COALESCE(hours_saved, 0)
    )
    INTO result
    FROM dashboard_stats
    ORDER BY updated_at DESC
    LIMIT 1;

    -- If no stats exist yet, return defaults
    IF result IS NULL THEN
        result := json_build_object(
            'active_connections', 0,
            'knowledge_items', 0,
            'team_collaborations', 0,
            'hours_saved', 0
        );
    END IF;

    RETURN result;
END;
$$;