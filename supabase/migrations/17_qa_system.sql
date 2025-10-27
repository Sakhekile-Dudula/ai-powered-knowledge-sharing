-- Create Q&A System Tables

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id BIGSERIAL PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  views INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open', -- 'open', 'answered', 'closed'
  accepted_answer_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Answers table
CREATE TABLE IF NOT EXISTS answers (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes table (for both questions and answers)
CREATE TABLE IF NOT EXISTS votes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  votable_type TEXT NOT NULL, -- 'question' or 'answer'
  votable_id BIGINT NOT NULL,
  vote_type INTEGER NOT NULL, -- 1 for upvote, -1 for downvote
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, votable_type, votable_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_questions_author ON questions(author_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_created ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_author ON answers(author_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_votable ON votes(votable_type, votable_id);

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for questions
CREATE POLICY "Anyone can view questions"
  ON questions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create questions"
  ON questions FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their questions"
  ON questions FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their questions"
  ON questions FOR DELETE
  USING (auth.uid() = author_id);

-- RLS Policies for answers
CREATE POLICY "Anyone can view answers"
  ON answers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create answers"
  ON answers FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their answers"
  ON answers FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their answers"
  ON answers FOR DELETE
  USING (auth.uid() = author_id);

-- RLS Policies for votes
CREATE POLICY "Users can view all votes"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Users can create votes"
  ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their votes"
  ON votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their votes"
  ON votes FOR DELETE
  USING (auth.uid() = user_id);

-- Function to get question with vote counts and answer count
CREATE OR REPLACE FUNCTION get_questions_with_stats()
RETURNS TABLE (
  id BIGINT,
  author_id UUID,
  author_name TEXT,
  author_role TEXT,
  title TEXT,
  description TEXT,
  tags TEXT[],
  views INTEGER,
  status TEXT,
  accepted_answer_id BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  upvotes BIGINT,
  downvotes BIGINT,
  answer_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.author_id,
    p.full_name as author_name,
    p.role as author_role,
    q.title,
    q.description,
    q.tags,
    q.views,
    q.status,
    q.accepted_answer_id,
    q.created_at,
    q.updated_at,
    COALESCE(SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END), 0)::BIGINT as upvotes,
    COALESCE(SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END), 0)::BIGINT as downvotes,
    COUNT(DISTINCT a.id)::BIGINT as answer_count
  FROM questions q
  LEFT JOIN profiles p ON q.author_id = p.id
  LEFT JOIN votes v ON v.votable_type = 'question' AND v.votable_id = q.id
  LEFT JOIN answers a ON a.question_id = q.id
  GROUP BY q.id, p.full_name, p.role
  ORDER BY q.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get answers with vote counts
CREATE OR REPLACE FUNCTION get_answers_for_question(p_question_id BIGINT)
RETURNS TABLE (
  id BIGINT,
  question_id BIGINT,
  author_id UUID,
  author_name TEXT,
  author_role TEXT,
  content TEXT,
  is_accepted BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  upvotes BIGINT,
  downvotes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.question_id,
    a.author_id,
    p.full_name as author_name,
    p.role as author_role,
    a.content,
    a.is_accepted,
    a.created_at,
    a.updated_at,
    COALESCE(SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END), 0)::BIGINT as upvotes,
    COALESCE(SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END), 0)::BIGINT as downvotes
  FROM answers a
  LEFT JOIN profiles p ON a.author_id = p.id
  LEFT JOIN votes v ON v.votable_type = 'answer' AND v.votable_id = a.id
  WHERE a.question_id = p_question_id
  GROUP BY a.id, p.full_name, p.role
  ORDER BY a.is_accepted DESC, a.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle vote
CREATE OR REPLACE FUNCTION toggle_vote(
  p_votable_type TEXT,
  p_votable_id BIGINT,
  p_vote_type INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Check if vote already exists
  IF EXISTS (
    SELECT 1 FROM votes 
    WHERE user_id = auth.uid() 
    AND votable_type = p_votable_type 
    AND votable_id = p_votable_id
  ) THEN
    -- If same vote type, remove it (toggle off)
    DELETE FROM votes
    WHERE user_id = auth.uid()
    AND votable_type = p_votable_type
    AND votable_id = p_votable_id
    AND vote_type = p_vote_type;
    
    -- If different vote type, update it
    UPDATE votes
    SET vote_type = p_vote_type
    WHERE user_id = auth.uid()
    AND votable_type = p_votable_type
    AND votable_id = p_votable_id
    AND vote_type != p_vote_type;
  ELSE
    -- Insert new vote
    INSERT INTO votes (user_id, votable_type, votable_id, vote_type)
    VALUES (auth.uid(), p_votable_type, p_votable_id, p_vote_type);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept an answer
CREATE OR REPLACE FUNCTION accept_answer(p_answer_id BIGINT)
RETURNS VOID AS $$
DECLARE
  v_question_id BIGINT;
  v_question_author UUID;
BEGIN
  -- Get question info
  SELECT question_id INTO v_question_id FROM answers WHERE id = p_answer_id;
  SELECT author_id INTO v_question_author FROM questions WHERE id = v_question_id;
  
  -- Only question author can accept answer
  IF v_question_author != auth.uid() THEN
    RAISE EXCEPTION 'Only question author can accept answers';
  END IF;
  
  -- Unaccept all other answers for this question
  UPDATE answers SET is_accepted = FALSE WHERE question_id = v_question_id;
  
  -- Accept this answer
  UPDATE answers SET is_accepted = TRUE WHERE id = p_answer_id;
  
  -- Update question status and accepted_answer_id
  UPDATE questions 
  SET status = 'answered', accepted_answer_id = p_answer_id
  WHERE id = v_question_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_question_views(p_question_id BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE questions SET views = views + 1 WHERE id = p_question_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to notify experts when question matches their expertise
CREATE OR REPLACE FUNCTION notify_matching_experts()
RETURNS TRIGGER AS $$
DECLARE
  v_tag TEXT;
  v_expert RECORD;
BEGIN
  -- For each tag in the question
  FOREACH v_tag IN ARRAY NEW.tags
  LOOP
    -- Find experts with matching expertise
    FOR v_expert IN 
      SELECT DISTINCT id, full_name
      FROM profiles
      WHERE id != NEW.author_id
      AND (
        v_tag = ANY(expertise)
        OR EXISTS (
          SELECT 1 FROM unnest(expertise) e WHERE e ILIKE '%' || v_tag || '%'
        )
      )
    LOOP
      -- Create notification for matching expert
      PERFORM create_notification(
        v_expert.id,
        'expertise_match',
        'Question in Your Area of Expertise',
        'A question was posted about ' || v_tag,
        '/knowledge',
        jsonb_build_object('question_id', NEW.id, 'tag', v_tag)
      );
    END LOOP;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_matching_experts
  AFTER INSERT ON questions
  FOR EACH ROW
  EXECUTE FUNCTION notify_matching_experts();

-- Insert sample questions for testing
INSERT INTO questions (author_id, title, description, tags, views, status)
SELECT 
  id,
  'How to optimize PostgreSQL queries for large datasets?',
  'I''m working with a table that has over 10 million rows and queries are getting slow. What are the best practices for optimization?',
  ARRAY['PostgreSQL', 'Performance', 'Database Design'],
  45,
  'open'
FROM profiles LIMIT 1;

INSERT INTO questions (author_id, title, description, tags, views, status)
SELECT 
  id,
  'Best practices for React state management in 2024?',
  'What are the current best practices for managing state in large React applications? Should I use Context API, Redux, or something else?',
  ARRAY['React', 'TypeScript', 'State Management'],
  78,
  'answered'
FROM profiles LIMIT 1 OFFSET 1;
