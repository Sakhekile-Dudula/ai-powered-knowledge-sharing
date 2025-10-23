-- Step 1: Create the tables
CREATE TABLE IF NOT EXISTS public.dashboard_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_connections INTEGER DEFAULT 0,
    knowledge_items INTEGER DEFAULT 0,
    team_collaborations INTEGER DEFAULT 0,
    hours_saved INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.historical_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_connections INTEGER DEFAULT 0,
    previous_items INTEGER DEFAULT 0,
    previous_collaborations INTEGER DEFAULT 0,
    previous_hours INTEGER DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);