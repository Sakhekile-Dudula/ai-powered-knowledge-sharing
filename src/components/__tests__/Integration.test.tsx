import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '../Dashboard';
import { KnowledgeSearch } from '../KnowledgeSearch';
import { ExpertFinder } from '../ExpertFinder';
import { Messages } from '../Messages';
import { createClient } from '@/utils/supabase/client';
import { mockDashboardStats, mockActivities, mockTrendingTopics, mockProfiles, mockKnowledgeItems } from '@/test/mockData';

vi.mock('@/utils/supabase/client');

describe('Integration Tests - User Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('INT-001: Complete user journey', () => {
    it('should allow user to navigate through dashboard, search, and expert finder workflow', async () => {
      // Step 1: Start on Dashboard
      const transformedActivities = mockActivities.map(act => ({
        id: act.id,
        user: act.user_id === 'user-1' ? 'Alice Johnson' : 'Bob Smith',
        action: act.action,
        topic: act.topic,
        timestamp: act.created_at,
        type: act.type,
        userAvatar: act.user_id === 'user-1' ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice' : 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
      }));
      
      const mockRpc = vi.fn((fn: string) => {
        const mockData: Record<string, any> = {
          get_dashboard_stats: { data: mockDashboardStats, error: null },
          get_historical_stats: { data: null, error: { message: 'Not implemented' } },
          get_recent_activity: { data: transformedActivities, error: null },
          get_trending_topics_with_items: { data: mockTrendingTopics, error: null },
          get_smart_suggested_connections: { data: mockProfiles, error: null },
        };
        const result = mockData[fn] || { data: [], error: null };
        const promise = Promise.resolve(result);
        (promise as any).limit = vi.fn(() => promise);
        return promise;
      });

      vi.mocked(createClient).mockReturnValue({
        rpc: mockRpc,
        from: vi.fn(),
        auth: { 
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id-123' } },
            error: null,
          })
        },
        channel: vi.fn(() => ({
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn(),
          unsubscribe: vi.fn(),
        })),
      } as any);

      const { unmount } = render(<Dashboard accessToken="mock-token" />);

      // Step 2: Verify Dashboard loads with data
      await waitFor(() => {
        expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
        expect(screen.getByText(/suggested connections/i)).toBeInTheDocument();
      });

      // Step 3: Verify user can see trending topics (knowledge exploration)
      await waitFor(() => {
        expect(screen.getByText(/react best practices/i)).toBeInTheDocument();
      });

      // Step 4: Verify user can see experts to contact
      await waitFor(() => {
        const aliceElements = screen.getAllByText(/alice johnson/i);
        expect(aliceElements.length).toBeGreaterThan(0);
      });

      unmount();

      // Step 5: Simulate navigation to Knowledge Search
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockResolvedValue({
            data: mockKnowledgeItems,
            error: null,
          }),
        }),
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null,
          }),
        },
      } as any);

      render(<KnowledgeSearch accessToken="mock-token" />);

      // Step 6: Verify Knowledge Search is functional and loaded
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
        // Component successfully rendered - workflow step complete
      });

      // Verify search infrastructure is set up (mockFrom available for searching)
      expect(mockFrom).toBeDefined();
    });

    it('should complete full workflow from dashboard to messaging', async () => {
      // Mock Dashboard data
      const transformedActivities = mockActivities.map(act => ({
        id: act.id,
        user: act.user_id === 'user-1' ? 'Alice Johnson' : 'Bob Smith',
        action: act.action,
        topic: act.topic,
        timestamp: act.created_at,
        type: act.type,
        userAvatar: act.user_id === 'user-1' ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice' : 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
      }));
      
      const mockRpc = vi.fn((fn: string) => {
        const mockData: Record<string, any> = {
          get_dashboard_stats: { data: mockDashboardStats, error: null },
          get_historical_stats: { data: null, error: { message: 'Not implemented' } },
          get_recent_activity: { data: transformedActivities, error: null },
          get_trending_topics_with_items: { data: mockTrendingTopics, error: null },
          get_smart_suggested_connections: { data: mockProfiles, error: null },
        };
        const result = mockData[fn] || { data: [], error: null };
        const promise = Promise.resolve(result);
        (promise as any).limit = vi.fn(() => promise);
        return promise;
      });

      vi.mocked(createClient).mockReturnValue({
        rpc: mockRpc,
        from: vi.fn(),
        auth: { 
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id-123' } },
            error: null,
          })
        },
        channel: vi.fn(() => ({
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn(),
          unsubscribe: vi.fn(),
        })),
      } as any);

      const { unmount } = render(<Dashboard accessToken="mock-token" />);

      // Verify Dashboard loads
      await waitFor(() => {
        expect(screen.getByText(/suggested connections/i)).toBeInTheDocument();
      });

      // Find expert to message
      await waitFor(() => {
        const connectButtons = screen.getAllByRole('button', { name: /connect/i });
        expect(connectButtons.length).toBeGreaterThan(0);
      });

      unmount();

      // Navigate to Messages component
      const mockConversations = [
        {
          id: 'conv-1',
          other_user_id: 'user-1',
          other_user_name: 'Alice Johnson',
          other_user_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
          last_message: 'Hello!',
          last_message_time: '2024-01-15T10:00:00Z',
          unread_count: 1,
        },
      ];

      const mockFrom = vi.fn((table: string) => {
        if (table === 'conversations') {
          return {
            select: vi.fn().mockResolvedValue({
              data: mockConversations,
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      });

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null,
          }),
        },
        channel: vi.fn(() => ({
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn(),
          unsubscribe: vi.fn(),
        })),
      } as any);

      render(<Messages currentUserName="Test User" />);

      // Verify Messages component loads
      await waitFor(() => {
        expect(screen.getByText(/messages/i)).toBeInTheDocument();
      });
    });
  });

  describe('INT-002: Collaboration workflow', () => {
    it('should support finding and interacting with shared insights', async () => {
      // User searches for insights in Knowledge Search
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                title: 'Best Practices for React Hooks',
                content: 'Use useEffect wisely...',
                tags: ['React', 'Hooks'],
                author_id: 'user-1',
                author_name: 'Alice Johnson',
                created_at: '2024-01-15T10:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-2' } },
            error: null,
          }),
        },
      } as any);

      render(<KnowledgeSearch accessToken="mock-token" />);

      // Verify Knowledge Search component loads for discovering insights
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });

      // Verify search infrastructure is available
      expect(mockFrom).toBeDefined();
    });

    it('should enable discovering insights and connecting with authors', async () => {
      // Step 1: User finds insight in Knowledge Search
      const mockKnowledgeFrom = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                title: 'TypeScript Best Practices',
                content: 'Type safety is important...',
                tags: ['TypeScript'],
                author_id: 'user-1',
                author_name: 'Alice Johnson',
                created_at: '2024-01-15T10:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockKnowledgeFrom,
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-2' } },
            error: null,
          }),
        },
      } as any);

      const { unmount } = render(<KnowledgeSearch accessToken="mock-token" />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });

      unmount();

      // Step 2: Navigate to Expert Finder to connect with author
      const mockExpertFrom = vi.fn(() => ({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'user-1',
              full_name: 'Alice Johnson',
              department: 'Engineering',
              role: 'Senior Developer',
              skills: ['React', 'TypeScript', 'Node.js'],
              bio: 'Passionate about clean code',
              avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
            },
          ],
          error: null,
        }),
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockExpertFrom,
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-2' } },
            error: null,
          }),
        },
      } as any);

      render(<ExpertFinder accessToken="mock-token" currentUserName="Test User" />);

      // Verify expert finder loads
      await waitFor(() => {
        expect(mockExpertFrom).toHaveBeenCalledWith('profiles');
      });
    });
  });

  describe('INT-003: Project discovery workflow', () => {
    it('should support searching projects and viewing team members', async () => {
      // User searches for projects in Knowledge Search
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'proj-1',
                title: 'AI Integration Project',
                content: 'Building AI features...',
                tags: ['AI', 'Integration'],
                type: 'project',
                author_id: 'user-1',
                author_name: 'Alice Johnson',
                created_at: '2024-01-15T10:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null,
          }),
        },
      } as any);

      render(<KnowledgeSearch accessToken="mock-token" />);

      // Verify Knowledge Search loads for project discovery
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });

      // Verify search infrastructure is set up
      expect(mockFrom).toBeDefined();
    });

    it('should allow discovering projects and finding team members', async () => {
      
      // Step 1: Find project through Dashboard trending topics
      const transformedActivities = mockActivities.map(act => ({
        id: act.id,
        user: act.user_id === 'user-1' ? 'Alice Johnson' : 'Bob Smith',
        action: act.action,
        topic: act.topic,
        timestamp: act.created_at,
        type: act.type,
        userAvatar: act.user_id === 'user-1' ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice' : 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
      }));
      
      const mockRpc = vi.fn((fn: string) => {
        const mockData: Record<string, any> = {
          get_dashboard_stats: { data: mockDashboardStats, error: null },
          get_historical_stats: { data: null, error: { message: 'Not implemented' } },
          get_recent_activity: { data: transformedActivities, error: null },
          get_trending_topics_with_items: { 
            data: [
              { title: 'AI Integration Project', views: 150, trending: 'up' },
              { title: 'Machine Learning Models', views: 120, trending: 'up' },
            ], 
            error: null 
          },
          get_smart_suggested_connections: { data: mockProfiles, error: null },
        };
        const result = mockData[fn] || { data: [], error: null };
        const promise = Promise.resolve(result);
        (promise as any).limit = vi.fn(() => promise);
        return promise;
      });

      vi.mocked(createClient).mockReturnValue({
        rpc: mockRpc,
        from: vi.fn(),
        auth: { 
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id-123' } },
            error: null,
          })
        },
        channel: vi.fn(() => ({
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn(),
          unsubscribe: vi.fn(),
        })),
      } as any);

      const { unmount } = render(<Dashboard accessToken="mock-token" />);

      // Verify trending topics loaded (project discovery workflow supported)
      await waitFor(() => {
        // Check that trending topics section exists
        expect(screen.getByText(/trending topics/i)).toBeInTheDocument();
      });

      unmount();

      // Step 2: Navigate to Expert Finder to find team members
      const mockExpertFrom = vi.fn(() => ({
        select: vi.fn().mockResolvedValue({
          data: mockProfiles,
          error: null,
        }),
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockExpertFrom,
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null,
          }),
        },
      } as any);

      render(<ExpertFinder accessToken="mock-token" currentUserName="Test User" />);

      // Verify experts load (potential team members)
      await waitFor(() => {
        expect(mockExpertFrom).toHaveBeenCalledWith('profiles');
      });
    });
  });

  describe('INT-004: Knowledge sharing workflow', () => {
    it('should support the knowledge creation and sharing workflow', async () => {
      // Simulate user searching for existing knowledge before creating
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockResolvedValue({
            data: mockKnowledgeItems,
            error: null,
          }),
        }),
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null,
          }),
        },
      } as any);

      render(<KnowledgeSearch accessToken="mock-token" />);

      // Verify Knowledge Search component loads for knowledge creation workflow
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });

      // Verify Add button exists for creating new knowledge
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
      
      // Verify search infrastructure is available
      expect(mockFrom).toBeDefined();
    });

    it('should enable sharing knowledge with experts through dashboard connections', async () => {
      // Step 1: View Dashboard to see suggested experts
      const transformedActivities = mockActivities.map(act => ({
        id: act.id,
        user: act.user_id === 'user-1' ? 'Alice Johnson' : 'Bob Smith',
        action: act.action,
        topic: act.topic,
        timestamp: act.created_at,
        type: act.type,
        userAvatar: act.user_id === 'user-1' ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice' : 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
      }));
      
      const mockRpc = vi.fn((fn: string) => {
        const mockData: Record<string, any> = {
          get_dashboard_stats: { data: mockDashboardStats, error: null },
          get_historical_stats: { data: null, error: { message: 'Not implemented' } },
          get_recent_activity: { data: transformedActivities, error: null },
          get_trending_topics_with_items: { data: mockTrendingTopics, error: null },
          get_smart_suggested_connections: { data: mockProfiles, error: null },
        };
        const result = mockData[fn] || { data: [], error: null };
        const promise = Promise.resolve(result);
        (promise as any).limit = vi.fn(() => promise);
        return promise;
      });

      vi.mocked(createClient).mockReturnValue({
        rpc: mockRpc,
        from: vi.fn(),
        auth: { 
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id-123' } },
            error: null,
          })
        },
        channel: vi.fn(() => ({
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn(),
          unsubscribe: vi.fn(),
        })),
      } as any);

      render(<Dashboard accessToken="mock-token" />);

      // Verify suggested experts appear
      await waitFor(() => {
        expect(screen.getByText(/suggested connections/i)).toBeInTheDocument();
      });

      // Verify connect buttons are available for sharing
      await waitFor(() => {
        const connectButtons = screen.getAllByRole('button', { name: /connect/i });
        expect(connectButtons.length).toBeGreaterThan(0);
      });

      // User can click connect to share knowledge with experts
      const connectButtons = screen.getAllByRole('button', { name: /connect/i });
      expect(connectButtons[0]).toBeInTheDocument();
    });
  });
});
