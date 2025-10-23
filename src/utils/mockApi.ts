// Mock API for development - simulates Supabase backend locally
// This allows testing without deploying the Edge Function

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isCurrentUser: boolean;
  senderId: string;
  senderName: string;
  recipientName: string;
}

interface Conversation {
  id: string;
  participantName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  participantRole?: string;
}

// In-memory storage for mock data
const mockMessages: Message[] = [];
const mockConversations = new Map<string, Conversation>();

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApi = {
  // Get conversations for current user
  async getConversations(currentUserName: string): Promise<{ conversations: Conversation[] }> {
    await delay(300);
    
    // Filter conversations for current user
    const conversations = Array.from(mockConversations.values())
      .filter(conv => {
        // Find messages involving this user
        const userMessages = mockMessages.filter(
          msg => msg.senderName === currentUserName || msg.recipientName === currentUserName
        );
        return userMessages.length > 0;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return { conversations };
  },

  // Get messages for a conversation
  async getMessages(currentUserName: string, recipientName: string): Promise<{ messages: Message[] }> {
    await delay(200);
    
    const messages = mockMessages
      .filter(msg => 
        (msg.senderName === currentUserName && msg.recipientName === recipientName) ||
        (msg.senderName === recipientName && msg.recipientName === currentUserName)
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return { messages };
  },

  // Send a message
  async sendMessage(
    currentUserId: string,
    currentUserName: string,
    recipientName: string,
    content: string
  ): Promise<{ messageId: string; message: Message }> {
    await delay(400);
    
    const messageId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    const message: Message = {
      id: messageId,
      sender: currentUserName,
      content,
      timestamp,
      isCurrentUser: true,
      senderId: currentUserId,
      senderName: currentUserName,
      recipientName,
    };
    
    mockMessages.push(message);
    
    // Update or create conversation
    const conversationKey = recipientName;
    mockConversations.set(conversationKey, {
      id: conversationKey,
      participantName: recipientName,
      lastMessage: content,
      timestamp,
      unreadCount: 0,
      participantRole: undefined,
    });
    
    return { messageId, message };
  },

  // Initialize with some sample messages
  async initializeSampleMessages(currentUserName: string) {
    // Add some sample conversations if none exist
    if (mockMessages.length === 0) {
      const sampleExperts = [
        { name: "Alex Chen", role: "Senior Solutions Architect" },
        { name: "Sarah Martinez", role: "Lead Backend Engineer" },
        { name: "Dr. Lisa Thompson", role: "Chief Data Scientist" },
      ];
      
      for (const expert of sampleExperts) {
        const messageId = crypto.randomUUID();
        const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString();
        
        // Create a sample message from the expert
        const message: Message = {
          id: messageId,
          sender: expert.name,
          content: `Hi ${currentUserName}! I'd be happy to discuss this with you. When would be a good time to connect?`,
          timestamp,
          isCurrentUser: false,
          senderId: crypto.randomUUID(),
          senderName: expert.name,
          recipientName: currentUserName,
        };
        
        mockMessages.push(message);
        
        // Add to conversations
        mockConversations.set(expert.name, {
          id: expert.name,
          participantName: expert.name,
          lastMessage: message.content,
          timestamp: message.timestamp,
          unreadCount: 1,
          participantRole: expert.role,
        });
      }
    }
  },

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    await delay(100);
    return { status: "ok" };
  },
};
