export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: string;
          team: string;
          expertise: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email: string;
          role: string;
          team: string;
          expertise: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: string;
          team?: string;
          expertise?: string;
          created_at?: string;
        };
      };
      topics: {
        Row: {
          id: string;
          title: string;
          views: number;
          previous_views: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          views?: number;
          previous_views?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          views?: number;
          previous_views?: number;
          created_at?: string;
        };
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          topic: string;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          topic: string;
          type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          topic?: string;
          type?: string;
          created_at?: string;
        };
      };
    };
    Functions: {
      get_dashboard_stats: {
        Args: Record<string, never>;
        Returns: {
          active_connections: number;
          knowledge_items: number;
          team_collaborations: number;
          hours_saved: number;
        };
      };
      get_historical_stats: {
        Args: Record<string, never>;
        Returns: {
          previous_connections: number;
          previous_items: number;
          previous_collaborations: number;
          previous_hours: number;
        };
      };
      get_suggested_experts: {
        Args: {
          user_id: string;
        };
        Returns: Array<{
          id: string;
          name: string;
          role: string;
          avatar: string;
          skills: string[];
          reason: string;
        }>;
      };
    };
  };
}