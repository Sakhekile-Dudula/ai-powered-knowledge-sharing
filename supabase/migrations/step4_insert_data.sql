-- Step 4: Insert initial demo data

-- Insert sample profiles (users)
INSERT INTO profiles (id, full_name, email, avatar_url)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'Sarah Johnson', 'sarah.johnson@company.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid, 'Michael Chen', 'michael.chen@company.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael'),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'::uuid, 'Emily Rodriguez', 'emily.rodriguez@company.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily'),
    ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'::uuid, 'David Kim', 'david.kim@company.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=David'),
    ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'::uuid, 'Jessica Lee', 'jessica.lee@company.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica')
ON CONFLICT (id) DO NOTHING;

-- Insert sample knowledge items
INSERT INTO knowledge_items (author_id, title, description, views, created_at)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'React Best Practices 2024', 'Comprehensive guide to modern React development patterns', 234, NOW() - interval '5 days'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid, 'API Security Guidelines', 'Essential security practices for REST APIs', 189, NOW() - interval '3 days'),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'::uuid, 'Database Optimization Tips', 'Performance tuning for PostgreSQL databases', 156, NOW() - interval '7 days'),
    ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'::uuid, 'CI/CD Pipeline Setup', 'Complete guide to automated deployment workflows', 298, NOW() - interval '2 days'),
    ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'::uuid, 'Microservices Architecture', 'Designing scalable microservices systems', 412, NOW() - interval '10 days')
ON CONFLICT DO NOTHING;

-- Insert user connections
INSERT INTO user_connections (user_id, connected_with, status)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid, 'accepted'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'::uuid, 'accepted'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid, 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'::uuid, 'accepted'),
    ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'::uuid, 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'::uuid, 'accepted'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'::uuid, 'pending')
ON CONFLICT DO NOTHING;

-- Insert collaborations
INSERT INTO collaborations (user_id, knowledge_item_id, type, created_at)
VALUES 
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid, 1, 'edit', NOW() - interval '2 days'),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'::uuid, 1, 'comment', NOW() - interval '1 day'),
    ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'::uuid, 2, 'review', NOW() - interval '3 days'),
    ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'::uuid, 3, 'share', NOW() - interval '5 days'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 4, 'edit', NOW() - interval '1 day')
ON CONFLICT DO NOTHING;

-- Insert activity log
INSERT INTO activity_log (user_id, action, topic, entity_type, entity_id, type, created_at)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'shared', 'React Best Practices 2024', 'knowledge_item', 1, 'share', NOW() - interval '5 days'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid, 'commented on', 'API Security Guidelines', 'knowledge_item', 2, 'comment', NOW() - interval '3 days'),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'::uuid, 'edited', 'Database Optimization Tips', 'knowledge_item', 3, 'edit', NOW() - interval '2 days'),
    ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'::uuid, 'reviewed', 'CI/CD Pipeline Setup', 'knowledge_item', 4, 'review', NOW() - interval '1 day'),
    ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'::uuid, 'shared', 'Microservices Architecture', 'knowledge_item', 5, 'share', NOW() - interval '4 hours')
ON CONFLICT DO NOTHING;

-- Insert historical stats
INSERT INTO historical_stats (previous_connections, previous_items, previous_collaborations, previous_hours)
VALUES 
    (10, 35, 18, 100)
ON CONFLICT DO NOTHING;