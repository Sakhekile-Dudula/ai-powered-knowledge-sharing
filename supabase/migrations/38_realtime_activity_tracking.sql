-- Enhanced Real-time Activity Tracking System
-- This migration creates triggers to automatically log user activities

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id uuid,
  p_action text,
  p_topic text,
  p_entity_type text DEFAULT NULL,
  p_entity_id bigint DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO activity_log (user_id, action, topic, entity_type, entity_id, type, created_at)
  VALUES (p_user_id, p_action, p_topic, p_entity_type, p_entity_id, 'activity', NOW());
END;
$$;

-- Trigger for knowledge_items creation
CREATE OR REPLACE FUNCTION track_knowledge_item_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (user_id, action, topic, entity_type, entity_id, type)
    VALUES (
      NEW.author_id,
      'shared',
      NEW.title,
      'knowledge_item',
      NEW.id,
      'activity'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.title != NEW.title THEN
    INSERT INTO activity_log (user_id, action, topic, entity_type, entity_id, type)
    VALUES (
      NEW.author_id,
      'updated',
      NEW.title,
      'knowledge_item',
      NEW.id,
      'activity'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for question creation
CREATE OR REPLACE FUNCTION track_question_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (user_id, action, topic, entity_type, entity_id, type)
    VALUES (
      NEW.author_id,
      'asked',
      NEW.title,
      'question',
      NEW.id,
      'activity'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for answer creation
CREATE OR REPLACE FUNCTION track_answer_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  question_title text;
  question_author_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get question title
    SELECT title, author_id INTO question_title, question_author_id
    FROM questions
    WHERE id = NEW.question_id;
    
    INSERT INTO activity_log (user_id, action, topic, entity_type, entity_id, type)
    VALUES (
      NEW.author_id,
      'answered',
      question_title,
      'answer',
      NEW.id,
      'activity'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for connection creation
CREATE OR REPLACE FUNCTION track_connection_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  connected_user_name text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'connected' THEN
    -- Get connected user's name
    SELECT full_name INTO connected_user_name
    FROM profiles
    WHERE id = NEW.connected_with;
    
    INSERT INTO activity_log (user_id, action, topic, entity_type, entity_id, type)
    VALUES (
      NEW.user_id,
      'connected with',
      connected_user_name,
      'connection',
      NULL,
      'activity'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Message tracking function (for future use when conversation_messages table exists)
-- Uncomment this when you have the messaging tables set up
/*
CREATE OR REPLACE FUNCTION track_message_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recipient_name text;
  recipient_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get recipient from conversation
    SELECT user_id INTO recipient_id
    FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
    LIMIT 1;
    
    -- Get recipient name
    SELECT full_name INTO recipient_name
    FROM profiles
    WHERE id = recipient_id;
    
    INSERT INTO activity_log (user_id, action, topic, entity_type, entity_id, type)
    VALUES (
      NEW.sender_id,
      'messaged',
      recipient_name,
      'message',
      NEW.id::integer,
      'activity'
    );
  END IF;
  RETURN NEW;
END;
$$;
*/

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_track_knowledge_items ON knowledge_items;
DROP TRIGGER IF EXISTS trigger_track_questions ON questions;
DROP TRIGGER IF EXISTS trigger_track_answers ON answers;
DROP TRIGGER IF EXISTS trigger_track_connections ON user_connections;

-- Create triggers (only for tables that exist)
CREATE TRIGGER trigger_track_knowledge_items
  AFTER INSERT OR UPDATE ON knowledge_items
  FOR EACH ROW
  EXECUTE FUNCTION track_knowledge_item_activity();

CREATE TRIGGER trigger_track_questions
  AFTER INSERT ON questions
  FOR EACH ROW
  EXECUTE FUNCTION track_question_activity();

CREATE TRIGGER trigger_track_answers
  AFTER INSERT ON answers
  FOR EACH ROW
  EXECUTE FUNCTION track_answer_activity();

CREATE TRIGGER trigger_track_connections
  AFTER INSERT OR UPDATE ON user_connections
  FOR EACH ROW
  EXECUTE FUNCTION track_connection_activity();

-- Note: Message tracking commented out - uncomment when messaging tables are ready
-- CREATE TRIGGER trigger_track_messages
--   AFTER INSERT ON conversation_messages
--   FOR EACH ROW
--   EXECUTE FUNCTION track_message_activity();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_activity TO authenticated;
GRANT EXECUTE ON FUNCTION track_knowledge_item_activity TO authenticated;
GRANT EXECUTE ON FUNCTION track_question_activity TO authenticated;
GRANT EXECUTE ON FUNCTION track_answer_activity TO authenticated;
GRANT EXECUTE ON FUNCTION track_connection_activity TO authenticated;

-- Update RLS policies for activity_log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all activity" ON activity_log;
DROP POLICY IF EXISTS "System can insert activity" ON activity_log;

-- Create new policies - allow viewing all activity (for dashboard)
CREATE POLICY "Users can view all activity"
  ON activity_log FOR SELECT
  TO authenticated
  USING (true);

-- Allow system to insert
CREATE POLICY "System can insert activity"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON FUNCTION log_activity IS 'Manually log user activity';
COMMENT ON FUNCTION track_knowledge_item_activity IS 'Auto-track knowledge item activities';
COMMENT ON FUNCTION track_question_activity IS 'Auto-track question activities';
COMMENT ON FUNCTION track_answer_activity IS 'Auto-track answer activities';
COMMENT ON FUNCTION track_connection_activity IS 'Auto-track connection activities';
