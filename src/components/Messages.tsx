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
} from "lucide-react";
import { projectId } from "../utils/supabase/info";
import { toast } from "sonner";
import { mockApi } from "../utils/mockApi";

// Toggle between mock API and real Supabase
const USE_MOCK_API = true; // Set to false when Supabase function is deployed

interface MessagesProps {
  accessToken: string | null;
  currentUserName: string;
}

interface Conversation {
  id: string;
  participantName: string;
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

export function Messages({ accessToken, currentUserName }: MessagesProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (USE_MOCK_API) {
      mockApi.initializeSampleMessages(currentUserName);
    }
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.participantName);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      if (USE_MOCK_API) {
        const data = await mockApi.getConversations(currentUserName);
        setConversations(data.conversations || []);
        
        // Auto-select first conversation if exists
        if (data.conversations && data.conversations.length > 0 && !selectedConversation) {
          setSelectedConversation(data.conversations[0]);
        }
      } else {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d5b5d02c/conversations`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setConversations(data.conversations || []);
          
          // Auto-select first conversation if exists
          if (data.conversations && data.conversations.length > 0 && !selectedConversation) {
            setSelectedConversation(data.conversations[0]);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (participantName: string) => {
    try {
      if (USE_MOCK_API) {
        const data = await mockApi.getMessages(currentUserName, participantName);
        setMessages(data.messages || []);
      } else {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d5b5d02c/messages?recipient=${encodeURIComponent(
            participantName
          )}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setIsSending(true);
    try {
      if (USE_MOCK_API) {
        const data = await mockApi.sendMessage(
          "mock-user-id",
          currentUserName,
          selectedConversation.participantName,
          newMessage
        );
        
        // Add the new message to the list
        const optimisticMessage: Message = {
          id: data.messageId,
          sender: currentUserName,
          content: newMessage,
          timestamp: new Date().toISOString(),
          isCurrentUser: true,
        };

        setMessages([...messages, optimisticMessage]);
        setNewMessage("");
        toast.success("Message sent!");
        
        // Update conversation list
        fetchConversations();
      } else {
        console.log("Sending message to:", selectedConversation.participantName, "Content:", newMessage);
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d5b5d02c/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              recipient: selectedConversation.participantName,
              content: newMessage,
            }),
          }
        );

        console.log("Response status:", response.status);
        console.log("Full URL:", `https://${projectId}.supabase.co/functions/v1/make-server-d5b5d02c/messages`);

        if (response.ok) {
          const data = await response.json();
          console.log("Message sent successfully:", data);

          // Add the new message to the list
          const optimisticMessage: Message = {
            id: data.messageId || Date.now().toString(),
            sender: currentUserName,
            content: newMessage,
            timestamp: new Date().toISOString(),
            isCurrentUser: true,
          };

          setMessages([...messages, optimisticMessage]);
          setNewMessage("");
          toast.success("Message sent!");
          
          // Update conversation list
          fetchConversations();
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to send message:", response.status, errorData);
          
          if (response.status === 404) {
            console.error("404 Error - Supabase function 'make-server-d5b5d02c' may not be deployed.");
            console.error("Please ensure the Edge Function is deployed to Supabase.");
            toast.error("Messaging service not available. Function may not be deployed.");
          } else {
            toast.error(`Failed to send message: ${errorData.error || `Error ${response.status}`}`);
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error(`Failed to send message: ${error instanceof Error ? error.message : "Network error"}`);
    } finally {
      setIsSending(false);
    }
  };

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
      {USE_MOCK_API && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-blue-900 dark:text-blue-100 text-sm">
            <strong>Development Mode:</strong> Using mock API for messaging. Messages are stored in memory for this session.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-240px)]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Messages
            </CardTitle>
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
                  </div>
                )}
              </ScrollArea>

              <CardContent className="border-t dark:border-slate-700 pt-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
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
    </div>
  );
}
