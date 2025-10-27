import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock all child components BEFORE importing App
// Note: App.tsx imports these as NAMED exports, so we must mock both named and default
vi.mock('../Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard-component">Dashboard Component</div>,
  default: () => <div data-testid="dashboard-component">Dashboard Component</div>,
}));

vi.mock('../KnowledgeSearch', () => ({
  KnowledgeSearch: () => <div data-testid="knowledge-search-component">Knowledge Search Component</div>,
  default: () => <div data-testid="knowledge-search-component">Knowledge Search Component</div>,
}));

vi.mock('../ExpertFinder', () => ({
  ExpertFinder: () => <div data-testid="expert-finder-component">Expert Finder Component</div>,
  default: () => <div data-testid="expert-finder-component">Expert Finder Component</div>,
}));

vi.mock('../ProjectConnections', () => ({
  ProjectConnections: () => <div data-testid="project-connections-component">Project Connections Component</div>,
  default: () => <div data-testid="project-connections-component">Project Connections Component</div>,
}));

vi.mock('../Messages', () => ({
  Messages: () => <div data-testid="messages-component">Messages Component</div>,
  default: () => <div data-testid="messages-component">Messages Component</div>,
}));

vi.mock('../InsightsHub', () => ({
  InsightsHub: () => <div data-testid="insights-hub-component">Insights Hub Component</div>,
  default: () => <div data-testid="insights-hub-component">Insights Hub Component</div>,
}));

import App from '../../App';

// Mock Supabase
vi.mock('../../utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
            },
            access_token: 'mock-token',
          },
        },
      }),
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => {
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'user-123',
          full_name: 'Test User',
          email: 'test@example.com',
          role: 'User',
        },
        error: null,
      }),
    })),
  })),
}));

// Mock fetch for data fetching
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
) as any;

