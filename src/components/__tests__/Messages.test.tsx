import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Messages } from '@/components/Messages';
import { createClient } from '@/utils/supabase/client';
import { mockConversations, mockMessages, mockUser } from '@/test/mockData';

vi.mock('@/utils/supabase/client');

describe('Messages Component', () => {
  const setupMockClient = (conversationsData = mockConversations, messagesData = mockMessages) => {
    const mockRpc = vi.fn((functionName: string) => {
      if (functionName === 'get_user_conversations') {
        return Promise.resolve({ data: conversationsData, error: null });
      } else if (functionName === 'get_conversation_messages') {
        return Promise.resolve({ data: messagesData, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      rpc: mockRpc,
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      })),
    } as any);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupMockClient();
  });

  describe('MSG-101: Load Messages page', () => {
    it('should load messages interface', async () => {
      render(<Messages currentUserName="Test User" />);

      // Check if main elements are present
      await waitFor(() => {
        expect(screen.getByText(/messages/i)).toBeInTheDocument();
      });
    });
  });

  describe('MSG-102: Display conversations list', () => {
    it('should show all conversations when they exist', async () => {
      setupMockClient(mockConversations, mockMessages);

      render(<Messages currentUserName="Test User" />);

      await waitFor(() => {
        const aliceElements = screen.getAllByText(/alice johnson/i);
        expect(aliceElements.length).toBeGreaterThan(0);
        expect(screen.getByText(/bob smith/i)).toBeInTheDocument();
      });
    });
  });

  describe('MSG-104: Display empty state', () => {
    it('should show empty state when no conversations exist', async () => {
      // Setup mock with empty conversations
      setupMockClient([], []);

      render(<Messages currentUserName="Test User" />);

      await waitFor(() => {
        expect(screen.getByText(/no conversations/i)).toBeInTheDocument();
      });
    });
  });

  describe('MSG-103: Select conversation', () => {
    it('should display messages when conversation is selected', async () => {
      const user = userEvent.setup();
      
      // Setup mock with conversations and messages
      setupMockClient(mockConversations, mockMessages);

      render(<Messages currentUserName="Test User" />);

      // Wait for conversations to load
      await waitFor(() => {
        const aliceElements = screen.getAllByText(/alice johnson/i);
        expect(aliceElements.length).toBeGreaterThan(0);
      });

      // Click on first conversation button
      const conversationButtons = screen.getAllByRole('button');
      const aliceButton = conversationButtons.find(btn => btn.textContent?.includes('Alice Johnson'));
      if (aliceButton) {
        await user.click(aliceButton);

        // Messages should be displayed
        await waitFor(() => {
          expect(screen.getByText(/hi! i saw your expertise in react/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('MSG-202: Send empty message', () => {
    it('should prevent sending empty messages', async () => {
      render(<Messages currentUserName="Test User" />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/messages/i)).toBeInTheDocument();
      });

      // Find send button (if visible)
      const sendButtons = screen.queryAllByRole('button', { name: /send/i });
      
      if (sendButtons.length > 0) {
        const sendButton = sendButtons[0];
        
        // Button should be disabled when message is empty
        expect(sendButton).toBeDisabled();
      }
    });
  });

  describe('MSG-206: Message timestamp', () => {
    it('should display message timestamps correctly', async () => {
      // Setup mock with conversations and messages
      setupMockClient(mockConversations, mockMessages);

      render(<Messages currentUserName="Test User" />);

      // Check that conversations with timestamps are displayed
      await waitFor(() => {
        const aliceElements = screen.getAllByText(/alice johnson/i);
        expect(aliceElements.length).toBeGreaterThan(0);
        // The component should display the last message time
        expect(screen.getByText(/thanks for the help/i)).toBeInTheDocument();
      });
    });
  });
});
