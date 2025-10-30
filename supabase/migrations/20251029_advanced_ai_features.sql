-- Migration: Advanced AI Features - Smart Notifications, Connection Suggestions, Work Pattern Analysis
-- Created: 2025-10-29

-- =====================================================
-- 1. SMART NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS smart_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('similar_work', 'connection_suggestion', 'collaboration_opportunity', 'expertise_match')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  action_url TEXT,
  action_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_smart_notifications_user ON smart_notifications(user_id);
CREATE INDEX idx_smart_notifications_unread ON smart_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_smart_notifications_created ON smart_notifications(created_at DESC);

-- =====================================================
-- 2. AI CONNECTION SUGGESTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_connection_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  suggested_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  shared_interests TEXT[] DEFAULT ARRAY[]::TEXT[],
  suggested_by TEXT DEFAULT 'ai_pattern_analysis' CHECK (suggested_by IN ('ai_pattern_analysis', 'project_overlap', 'skill_match', 'knowledge_similarity')),
  confidence INTEGER DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  is_dismissed BOOLEAN DEFAULT FALSE,
  is_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, suggested_user_id)
);

CREATE INDEX idx_ai_suggestions_user ON ai_connection_suggestions(user_id);
CREATE INDEX idx_ai_suggestions_score ON ai_connection_suggestions(score DESC);
CREATE INDEX idx_ai_suggestions_active ON ai_connection_suggestions(user_id, is_dismissed) WHERE is_dismissed = FALSE;

-- =====================================================
-- 3. NOTIFICATION PREFERENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  similar_work BOOLEAN DEFAULT TRUE,
  connection_suggestions BOOLEAN DEFAULT TRUE,
  collaboration_opportunities BOOLEAN DEFAULT TRUE,
  expertise_matches BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. WORK PATTERN ANALYSIS TABLE (Cached analysis results)
-- =====================================================
CREATE TABLE IF NOT EXISTS work_pattern_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  projects TEXT[] DEFAULT ARRAY[]::TEXT[],
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  recent_activity JSONB DEFAULT '[]'::jsonb,
  collaborators UUID[] DEFAULT ARRAY[]::UUID[],
  activity_score INTEGER DEFAULT 0,
  last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_work_pattern_user ON work_pattern_analysis(user_id);
CREATE INDEX idx_work_pattern_analyzed ON work_pattern_analysis(last_analyzed DESC);

-- =====================================================
-- 5. ACTIVITY LOG TABLE (For tracking user activities)
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_user_created ON activity_log(user_id, created_at DESC);

-- =====================================================
-- 6. PROJECTS TABLE (If not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- =====================================================
-- 7. PROJECT MEMBERS TABLE (If not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- =====================================================
-- 8. FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_smart_notifications_updated_at ON smart_notifications;
CREATE TRIGGER update_smart_notifications_updated_at
  BEFORE UPDATE ON smart_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_suggestions_updated_at ON ai_connection_suggestions;
CREATE TRIGGER update_ai_suggestions_updated_at
  BEFORE UPDATE ON ai_connection_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_prefs_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_prefs_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. LOG ACTIVITY FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_action_type TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO activity_log (user_id, action_type, entity_type, entity_id, metadata)
  VALUES (p_user_id, p_action_type, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. GET SMART SUGGESTIONS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION get_smart_suggestions(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  suggestion_id UUID,
  suggested_user_id UUID,
  suggested_user_name TEXT,
  suggested_user_email TEXT,
  suggested_user_avatar TEXT,
  suggested_user_department TEXT,
  reason TEXT,
  score INTEGER,
  shared_interests TEXT[],
  confidence INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.suggested_user_id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.department,
    s.reason,
    s.score,
    s.shared_interests,
    s.confidence
  FROM ai_connection_suggestions s
  JOIN profiles p ON s.suggested_user_id = p.id
  WHERE s.user_id = p_user_id 
    AND s.is_dismissed = FALSE
  ORDER BY s.score DESC, s.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. RLS POLICIES
-- =====================================================

-- Smart Notifications
ALTER TABLE smart_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON smart_notifications;
CREATE POLICY "Users can view own notifications"
  ON smart_notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON smart_notifications;
CREATE POLICY "Users can update own notifications"
  ON smart_notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON smart_notifications;
CREATE POLICY "System can insert notifications"
  ON smart_notifications FOR INSERT
  WITH CHECK (true);

-- AI Connection Suggestions
ALTER TABLE ai_connection_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own suggestions" ON ai_connection_suggestions;
CREATE POLICY "Users can view own suggestions"
  ON ai_connection_suggestions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own suggestions" ON ai_connection_suggestions;
CREATE POLICY "Users can update own suggestions"
  ON ai_connection_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert suggestions" ON ai_connection_suggestions;
CREATE POLICY "System can insert suggestions"
  ON ai_connection_suggestions FOR INSERT
  WITH CHECK (true);

-- Notification Preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own preferences" ON notification_preferences;
CREATE POLICY "Users can manage own preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Activity Log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity" ON activity_log;
CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert activity" ON activity_log;
CREATE POLICY "System can insert activity"
  ON activity_log FOR INSERT
  WITH CHECK (true);

-- Work Pattern Analysis
ALTER TABLE work_pattern_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own patterns" ON work_pattern_analysis;
CREATE POLICY "Users can view own patterns"
  ON work_pattern_analysis FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage patterns" ON work_pattern_analysis;
CREATE POLICY "System can manage patterns"
  ON work_pattern_analysis FOR ALL
  USING (true);

-- Project Members
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view project members" ON project_members;
CREATE POLICY "Anyone can view project members"
  ON project_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Project members can be added" ON project_members;
CREATE POLICY "Project members can be added"
  ON project_members FOR INSERT
  WITH CHECK (true);

-- Projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view projects" ON projects;
CREATE POLICY "Anyone can view projects"
  ON projects FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create projects" ON projects;
CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = created_by);

-- =====================================================
-- 12. SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert default notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE smart_notifications IS 'AI-powered smart notifications for collaboration opportunities';
COMMENT ON TABLE ai_connection_suggestions IS 'AI-generated connection suggestions based on work pattern analysis';
COMMENT ON TABLE notification_preferences IS 'User preferences for smart notifications';
COMMENT ON TABLE work_pattern_analysis IS 'Cached work pattern analysis for users';
COMMENT ON TABLE activity_log IS 'Log of user activities for AI analysis';
COMMENT ON TABLE project_members IS 'Tracks project team membership';
