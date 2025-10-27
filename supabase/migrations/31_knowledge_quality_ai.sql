-- Knowledge Quality & AI Features Migration

-- Knowledge Items table (for storing technical content)
CREATE TABLE IF NOT EXISTS knowledge_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  is_deprecated BOOLEAN DEFAULT false,
  deprecation_reason TEXT,
  freshness_score INTEGER DEFAULT 100 CHECK (freshness_score >= 0 AND freshness_score <= 100),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Peer Reviews table
CREATE TABLE IF NOT EXISTS peer_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_item_id UUID REFERENCES knowledge_items(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'needs_changes')) DEFAULT 'pending',
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Versions table (version history)
CREATE TABLE IF NOT EXISTS knowledge_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_item_id UUID REFERENCES knowledge_items(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Chat History table
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generated tags table
CREATE TABLE IF NOT EXISTS auto_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL, -- 'knowledge_item', 'project', 'profile'
  tag TEXT NOT NULL,
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, tag)
);

-- Document summaries table
CREATE TABLE IF NOT EXISTS document_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_points TEXT[],
  action_items TEXT[],
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by TEXT DEFAULT 'AI'
);

-- Suggested connections table
CREATE TABLE IF NOT EXISTS suggested_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  person2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  shared_interests TEXT[],
  match_score FLOAT CHECK (match_score >= 0 AND match_score <= 1),
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(person1_id, person2_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_items_author ON knowledge_items(author_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_tags ON knowledge_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_deprecated ON knowledge_items(is_deprecated);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_freshness ON knowledge_items(freshness_score);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_item ON peer_reviews(knowledge_item_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewer ON peer_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_versions_item ON knowledge_versions(knowledge_item_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_user ON ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_tags_content ON auto_tags(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_document_summaries_doc ON document_summaries(document_id, document_type);
CREATE INDEX IF NOT EXISTS idx_suggested_connections_person1 ON suggested_connections(person1_id);
CREATE INDEX IF NOT EXISTS idx_suggested_connections_person2 ON suggested_connections(person2_id);

-- RLS Policies

-- Knowledge Items
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view knowledge items"
  ON knowledge_items FOR SELECT
  USING (true);

CREATE POLICY "Users can create knowledge items"
  ON knowledge_items FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their knowledge items"
  ON knowledge_items FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their knowledge items"
  ON knowledge_items FOR DELETE
  USING (auth.uid() = author_id);

-- Peer Reviews
ALTER TABLE peer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view peer reviews"
  ON peer_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create peer reviews"
  ON peer_reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can update their reviews"
  ON peer_reviews FOR UPDATE
  USING (auth.uid() = reviewer_id);

-- Knowledge Versions
ALTER TABLE knowledge_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view knowledge versions"
  ON knowledge_versions FOR SELECT
  USING (true);

CREATE POLICY "System can create versions"
  ON knowledge_versions FOR INSERT
  WITH CHECK (true);

-- AI Chat History
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat history"
  ON ai_chat_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create chat messages"
  ON ai_chat_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Auto Tags
ALTER TABLE auto_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view auto tags"
  ON auto_tags FOR SELECT
  USING (true);

CREATE POLICY "System can create auto tags"
  ON auto_tags FOR INSERT
  WITH CHECK (true);

-- Document Summaries
ALTER TABLE document_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view document summaries"
  ON document_summaries FOR SELECT
  USING (true);

CREATE POLICY "System can create summaries"
  ON document_summaries FOR INSERT
  WITH CHECK (true);

-- Suggested Connections
ALTER TABLE suggested_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their suggested connections"
  ON suggested_connections FOR SELECT
  USING (auth.uid() = person1_id OR auth.uid() = person2_id);

CREATE POLICY "System can create connection suggestions"
  ON suggested_connections FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their connection status"
  ON suggested_connections FOR UPDATE
  USING (auth.uid() = person1_id OR auth.uid() = person2_id);

-- Function to calculate freshness score based on last update
CREATE OR REPLACE FUNCTION calculate_freshness_score(last_updated TIMESTAMPTZ)
RETURNS INTEGER AS $$
DECLARE
  days_old INTEGER;
  score INTEGER;
BEGIN
  days_old := EXTRACT(DAY FROM NOW() - last_updated)::INTEGER;
  
  -- Fresh content (0-30 days): 100-80 score
  IF days_old <= 30 THEN
    score := 100 - (days_old * 20 / 30);
  -- Moderate content (31-90 days): 80-50 score
  ELSIF days_old <= 90 THEN
    score := 80 - ((days_old - 30) * 30 / 60);
  -- Stale content (91-180 days): 50-20 score
  ELSIF days_old <= 180 THEN
    score := 50 - ((days_old - 90) * 30 / 90);
  -- Very stale (180+ days): 20-0 score
  ELSE
    score := GREATEST(0, 20 - ((days_old - 180) * 20 / 180));
  END IF;
  
  RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update freshness score
CREATE OR REPLACE FUNCTION update_knowledge_freshness()
RETURNS TRIGGER AS $$
BEGIN
  NEW.freshness_score := calculate_freshness_score(NEW.updated_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_knowledge_freshness
  BEFORE INSERT OR UPDATE ON knowledge_items
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_freshness();

-- Function to create version history on update
CREATE OR REPLACE FUNCTION create_knowledge_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if content or title changed
  IF NEW.content != OLD.content OR NEW.title != OLD.title THEN
    INSERT INTO knowledge_versions (
      knowledge_item_id,
      version_number,
      title,
      content,
      changed_by
    ) VALUES (
      OLD.id,
      OLD.version,
      OLD.title,
      OLD.content,
      OLD.author_name
    );
    
    -- Increment version number
    NEW.version := OLD.version + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_knowledge_version
  BEFORE UPDATE ON knowledge_items
  FOR EACH ROW
  EXECUTE FUNCTION create_knowledge_version();

-- Function to get trending tags
CREATE OR REPLACE FUNCTION get_trending_tags(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  tag TEXT,
  count BIGINT,
  trend_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(tags) as tag,
    COUNT(*) as count,
    COUNT(*) * (1 + (100 - AVG(EXTRACT(DAY FROM NOW() - created_at)::FLOAT)) / 100) as trend_score
  FROM knowledge_items
  WHERE 
    created_at > NOW() - INTERVAL '90 days'
    AND tags IS NOT NULL
  GROUP BY tag
  ORDER BY trend_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to find experts by skill/topic
CREATE OR REPLACE FUNCTION find_experts(search_term TEXT, limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  expertise TEXT[],
  relevance_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.skills,
    (
      -- Score based on skill matches
      (SELECT COUNT(*) FROM unnest(p.skills) s WHERE s ILIKE '%' || search_term || '%') * 0.5 +
      -- Score based on bio mention
      CASE WHEN p.bio ILIKE '%' || search_term || '%' THEN 0.3 ELSE 0 END +
      -- Score based on recent knowledge contributions
      (SELECT COUNT(*) * 0.2 FROM knowledge_items k 
       WHERE k.author_id = p.id 
       AND (k.title ILIKE '%' || search_term || '%' OR k.content ILIKE '%' || search_term || '%')
       LIMIT 1)
    )::FLOAT as relevance_score
  FROM profiles p
  WHERE 
    p.skills IS NOT NULL
    OR p.bio IS NOT NULL
  HAVING relevance_score > 0
  ORDER BY relevance_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Insert sample knowledge items
INSERT INTO knowledge_items (title, content, author_id, author_name, category, tags) 
SELECT 
  'Getting Started with React Hooks',
  'React Hooks allow you to use state and other React features without writing a class. The most commonly used hooks are useState and useEffect...',
  id,
  full_name,
  'Frontend Development',
  ARRAY['React', 'JavaScript', 'Frontend', 'Hooks']
FROM profiles
WHERE email = 'demo@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO knowledge_items (title, content, author_id, author_name, category, tags)
SELECT 
  'Microservices Best Practices',
  'When building microservices, consider these key principles: single responsibility, independent deployment, decentralized data management...',
  id,
  full_name,
  'Architecture',
  ARRAY['Microservices', 'Architecture', 'Backend', 'DevOps']
FROM profiles
WHERE email = 'demo@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO knowledge_items (title, content, author_id, author_name, category, tags, is_deprecated, deprecation_reason)
SELECT 
  'Using jQuery for DOM Manipulation',
  'jQuery provides a simple API for DOM manipulation. Use $(selector) to select elements...',
  id,
  full_name,
  'Frontend Development',
  ARRAY['jQuery', 'JavaScript', 'Legacy'],
  true,
  'Modern frameworks like React and Vue have replaced jQuery for most use cases. Consider using vanilla JavaScript or a modern framework instead.'
FROM profiles
WHERE email = 'demo@example.com'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE knowledge_items IS 'Stores technical knowledge articles with quality tracking';
COMMENT ON TABLE peer_reviews IS 'Peer review system for knowledge items';
COMMENT ON TABLE knowledge_versions IS 'Version history for knowledge items';
COMMENT ON TABLE ai_chat_history IS 'AI chatbot conversation history';
COMMENT ON TABLE auto_tags IS 'Auto-generated tags using NLP';
COMMENT ON TABLE document_summaries IS 'AI-generated document summaries';
COMMENT ON TABLE suggested_connections IS 'AI-suggested professional connections';
