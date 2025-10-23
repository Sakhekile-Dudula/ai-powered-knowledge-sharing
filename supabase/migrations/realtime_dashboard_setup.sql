-- Drop existing functions and tables if they exist
DROP FUNCTION IF EXISTS public.get_dashboard_stats();
DROP FUNCTION IF EXISTS public.get_historical_stats();
DROP FUNCTION IF EXISTS public.get_suggested_experts(uuid);

-- Create tables for storing real data
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users PRIMARY KEY,
    full_name TEXT,
    role TEXT,
    team TEXT,
    skills TEXT[],
    expertise_areas TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.knowledge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    author_id UUID REFERENCES auth.users NOT NULL,
    team TEXT,
    tags TEXT[],
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.collaborations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_item_id UUID REFERENCES public.knowledge_items,
    user_id UUID REFERENCES auth.users,
    type TEXT CHECK (type IN ('edit', 'comment', 'review', 'share')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users,
    action TEXT NOT NULL,
    topic TEXT,
    entity_type TEXT,
    entity_id UUID,
    type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users,
    connected_with UUID REFERENCES auth.users,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, connected_with)
);

-- Create function to get real-time dashboard stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    active_users INTEGER;
    knowledge_count INTEGER;
    collaboration_count INTEGER;
    total_hours INTEGER;
    prev_month_users INTEGER;
    prev_month_knowledge INTEGER;
    prev_month_collaborations INTEGER;
    prev_month_hours INTEGER;
BEGIN
    -- Get current month stats
    SELECT COUNT(DISTINCT user_id)
    INTO active_users
    FROM activity_log
    WHERE created_at >= date_trunc('month', CURRENT_DATE);

    SELECT COUNT(*)
    INTO knowledge_count
    FROM knowledge_items;

    SELECT COUNT(*)
    INTO collaboration_count
    FROM collaborations
    WHERE created_at >= date_trunc('month', CURRENT_DATE);

    -- Calculate hours saved (example: 2 hours per collaboration)
    total_hours := collaboration_count * 2;

    -- Get previous month stats for comparison
    SELECT COUNT(DISTINCT user_id)
    INTO prev_month_users
    FROM activity_log
    WHERE created_at >= date_trunc('month', CURRENT_DATE - interval '1 month')
    AND created_at < date_trunc('month', CURRENT_DATE);

    SELECT COUNT(*)
    INTO prev_month_knowledge
    FROM knowledge_items
    WHERE created_at < date_trunc('month', CURRENT_DATE);

    SELECT COUNT(*)
    INTO prev_month_collaborations
    FROM collaborations
    WHERE created_at >= date_trunc('month', CURRENT_DATE - interval '1 month')
    AND created_at < date_trunc('month', CURRENT_DATE);

    prev_month_hours := prev_month_collaborations * 2;

    RETURN json_build_object(
        'current', json_build_object(
            'active_connections', active_users,
            'knowledge_items', knowledge_count,
            'team_collaborations', collaboration_count,
            'hours_saved', total_hours
        ),
        'previous', json_build_object(
            'active_connections', prev_month_users,
            'knowledge_items', prev_month_knowledge,
            'team_collaborations', prev_month_collaborations,
            'hours_saved', prev_month_hours
        )
    );
END;
$$;

-- Create function to get trending topics
CREATE OR REPLACE FUNCTION public.get_trending_topics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(topic_data)
    INTO result
    FROM (
        SELECT 
            json_build_object(
                'title', k.title,
                'views', k.views,
                'trending', CASE 
                    WHEN k.views > COALESCE(prev_views.views, 0) THEN 'up'
                    WHEN k.views < COALESCE(prev_views.views, 0) THEN 'down'
                    ELSE 'neutral'
                END
            ) as topic_data
        FROM knowledge_items k
        LEFT JOIN LATERAL (
            SELECT views
            FROM knowledge_items ki2
            WHERE ki2.title = k.title
            AND ki2.created_at < k.created_at
            ORDER BY created_at DESC
            LIMIT 1
        ) prev_views ON true
        ORDER BY k.views DESC
        LIMIT 5
    ) topics;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Create function to get suggested experts based on real connections and expertise
CREATE OR REPLACE FUNCTION public.get_suggested_experts(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_expertise TEXT[];
    result JSON;
BEGIN
    -- Get the user's expertise areas
    SELECT expertise_areas
    INTO user_expertise
    FROM profiles
    WHERE id = user_id;

    -- Find experts based on matching expertise and activity
    SELECT json_agg(expert_data)
    INTO result
    FROM (
        SELECT json_build_object(
            'id', p.id,
            'name', p.full_name,
            'role', p.role,
            'avatar', LEFT(p.full_name, 1),
            'skills', p.skills,
            'reason', CASE
                WHEN EXISTS (
                    SELECT 1 FROM knowledge_items k
                    WHERE k.author_id = p.id
                    AND k.tags && user_expertise
                ) THEN 'Has knowledge in your areas of interest'
                ELSE 'Expert in complementary areas'
            END
        ) as expert_data
        FROM profiles p
        WHERE p.id != user_id
        AND NOT EXISTS (
            SELECT 1 FROM user_connections uc
            WHERE (uc.user_id = user_id AND uc.connected_with = p.id)
            OR (uc.user_id = p.id AND uc.connected_with = user_id)
        )
        AND (p.expertise_areas && user_expertise OR p.skills && user_expertise)
        ORDER BY (
            SELECT COUNT(*)
            FROM knowledge_items k
            WHERE k.author_id = p.id
            AND k.created_at >= CURRENT_DATE - interval '30 days'
        ) DESC
        LIMIT 3
    ) experts;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Create function to get recent activity
CREATE OR REPLACE FUNCTION public.get_recent_activity()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(activity_data)
    INTO result
    FROM (
        SELECT json_build_object(
            'id', a.id,
            'user', p.full_name,
            'action', a.action,
            'topic', a.topic,
            'type', a.type,
            'timestamp', a.created_at
        ) as activity_data
        FROM activity_log a
        JOIN profiles p ON a.user_id = p.id
        ORDER BY a.created_at DESC
        LIMIT 5
    ) activities;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Insert sample data for testing
INSERT INTO public.profiles (id, full_name, role, team, skills, expertise_areas)
SELECT 
    gen_random_uuid(),
    'Demo User ' || i,
    CASE mod(i, 3) 
        WHEN 0 THEN 'Software Engineer'
        WHEN 1 THEN 'Product Manager'
        ELSE 'Technical Lead'
    END,
    CASE mod(i, 2)
        WHEN 0 THEN 'Frontend Team'
        ELSE 'Backend Team'
    END,
    ARRAY['Skill ' || i, 'Skill ' || (i + 1)],
    ARRAY['Expertise ' || i]
FROM generate_series(1, 10) i
ON CONFLICT DO NOTHING;