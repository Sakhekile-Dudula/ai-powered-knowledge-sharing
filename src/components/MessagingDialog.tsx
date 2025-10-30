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
import { toast } from "sonner";
import { createClient } from "../utils/supabase/client";

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
  recipientId,
  currentUserName,
}: MessagingDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen && recipientId) {
      fetchOrCreateConversation();
    }
  }, [isOpen, recipientId]);

  const fetchOrCreateConversation = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !recipientId) {
        console.log('No user or recipientId');
        setIsLoading(false);
        return;
      }

      // Check if conversation exists
      const { data: conversations, error: convError } = await supabase.rpc('get_user_conversations', {
        p_user_id: user.id
      });

      if (convError) {
        console.error('Error fetching conversations:', convError);
        setIsLoading(false);
        return;
      }

      // Find conversation with this recipient
      const existingConv = conversations?.find((conv: any) => 
        conv.participant_id === recipientId
      );

      if (existingConv) {
        // Load messages for this conversation
        const { data: msgs, error: msgsError } = await supabase.rpc('get_conversation_messages', {
          p_conversation_id: existingConv.id,
          p_user_id: user.id
        });

        if (!msgsError && msgs) {
          setMessages(msgs.map((msg: any) => ({
            id: msg.id,
            sender: msg.sender_name,
            content: msg.content,
            timestamp: msg.created_at,
            isCurrentUser: msg.sender_id === user.id
          })));
        }
      } else {
        // New conversation - no messages yet
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !recipientId) return;

    const messageContent = newMessage.trim();
    setIsSending(true);
    setNewMessage(""); // Clear input immediately for better UX
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please log in to send messages');
        setNewMessage(messageContent);
        setIsSending(false);
        return;
      }

      console.log('Sending message to recipient ID:', recipientId, 'Content:', messageContent);

      // Send the message
      const { data, error } = await supabase.rpc('send_message', {
        p_sender_id: user.id,
        p_recipient_id: recipientId,
        p_content: messageContent
      });

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        setNewMessage(messageContent);
        setIsSending(false);
        return;
      }

      console.log('Message sent successfully:', data);

      // Add message to UI immediately
      const newMsg: Message = {
        id: data?.message_id || Date.now().toString(),
        sender: currentUserName,
        content: messageContent,
        timestamp: new Date().toISOString(),
        isCurrentUser: true,
      };
      
      setMessages((prev) => [...prev, newMsg]);
      
      toast.success('Message sent!');
      
      // Refresh messages after a short delay
      setTimeout(() => {
        fetchOrCreateConversation();
      }, 500);
      
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error(`Failed to send message: ${error instanceof Error ? error.message : "Network error"}`);
      setNewMessage(messageContent);
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
