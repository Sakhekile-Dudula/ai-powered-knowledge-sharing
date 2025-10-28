-- Create office hours table
-- Note: max_participants default should match VITE_DEFAULT_MAX_PARTICIPANTS in .env (default: 10)
CREATE TABLE IF NOT EXISTS office_hours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expert_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  topic TEXT NOT NULL,
  max_participants INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create office hours participants table
CREATE TABLE IF NOT EXISTS office_hours_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  office_hour_id UUID REFERENCES office_hours(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(office_hour_id, user_id)
);

-- Create collaboration requests table
CREATE TABLE IF NOT EXISTS collaboration_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collaborative documents table
CREATE TABLE IF NOT EXISTS collaborative_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document collaborators table
CREATE TABLE IF NOT EXISTS document_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES collaborative_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT DEFAULT 'edit' CHECK (permission IN ('view', 'edit', 'admin')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

-- Create video sessions table
CREATE TABLE IF NOT EXISTS video_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_code TEXT UNIQUE,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create video session participants table
CREATE TABLE IF NOT EXISTS video_session_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES video_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(session_id, user_id)
);

-- Enable RLS
ALTER TABLE office_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_hours_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_session_participants ENABLE ROW LEVEL SECURITY;

-- Office hours policies
CREATE POLICY "Anyone can view active office hours"
  ON office_hours FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Users can create their own office hours"
  ON office_hours FOR INSERT
  WITH CHECK (auth.uid() = expert_id);

CREATE POLICY "Users can update their own office hours"
  ON office_hours FOR UPDATE
  USING (auth.uid() = expert_id);

-- Office hours participants policies
CREATE POLICY "Anyone can view office hours participants"
  ON office_hours_participants FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can join office hours"
  ON office_hours_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave office hours"
  ON office_hours_participants FOR DELETE
  USING (auth.uid() = user_id);

-- Collaboration requests policies
CREATE POLICY "Users can view their collaboration requests"
  ON collaboration_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

CREATE POLICY "Users can create collaboration requests"
  ON collaboration_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update requests where they are the target"
  ON collaboration_requests FOR UPDATE
  USING (auth.uid() = target_id);

-- Collaborative documents policies
CREATE POLICY "Users can view documents they own or collaborate on"
  ON collaborative_documents FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM document_collaborators
      WHERE document_id = collaborative_documents.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own documents"
  ON collaborative_documents FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update documents they own or have edit permission"
  ON collaborative_documents FOR UPDATE
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM document_collaborators
      WHERE document_id = collaborative_documents.id
      AND user_id = auth.uid()
      AND permission IN ('edit', 'admin')
    )
  );

-- Document collaborators policies
CREATE POLICY "Users can view collaborators of their documents"
  ON document_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collaborative_documents
      WHERE id = document_id
      AND (owner_id = auth.uid() OR auth.uid() = document_collaborators.user_id)
    )
  );

CREATE POLICY "Document owners can add collaborators"
  ON document_collaborators FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collaborative_documents
      WHERE id = document_id
      AND owner_id = auth.uid()
    )
  );

-- Video sessions policies
CREATE POLICY "Anyone can view active video sessions"
  ON video_sessions FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Users can create video sessions"
  ON video_sessions FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their sessions"
  ON video_sessions FOR UPDATE
  USING (auth.uid() = host_id);

-- Video session participants policies
CREATE POLICY "Anyone can view session participants"
  ON video_session_participants FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can join video sessions"
  ON video_session_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create functions
CREATE OR REPLACE FUNCTION get_office_hours_with_details()
RETURNS TABLE (
  id UUID,
  expert_id UUID,
  expert_name TEXT,
  expert_role TEXT,
  day_of_week TEXT,
  start_time TIME,
  end_time TIME,
  topic TEXT,
  max_participants INTEGER,
  current_participants BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oh.id,
    oh.expert_id,
    COALESCE(p.full_name, u.email) as expert_name,
    COALESCE(p.role, 'User') as expert_role,
    oh.day_of_week,
    oh.start_time,
    oh.end_time,
    oh.topic,
    oh.max_participants,
    COUNT(ohp.user_id) as current_participants
  FROM office_hours oh
  LEFT JOIN auth.users u ON oh.expert_id = u.id
  LEFT JOIN profiles p ON oh.expert_id = p.id
  LEFT JOIN office_hours_participants ohp ON oh.id = ohp.office_hour_id
  WHERE oh.is_active = TRUE
  GROUP BY oh.id, oh.expert_id, p.full_name, u.email, p.role, 
           oh.day_of_week, oh.start_time, oh.end_time, oh.topic, oh.max_participants;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_office_hours_expert ON office_hours(expert_id);
CREATE INDEX IF NOT EXISTS idx_office_hours_active ON office_hours(is_active);
CREATE INDEX IF NOT EXISTS idx_office_hours_participants_office ON office_hours_participants(office_hour_id);
CREATE INDEX IF NOT EXISTS idx_collab_requests_requester ON collaboration_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_collab_requests_target ON collaboration_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_collab_requests_status ON collaboration_requests(status);
CREATE INDEX IF NOT EXISTS idx_collab_docs_owner ON collaborative_documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_doc_collaborators_doc ON document_collaborators(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_collaborators_user ON document_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_host ON video_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_active ON video_sessions(is_active);
