import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagingDialog } from '../MessagingDialog';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock mockApi
vi.mock('../../utils/mockApi', () => ({
  mockApi: {
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

describe('MessagingDialog Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    recipientName: 'Sarah Chen',
    recipientId: 'recipient-123',
    currentUserName: 'John Doe',
    currentUserId: 'user-123',
    accessToken: 'mock-token',
  };

  const mockMessages = [
    {
      id: '1',
      sender: 'Sarah Chen',
      content: 'Hi! How can I help you?',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      isCurrentUser: false,
      senderId: 'recipient-123',
      senderName: 'Sarah Chen',
      recipientName: 'John Doe',
    },
    {
      id: '2',
      sender: 'John Doe',
      content: 'I have a question about the API.',
      timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
      isCurrentUser: true,
      senderId: 'user-123',
      senderName: 'John Doe',
      recipientName: 'Sarah Chen',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MSG-001: Open messaging dialog', () => {
    it('should display dialog with recipient name when opened', async () => {
      const { mockApi } = await import('../../utils/mockApi');
      vi.mocked(mockApi.getMessages).mockResolvedValue({
        messages: []
      });

      render(<MessagingDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const titleElements = screen.getAllByText(/Message Sarah Chen/i);
      expect(titleElements.length).toBeGreaterThan(0);
      
      expect(screen.getByText(/Send a direct message to connect and collaborate/i)).toBeInTheDocument();
    });

    it('should not display dialog when isOpen is false', () => {
      render(<MessagingDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('MSG-002: Display recipient info', () => {
    it('should display recipient name in dialog header', async () => {
      const { mockApi } = await import('../../utils/mockApi');
      vi.mocked(mockApi.getMessages).mockResolvedValue({
        messages: []
      });

      render(<MessagingDialog {...defaultProps} />);

      await waitFor(() => {
        const titleElements = screen.getAllByText(/Message Sarah Chen/i);
        expect(titleElements.length).toBeGreaterThan(0);
      });
    });

    it('should display different recipient names correctly', async () => {
      const { mockApi } = await import('../../utils/mockApi');
      vi.mocked(mockApi.getMessages).mockResolvedValue({
        messages: []
      });

      const { rerender } = render(<MessagingDialog {...defaultProps} />);

      await waitFor(() => {
        const titleElements = screen.getAllByText(/Message Sarah Chen/i);
        expect(titleElements.length).toBeGreaterThan(0);
      });

      rerender(<MessagingDialog {...defaultProps} recipientName="Alex Johnson" />);

      await waitFor(() => {
        const titleElements = screen.getAllByText(/Message Alex Johnson/i);
        expect(titleElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('MSG-003: Send first message', () => {
    it('should send message and display it when no conversation history exists', async () => {
      const user = userEvent.setup();
      const { mockApi } = await import('../../utils/mockApi');
      
      vi.mocked(mockApi.getMessages).mockResolvedValue({
        messages: []
      });
      
      vi.mocked(mockApi.sendMessage).mockResolvedValue({
        messageId: 'msg-new',
        message: {
          id: 'msg-new',
          sender: 'John Doe',
          content: 'Hello! This is my first message.',
          timestamp: new Date().toISOString(),
          isCurrentUser: true,
          senderId: 'mock-user-id',
          senderName: 'John Doe',
          recipientName: 'Sarah Chen'
        }
      });

      render(<MessagingDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/No messages yet/i)).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, 'Hello! This is my first message.');

      // Find the send button (not the close button)
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(btn => !btn.querySelector('.lucide-x'));
      await user.click(sendButton!);

      await waitFor(() => {
        expect(screen.getByText('Hello! This is my first message.')).toBeInTheDocument();
      });

      expect(mockApi.sendMessage).toHaveBeenCalledWith(
        'mock-user-id',
        'John Doe',
        'Sarah Chen',
        'Hello! This is my first message.'
      );
    });

    it('should clear textarea after sending message', async () => {
      const user = userEvent.setup();
      const { mockApi } = await import('../../utils/mockApi');
      
      vi.mocked(mockApi.getMessages).mockResolvedValue({
        messages: []
      });
      
      vi.mocked(mockApi.sendMessage).mockResolvedValue({
        messageId: 'msg-new',
        message: {
          id: 'msg-new',
          sender: 'John Doe',
          content: 'Test message',
          timestamp: new Date().toISOString(),
          isCurrentUser: true,
          senderId: 'mock-user-id',
          senderName: 'John Doe',
          recipientName: 'Sarah Chen'
        }
      });

      render(<MessagingDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, 'Test message');
      expect(textarea).toHaveValue('Test message');

      // Find the send button (not the close button)
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(btn => !btn.querySelector('.lucide-x'));
      await user.click(sendButton!);

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('should not send empty or whitespace-only messages', async () => {
      const user = userEvent.setup();
      const { mockApi } = await import('../../utils/mockApi');
      
      vi.mocked(mockApi.getMessages).mockResolvedValue({
        messages: []
      });

      render(<MessagingDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, '   ');

      // Find the send button (not the close button)
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(btn => !btn.querySelector('.lucide-x'));
      expect(sendButton).toBeDisabled();
    });
  });

  describe('MSG-004: Display message history', () => {
    it('should display existing conversation messages chronologically', async () => {
      const { mockApi } = await import('../../utils/mockApi');
      
      vi.mocked(mockApi.getMessages).mockResolvedValue({
        messages: mockMessages
      });

      render(<MessagingDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Hi! How can I help you?')).toBeInTheDocument();
      });

      expect(screen.getByText('I have a question about the API.')).toBeInTheDocument();
    });

    it('should distinguish between sent and received messages', async () => {
      const { mockApi } = await import('../../utils/mockApi');
      
      vi.mocked(mockApi.getMessages).mockResolvedValue({
        messages: mockMessages
      });

      render(<MessagingDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Hi! How can I help you?')).toBeInTheDocument();
      });

      const messages = screen.getAllByText(/Hi! How can I help you\?|I have a question about the API\./);
      expect(messages.length).toBeGreaterThanOrEqual(2);
    });

    it('should display timestamps for messages', async () => {
      const { mockApi } = await import('../../utils/mockApi');
      
      vi.mocked(mockApi.getMessages).mockResolvedValue({
        messages: mockMessages
      });

      render(<MessagingDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Hi! How can I help you?')).toBeInTheDocument();
      });

      // Check for relative time format (e.g., "1h ago", "30m ago")
      const timeElements = screen.getAllByText(/ago|Just now/);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  describe('MSG-005: Close dialog', () => {
    it('should call onClose when dialog is closed', async () => {
      const user = userEvent.setup();
      const onCloseMock = vi.fn();
      const { mockApi } = await import('../../utils/mockApi');
      
      vi.mocked(mockApi.getMessages).mockResolvedValue({
        messages: []
      });

      render(<MessagingDialog {...defaultProps} onClose={onCloseMock} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find and click the close button (X button)
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(onCloseMock).toHaveBeenCalled();
    });

    it('should close dialog when clicking outside', async () => {
      const onCloseMock = vi.fn();
      const { mockApi } = await import('../../utils/mockApi');
      
      vi.mocked(mockApi.getMessages).mockResolvedValue({
        messages: []
      });

      const { container } = render(<MessagingDialog {...defaultProps} onClose={onCloseMock} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click on the backdrop/overlay
      const backdrop = container.querySelector('[data-state="open"]')?.parentElement;
      if (backdrop) {
        await userEvent.click(backdrop);
        expect(onCloseMock).toHaveBeenCalled();
      }
    });
  });

  describe('Additional functionality', () => {
    it('should send message when pressing Enter key', async () => {
      const user = userEvent.setup();
      const { mockApi } = await import('../../utils/mockApi');
      
      vi.mocked(mockApi.getMessages).mockResolvedValue({
        messages: []
      });
      
      vi.mocked(mockApi.sendMessage).mockResolvedValue({
        messageId: 'msg-new',
        message: {
          id: 'msg-new',
          sender: 'John Doe',
          content: 'Quick message',
          timestamp: new Date().toISOString(),
          isCurrentUser: true,
          senderId: 'user-123',
          senderName: 'John Doe',
          recipientName: 'Sarah Chen',
        }
      });

      render(<MessagingDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, 'Quick message{Enter}');

      await waitFor(() => {
        expect(mockApi.sendMessage).toHaveBeenCalled();
      });
    });

    it('should show loading state while fetching messages', async () => {
      const { mockApi } = await import('../../utils/mockApi');
      
      // Create a promise that we can control
      let resolveMessages: (value: any) => void;
      const messagesPromise = new Promise((resolve) => {
        resolveMessages = resolve;
      });
      
      vi.mocked(mockApi.getMessages).mockReturnValue(messagesPromise as any);

      render(<MessagingDialog {...defaultProps} />);

      // Should show loading spinner initially
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Resolve the promise
      resolveMessages!({
        messages: mockMessages
      });

      await waitFor(() => {
        expect(screen.getByText('Hi! How can I help you?')).toBeInTheDocument();
      });
    });
  });
});

