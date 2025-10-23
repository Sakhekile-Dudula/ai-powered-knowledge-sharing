-- Step 4: Insert initial demo data
INSERT INTO public.dashboard_stats 
    (active_connections, knowledge_items, team_collaborations, hours_saved)
VALUES 
    (15, 45, 23, 120)
ON CONFLICT DO NOTHING;

INSERT INTO public.historical_stats 
    (previous_connections, previous_items, previous_collaborations, previous_hours)
VALUES 
    (10, 35, 18, 100)
ON CONFLICT DO NOTHING;