-- Insert sample messages for testing

-- Create a conversation between Sarah and Michael
DO $$
DECLARE
    v_conversation_id uuid;
    v_sarah_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
    v_michael_id uuid := 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid;
BEGIN
    -- Create conversation
    INSERT INTO conversations DEFAULT VALUES
    RETURNING id INTO v_conversation_id;
    
    -- Add participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES 
        (v_conversation_id, v_sarah_id),
        (v_conversation_id, v_michael_id);
    
    -- Add messages
    INSERT INTO messages (conversation_id, sender_id, content, created_at)
    VALUES 
        (v_conversation_id, v_sarah_id, 'Hey Michael, have you seen the new React Best Practices guide?', NOW() - interval '2 hours'),
        (v_conversation_id, v_michael_id, 'Yes! I just reviewed it. Really comprehensive coverage of hooks and performance optimization.', NOW() - interval '1 hour 50 minutes'),
        (v_conversation_id, v_sarah_id, 'Great! Could you help review the section on custom hooks? I want to make sure it follows our team standards.', NOW() - interval '1 hour 30 minutes'),
        (v_conversation_id, v_michael_id, 'Absolutely. I''ll take a look this afternoon and add my comments.', NOW() - interval '1 hour');
END $$;

-- Create a conversation between Sarah and Emily
DO $$
DECLARE
    v_conversation_id uuid;
    v_sarah_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
    v_emily_id uuid := 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'::uuid;
BEGIN
    -- Create conversation
    INSERT INTO conversations DEFAULT VALUES
    RETURNING id INTO v_conversation_id;
    
    -- Add participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES 
        (v_conversation_id, v_sarah_id),
        (v_conversation_id, v_emily_id);
    
    -- Add messages
    INSERT INTO messages (conversation_id, sender_id, content, created_at)
    VALUES 
        (v_conversation_id, v_emily_id, 'Hi Sarah, I noticed you''re working on database optimization. Do you have any tips for indexing strategies?', NOW() - interval '3 hours'),
        (v_conversation_id, v_sarah_id, 'Sure! The key is to identify your most common queries first. What kind of queries are you optimizing?', NOW() - interval '2 hours 30 minutes'),
        (v_conversation_id, v_emily_id, 'Mostly searches on user profiles and activity logs. They''re getting slow as we scale.', NOW() - interval '2 hours'),
        (v_conversation_id, v_sarah_id, 'Perfect. I''ll share our indexing strategy document. It covers exactly those use cases.', NOW() - interval '1 hour 45 minutes');
END $$;

-- Create a conversation between Michael and David
DO $$
DECLARE
    v_conversation_id uuid;
    v_michael_id uuid := 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid;
    v_david_id uuid := 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'::uuid;
BEGIN
    -- Create conversation
    INSERT INTO conversations DEFAULT VALUES
    RETURNING id INTO v_conversation_id;
    
    -- Add participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES 
        (v_conversation_id, v_michael_id),
        (v_conversation_id, v_david_id);
    
    -- Add messages
    INSERT INTO messages (conversation_id, sender_id, content, created_at)
    VALUES 
        (v_conversation_id, v_david_id, 'Michael, can you review my CI/CD pipeline setup? Want to make sure I''m following best practices.', NOW() - interval '4 hours'),
        (v_conversation_id, v_michael_id, 'Of course! Send me the link to your pipeline configuration.', NOW() - interval '3 hours 30 minutes');
END $$;
