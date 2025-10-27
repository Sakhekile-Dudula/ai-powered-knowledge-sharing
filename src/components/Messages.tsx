import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import {
  Search,
  MessageCircle,
  Send,
  Loader2,
  Clock,
  Video,
  Phone,
} from "lucide-react";
import { createClient } from "../utils/supabase/client";
import { toast } from "sonner";
import { startTeamsCall, startTeamsChat } from "../utils/teamsIntegration";

interface MessagesProps {
  currentUserName: string;
}

interface Conversation {
  id: string;
  participantName: string;
  participantEmail?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  participantRole?: string;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isCurrentUser: boolean;
}

export function Messages({ currentUserName }: MessagesProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initializeUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    initializeUser();
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation && currentUserId) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation, currentUserId]);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please log in to view messages');
        return;
      }

      const { data, error } = await supabase.rpc('get_user_conversations', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error fetching conversations:', error);
        toast.error('Failed to load conversations');
        return;
      }

      if (data && Array.isArray(data)) {
        setConversations(data);
        
        // Auto-select first conversation if exists
        if (data.length > 0 && !selectedConversation) {
          setSelectedConversation(data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      toast.error('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase.rpc('get_conversation_messages', {
        p_conversation_id: conversationId,
        p_user_id: user.id
      });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      if (data && Array.isArray(data)) {
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const startNewConversation = async () => {
    if (!newRecipientEmail.trim() || !currentUserId) {
      toast.error('Please enter a recipient email');
      return;
    }

    setIsSending(true);
    try {
      const supabase = createClient();
      
      // Find recipient by email
      const { data: recipient } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', newRecipientEmail.trim())
        .single();
      
      if (!recipient) {
        toast.error('User not found');
        setIsSending(false);
        return;
      }

      if (recipient.id === currentUserId) {
        toast.error("You can't message yourself");
        setIsSending(false);
        return;
      }

      // Check if conversation already exists
      const existingConv = conversations.find(c => 
        c.participantName === recipient.full_name
      );

      if (existingConv) {
        setSelectedConversation(existingConv);
        setShowNewMessageDialog(false);
        setNewRecipientEmail("");
        toast.info('Conversation already exists');
        setIsSending(false);
        return;
      }

      // Create new conversation with first message
      const firstMessage = "Hi! I'd like to connect with you.";
      const { data, error } = await supabase.rpc('send_message', {
        p_sender_id: currentUserId,
        p_recipient_id: recipient.id,
        p_content: firstMessage
      });

      if (error) {
        console.error('Error creating conversation:', error);
        toast.error('Failed to start conversation');
        setIsSending(false);
        return;
      }

      if (!data) {
        console.error('No data returned from send_message');
        toast.error('Failed to start conversation');
        setIsSending(false);
        return;
      }

      toast.success('Conversation started!');
      setShowNewMessageDialog(false);
      setNewRecipientEmail("");
      
      // Refresh conversations and select the new one
      await fetchConversations();
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;

    setIsSending(true);
    const messageContent = newMessage;
    setNewMessage(""); // Clear input immediately for better UX
    
    // Stop typing indicator
    broadcastTyping(false);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }

    try {
      const supabase = createClient();
      
      // Find recipient ID from the conversation
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', selectedConversation.id)
        .neq('user_id', currentUserId);
      
      if (!participants || participants.length === 0) {
        toast.error('Could not find recipient');
        setNewMessage(messageContent);
        return;
      }

      const recipientId = participants[0].user_id;

      const { data, error } = await supabase.rpc('send_message', {
        p_sender_id: currentUserId,
        p_recipient_id: recipientId,
        p_content: messageContent
      });

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        setNewMessage(messageContent);
        return;
      }

      // Add message to local state immediately
      const newMsg: Message = {
        id: data || Date.now().toString(),
        sender: currentUserName,
        content: messageContent,
        timestamp: new Date().toISOString(),
        isCurrentUser: true,
      };
      setMessages((prev) => [...prev, newMsg]);

      // Refresh messages to ensure sync
      await fetchMessages(selectedConversation.id);

      toast.success('Message sent!');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const handleTeamsCall = () => {
    if (!selectedConversation) return;
    
    const recipient = selectedConversation.participantEmail || selectedConversation.participantName;
    startTeamsCall([recipient]);
    toast.success(`Starting Teams call with ${selectedConversation.participantName}...`);
  };

  const handleTeamsChat = () => {
    if (!selectedConversation) return;
    
    const recipient = selectedConversation.participantEmail || selectedConversation.participantName;
    startTeamsChat([recipient], `Hi ${selectedConversation.participantName}!`);
    toast.success(`Opening Teams chat with ${selectedConversation.participantName}...`);
  };

  // Broadcast typing status
  const broadcastTyping = async (isTyping: boolean) => {
    if (!selectedConversation || !currentUserId) return;
    
    const supabase = createClient();
    const channel = supabase.channel(`conversation:${selectedConversation.id}`);
    
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId, isTyping }
    });
  };

  // Handle user typing
  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Broadcast that user is typing
    if (value.length > 0) {
      broadcastTyping(true);
      
      // Set timeout to stop typing indicator after 3 seconds of inactivity
      const timeout = setTimeout(() => {
        broadcastTyping(false);
      }, 3000);
      
      setTypingTimeout(timeout);
    } else {
      broadcastTyping(false);
    }
  };

  // Subscribe to typing events
  useEffect(() => {
    if (!selectedConversation || !currentUserId) return;
    
    const supabase = createClient();
    const channel = supabase.channel(`conversation:${selectedConversation.id}`);
    
    channel
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        // Only show typing indicator if it's not from current user
        if (payload.payload.userId !== currentUserId) {
          setOtherUserTyping(payload.payload.isTyping);
        }
      })
      .subscribe();
    
    // Cleanup on unmount or conversation change
    return () => {
      channel.unsubscribe();
      setOtherUserTyping(false);
    };
  }, [selectedConversation, currentUserId]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const filteredConversations = searchQuery
    ? conversations.filter((conv) =>
        conv.participantName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-240px)]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Messages
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setShowNewMessageDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                New
              </Button>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search conversations..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-380px)]">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-slate-500 dark:text-slate-400">
                    No conversations yet. Start messaging experts!
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedConversation?.id === conversation.id
                          ? "bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm">
                            {getInitials(conversation.participantName)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-slate-900 dark:text-slate-100 text-sm truncate">
                              {conversation.participantName}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <Badge className="bg-blue-600 text-white ml-2 text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          {conversation.participantRole && (
                            <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">
                              {conversation.participantRole}
                            </p>
                          )}
                          <p className="text-slate-600 dark:text-slate-400 text-xs truncate">
                            {conversation.lastMessage}
                          </p>
                          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                            {formatTime(conversation.timestamp)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white">
                        {getInitials(selectedConversation.participantName)}
                      </span>
                    </div>
                    <div>
                      <CardTitle>{selectedConversation.participantName}</CardTitle>
                      {selectedConversation.participantRole && (
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                          {selectedConversation.participantRole}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleTeamsCall}
                      className="flex items-center gap-2"
                      title="Start Teams video call"
                    >
                      <Video className="w-4 h-4" />
                      <span className="hidden sm:inline">Call</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleTeamsChat}
                      className="flex items-center gap-2"
                      title="Start Teams chat"
                    >
                      <Phone className="w-4 h-4" />
                      <span className="hidden sm:inline">Chat</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-6">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-500 dark:text-slate-400 text-center">
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.isCurrentUser ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] ${
                            message.isCurrentUser
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          } rounded-lg px-4 py-2`}
                        >
                          <p className="text-sm mb-1">{message.content}</p>
                          <p
                            className={`text-xs flex items-center gap-1 ${
                              message.isCurrentUser
                                ? "text-blue-100"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Typing Indicator */}
                    {otherUserTyping && (
                      <div className="flex justify-start">
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-3 max-w-[75%]">
                          <div className="flex items-center gap-1">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                              {selectedConversation?.participantName} is typing...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              <CardContent className="border-t dark:border-slate-700 pt-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="min-h-[60px] max-h-[120px] resize-none"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSending}
                    className="self-end"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">
                  Select a conversation to start messaging
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* New Message Dialog */}
      {showNewMessageDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>New Message</CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Enter the email address of the person you want to message
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Recipient Email</label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={newRecipientEmail}
                  onChange={(e) => setNewRecipientEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      startNewConversation();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewMessageDialog(false);
                    setNewRecipientEmail("");
                  }}
                  disabled={isSending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={startNewConversation}
                  disabled={isSending || !newRecipientEmail.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    'Start Conversation'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
