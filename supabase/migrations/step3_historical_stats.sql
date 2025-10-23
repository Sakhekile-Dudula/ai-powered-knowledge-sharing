-- Step 3: Create the historical stats function
CREATE OR REPLACE FUNCTION public.get_historical_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Get the most recent historical stats
    SELECT json_build_object(
        'previous_connections', COALESCE(previous_connections, 0),
        'previous_items', COALESCE(previous_items, 0),
        'previous_collaborations', COALESCE(previous_collaborations, 0),
        'previous_hours', COALESCE(previous_hours, 0)
    )
    INTO result
    FROM historical_stats
    ORDER BY recorded_at DESC
    LIMIT 1;

    -- If no historical stats exist yet, return defaults
    IF result IS NULL THEN
        result := json_build_object(
            'previous_connections', 0,
            'previous_items', 0,
            'previous_collaborations', 0,
            'previous_hours', 0
        );
    END IF;

    RETURN result;
END;
$$;