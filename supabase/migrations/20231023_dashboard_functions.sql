-- Create stats tables first
CREATE TABLE IF NOT EXISTS dashboard_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_connections INTEGER DEFAULT 0,
    knowledge_items INTEGER DEFAULT 0,
    team_collaborations INTEGER DEFAULT 0,
    hours_saved INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historical_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_connections INTEGER DEFAULT 0,
    previous_items INTEGER DEFAULT 0,
    previous_collaborations INTEGER DEFAULT 0,
    previous_hours INTEGER DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to get current dashboard stats
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

-- Function to get historical stats
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

-- Function to get suggested experts
CREATE OR REPLACE FUNCTION public.get_suggested_experts(user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Get experts based on user's interests and activity
    SELECT json_agg(expert_data)
    INTO result
    FROM (
        SELECT json_build_object(
            'id', auth.users.id,
            'name', profiles.full_name,
            'role', profiles.role,
            'avatar', LEFT(profiles.full_name, 1), -- First letter of name as avatar
            'skills', skills,
            'reason', 'Similar interests and expertise'
        ) as expert_data
        FROM auth.users
        JOIN profiles ON auth.users.id = profiles.id
        WHERE auth.users.id != user_id
        LIMIT 3
    ) experts;

    -- If no experts found, return empty array
    IF result IS NULL THEN
        result := '[]'::json;
    END IF;

    RETURN result;
END;
$$;

-- Insert some initial demo data
INSERT INTO dashboard_stats (active_connections, knowledge_items, team_collaborations, hours_saved)
VALUES (15, 45, 23, 120)
ON CONFLICT DO NOTHING;

INSERT INTO historical_stats (previous_connections, previous_items, previous_collaborations, previous_hours)
VALUES (10, 35, 18, 100)
ON CONFLICT DO NOTHING;