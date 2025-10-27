import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '@/components/Dashboard';
import { mockDashboardStats, mockActivities, mockTrendingTopics, mockProfiles } from '@/test/mockData';
import { createClient } from '@/utils/supabase/client';

vi.mock('@/utils/supabase/client');

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Transform activities to match Dashboard's ActivityData interface
    const transformedActivities = mockActivities.map(act => ({
      id: act.id,
      user: act.user_id === 'user-1' ? 'Alice Johnson' : 'Bob Smith',
      action: act.action,
      topic: act.topic,
      timestamp: act.created_at,
      type: act.type,
      userAvatar: act.user_id === 'user-1' ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice' : 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    }));
    
    // Mock the createClient function to return a mock Supabase client
    const mockRpc = vi.fn((fn: string) => {
      const mockData: Record<string, any> = {
        get_dashboard_stats: { data: mockDashboardStats, error: null },
        get_historical_stats: { data: null, error: { message: 'Not implemented' } },
        get_recent_activity: { data: transformedActivities, error: null },
        get_trending_topics_with_items: { data: mockTrendingTopics, error: null },
        get_smart_suggested_connections: { data: mockProfiles, error: null },
      };
      
      const result = mockData[fn] || { data: [], error: null };
      // Create a proper promise that can be awaited
      const promise = Promise.resolve(result);
      // Add limit as a method property that returns the same promise for chainability
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
  });

  describe('DASH-001: Dashboard loads successfully', () => {
    it('should display dashboard with all widgets', async () => {
      render(<Dashboard accessToken="mock-token" />);

      // Check if main sections are present
      await waitFor(() => {
        expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
        expect(screen.getByText(/suggested connections/i)).toBeInTheDocument();
        expect(screen.getByText(/trending topics/i)).toBeInTheDocument();
      });
    });
  });

  describe('DASH-002: Activity feed displays', () => {
    it('should display recent activities chronologically', async () => {
      render(<Dashboard accessToken="mock-token" />);

      await waitFor(() => {
        expect(screen.getByText(/react best practices/i)).toBeInTheDocument();
        expect(screen.getByText(/network update/i)).toBeInTheDocument();
      });
    });
  });

  describe('DASH-003: Suggested connections display', () => {
    it('should show relevant experts/connections', async () => {
      render(<Dashboard accessToken="mock-token" />);

      await waitFor(() => {
        const aliceElements = screen.getAllByText(/alice johnson/i);
        expect(aliceElements.length).toBeGreaterThan(0);
        const bobElements = screen.getAllByText(/bob smith/i);
        expect(bobElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('DASH-004: Quick stats display', () => {
    it('should show correct stat counts', async () => {
      render(<Dashboard accessToken="mock-token" />);

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument(); // Active connections
        expect(screen.getByText('8')).toBeInTheDocument(); // Knowledge items
        expect(screen.getByText('12')).toBeInTheDocument(); // Team collaborations
        expect(screen.getByText('45')).toBeInTheDocument(); // Hours saved
      });
    });
  });

  describe('DASH-101: Click on activity item', () => {
    it('should open activity detail dialog when clicked', async () => {
      const user = userEvent.setup();
      
      // Transform activities to match Dashboard's ActivityData interface
      const transformedActivities = mockActivities.map(act => ({
        id: act.id,
        user: act.user_id === 'user-1' ? 'Alice Johnson' : 'Bob Smith',
        action: act.action,
        topic: act.topic,
        timestamp: act.created_at,
        type: act.type,
        userAvatar: act.user_id === 'user-1' ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice' : 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
      }));
      
      // Mock get_activity_detail RPC call
      const mockRpc = vi.fn((fn: string) => {
        if (fn === 'get_activity_detail') {
          const result = {
            data: [{
              ...mockActivities[0],
              user_name: 'Alice Johnson',
              user_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
              user_department: 'MRI Research',
            }],
            error: null,
          };
          const promise = Promise.resolve(result);
          (promise as any).limit = vi.fn(() => promise);
          return promise;
        }
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

      // Wait for activities to load
      await waitFor(() => {
        expect(screen.getByText(/react best practices/i)).toBeInTheDocument();
      });

      // Click on activity
      const activityItem = screen.getByText(/react best practices/i).closest('div[role="button"]');
      if (activityItem) {
        await user.click(activityItem);
        
        // Check if dialog opens
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
      }
    });
  });

  describe('DASH-005: Empty state - new user', () => {
    it('should show empty state messages for new user', async () => {
      // Mock empty data
      const mockRpc = vi.fn(() => {
        const result = { data: [], error: null };
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

      await waitFor(() => {
        expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
        expect(screen.getByText(/no trending topics/i)).toBeInTheDocument();
      });
    });
  });

  describe('DASH-102: Click on suggested expert', () => {
    it('should show expert details when hovering', async () => {
      const user = userEvent.setup();
      render(<Dashboard accessToken="mock-token" />);

      await waitFor(() => {
        const aliceElements = screen.getAllByText(/alice johnson/i);
        expect(aliceElements.length).toBeGreaterThan(0);
      });

      // Hover over expert card in suggested connections section
      const aliceElements = screen.getAllByText(/alice johnson/i);
      const expertCard = aliceElements[aliceElements.length - 1]; // Get the last one (from suggested connections)
      await user.hover(expertCard);

      // Hover card should show additional details
      await waitFor(() => {
        expect(screen.getByText(/senior developer/i)).toBeInTheDocument();
      });
    });
  });

  describe('DASH-103: Click on suggested connection card', () => {
    it('should show Connect button when connection card is displayed', async () => {
      const user = userEvent.setup();
      render(<Dashboard accessToken="mock-token" />);

      // Wait for suggested connections to load
      await waitFor(() => {
        const aliceElements = screen.getAllByText(/alice johnson/i);
        expect(aliceElements.length).toBeGreaterThan(0);
      });

      // Check that Connect buttons are present
      const connectButtons = screen.getAllByRole('button', { name: /connect/i });
      expect(connectButtons.length).toBeGreaterThan(0);

      // Click a Connect button
      await user.click(connectButtons[0]);
      
      // Button should be clickable (basic interaction test)
      expect(connectButtons[0]).toBeInTheDocument();
    });
  });

  describe('DASH-104: Click on trending topic', () => {
    it('should open topic dialog when topic is clicked', async () => {
      const user = userEvent.setup();
      
      // Mock get_topic_items RPC call
      const mockRpc = vi.fn((fn: string) => {
        if (fn === 'get_topic_items') {
          const result = {
            data: [
              {
                id: '1',
                title: 'React Best Practices',
                type: 'article',
                created_at: '2024-01-15T10:30:00Z',
              },
              {
                id: '2',
                title: 'Component Patterns',
                type: 'discussion',
                created_at: '2024-01-14T14:20:00Z',
              },
            ],
            error: null,
          };
          const promise = Promise.resolve(result);
          (promise as any).limit = vi.fn(() => promise);
          return promise;
        }
        
        const transformedActivities = mockActivities.map(act => ({
          id: act.id,
          user: act.user_id === 'user-1' ? 'Alice Johnson' : 'Bob Smith',
          action: act.action,
          topic: act.topic,
          timestamp: act.created_at,
          type: act.type,
          userAvatar: act.user_id === 'user-1' ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice' : 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
        }));
        
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

      // Wait for trending topics to load
      await waitFor(() => {
        expect(screen.getByText(/react best practices/i)).toBeInTheDocument();
      });

      // Click on a trending topic
      const topicElement = screen.getByText(/react best practices/i);
      await user.click(topicElement);

      // Check if dialog opens
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });
      
      // Verify dialog contains the topic items
      const dialog = screen.getByRole('dialog');
      const dialogItems = within(dialog).getAllByText(/react best practices/i);
      expect(dialogItems.length).toBeGreaterThan(0);
    });
  });

  describe('DASH-105: Click on stats card for details', () => {
    it('should open connections dialog when Active Connections card is clicked', async () => {
      const user = userEvent.setup();
      
      // Mock get_user_connections RPC call
      const mockRpc = vi.fn((fn: string) => {
        if (fn === 'get_user_connections') {
          const result = {
            data: [
              {
                id: 'user-1',
                full_name: 'Alice Johnson',
                role: 'Senior Developer',
                department: 'MRI Research',
                skills: ['React', 'TypeScript', 'Node.js'],
                avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
              },
              {
                id: 'user-2',
                full_name: 'Bob Smith',
                role: 'Data Scientist',
                department: 'Analytics',
                skills: ['Python', 'Machine Learning', 'SQL'],
                avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
              },
            ],
            error: null,
          };
          const promise = Promise.resolve(result);
          (promise as any).limit = vi.fn(() => promise);
          return promise;
        }
        
        const transformedActivities = mockActivities.map(act => ({
          id: act.id,
          user: act.user_id === 'user-1' ? 'Alice Johnson' : 'Bob Smith',
          action: act.action,
          topic: act.topic,
          timestamp: act.created_at,
          type: act.type,
          userAvatar: act.user_id === 'user-1' ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice' : 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
        }));
        
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

      // Wait for stats to load
      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument();
      });

      // Find and click the Active Connections card
      const connectionsCard = screen.getByText(/active connections/i).closest('.cursor-pointer');
      expect(connectionsCard).toBeInTheDocument();
      
      if (connectionsCard) {
        await user.click(connectionsCard as Element);

        // Check if dialog opens with connections
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
      }
    });
  });
});
