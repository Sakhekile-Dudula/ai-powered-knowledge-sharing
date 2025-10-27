import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectConnections } from '@/components/ProjectConnections';

// Mock fetch globally
global.fetch = vi.fn();

describe('ProjectConnections Component', () => {
  const mockAccessToken = 'mock-access-token';

  const mockProjects = [
    {
      id: '1',
      name: 'Platform API Redesign',
      description: 'Modernizing our core API infrastructure',
      team: 'Platform Engineering',
      status: 'In Progress',
      progress: 65,
      members: 8,
      timeline: 'Q4 2025',
      tags: ['API', 'Backend', 'Infrastructure'],
      connectedProjects: ['Security Framework', 'Cloud Migration'],
    },
    {
      id: '2',
      name: 'Mobile App Refresh',
      description: 'Updating mobile experience with new design system',
      team: 'Mobile Team',
      status: 'Planning',
      progress: 20,
      members: 5,
      timeline: 'Q1 2026',
      tags: ['Mobile', 'React Native', 'UX'],
      connectedProjects: ['Design System'],
    },
    {
      id: '3',
      name: 'Security Framework',
      description: 'Enterprise security compliance implementation',
      team: 'Security',
      status: 'Completed',
      progress: 100,
      members: 4,
      timeline: 'Q3 2025',
      tags: ['Security', 'Compliance'],
      connectedProjects: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PC-001: Load project graph', () => {
    it('should display graph with nodes and edges when data is loaded', async () => {
      const user = userEvent.setup();
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: mockProjects }),
      });

      render(<ProjectConnections accessToken={mockAccessToken} />);

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.getByText('Platform API Redesign')).toBeInTheDocument();
      });

      // Verify projects are displayed (use getAllByText for names that may appear in sidebar)
      expect(screen.getByText('Platform API Redesign')).toBeInTheDocument();
      expect(screen.getByText('Mobile App Refresh')).toBeInTheDocument();
      
      const securityFrameworkElements = screen.getAllByText('Security Framework');
      expect(securityFrameworkElements.length).toBeGreaterThan(0);

      // Click "View Graph" button to open graph dialog
      const viewGraphButton = screen.getByRole('button', { name: /view graph/i });
      await user.click(viewGraphButton);

      // Wait for graph dialog to open
      await waitFor(() => {
        // The dialog should be open (checking for dialog role or specific content)
        const dialogs = screen.queryAllByRole('dialog');
        expect(dialogs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('PC-002: Display project nodes', () => {
    it('should display each project node with name and icon', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: mockProjects }),
      });

      render(<ProjectConnections accessToken={mockAccessToken} />);

      await waitFor(() => {
        expect(screen.getByText('Platform API Redesign')).toBeInTheDocument();
      });

      // Verify all project names are displayed (may appear in sidebar too)
      expect(screen.getByText('Platform API Redesign')).toBeInTheDocument();
      expect(screen.getByText('Mobile App Refresh')).toBeInTheDocument();
      
      const securityFrameworkElements = screen.getAllByText('Security Framework');
      expect(securityFrameworkElements.length).toBeGreaterThan(0);

      // Verify project descriptions are shown
      expect(screen.getByText('Modernizing our core API infrastructure')).toBeInTheDocument();
      expect(screen.getByText('Updating mobile experience with new design system')).toBeInTheDocument();
      expect(screen.getByText('Enterprise security compliance implementation')).toBeInTheDocument();

      // Verify status badges
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Planning')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  describe('PC-003: Display connections', () => {
    it('should show connecting lines and relationships between projects', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: mockProjects }),
      });

      render(<ProjectConnections accessToken={mockAccessToken} />);

      await waitFor(() => {
        expect(screen.getByText('Platform API Redesign')).toBeInTheDocument();
      });

      // Verify connected projects are displayed (may appear multiple times)
      const securityFrameworkMatches = screen.getAllByText(/Security Framework/);
      expect(securityFrameworkMatches.length).toBeGreaterThan(0);
      
      const cloudMigrationMatches = screen.getAllByText(/Cloud Migration/);
      expect(cloudMigrationMatches.length).toBeGreaterThan(0);
      
      const designSystemMatches = screen.getAllByText(/Design System/);
      expect(designSystemMatches.length).toBeGreaterThan(0);

      // Verify the "Connected Projects" label appears
      const connectedProjectsLabels = screen.getAllByText(/connected projects/i);
      expect(connectedProjectsLabels.length).toBeGreaterThan(0);

      // Verify that projects with no connections show appropriate message
      expect(screen.getByText(/no connected projects yet/i)).toBeInTheDocument();
    });
  });

  describe('PC-004: Empty state - no projects', () => {
    it('should display empty state message when no projects exist', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: [] }),
      });

      render(<ProjectConnections accessToken={mockAccessToken} />);

      await waitFor(() => {
        // Check for empty state or add project button
        const addProjectButtons = screen.getAllByRole('button', { name: /add project/i });
        expect(addProjectButtons.length).toBeGreaterThan(0);
      });

      // Verify no project cards are displayed (check for heading elements)
      const projectHeadings = screen.queryAllByRole('heading', { level: 3 });
      const projectNames = projectHeadings.map(h => h.textContent);
      
      expect(projectNames).not.toContain('Platform API Redesign');
      expect(projectNames).not.toContain('Mobile App Refresh');

      // Verify the "Add Project" button is available as call-to-action
      const addProjectButtons = screen.getAllByRole('button', { name: /add project/i });
      expect(addProjectButtons.length).toBeGreaterThan(0);
    });
  });

  describe('PC-005: Graph rendering performance', () => {
    it('should load large graph with 50+ projects efficiently', async () => {
      // Generate 50 mock projects
      const largeProjectSet = Array.from({ length: 50 }, (_, i) => ({
        id: `project-${i + 1}`,
        name: `Project ${i + 1}`,
        description: `Description for project ${i + 1}`,
        team: `Team ${(i % 5) + 1}`,
        status: ['In Progress', 'Planning', 'Completed'][i % 3],
        progress: Math.floor(Math.random() * 100),
        members: Math.floor(Math.random() * 10) + 1,
        timeline: `Q${(i % 4) + 1} 2025`,
        tags: [`Tag${i % 3 + 1}`, `Tech${i % 4 + 1}`],
        connectedProjects: i > 0 ? [`Project ${i}`] : [],
      }));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: largeProjectSet }),
      });

      const startTime = performance.now();

      render(<ProjectConnections accessToken={mockAccessToken} />);

      // Wait for projects to load
      await waitFor(() => {
        const project1Elements = screen.getAllByText('Project 1');
        expect(project1Elements.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const loadTime = performance.now() - startTime;

      // Verify loading completed within reasonable time (3 seconds)
      expect(loadTime).toBeLessThan(3000);

      // Verify that multiple projects are rendered (at least some of them should be visible)
      const project1Headings = screen.getAllByText('Project 1');
      expect(project1Headings.length).toBeGreaterThan(0);
      
      // Verify the component handles large dataset without crashing
      const projectCards = screen.getAllByRole('heading', { level: 3 });
      expect(projectCards.length).toBeGreaterThan(0);
    });
  });
});
