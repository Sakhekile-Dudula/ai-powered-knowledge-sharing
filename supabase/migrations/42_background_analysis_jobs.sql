-- Migration 42: Background Analysis Job System
-- Periodic refresh of work patterns and AI insights

-- Function to analyze all active users (called by edge function or cron)
CREATE OR REPLACE FUNCTION run_ai_analysis_job()
RETURNS TABLE (
  users_analyzed INTEGER,
  patterns_updated INTEGER,
  insights_generated INTEGER,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_users_count INTEGER := 0;
  v_patterns_count INTEGER := 0;
  v_insights_count INTEGER := 0;
  v_user RECORD;
  v_pattern_exists BOOLEAN;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Get users active in last 7 days
  FOR v_user IN 
    SELECT DISTINCT user_id 
    FROM project_activity_log
    WHERE created_at > NOW() - INTERVAL '7 days'
  LOOP
    v_users_count := v_users_count + 1;
    
    -- Check if user has a work pattern
    SELECT EXISTS(
      SELECT 1 FROM user_work_patterns WHERE user_id = v_user.user_id
    ) INTO v_pattern_exists;
    
    -- Refresh work pattern if old or missing
    IF NOT v_pattern_exists OR 
       (SELECT last_analyzed_at FROM user_work_patterns WHERE user_id = v_user.user_id) < NOW() - INTERVAL '1 hour'
    THEN
      -- This would be called from application code
      -- For now, just track that analysis is needed
      v_patterns_count := v_patterns_count + 1;
    END IF;
  END LOOP;
  
  -- Clean up expired insights cache
  DELETE FROM ai_insights_cache WHERE expires_at < NOW();
  
  -- Return statistics
  RETURN QUERY SELECT 
    v_users_count,
    v_patterns_count,
    v_insights_count,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually trigger analysis for specific user
CREATE OR REPLACE FUNCTION trigger_user_analysis(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Delete old cached insights
  DELETE FROM ai_insights_cache 
  WHERE user_id = p_user_id;
  
  -- Mark work pattern for refresh
  UPDATE user_work_patterns 
  SET last_analyzed_at = NOW() - INTERVAL '2 hours'
  WHERE user_id = p_user_id;
  
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Analysis triggered',
    'user_id', p_user_id
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Analysis job execution log
CREATE TABLE IF NOT EXISTS ai_analysis_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_type TEXT NOT NULL, -- 'scheduled', 'manual', 'on_demand'
  users_analyzed INTEGER DEFAULT 0,
  patterns_updated INTEGER DEFAULT 0,
  insights_generated INTEGER DEFAULT 0,
  execution_time_ms INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_jobs_started ON ai_analysis_jobs(started_at DESC);
CREATE INDEX idx_ai_jobs_status ON ai_analysis_jobs(status);

-- Grant permissions
GRANT EXECUTE ON FUNCTION run_ai_analysis_job TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_user_analysis TO authenticated;

-- Success message
DO $$ BEGIN
  RAISE NOTICE 'Migration 42 completed: Background analysis job system created';
END $$;