describe('Navigation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NAV-001: Navigate to Dashboard', () => {
    it('should load Dashboard when Dashboard tab is clicked', async () => {
      render(<App />);

      // Wait for auth to complete and tabs to appear
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Dashboard/i })).toBeInTheDocument();
      });

      // Dashboard component should be visible by default
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-component')).toBeInTheDocument();
      });
    });

    it('should return to Dashboard when clicking Dashboard tab from another page', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Wait for tabs to load
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Search/i })).toBeInTheDocument();
      });

      // Navigate away to Search
      const searchTab = screen.getByRole('tab', { name: /Search/i });
      await user.click(searchTab);

      // Verify Knowledge Search loads
      await waitFor(() => {
        expect(screen.getByTestId('knowledge-search-component')).toBeInTheDocument();
      });

      // Navigate back to Dashboard
      const dashboardTab = screen.getByRole('tab', { name: /Dashboard/i });
      await user.click(dashboardTab);

      // Dashboard component should be visible again
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-component')).toBeInTheDocument();
      });
    });
  });

  describe('NAV-002: Navigate to Knowledge Search', () => {
    it('should load Knowledge Search when Search tab is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Search/i })).toBeInTheDocument();
      });

      const searchTab = screen.getByRole('tab', { name: /Search/i });
      await user.click(searchTab);

      await waitFor(() => {
        expect(screen.getByTestId('knowledge-search-component')).toBeInTheDocument();
      });
    });

    it('should display Knowledge Search interface', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Search/i })).toBeInTheDocument();
      });

      const searchTab = screen.getByRole('tab', { name: /Search/i });
      await user.click(searchTab);

      // Verify component renders
      await waitFor(() => {
        expect(screen.getByTestId('knowledge-search-component')).toBeInTheDocument();
        expect(screen.queryByTestId('dashboard-component')).not.toBeInTheDocument();
      });
    });
  });

  describe('NAV-003: Navigate to Expert Finder', () => {
    it('should load Expert Finder when Experts tab is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Experts/i })).toBeInTheDocument();
      });

      const expertsTab = screen.getByRole('tab', { name: /Experts/i });
      await user.click(expertsTab);

      await waitFor(() => {
        expect(screen.getByTestId('expert-finder-component')).toBeInTheDocument();
      });
    });

    it('should display Expert Finder interface', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Experts/i })).toBeInTheDocument();
      });

      const expertsTab = screen.getByRole('tab', { name: /Experts/i });
      await user.click(expertsTab);

      // Verify component renders and Dashboard is hidden
      await waitFor(() => {
        expect(screen.getByTestId('expert-finder-component')).toBeInTheDocument();
        expect(screen.queryByTestId('dashboard-component')).not.toBeInTheDocument();
      });
    });
  });

  describe('NAV-004: Navigate to Project Connections', () => {
    it('should load Project Connections when Projects tab is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Projects/i })).toBeInTheDocument();
      });

      const projectsTab = screen.getByRole('tab', { name: /Projects/i });
      await user.click(projectsTab);

      await waitFor(() => {
        expect(screen.getByTestId('project-connections-component')).toBeInTheDocument();
      });
    });

    it('should display Project Connections interface', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Projects/i })).toBeInTheDocument();
      });

      const projectsTab = screen.getByRole('tab', { name: /Projects/i });
      await user.click(projectsTab);

      // Verify component renders
      await waitFor(() => {
        expect(screen.getByTestId('project-connections-component')).toBeInTheDocument();
        expect(screen.queryByTestId('dashboard-component')).not.toBeInTheDocument();
      });
    });
  });

  describe('NAV-005: Navigate to Insights Hub', () => {
    it('should load Insights Hub when Insights tab is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Insights/i })).toBeInTheDocument();
      });

      const insightsTab = screen.getByRole('tab', { name: /Insights/i });
      await user.click(insightsTab);

      await waitFor(() => {
        expect(screen.getByTestId('insights-hub-component')).toBeInTheDocument();
      });
    });

    it('should display Insights Hub interface', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Insights/i })).toBeInTheDocument();
      });

      const insightsTab = screen.getByRole('tab', { name: /Insights/i });
      await user.click(insightsTab);

      // Verify component renders
      await waitFor(() => {
        expect(screen.getByTestId('insights-hub-component')).toBeInTheDocument();
        expect(screen.queryByTestId('dashboard-component')).not.toBeInTheDocument();
      });
    });
  });

  describe('NAV-006: Navigate to Messages', () => {
    it('should load Messages when Messages tab is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Messages/i })).toBeInTheDocument();
      });

      const messagesTab = screen.getByRole('tab', { name: /Messages/i });
      await user.click(messagesTab);

      await waitFor(() => {
        expect(screen.getByTestId('messages-component')).toBeInTheDocument();
      });
    });

    it('should display Messages interface', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Messages/i })).toBeInTheDocument();
      });

      const messagesTab = screen.getByRole('tab', { name: /Messages/i });
      await user.click(messagesTab);

      // Verify component renders
      await waitFor(() => {
        expect(screen.getByTestId('messages-component')).toBeInTheDocument();
        expect(screen.queryByTestId('dashboard-component')).not.toBeInTheDocument();
      });
    });
  });

  describe('NAV-007: Active nav state', () => {
    it('should switch between components when tabs are clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Dashboard/i })).toBeInTheDocument();
      });

      // Click on Search tab
      const searchTab = screen.getByRole('tab', { name: /Search/i });
      await user.click(searchTab);

      // Search component should be visible
      await waitFor(() => {
        expect(screen.getByTestId('knowledge-search-component')).toBeInTheDocument();
        expect(screen.queryByTestId('dashboard-component')).not.toBeInTheDocument();
      });
    });

    it('should maintain only one active component at a time', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Dashboard/i })).toBeInTheDocument();
      });

      // Click through tabs and verify only one component is visible
      const tabTests = [
        { name: 'Search', testId: 'knowledge-search-component' },
        { name: 'Experts', testId: 'expert-finder-component' },
        { name: 'Projects', testId: 'project-connections-component' },
      ];
      
      for (const { name, testId } of tabTests) {
        const tab = screen.getByRole('tab', { name: new RegExp(name, 'i') });
        await user.click(tab);

        await waitFor(() => {
          // Current component should be visible
          expect(screen.getByTestId(testId)).toBeInTheDocument();
          // Dashboard should not be visible
          expect(screen.queryByTestId('dashboard-component')).not.toBeInTheDocument();
        });
      }
    });

    it('should display all navigation tabs', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Dashboard/i })).toBeInTheDocument();
      });

      // Verify all 6 tabs are present
      expect(screen.getByRole('tab', { name: /Dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Search/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Experts/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Projects/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Messages/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Insights/i })).toBeInTheDocument();
    });
  });

  describe('Additional Navigation Tests', () => {
    it('should preserve navigation state when staying on a tab', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Experts/i })).toBeInTheDocument();
      });

      // Navigate to Experts tab
      const expertsTab = screen.getByRole('tab', { name: /Experts/i });
      await user.click(expertsTab);

      await waitFor(() => {
        expect(screen.getByTestId('expert-finder-component')).toBeInTheDocument();
      });

      // Expert Finder component should still be visible
      expect(screen.getByTestId('expert-finder-component')).toBeInTheDocument();
    });

    it('should handle rapid tab switching', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Dashboard/i })).toBeInTheDocument();
      });

      // Rapidly click different tabs
      const dashboardTab = screen.getByRole('tab', { name: /Dashboard/i });
      const searchTab = screen.getByRole('tab', { name: /Search/i });
      const expertsTab = screen.getByRole('tab', { name: /Experts/i });

      await user.click(searchTab);
      await user.click(expertsTab);
      await user.click(dashboardTab);
      await user.click(searchTab);

      // Final component (Search) should be visible
      await waitFor(() => {
        expect(screen.getByTestId('knowledge-search-component')).toBeInTheDocument();
      });
    });
  });
});
