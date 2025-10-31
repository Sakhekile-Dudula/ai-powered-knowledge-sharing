-- Migration 41: Project Activity Tracking System
-- This enables AI-powered insights by tracking detailed project interactions

-- Project Activity Log Table
CREATE TABLE IF NOT EXISTS project_activity_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id BIGINT REFERENCES knowledge_items(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'view', 'edit', 'collaborate', 'contribute', 'comment'
  metadata JSONB DEFAULT '{}'::jsonb, -- Flexible storage for activity details
  duration_seconds INTEGER, -- Time spent on activity (for 'view' type)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_project_activity_user ON project_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_activity_project ON project_activity_log(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_activity_type ON project_activity_log(activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_activity_created ON project_activity_log(created_at DESC);

-- User Work Patterns Table (stores analyzed patterns)
CREATE TABLE IF NOT EXISTS user_work_patterns (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Temporal patterns
  active_hours JSONB DEFAULT '[]'::jsonb, -- Array of hour ranges when user is most active
  active_days JSONB DEFAULT '[]'::jsonb, -- Array of days (0-6) when user is most active
  
  -- Collaboration patterns
  frequent_collaborators JSONB DEFAULT '[]'::jsonb, -- Array of {user_id, count, projects[]}
  collaboration_frequency INTEGER DEFAULT 0, -- Total collaboration events
  
  -- Expertise and interests
  expertise_areas JSONB DEFAULT '[]'::jsonb, -- Array of {topic, confidence_score, project_count}
  active_projects JSONB DEFAULT '[]'::jsonb, -- Array of {project_id, engagement_score, last_active}
  
  -- Behavioral metrics
  avg_response_time INTEGER, -- Average time to respond to questions/messages (minutes)
  knowledge_sharing_score DECIMAL(5,2) DEFAULT 0, -- Calculated score based on contributions
  
  -- Analysis metadata
  last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  analysis_version INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_work_patterns_user ON user_work_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_work_patterns_analyzed ON user_work_patterns(last_analyzed_at DESC);

-- Project Dependencies Table
CREATE TABLE IF NOT EXISTS project_dependencies (
  id BIGSERIAL PRIMARY KEY,
  source_project_id BIGINT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  target_project_id BIGINT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  
  -- Dependency types
  dependency_type TEXT NOT NULL, -- 'shared_team', 'shared_technology', 'knowledge_flow', 'timeline_dependency'
  
  -- Relationship metrics
  strength_score DECIMAL(5,2) DEFAULT 0, -- 0-100 indicating strength of dependency
  shared_members_count INTEGER DEFAULT 0,
  shared_technologies JSONB DEFAULT '[]'::jsonb, -- Array of technology names
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  last_validated_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate dependencies
  UNIQUE(source_project_id, target_project_id, dependency_type)
);

-- Indexes for dependency queries
CREATE INDEX IF NOT EXISTS idx_project_deps_source ON project_dependencies(source_project_id, strength_score DESC);
CREATE INDEX IF NOT EXISTS idx_project_deps_target ON project_dependencies(target_project_id, strength_score DESC);
CREATE INDEX IF NOT EXISTS idx_project_deps_type ON project_dependencies(dependency_type);
CREATE INDEX IF NOT EXISTS idx_project_deps_strength ON project_dependencies(strength_score DESC);

-- AI Insights Cache Table (pre-computed insights for fast loading)
CREATE TABLE IF NOT EXISTS ai_insights_cache (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id BIGINT REFERENCES knowledge_items(id) ON DELETE CASCADE, -- NULL for user-level insights
  
  insight_type TEXT NOT NULL, -- 'shared_team', 'common_dependencies', 'knowledge_transfer', 'timeline_risk'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_label TEXT,
  action_data JSONB DEFAULT '{}'::jsonb, -- Data needed to execute the action
  
  priority_score DECIMAL(5,2) DEFAULT 0, -- For sorting insights by importance
  metadata JSONB DEFAULT '{}'::jsonb,
  
  expires_at TIMESTAMPTZ, -- When this insight should be recalculated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate insights
  UNIQUE(user_id, project_id, insight_type, title)
);

-- Indexes for insights queries
CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON ai_insights_cache(user_id, priority_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_project ON ai_insights_cache(project_id, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights_cache(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_expires ON ai_insights_cache(expires_at);

-- Function: Log project activity (called from application code)
CREATE OR REPLACE FUNCTION log_project_activity(
  p_user_id UUID,
  p_project_id BIGINT,
  p_activity_type TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_duration_seconds INTEGER DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  v_activity_id BIGINT;
BEGIN
  INSERT INTO project_activity_log (
    user_id, project_id, activity_type, metadata, duration_seconds
  ) VALUES (
    p_user_id, p_project_id, p_activity_type, p_metadata, p_duration_seconds
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get shared team members between two projects
CREATE OR REPLACE FUNCTION analyze_shared_team_members(
  p_project_id_1 BIGINT,
  p_project_id_2 BIGINT,
  p_days_back INTEGER DEFAULT 30
) RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  activity_count_project1 BIGINT,
  activity_count_project2 BIGINT,
  total_activity BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH project1_users AS (
    SELECT DISTINCT pal.user_id, COUNT(*) as count1
    FROM project_activity_log pal
    WHERE pal.project_id = p_project_id_1
      AND pal.created_at > NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY pal.user_id
  ),
  project2_users AS (
    SELECT DISTINCT pal.user_id, COUNT(*) as count2
    FROM project_activity_log pal
    WHERE pal.project_id = p_project_id_2
      AND pal.created_at > NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY pal.user_id
  )
  SELECT 
    p1.user_id,
    p.full_name,
    p1.count1::BIGINT,
    p2.count2::BIGINT,
    (p1.count1 + p2.count2)::BIGINT as total_activity
  FROM project1_users p1
  INNER JOIN project2_users p2 ON p1.user_id = p2.user_id
  LEFT JOIN profiles p ON p.id = p1.user_id
  ORDER BY total_activity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Detect common dependencies between projects
CREATE OR REPLACE FUNCTION detect_common_dependencies(
  p_project_id BIGINT,
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  related_project_id BIGINT,
  project_title TEXT,
  dependency_type TEXT,
  strength_score DECIMAL,
  shared_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pd.target_project_id,
    ki.title,
    pd.dependency_type,
    pd.strength_score,
    pd.shared_members_count
  FROM project_dependencies pd
  LEFT JOIN knowledge_items ki ON ki.id = pd.target_project_id
  WHERE pd.source_project_id = p_project_id
  ORDER BY pd.strength_score DESC, pd.shared_members_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Identify knowledge transfer opportunities
CREATE OR REPLACE FUNCTION identify_knowledge_transfer_opportunities(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
) RETURNS TABLE (
  from_project_id BIGINT,
  from_project_title TEXT,
  to_project_id BIGINT,
  to_project_title TEXT,
  shared_topics TEXT[],
  opportunity_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH user_projects AS (
    -- Projects where user is active
    SELECT DISTINCT project_id
    FROM project_activity_log
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '60 days'
  ),
  project_topics AS (
    -- Extract topics/tags from projects
    SELECT ki.id, ki.title, ki.tags
    FROM knowledge_items ki
    WHERE ki.id IN (SELECT project_id FROM user_projects)
  )
  SELECT 
    pt1.id as from_project_id,
    pt1.title as from_project_title,
    pt2.id as to_project_id,
    pt2.title as to_project_title,
    ARRAY(SELECT unnest(pt1.tags) INTERSECT SELECT unnest(pt2.tags)) as shared_topics,
    (array_length(ARRAY(SELECT unnest(pt1.tags) INTERSECT SELECT unnest(pt2.tags)), 1) * 10.0)::DECIMAL as opportunity_score
  FROM project_topics pt1
  CROSS JOIN project_topics pt2
  WHERE pt1.id != pt2.id
    AND array_length(ARRAY(SELECT unnest(pt1.tags) INTERSECT SELECT unnest(pt2.tags)), 1) > 0
  ORDER BY opportunity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for project_activity_log
ALTER TABLE project_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own project activity"
  ON project_activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can log their own project activity"
  ON project_activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_work_patterns
ALTER TABLE user_work_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own work patterns"
  ON user_work_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view others' public work patterns"
  ON user_work_patterns FOR SELECT
  USING (true); -- Allow all authenticated users to see patterns for collaboration

CREATE POLICY "System can update work patterns"
  ON user_work_patterns FOR ALL
  USING (true); -- Background jobs need access

-- RLS Policies for project_dependencies
ALTER TABLE project_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view project dependencies"
  ON project_dependencies FOR SELECT
  USING (true); -- Dependencies are public for collaboration

-- RLS Policies for ai_insights_cache
ALTER TABLE ai_insights_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights"
  ON ai_insights_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage insights cache"
  ON ai_insights_cache FOR ALL
  USING (true); -- Background analysis jobs need full access

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION log_project_activity TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_shared_team_members TO authenticated;
GRANT EXECUTE ON FUNCTION detect_common_dependencies TO authenticated;
GRANT EXECUTE ON FUNCTION identify_knowledge_transfer_opportunities TO authenticated;

-- Success message
DO $$ BEGIN
  RAISE NOTICE 'Migration 41 completed: Project activity tracking system created';
END $$;
