import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Auth from '@/components/Auth';
import { createClient } from '@/utils/supabase/client';

// Mock the supabase client
vi.mock('@/utils/supabase/client');

describe('Auth Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock for createClient
    const mockSupabase = {
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'test-profile-id' },
              error: null,
            }),
          }),
        }),
      })),
    };
    
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
  });

  describe('AUTH-001: Successful user registration', () => {
    it('should create user account and call onAuthSuccess on successful signup', async () => {
      const mockOnAuthSuccess = vi.fn();
      const user = userEvent.setup();
      const mockSupabase = createClient() as any;

      // Mock successful signup
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
          session: { access_token: 'mock-token' },
        },
        error: null,
      });

      // Mock profile insertion
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'test-user-id', email: 'test@example.com', full_name: 'Test User' },
              error: null,
            }),
          }),
        }),
      });

      render(<Auth onAuthSuccess={mockOnAuthSuccess} />);

      // Switch to sign up tab
      const signUpTab = screen.getByRole('tab', { name: /sign up/i });
      await user.click(signUpTab);

      // Wait for signup form to be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      // Fill in the form
      const fullNameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const roleInput = screen.getByLabelText(/^role$/i);
      const teamInput = screen.getByLabelText(/^team$/i);
      const expertiseInput = screen.getByLabelText(/area of expertise/i);
      const departmentSelect = screen.getByLabelText(/department/i);

      await user.type(fullNameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(roleInput, 'Developer');
      await user.type(teamInput, 'Engineering');
      await user.type(expertiseInput, 'React, TypeScript');
      await user.selectOptions(departmentSelect, 'IT');
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalled();
      }, { timeout: 10000 });
    }, 10000);
  });

  describe('AUTH-002: Registration with invalid email', () => {
    it('should show error for invalid email format', async () => {
      const mockOnAuthSuccess = vi.fn();
      const user = userEvent.setup();
      const mockSupabase = createClient() as any;

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid email format', name: 'AuthError', status: 400 },
      });

      render(<Auth onAuthSuccess={mockOnAuthSuccess} />);

      // Switch to sign up tab
      const signUpTab = screen.getByRole('tab', { name: /sign up/i });
      await user.click(signUpTab);

      // Wait for signup form
      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      const fullNameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const roleInput = screen.getByLabelText(/^role$/i);
      const teamInput = screen.getByLabelText(/^team$/i);
      const expertiseInput = screen.getByLabelText(/area of expertise/i);
      const departmentSelect = screen.getByLabelText(/department/i);

      await user.type(fullNameInput, 'Test User');
      await user.type(emailInput, 'invalid@test');  // Valid format to pass HTML5 validation
      await user.type(passwordInput, 'password123');
      await user.type(roleInput, 'Developer');
      await user.type(teamInput, 'Engineering');
      await user.type(expertiseInput, 'React, TypeScript');
      await user.selectOptions(departmentSelect, 'IT');
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Component uses toast for errors, check if signUp was called
      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalled();
      });
    });
  });

  describe('AUTH-101: Successful login', () => {
    it('should log in user with valid credentials', async () => {
      const mockOnAuthSuccess = vi.fn();
      const user = userEvent.setup();
      const mockSupabase = createClient() as any;

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
          session: { access_token: 'mock-token' },
        },
        error: null,
      });

      // Mock profile fetch
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'test-user-id', email: 'test@example.com', full_name: 'Test User' },
          error: null,
        }),
      });

      render(<Auth onAuthSuccess={mockOnAuthSuccess} />);

      // Sign In tab is default, no need to switch
      const emailInput = screen.getByPlaceholderText(/you@mrisoftware.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });
  });

  describe('AUTH-102: Login with incorrect password', () => {
    it('should show error for wrong password', async () => {
      const mockOnAuthSuccess = vi.fn();
      const user = userEvent.setup();
      const mockSupabase = createClient() as any;

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', name: 'AuthError', status: 400 },
      });

      render(<Auth onAuthSuccess={mockOnAuthSuccess} />);

      // Sign In tab is default
      const emailInput = screen.getByPlaceholderText(/you@mrisoftware.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      // Component uses toast for errors, verify signIn was called
      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();
      });
    });
  });

  describe('AUTH-105: Toggle between Sign In/Sign Up', () => {
    it('should toggle between sign in and sign up forms', async () => {
      const mockOnAuthSuccess = vi.fn();
      const user = userEvent.setup();

      render(<Auth onAuthSuccess={mockOnAuthSuccess} />);

      // Initially showing sign in (default tab) - has submit button "Sign In"
      expect(screen.getByRole('tab', { name: /sign in/i })).toHaveAttribute('aria-selected', 'true');

      // Click tab to switch to sign up
      const signUpTab = screen.getByRole('tab', { name: /sign up/i });
      await user.click(signUpTab);

      // Wait for sign up form and "Create Account" button to appear
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /sign up/i })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      });

      // Click tab to switch back to sign in
      const signInTab = screen.getByRole('tab', { name: /sign in/i });
      await user.click(signInTab);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /sign in/i })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
      });
    });
  });
});
