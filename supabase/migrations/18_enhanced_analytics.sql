-- Enhanced Analytics System

-- User analytics view
CREATE OR REPLACE VIEW user_analytics AS
SELECT 
  p.id as user_id,
  p.full_name,
  p.department,
  p.role,
  p.expertise,
  -- Questions metrics
  COUNT(DISTINCT q.id) as questions_asked,
  -- Answers metrics
  COUNT(DISTINCT a.id) as answers_given,
  COUNT(DISTINCT CASE WHEN a.is_accepted THEN a.id END) as accepted_answers,
  -- Knowledge items metrics
  COUNT(DISTINCT k.id) as knowledge_items_created,
  SUM(DISTINCT k.views) as total_views,
  -- Connections
  COUNT(DISTINCT uc.id) as total_connections,
  -- Messages
  COUNT(DISTINCT m.id) as messages_sent,
  -- Votes received
  COALESCE(SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END), 0) as upvotes_received,
  COALESCE(SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END), 0) as downvotes_received,
  -- Reputation score
  (COUNT(DISTINCT a.id) * 5 + 
   COUNT(DISTINCT CASE WHEN a.is_accepted THEN a.id END) * 15 +
   COUNT(DISTINCT k.id) * 10 +
   COALESCE(SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END), 0) * 2) as reputation_score
FROM profiles p
LEFT JOIN questions q ON p.id = q.author_id
LEFT JOIN answers a ON p.id = a.author_id
LEFT JOIN knowledge_items k ON p.id = k.author_id
LEFT JOIN user_connections uc ON p.id = uc.user_id AND uc.status = 'accepted'
LEFT JOIN messages m ON p.id = m.sender_id
LEFT JOIN votes v ON (
  (v.votable_type = 'answer' AND v.votable_id = a.id) OR
  (v.votable_type = 'question' AND v.votable_id = q.id)
)
GROUP BY p.id, p.full_name, p.department, p.role, p.expertise;

-- Department analytics view
CREATE OR REPLACE VIEW department_analytics AS
SELECT 
  department,
  COUNT(DISTINCT id) as total_users,
  COUNT(DISTINCT CASE WHEN expertise IS NOT NULL AND array_length(expertise, 1) > 0 THEN id END) as users_with_expertise,
  (
    SELECT array_agg(DISTINCT skill)
    FROM profiles p2, unnest(p2.expertise) as skill
    WHERE p2.department = profiles.department AND p2.expertise IS NOT NULL
  ) as all_skills,
  AVG((
    SELECT reputation_score 
    FROM user_analytics 
    WHERE user_id = profiles.id
  )) as avg_reputation
FROM profiles
WHERE department IS NOT NULL
GROUP BY department;

