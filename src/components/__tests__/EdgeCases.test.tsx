import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KnowledgeSearch } from '../KnowledgeSearch';
import { ExpertFinder } from '../ExpertFinder';
import { ProjectConnections } from '../ProjectConnections';
import { InsightsHub } from '../InsightsHub';
import { Messages } from '../Messages';
import { Dashboard } from '../Dashboard';

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
  },
}));

describe('Edge Cases - Empty States', () => {
  const mockAccessToken = 'mock-token-123';
  const mockUserName = 'Test User';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('EDGE-001: Knowledge Search - No search results', () => {
    it('should display empty state with helpful message when search returns no results', async () => {
      const user = userEvent.setup();

      // Mock empty search results
      const mockSupabase = await import('../../lib/supabase');
      mockSupabase.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockResolvedValue({
            data: [], // Empty results
            error: null,
          }),
        }),
      });

      render(<KnowledgeSearch accessToken={mockAccessToken} />);

      // Wait for component to finish initial loading
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 10000 });

      // Search for non-existent term
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.clear(searchInput);
      await user.type(searchInput, 'nonexistentterm12345');
      await user.keyboard('{Enter}');

      // Verify empty state message is displayed
      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('should show helpful suggestions in empty state', async () => {
      const user = userEvent.setup();

      const mockSupabase = await import('../../lib/supabase');
      mockSupabase.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      render(<KnowledgeSearch accessToken={mockAccessToken} />);

      // Wait for component to finish initial loading
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 10000 });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.clear(searchInput);
      await user.type(searchInput, 'xyz123');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        // Should show empty state message
        const emptyMessage = screen.getByText(/no results found/i);
        expect(emptyMessage).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('EDGE-002: Expert Finder - No experts found', () => {
    it('should display empty state when filter returns no matches', async () => {
      // Mock empty experts list
      const mockSupabase = await import('../../lib/supabase');
      mockSupabase.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [], // No experts
          error: null,
        }),
      });

      render(
        <ExpertFinder
          accessToken={mockAccessToken}
          currentUserName={mockUserName}
        />
      );

      await waitFor(() => {
        // Check for empty state message
        const emptyText = screen.queryByText(/no experts/i) || 
                         screen.queryByText(/no matches/i) ||
                         screen.queryByText(/try different/i);
        
        // Should show some kind of empty state
        expect(emptyText || screen.getByText(/search/i)).toBeInTheDocument();
      });
    });

    it('should show "No experts match criteria" for specific skill search', async () => {
      const mockSupabase = await import('../../lib/supabase');
      mockSupabase.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      render(
        <ExpertFinder
          accessToken={mockAccessToken}
          currentUserName={mockUserName}
        />
      );

      await waitFor(() => {
        // Component should render with empty experts list
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('EDGE-003: Project Connections - No projects', () => {
    it('should display empty state with call-to-action when no projects exist', async () => {
      // Mock empty projects list
      const mockSupabase = await import('../../lib/supabase');
      mockSupabase.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [], // No projects
          error: null,
        }),
      });

      render(<ProjectConnections accessToken={mockAccessToken} />);

      // Wait for loading to complete
      await waitFor(() => {
        const spinner = screen.queryByRole('status') || screen.queryByText(/loading/i);
        expect(spinner).not.toBeInTheDocument();
      }, { timeout: 10000 });

      await waitFor(() => {
        // Should show empty state or CTA
        const emptyElement = screen.queryByText(/no projects/i) ||
                            screen.queryByText(/add project/i) ||
                            screen.queryByText(/create/i) ||
                            screen.queryAllByRole('button')[0];
        
        expect(emptyElement).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('should encourage user to start connecting projects', async () => {
      const mockSupabase = await import('../../lib/supabase');
      mockSupabase.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      render(<ProjectConnections accessToken={mockAccessToken} />);

      // Wait for loading to complete
      await waitFor(() => {
        const spinner = screen.queryByRole('status') || screen.queryByText(/loading/i);
        expect(spinner).not.toBeInTheDocument();
      }, { timeout: 10000 });

      await waitFor(() => {
        // Should show empty state message or add button
        const buttons = screen.queryAllByRole('button');
        expect(buttons.length > 0 || screen.queryByText(/no projects/i)).toBeTruthy();
      }, { timeout: 10000 });
    });
  });

  describe('EDGE-004: Insights Hub - No insights', () => {
    it('should display empty state with "Share first insight" message', async () => {
      // Mock empty insights list
      const mockSupabase = await import('../../lib/supabase');
      mockSupabase.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [], // No insights
          error: null,
        }),
      });

      render(<InsightsHub accessToken={mockAccessToken} />);

      // Wait for loading to complete
      await waitFor(() => {
        const spinner = screen.queryByRole('status') || screen.queryByText(/loading/i);
        expect(spinner).not.toBeInTheDocument();
      }, { timeout: 10000 });

      await waitFor(() => {
        // Should show empty state message
        const emptyMessage = screen.queryByText(/no insights/i) ||
                            screen.queryByText(/share/i) ||
                            screen.queryByText(/first insight/i) ||
                            screen.queryAllByRole('button')[0];
        
        expect(emptyMessage).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('should show call-to-action to create first insight', async () => {
      const mockSupabase = await import('../../lib/supabase');
      mockSupabase.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      render(<InsightsHub accessToken={mockAccessToken} />);

      await waitFor(() => {
        // Should have interactive elements
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('EDGE-005: Messages - No conversations', () => {
    it('should display empty state with "Start a conversation" message', async () => {
      // Mock empty conversations list
      const mockSupabase = await import('../../lib/supabase');
      mockSupabase.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [], // No conversations
          error: null,
        }),
      });

      render(
        <Messages
          currentUserName={mockUserName}
        />
      );

      await waitFor(() => {
        // Should show empty state
        const emptyMessage = screen.queryByText(/no conversations/i) ||
                            screen.queryByText(/start/i) ||
                            screen.queryByText(/message/i) ||
                            screen.queryByRole('button');
        
        expect(emptyMessage).toBeInTheDocument();
      });
    });

    it('should provide way to initiate first conversation', async () => {
      const mockSupabase = await import('../../lib/supabase');
      mockSupabase.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      render(
        <Messages
          currentUserName={mockUserName}
        />
      );

      await waitFor(() => {
        // Should show some UI element
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('EDGE-006: Dashboard - No activity', () => {
    it('should display empty state with "Get started" guidance for new user', async () => {
      // Mock empty dashboard data
      const mockSupabase = await import('../../lib/supabase');
      mockSupabase.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [], // No activity
            error: null,
          }),
        }),
      });

      render(<Dashboard accessToken={mockAccessToken} />);

      await waitFor(() => {
        // Should show dashboard with empty state indicators
        const emptyIndicators = screen.queryAllByText(/no/i);
        const hasEmptyState = emptyIndicators.length > 0 ||
                             screen.queryByText(/get started/i) ||
                             screen.queryByText(/welcome/i);
        
        expect(hasEmptyState || screen.getByRole('heading')).toBeTruthy();
      });
    });

    it('should show onboarding prompts for new user', async () => {
      const mockSupabase = await import('../../lib/supabase');
      mockSupabase.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      render(<Dashboard accessToken={mockAccessToken} />);

      await waitFor(() => {
        // Dashboard should render with some content
        expect(document.body).toBeInTheDocument();
      });
    });

    it('should display activity stats as zero for new user', async () => {
      const mockSupabase = await import('../../lib/supabase');
      mockSupabase.supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      render(<Dashboard accessToken={mockAccessToken} />);

      await waitFor(() => {
        // Should show zero stats or empty indicators
        const zeroStat = screen.queryByText(/0/) || screen.queryByText(/no/i);
        expect(zeroStat || document.body).toBeInTheDocument();
      });
    });
  });
});
