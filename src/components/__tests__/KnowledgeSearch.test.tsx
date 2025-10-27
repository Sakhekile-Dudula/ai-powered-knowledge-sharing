import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KnowledgeSearch } from '@/components/KnowledgeSearch';

// Mock fetch globally
global.fetch = vi.fn();

describe('KnowledgeSearch Component', () => {
  const mockAccessToken = 'mock-access-token';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('KS-001: Basic text search', () => {
    it('should display relevant results when searching with a term', async () => {
      const user = userEvent.setup();
      
      // Mock search results
      const mockResults = [
        {
          id: 1,
          title: 'React Best Practices',
          description: 'A comprehensive guide to React development',
          type: 'document',
          author: 'Alice Johnson',
          team: 'Engineering',
          date: '2025-10-20',
          relevance: 95,
          tags: ['react', 'frontend'],
        },
        {
          id: 2,
          title: 'React Testing Guide',
          description: 'How to test React components effectively',
          type: 'document',
          author: 'Bob Smith',
          team: 'QA',
          date: '2025-10-22',
          relevance: 88,
          tags: ['react', 'testing'],
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockResults }),
      });

      render(<KnowledgeSearch accessToken={mockAccessToken} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search knowledge/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search knowledge/i);
      await user.type(searchInput, 'React');
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Verify results are displayed
      await waitFor(() => {
        expect(screen.getByText('React Best Practices')).toBeInTheDocument();
        expect(screen.getByText('React Testing Guide')).toBeInTheDocument();
      });

      // Verify result count
      expect(screen.getByText(/found/i)).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();

      // Verify fetch was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=React'),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
      );
    });
  });

  describe('KS-002: Search with no results', () => {
    it('should display "No results found" message when search returns empty', async () => {
      const user = userEvent.setup();

      // Mock empty search results
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      render(<KnowledgeSearch accessToken={mockAccessToken} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search knowledge/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search knowledge/i);
      await user.type(searchInput, 'NonexistentTerm12345');
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Verify "No results found" message is displayed
      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });
  });

  describe('KS-003: Empty search query', () => {
    it('should display all documents when search field is empty', async () => {
      const user = userEvent.setup();

      const mockAllResults = [
        {
          id: 1,
          title: 'React Best Practices',
          description: 'A comprehensive guide to React development',
          type: 'document',
          author: 'Alice Johnson',
          team: 'Engineering',
          date: '2025-10-20',
          tags: ['react', 'frontend'],
        },
        {
          id: 2,
          title: 'SQL Query Optimization',
          description: 'Tips for optimizing database queries',
          type: 'document',
          author: 'Bob Smith',
          team: 'Database',
          date: '2025-10-22',
          tags: ['sql', 'database'],
        },
        {
          id: 3,
          title: 'API Integration Guide',
          description: 'How to integrate third-party APIs',
          type: 'document',
          author: 'Carol White',
          team: 'Backend',
          date: '2025-10-23',
          tags: ['api', 'integration'],
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockAllResults }),
      });

      render(<KnowledgeSearch accessToken={mockAccessToken} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search knowledge/i)).toBeInTheDocument();
      });

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Verify all documents are displayed
      await waitFor(() => {
        expect(screen.getByText('React Best Practices')).toBeInTheDocument();
        expect(screen.getByText('SQL Query Optimization')).toBeInTheDocument();
        expect(screen.getByText('API Integration Guide')).toBeInTheDocument();
      });

      // Verify fetch was called without query parameter
      expect(global.fetch).toHaveBeenCalledWith(
        expect.not.stringContaining('q='),
        expect.any(Object)
      );
    });
  });

  describe('KS-004: Search with special characters', () => {
    it('should handle special characters gracefully', async () => {
      const user = userEvent.setup();

      // Mock search results - search should still work with special chars
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      render(<KnowledgeSearch accessToken={mockAccessToken} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search knowledge/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search knowledge/i);
      await user.type(searchInput, '!@#$%^&*()');
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Verify the search doesn't crash and handles gracefully
      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });

      // Verify fetch was called with special characters
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q='),
        expect.any(Object)
      );
    });
  });

  describe('KS-005: Search result relevance', () => {
    it('should display most relevant results first', async () => {
      const user = userEvent.setup();

      const mockResults = [
        {
          id: 1,
          title: 'Advanced TypeScript Patterns',
          description: 'Expert-level TypeScript programming',
          type: 'document',
          author: 'Alice Johnson',
          team: 'Engineering',
          date: '2025-10-20',
          relevance: 98,
          tags: ['typescript', 'advanced'],
        },
        {
          id: 2,
          title: 'TypeScript Basics',
          description: 'Introduction to TypeScript',
          type: 'document',
          author: 'Bob Smith',
          team: 'Training',
          date: '2025-10-21',
          relevance: 75,
          tags: ['typescript', 'beginner'],
        },
        {
          id: 3,
          title: 'TypeScript Best Practices',
          description: 'Guidelines for TypeScript development',
          type: 'document',
          author: 'Carol White',
          team: 'Engineering',
          date: '2025-10-22',
          relevance: 92,
          tags: ['typescript', 'best-practices'],
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockResults }),
      });

      render(<KnowledgeSearch accessToken={mockAccessToken} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search knowledge/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search knowledge/i);
      await user.type(searchInput, 'TypeScript');
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Verify results are displayed
      await waitFor(() => {
        expect(screen.getByText('Advanced TypeScript Patterns')).toBeInTheDocument();
        expect(screen.getByText('TypeScript Basics')).toBeInTheDocument();
        expect(screen.getByText('TypeScript Best Practices')).toBeInTheDocument();
      });

      // Verify relevance scores are shown
      expect(screen.getByText('98% match')).toBeInTheDocument();
      expect(screen.getByText('75% match')).toBeInTheDocument();
      expect(screen.getByText('92% match')).toBeInTheDocument();

      // Get all result cards
      const resultTitles = screen.getAllByRole('heading', { level: 3 });
      
      // The first result should have the highest relevance (98%)
      expect(resultTitles[0]).toHaveTextContent('Advanced TypeScript Patterns');
    });
  });
});