-- Trending topics function
CREATE OR REPLACE FUNCTION get_trending_topics(days INTEGER DEFAULT 7)
RETURNS TABLE (
  topic TEXT,
  mention_count BIGINT,
  trend_direction TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_tags AS (
    SELECT unnest(tags) as tag
    FROM questions
    WHERE created_at >= NOW() - (days || ' days')::INTERVAL
  ),
  older_tags AS (
    SELECT unnest(tags) as tag
    FROM questions
    WHERE created_at >= NOW() - ((days * 2) || ' days')::INTERVAL
    AND created_at < NOW() - (days || ' days')::INTERVAL
  )
  SELECT 
    rt.tag as topic,
    COUNT(*)::BIGINT as mention_count,
    CASE 
      WHEN COUNT(*) > COALESCE(COUNT(ot.tag), 0) * 1.5 THEN 'rising'
      WHEN COUNT(*) < COALESCE(COUNT(ot.tag), 0) * 0.5 THEN 'falling'
      ELSE 'stable'
    END as trend_direction
  FROM recent_tags rt
  LEFT JOIN older_tags ot ON rt.tag = ot.tag
  GROUP BY rt.tag
  ORDER BY mention_count DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Activity timeline function
CREATE OR REPLACE FUNCTION get_activity_timeline(days INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  questions_count BIGINT,
  answers_count BIGINT,
  knowledge_items_count BIGINT,
  messages_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (days || ' days')::INTERVAL,
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE as day
  )
  SELECT 
    ds.day as date,
    COUNT(DISTINCT q.id)::BIGINT as questions_count,
    COUNT(DISTINCT a.id)::BIGINT as answers_count,
    COUNT(DISTINCT k.id)::BIGINT as knowledge_items_count,
    COUNT(DISTINCT m.id)::BIGINT as messages_count
  FROM date_series ds
  LEFT JOIN questions q ON DATE(q.created_at) = ds.day
  LEFT JOIN answers a ON DATE(a.created_at) = ds.day
  LEFT JOIN knowledge_items k ON DATE(k.created_at) = ds.day
  LEFT JOIN messages m ON DATE(m.created_at) = ds.day
  GROUP BY ds.day
  ORDER BY ds.day;
END;
$$ LANGUAGE plpgsql;

-- Top contributors function
CREATE OR REPLACE FUNCTION get_top_contributors(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  department TEXT,
  role TEXT,
  reputation_score BIGINT,
  questions_asked BIGINT,
  answers_given BIGINT,
  accepted_answers BIGINT,
  knowledge_items_created BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.user_id,
    ua.full_name,
    ua.department,
    ua.role,
    ua.reputation_score,
    ua.questions_asked,
    ua.answers_given,
    ua.accepted_answers,
    ua.knowledge_items_created
  FROM user_analytics ua
  ORDER BY ua.reputation_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Skills distribution function
CREATE OR REPLACE FUNCTION get_skills_distribution()
RETURNS TABLE (
  skill TEXT,
  user_count BIGINT,
  avg_reputation NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(p.expertise) as skill,
    COUNT(DISTINCT p.id)::BIGINT as user_count,
    AVG(ua.reputation_score)::NUMERIC as avg_reputation
  FROM profiles p
  LEFT JOIN user_analytics ua ON p.id = ua.user_id
  WHERE p.expertise IS NOT NULL
  GROUP BY skill
  ORDER BY user_count DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Department collaboration matrix
CREATE OR REPLACE FUNCTION get_department_collaboration()
RETURNS TABLE (
  dept1 TEXT,
  dept2 TEXT,
  collaboration_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p1.department as dept1,
    p2.department as dept2,
    COUNT(*)::BIGINT as collaboration_count
  FROM user_connections uc
  JOIN profiles p1 ON uc.user_id = p1.id
  JOIN profiles p2 ON uc.connected_with = p2.id
  WHERE uc.status = 'accepted'
    AND p1.department IS NOT NULL
    AND p2.department IS NOT NULL
    AND p1.department != p2.department
  GROUP BY p1.department, p2.department
  ORDER BY collaboration_count DESC
  LIMIT 15;
END;
$$ LANGUAGE plpgsql;

-- Engagement metrics function
CREATE OR REPLACE FUNCTION get_engagement_metrics()
RETURNS TABLE (
  total_users BIGINT,
  active_users_7d BIGINT,
  active_users_30d BIGINT,
  total_questions BIGINT,
  answered_questions BIGINT,
  total_knowledge_items BIGINT,
  total_connections BIGINT,
  avg_response_time_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::BIGINT FROM profiles) as total_users,
    (SELECT COUNT(DISTINCT author_id)::BIGINT 
     FROM (
       SELECT author_id FROM questions WHERE created_at >= NOW() - INTERVAL '7 days'
       UNION
       SELECT author_id FROM answers WHERE created_at >= NOW() - INTERVAL '7 days'
       UNION
       SELECT sender_id as author_id FROM messages WHERE created_at >= NOW() - INTERVAL '7 days'
     ) active_7d
    ) as active_users_7d,
    (SELECT COUNT(DISTINCT author_id)::BIGINT 
     FROM (
       SELECT author_id FROM questions WHERE created_at >= NOW() - INTERVAL '30 days'
       UNION
       SELECT author_id FROM answers WHERE created_at >= NOW() - INTERVAL '30 days'
       UNION
       SELECT sender_id as author_id FROM messages WHERE created_at >= NOW() - INTERVAL '30 days'
     ) active_30d
    ) as active_users_30d,
    (SELECT COUNT(*)::BIGINT FROM questions) as total_questions,
    (SELECT COUNT(*)::BIGINT FROM questions WHERE status = 'answered') as answered_questions,
    (SELECT COUNT(*)::BIGINT FROM knowledge_items) as total_knowledge_items,
    (SELECT COUNT(*)::BIGINT FROM user_connections WHERE status = 'accepted') as total_connections,
    (SELECT AVG(EXTRACT(EPOCH FROM (a.created_at - q.created_at)) / 3600)::NUMERIC
     FROM answers a
     JOIN questions q ON a.question_id = q.id
     WHERE a.id = (
       SELECT id FROM answers WHERE question_id = q.id ORDER BY created_at LIMIT 1
     )
    ) as avg_response_time_hours;
END;
$$ LANGUAGE plpgsql;
