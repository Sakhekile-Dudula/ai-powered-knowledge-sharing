import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { buildApiUrl, API_ENDPOINTS, getApiEndpoint } from "../utils/supabase/api-config";
import { toast } from "sonner";
import { mockApi } from "../utils/mockApi";

// Toggle between mock API and real Supabase
const USE_MOCK_API = true; // Set to false when Supabase function is deployed

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isCurrentUser: boolean;
}

interface MessagingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientId?: string;
  currentUserName: string;
  currentUserId?: string;
  accessToken: string;
}

export function MessagingDialog({
  isOpen,
  onClose,
  recipientName,
  currentUserName,
  accessToken,
}: MessagingDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Check if the server is available
      if (!USE_MOCK_API) {
        checkServerHealth();
      }
      fetchMessages();
    }
  }, [isOpen, recipientName]);

  const checkServerHealth = async () => {
    try {
      const response = await fetch(
        getApiEndpoint(API_ENDPOINTS.HEALTH),
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      
      if (!response.ok) {
        console.error("Server health check failed:", response.status);
        console.error("The Supabase Edge Function may not be deployed.");
        console.error("To deploy, run: supabase functions deploy make-server-d5b5d02c");
      } else {
        console.log("Server health check passed");
      }
    } catch (error) {
      console.error("Server health check error:", error);
    }
  };

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      if (USE_MOCK_API) {
        const data = await mockApi.getMessages(currentUserName, recipientName);
        setMessages(data.messages || []);
      } else {
        const response = await fetch(
          buildApiUrl(API_ENDPOINTS.MESSAGES_LIST, { recipient: recipientName }),
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      if (USE_MOCK_API) {
        const data = await mockApi.sendMessage(
          "mock-user-id",
          currentUserName,
          recipientName,
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
      } else {
        console.log("Sending message to:", recipientName, "Content:", newMessage);
        
        const response = await fetch(
          getApiEndpoint(API_ENDPOINTS.MESSAGES_CREATE),
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              recipient: recipientName,
              content: newMessage,
            }),
          }
        );

        console.log("Response status:", response.status);
        console.log("Full URL:", getApiEndpoint(API_ENDPOINTS.MESSAGES_CREATE));
        
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Message {recipientName}</DialogTitle>
          <DialogDescription>
            Send a direct message to connect and collaborate
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-slate-500 dark:text-slate-400 text-center">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
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
                      className={`text-xs ${
                        message.isCurrentUser
                          ? "text-blue-100"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t dark:border-slate-700">
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
      </DialogContent>
    </Dialog>
  );
}
