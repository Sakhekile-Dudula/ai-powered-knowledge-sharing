// Mock data for testing

export const mockUser = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'Software Engineer',
  team: 'Engineering',
  expertise: ['React', 'TypeScript', 'Testing'],
  department: 'MRI Research',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
};

export const mockProfiles = [
  {
    id: 'user-1',
    full_name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'Senior Developer',
    team: 'Platform',
    expertise: ['React', 'Node.js', 'AWS'],
    department: 'MRI Research',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
  },
  {
    id: 'user-2',
    full_name: 'Bob Smith',
    email: 'bob@example.com',
    role: 'Data Scientist',
    team: 'Analytics',
    expertise: ['Python', 'Machine Learning', 'SQL'],
    department: 'Cardiology',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
  },
];

export const mockKnowledgeItems = [
  {
    id: 1,
    title: 'React Best Practices',
    description: 'A comprehensive guide to React development',
    category: 'Development',
    tags: ['react', 'frontend', 'javascript'],
    author_id: 'user-1',
    created_at: '2025-10-20T10:00:00Z',
    views: 150,
    helpful_count: 25,
  },
  {
    id: 2,
    title: 'SQL Query Optimization',
    description: 'Tips for optimizing database queries',
    category: 'Database',
    tags: ['sql', 'database', 'performance'],
    author_id: 'user-2',
    created_at: '2025-10-22T14:30:00Z',
    views: 89,
    helpful_count: 12,
  },
];

export const mockConversations = [
  {
    id: 'conv-1',
    participantId: 'user-1',
    participantName: 'Alice Johnson',
    participantAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    lastMessage: 'Thanks for the help!',
    lastMessageTime: '2025-10-24T10:30:00Z',
    unreadCount: 2,
  },
  {
    id: 'conv-2',
    participantId: 'user-2',
    participantName: 'Bob Smith',
    participantAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    lastMessage: 'Can we schedule a meeting?',
    lastMessageTime: '2025-10-23T15:45:00Z',
    unreadCount: 0,
  },
];

export const mockMessages = [
  {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'user-1',
    content: 'Hi! I saw your expertise in React.',
    created_at: '2025-10-24T10:00:00Z',
  },
  {
    id: 'msg-2',
    conversation_id: 'conv-1',
    sender_id: 'test-user-id-123',
    content: 'Hi Alice! Yes, happy to help.',
    created_at: '2025-10-24T10:15:00Z',
  },
  {
    id: 'msg-3',
    conversation_id: 'conv-1',
    sender_id: 'user-1',
    content: 'Thanks for the help!',
    created_at: '2025-10-24T10:30:00Z',
  },
];

export const mockActivities = [
  {
    id: 'activity-1',
    user_id: 'user-1',
    action: 'shared',
    topic: 'React Best Practices',
    description: 'Shared a knowledge article',
    type: 'knowledge',
    created_at: '2025-10-24T09:00:00Z',
    related_item_id: 1,
  },
  {
    id: 'activity-2',
    user_id: 'user-2',
    action: 'connected',
    topic: 'Network Update',
    description: 'Connected with your team',
    type: 'connection',
    created_at: '2025-10-24T08:30:00Z',
    related_item_id: null,
  },
];

export const mockDashboardStats = {
  active_connections: 15,
  knowledge_items: 8,
  team_collaborations: 12,
  hours_saved: 45,
};

export const mockTrendingTopics = [
  {
    topic_title: 'Development',
    views: 450,
    item_count: 12,
    category: 'Development',
    trending_score: 320,
  },
  {
    topic_title: 'Database',
    views: 280,
    item_count: 8,
    category: 'Database',
    trending_score: 198,
  },
];
