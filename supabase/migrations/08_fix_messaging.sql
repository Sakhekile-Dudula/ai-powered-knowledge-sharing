-- Auto-create profiles for authenticated users and fix messaging

-- 1. Create a trigger to automatically create profiles when users sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.email)
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);
  
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Create profiles for existing auth users who don't have profiles yet
INSERT INTO profiles (id, email, full_name, avatar_url)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  COALESCE(au.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || au.email)
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);

-- 3. Update send_message function to accept email as recipient identifier
CREATE OR REPLACE FUNCTION send_message_by_email(
    p_sender_id uuid,
    p_recipient_email text,
    p_content text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_recipient_id uuid;
    v_conversation_id uuid;
    v_message_id uuid;
    result json;
BEGIN
    -- Find recipient by email
    SELECT id INTO v_recipient_id
    FROM profiles
    WHERE email = p_recipient_email
    LIMIT 1;
    
    IF v_recipient_id IS NULL THEN
        RAISE EXCEPTION 'Recipient not found: %', p_recipient_email;
    END IF;
    
    -- Find existing conversation between these two users
    SELECT c.id INTO v_conversation_id
    FROM conversations c
    WHERE EXISTS (
        SELECT 1 FROM conversation_participants cp1
        WHERE cp1.conversation_id = c.id AND cp1.user_id = p_sender_id
    )
    AND EXISTS (
        SELECT 1 FROM conversation_participants cp2
        WHERE cp2.conversation_id = c.id AND cp2.user_id = v_recipient_id
    )
    AND (
        SELECT COUNT(*) FROM conversation_participants cp3
        WHERE cp3.conversation_id = c.id
    ) = 2
    LIMIT 1;
    
    -- If no conversation exists, create one
    IF v_conversation_id IS NULL THEN
        INSERT INTO conversations DEFAULT VALUES
        RETURNING id INTO v_conversation_id;
        
        -- Add both participants
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES 
            (v_conversation_id, p_sender_id),
            (v_conversation_id, v_recipient_id);
    END IF;
    
    -- Insert the message
    INSERT INTO messages (conversation_id, sender_id, content)
    VALUES (v_conversation_id, p_sender_id, p_content)
    RETURNING id INTO v_message_id;
    
    -- Update conversation timestamp
    UPDATE conversations
    SET updated_at = NOW()
    WHERE id = v_conversation_id;
    
    -- Build result
    SELECT json_build_object(
        'id', v_message_id,
        'conversationId', v_conversation_id,
        'recipientId', v_recipient_id,
        'content', p_content,
        'timestamp', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$;
