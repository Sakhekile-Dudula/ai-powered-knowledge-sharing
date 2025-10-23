

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role?: string;
}

export interface AppComponentProps {
  accessToken: string | null;
}

export interface UserAwareComponentProps extends AppComponentProps {
  currentUserName: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role?: string;
  created_at?: string;
  updated_at?: string;
}