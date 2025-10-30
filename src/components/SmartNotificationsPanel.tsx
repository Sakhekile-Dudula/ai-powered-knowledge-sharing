/**
 * Smart Notifications Panel
 * Real-time notifications for similar work, collaboration opportunities, etc.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { 
  Bell, 
  BellOff, 
  X, 
  ExternalLink, 
  CheckCheck,
  Sparkles,
  Users,
  Lightbulb,
  Award,
  Loader2
} from 'lucide-react';
import { getSmartNotifications, SmartNotification } from '../utils/smartNotifications';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SmartNotificationsPanelProps {
  userId: string;
}

export function SmartNotificationsPanel({ userId }: SmartNotificationsPanelProps) {
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const notificationService = getSmartNotifications();

  useEffect(() => {
    loadNotifications();

    // Subscribe to real-time notifications
    const unsubscribe = notificationService.subscribeToNotifications(userId, (notification) => {
      setNotifications(prev => [notification, ...prev]);
      
      // Show toast for high priority
      if (notification.priority === 'high') {
        toast.info(notification.title, {
          description: notification.message,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  useEffect(() => {
    loadNotifications();
  }, [showUnreadOnly]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications(userId, showUnreadOnly);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    setNotifications(notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    ));
  };

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead(userId);
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    toast.success('All notifications marked as read');
  };

  const handleDelete = async (notificationId: string) => {
    await notificationService.deleteNotification(notificationId);
    setNotifications(notifications.filter(n => n.id !== notificationId));
  };

  const handleAction = async (notification: SmartNotification) => {
    if (notification.actionUrl) {
      // Navigate to the action URL
      window.location.href = notification.actionUrl;
    }
    await handleMarkAsRead(notification.id);
  };

  const getNotificationIcon = (type: SmartNotification['type']) => {
    switch (type) {
      case 'similar_work':
        return <Sparkles className="w-5 h-5 text-purple-600" />;
      case 'connection_suggestion':
        return <Users className="w-5 h-5 text-blue-600" />;
      case 'collaboration_opportunity':
        return <Lightbulb className="w-5 h-5 text-amber-600" />;
      case 'expertise_match':
        return <Award className="w-5 h-5 text-green-600" />;
    }
  };

  const getPriorityColor = (priority: SmartNotification['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-4 border-l-blue-500 bg-blue-50';
      case 'low':
        return 'border-l-4 border-l-gray-500 bg-gray-50';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Smart Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Smart Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              AI-powered collaboration alerts
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            >
              {showUnreadOnly ? (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Show All
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 mr-2" />
                  Unread Only
                </>
              )}
            </Button>
            
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <BellOff className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-muted-foreground">
              {showUnreadOnly ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              We'll notify you about collaboration opportunities
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-lg p-4 ${getPriorityColor(notification.priority)} ${
                    !notification.isRead ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDistanceToNow(notification.createdAt, { addSuffix: true })}</span>
                          {notification.priority === 'high' && (
                            <Badge variant="destructive" className="text-xs">High Priority</Badge>
                          )}
                        </div>

                        {notification.actionUrl && notification.actionLabel && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(notification)}
                            className="mt-2"
                          >
                            <ExternalLink className="w-3 h-3 mr-2" />
                            {notification.actionLabel}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMarkAsRead(notification.id)}
                          title="Mark as read"
                        >
                          <CheckCheck className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(notification.id)}
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
