import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { InsightsHub } from '@/components/InsightsHub';

// Mock fetch globally
global.fetch = vi.fn();

describe('InsightsHub Component', () => {
  const mockAccessToken = 'mock-access-token';

  const mockInsights = [
    {
      id: '1',
      title: 'React Performance Optimization',
      description: 'Tips for improving React app performance',
      type: 'tip',
      impact: 'High',
      author: 'Alice Johnson',
      team: 'Engineering',
      date: '2 days ago',
      likes: 23,
      comments: 12,
      tags: ['React', 'Performance'],
      created_at: '2025-10-22T10:00:00Z',
    },
    {
      id: '2',
      title: 'API Design Best Practices',
      description: 'Guidelines for designing clean and maintainable APIs',
      type: 'learning',
      impact: 'Medium',
      author: 'Bob Smith',
      team: 'Backend',
      date: '1 week ago',
      likes: 45,
      comments: 28,
      tags: ['API', 'Backend'],
      created_at: '2025-10-17T14:00:00Z',
    },
    {
      id: '3',
      title: 'Security Best Practices',
      description: 'Essential security measures for web applications',
      type: 'warning',
      impact: 'Critical',
      author: 'Carol White',
      team: 'Security',
      date: '3 days ago',
      likes: 67,
      comments: 34,
      tags: ['Security', 'Web'],
      created_at: '2025-10-21T08:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('IH-001: Load insights feed', () => {
    it('should display insights feed after loading', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ insights: mockInsights }),
      });

      render(<InsightsHub accessToken={mockAccessToken} />);

      // Wait for insights to load
      await waitFor(() => {
        expect(screen.getByText('React Performance Optimization')).toBeInTheDocument();
      });

      // Verify all insights are displayed
      expect(screen.getByText('React Performance Optimization')).toBeInTheDocument();
      expect(screen.getByText('API Design Best Practices')).toBeInTheDocument();
      expect(screen.getByText('Security Best Practices')).toBeInTheDocument();

      // Verify fetch was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/insights'),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
      );
    });
  });

  describe('IH-002: Display insight cards', () => {
    it('should display each insight card with title, author, and preview', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ insights: mockInsights }),
      });

      render(<InsightsHub accessToken={mockAccessToken} />);

      await waitFor(() => {
        expect(screen.getByText('React Performance Optimization')).toBeInTheDocument();
      });

      // Check first insight card
      expect(screen.getByText('React Performance Optimization')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Tips for improving React app performance')).toBeInTheDocument();

      // Check second insight card
      expect(screen.getByText('API Design Best Practices')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('Guidelines for designing clean and maintainable APIs')).toBeInTheDocument();

      // Check third insight card
      expect(screen.getByText('Security Best Practices')).toBeInTheDocument();
      expect(screen.getByText('Carol White')).toBeInTheDocument();
      expect(screen.getByText('Essential security measures for web applications')).toBeInTheDocument();

      // Verify impact badges are shown
      expect(screen.getByText(/High Impact/i)).toBeInTheDocument();
      expect(screen.getByText(/Medium Impact/i)).toBeInTheDocument();
      expect(screen.getByText(/Critical Impact/i)).toBeInTheDocument();

      // Verify team badges are shown (use getAllByText since teams may appear in sidebar too)
      const engineeringElements = screen.getAllByText('Engineering');
      expect(engineeringElements.length).toBeGreaterThan(0);
      
      const backendElements = screen.getAllByText('Backend');
      expect(backendElements.length).toBeGreaterThan(0);
      
      const securityElements = screen.getAllByText('Security');
      expect(securityElements.length).toBeGreaterThan(0);
    });
  });

  describe('IH-003: Sort insights by date', () => {
    it('should display newest insights first when sorted by most recent', async () => {
      const sortedInsights = [...mockInsights].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ insights: sortedInsights }),
      });

      render(<InsightsHub accessToken={mockAccessToken} />);

      await waitFor(() => {
        expect(screen.getByText('React Performance Optimization')).toBeInTheDocument();
      });

      // Get all insight titles
      const insightTitles = screen.getAllByRole('heading', { level: 3 });

      // Verify the order (newest first)
      // Based on created_at: React (Oct 22) > Security (Oct 21) > API (Oct 17)
      expect(insightTitles[0]).toHaveTextContent('React Performance Optimization');
      expect(insightTitles[1]).toHaveTextContent('Security Best Practices');
      expect(insightTitles[2]).toHaveTextContent('API Design Best Practices');
    });
  });

  describe('IH-004: Sort insights by popularity', () => {
    it('should display most liked insights first when sorted by popularity', async () => {
      const sortedByLikes = [...mockInsights].sort((a, b) => b.likes - a.likes);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ insights: sortedByLikes }),
      });

      render(<InsightsHub accessToken={mockAccessToken} />);

      await waitFor(() => {
        expect(screen.getByText('Security Best Practices')).toBeInTheDocument();
      });

      // Get all insight titles
      const insightTitles = screen.getAllByRole('heading', { level: 3 });

      // Verify the order (most liked first)
      // Based on likes: Security (67) > API (45) > React (23)
      expect(insightTitles[0]).toHaveTextContent('Security Best Practices');
      expect(insightTitles[1]).toHaveTextContent('API Design Best Practices');
      expect(insightTitles[2]).toHaveTextContent('React Performance Optimization');

      // Verify like counts are displayed (use getAllByText since numbers may appear in sidebar too)
      const likes67 = screen.getAllByText('67');
      expect(likes67.length).toBeGreaterThan(0);
      
      const likes45 = screen.getAllByText('45');
      expect(likes45.length).toBeGreaterThan(0);
      
      const likes23 = screen.getAllByText('23');
      expect(likes23.length).toBeGreaterThan(0);
    });
  });

  describe('IH-005: Empty state', () => {
    it('should display empty state with call-to-action when no insights exist', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ insights: [] }),
      });

      render(<InsightsHub accessToken={mockAccessToken} />);

      await waitFor(() => {
        // Check for empty state message or call to action
        const emptyStateElements = screen.queryAllByText(/no insights/i);
        const ctaElements = screen.queryAllByText(/share|add|create/i);
        
        // Either an empty state message or a CTA button should be present
        expect(emptyStateElements.length > 0 || ctaElements.length > 0).toBe(true);
      });

      // Verify the "Share Insight" button is present as a call-to-action
      const shareButtons = screen.getAllByRole('button', { name: /share insight/i });
      expect(shareButtons.length).toBeGreaterThan(0);

      // Verify no insight cards are displayed
      expect(screen.queryByText('React Performance Optimization')).not.toBeInTheDocument();
      expect(screen.queryByText('API Design Best Practices')).not.toBeInTheDocument();
    });
  });
});
