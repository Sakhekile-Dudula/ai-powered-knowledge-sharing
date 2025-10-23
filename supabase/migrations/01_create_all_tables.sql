-- Create tables if they don't exist
DO $$ 
BEGIN
    -- Create activity_log table
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_log') THEN
        CREATE TABLE public.activity_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id),
            action TEXT NOT NULL,
            topic TEXT,
            entity_type TEXT,
            entity_id UUID,
            type TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- Create knowledge_items table
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'knowledge_items') THEN
        CREATE TABLE public.knowledge_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            content TEXT,
            author_id UUID REFERENCES auth.users(id),
            views INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- Create collaborations table
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'collaborations') THEN
        CREATE TABLE public.collaborations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id),
            knowledge_item_id UUID REFERENCES knowledge_items(id),
            type TEXT NOT NULL, -- 'edit', 'comment', 'review', 'share'
            content TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- Create user_connections table
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_connections') THEN
        CREATE TABLE public.user_connections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id),
            connected_with UUID REFERENCES auth.users(id),
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- Create dashboard_stats table
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dashboard_stats') THEN
        CREATE TABLE public.dashboard_stats (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            active_connections INTEGER DEFAULT 0,
            knowledge_items INTEGER DEFAULT 0,
            team_collaborations INTEGER DEFAULT 0,
            hours_saved INTEGER DEFAULT 0,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- Create historical_stats table
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'historical_stats') THEN
        CREATE TABLE public.historical_stats (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            previous_connections INTEGER DEFAULT 0,
            previous_items INTEGER DEFAULT 0,
            previous_collaborations INTEGER DEFAULT 0,
            previous_hours INTEGER DEFAULT 0,
            recorded_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;