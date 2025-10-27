import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpertFinder } from '@/components/ExpertFinder';
import { createClient } from '@/utils/supabase/client';

// Mock the supabase client
vi.mock('@/utils/supabase/client');

describe('ExpertFinder Component', () => {
  const mockAccessToken = 'mock-access-token';
  const mockCurrentUserName = 'Test User';

  const mockExperts = [
    {
      id: 'expert-1',
      full_name: 'Alice Johnson',
      role: 'Senior Developer',
      team: 'Platform',
      department: 'Engineering',
      expertise: ['React', 'Node.js', 'AWS'],
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    },
    {
      id: 'expert-2',
      full_name: 'Bob Smith',
      role: 'Data Scientist',
      team: 'Analytics',
      department: 'Data Science',
      expertise: ['Python', 'Machine Learning', 'SQL'],
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    },
    {
      id: 'expert-3',
      full_name: 'Carol White',
      role: 'DevOps Engineer',
      team: 'Infrastructure',
      department: 'Engineering',
      expertise: ['AWS', 'Kubernetes', 'Docker'],
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock for createClient
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      })),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
  });

  describe('EF-001: Search experts by name', () => {
    it('should display matching experts when searching by name', async () => {
      const user = userEvent.setup();
      const mockSupabase = createClient() as any;

      // Mock the query chain
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // First call (initial load) - return all experts
      mockQuery.not.mockResolvedValueOnce({
        data: mockExperts,
        error: null,
      });

      render(<ExpertFinder accessToken={mockAccessToken} currentUserName={mockCurrentUserName} />);

      // Wait for experts to load
      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Search for specific expert by name
      const searchInput = screen.getByPlaceholderText(/search by name/i);
      await user.clear(searchInput);
      await user.type(searchInput, 'Alice');

      // Verify only matching expert is shown
      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
        expect(screen.queryByText('Carol White')).not.toBeInTheDocument();
      });
    });
  });

  describe('EF-002: Search experts by skill', () => {
    it('should display experts with matching skills', async () => {
      const user = userEvent.setup();
      const mockSupabase = createClient() as any;

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      mockQuery.not.mockResolvedValueOnce({
        data: mockExperts,
        error: null,
      });

      render(<ExpertFinder accessToken={mockAccessToken} currentUserName={mockCurrentUserName} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Search by skill
      const searchInput = screen.getByPlaceholderText(/search by name/i);
      await user.clear(searchInput);
      await user.type(searchInput, 'AWS');

      // Verify experts with AWS skill are shown (Alice and Carol)
      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.getByText('Carol White')).toBeInTheDocument();
        expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
      });
    });
  });

  describe('EF-003: Search with no matches', () => {
    it('should display "No experts found" message when search returns no matches', async () => {
      const user = userEvent.setup();
      const mockSupabase = createClient() as any;

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      mockQuery.not.mockResolvedValueOnce({
        data: mockExperts,
        error: null,
      });

      render(<ExpertFinder accessToken={mockAccessToken} currentUserName={mockCurrentUserName} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Search for non-existent expert
      const searchInput = screen.getByPlaceholderText(/search by name/i);
      await user.clear(searchInput);
      await user.type(searchInput, 'NonExistentPerson123');

      // Verify no experts message or no results
      await waitFor(() => {
        expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
        expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
        expect(screen.queryByText('Carol White')).not.toBeInTheDocument();
      });
    });
  });

  describe('EF-004: View all experts', () => {
    it('should display all experts when search field is empty', async () => {
      const user = userEvent.setup();
      const mockSupabase = createClient() as any;

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      mockQuery.not.mockResolvedValueOnce({
        data: mockExperts,
        error: null,
      });

      render(<ExpertFinder accessToken={mockAccessToken} currentUserName={mockCurrentUserName} />);

      // Wait for all experts to load
      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
        expect(screen.getByText('Carol White')).toBeInTheDocument();
      });

      // Type something in search
      const searchInput = screen.getByPlaceholderText(/search by name/i);
      await user.type(searchInput, 'Alice');

      await waitFor(() => {
        expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
      });

      // Clear search field
      await user.clear(searchInput);

      // Verify all experts are shown again
      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
        expect(screen.getByText('Carol White')).toBeInTheDocument();
      });
    });
  });

  describe('EF-005: Expert card display', () => {
    it('should display expert name, role, skills, and avatar', async () => {
      const mockSupabase = createClient() as any;

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      mockQuery.not.mockResolvedValueOnce({
        data: mockExperts,
        error: null,
      });

      render(<ExpertFinder accessToken={mockAccessToken} currentUserName={mockCurrentUserName} />);

      // Wait for expert cards to load
      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Verify all required information is displayed for first expert
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Senior Developer')).toBeInTheDocument();
      
      // Verify team/department info
      expect(screen.getByText('Platform')).toBeInTheDocument();
      
      // Verify skills are displayed (React, Node.js, AWS) - use getAllByText since skills may appear multiple times
      const reactElements = screen.getAllByText(/React/);
      expect(reactElements.length).toBeGreaterThan(0);
      
      const nodejsElements = screen.getAllByText(/Node\.js/);
      expect(nodejsElements.length).toBeGreaterThan(0);
      
      const awsElements = screen.getAllByText(/AWS/);
      expect(awsElements.length).toBeGreaterThan(0);

      // Verify action buttons are present
      expect(screen.getAllByRole('button', { name: /message/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /schedule/i }).length).toBeGreaterThan(0);
    });
  });
});
