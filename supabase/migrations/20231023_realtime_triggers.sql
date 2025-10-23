-- Create a function to maintain historical stats
CREATE OR REPLACE FUNCTION update_historical_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Store the current stats as historical before they change
    INSERT INTO historical_stats (
        previous_connections,
        previous_items,
        previous_collaborations,
        previous_hours
    )
    SELECT
        (SELECT COUNT(DISTINCT user_id) FROM activity_log WHERE created_at >= date_trunc('month', CURRENT_DATE - interval '1 month')),
        (SELECT COUNT(*) FROM knowledge_items WHERE created_at < date_trunc('month', CURRENT_DATE)),
        (SELECT COUNT(*) FROM collaborations WHERE created_at >= date_trunc('month', CURRENT_DATE - interval '1 month')),
        (SELECT COUNT(*) * 2 FROM collaborations WHERE created_at >= date_trunc('month', CURRENT_DATE - interval '1 month'));
    
    RETURN NEW;
END;
$$;

-- Create trigger to update historical stats monthly
CREATE OR REPLACE TRIGGER update_historical_stats_trigger
    AFTER INSERT OR UPDATE ON activity_log
    FOR EACH STATEMENT
    WHEN (date_trunc('month', NEW.created_at) > date_trunc('month', COALESCE((SELECT MAX(recorded_at) FROM historical_stats), '1970-01-01'::timestamp)))
    EXECUTE FUNCTION update_historical_stats();

-- Create a function to update knowledge item views
CREATE OR REPLACE FUNCTION increment_knowledge_item_views()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE knowledge_items
    SET views = views + 1
    WHERE id = NEW.entity_id
    AND NEW.entity_type = 'knowledge_item'
    AND NEW.action = 'viewed';
    
    RETURN NEW;
END;
$$;

-- Create trigger to update views when activity is logged
CREATE TRIGGER increment_views_trigger
    AFTER INSERT ON activity_log
    FOR EACH ROW
    EXECUTE FUNCTION increment_knowledge_item_views();

-- Create a function to log collaboration activities
CREATE OR REPLACE FUNCTION log_collaboration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO activity_log (
        user_id,
        action,
        topic,
        entity_type,
        entity_id,
        type
    )
    SELECT
        NEW.user_id,
        CASE NEW.type
            WHEN 'edit' THEN 'edited'
            WHEN 'comment' THEN 'commented on'
            WHEN 'review' THEN 'reviewed'
            WHEN 'share' THEN 'shared'
        END,
        k.title,
        'knowledge_item',
        NEW.knowledge_item_id,
        NEW.type
    FROM knowledge_items k
    WHERE k.id = NEW.knowledge_item_id;
    
    RETURN NEW;
END;
$$;

-- Create trigger to log collaboration activities
CREATE TRIGGER log_collaboration_trigger
    AFTER INSERT ON collaborations
    FOR EACH ROW
    EXECUTE FUNCTION log_collaboration();

-- Create a function to handle user connections
CREATE OR REPLACE FUNCTION handle_user_connection()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- Log the connection activity for both users
        INSERT INTO activity_log (user_id, action, topic, entity_type, entity_id, type)
        VALUES
        (NEW.user_id, 'connected with', (SELECT full_name FROM profiles WHERE id = NEW.connected_with), 'user', NEW.connected_with, 'connection'),
        (NEW.connected_with, 'connected with', (SELECT full_name FROM profiles WHERE id = NEW.user_id), 'user', NEW.user_id, 'connection');
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for user connections
CREATE TRIGGER handle_user_connection_trigger
    AFTER UPDATE ON user_connections
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_connection();

-- Enable real-time for relevant tables
ALTER TABLE knowledge_items REPLICA IDENTITY FULL;
ALTER TABLE activity_log REPLICA IDENTITY FULL;
ALTER TABLE collaborations REPLICA IDENTITY FULL;
ALTER TABLE user_connections REPLICA IDENTITY FULL;

-- Enable row level security
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow users to view all knowledge items"
    ON knowledge_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow users to create knowledge items"
    ON knowledge_items FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Allow users to update their own knowledge items"
    ON knowledge_items FOR UPDATE
    TO authenticated
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Allow users to view all activities"
    ON activity_log FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow users to create activities"
    ON activity_log FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to view all collaborations"
    ON collaborations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow users to create collaborations"
    ON collaborations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to view their own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);