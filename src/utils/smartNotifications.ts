/**
 * Smart Notifications System
 * Real-time alerts when someone is working on similar issues
 */

import { createClient } from './supabase/client';
import { getProactiveAI } from './proactiveAI';

export interface SmartNotification {
  id: string;
  userId: string;
  type: 'similar_work' | 'connection_suggestion' | 'collaboration_opportunity' | 'expertise_match';
  title: string;
  message: string;
  metadata: any;
  isRead: boolean;
  createdAt: Date;
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationPreferences {
  similarWork: boolean;
  connectionSuggestions: boolean;
  collaborationOpportunities: boolean;
  expertiseMatches: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

/**
 * Smart Notification Service
 */
export class SmartNotificationService {
  private supabase = createClient();
  private aiService = getProactiveAI();

  /**
   * Create a smart notification
   */
  async createNotification(notification: Omit<SmartNotification, 'id' | 'createdAt'>): Promise<void> {
    const { error } = await this.supabase
      .from('smart_notifications')
      .insert({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        is_read: notification.isRead,
        priority: notification.priority,
        action_url: notification.actionUrl,
        action_label: notification.actionLabel,
      });

    if (error) {
      console.error('Error creating notification:', error);
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(userId: string, unreadOnly: boolean = false): Promise<SmartNotification[]> {
    let query = this.supabase
      .from('smart_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return (data || []).map(n => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      message: n.message,
      metadata: n.metadata,
      isRead: n.is_read,
      createdAt: new Date(n.created_at),
      priority: n.priority,
      actionUrl: n.action_url,
      actionLabel: n.action_label,
    }));
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await this.supabase
      .from('smart_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.supabase
      .from('smart_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await this.supabase
      .from('smart_notifications')
      .delete()
      .eq('id', notificationId);
  }

  /**
   * Get user's notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const { data } = await this.supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) {
      // Return defaults
      return {
        similarWork: true,
        connectionSuggestions: true,
        collaborationOpportunities: true,
        expertiseMatches: true,
        emailNotifications: false,
        pushNotifications: true,
      };
    }

    return {
      similarWork: data.similar_work,
      connectionSuggestions: data.connection_suggestions,
      collaborationOpportunities: data.collaboration_opportunities,
      expertiseMatches: data.expertise_matches,
      emailNotifications: data.email_notifications,
      pushNotifications: data.push_notifications,
    };
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    await this.supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        similar_work: preferences.similarWork,
        connection_suggestions: preferences.connectionSuggestions,
        collaboration_opportunities: preferences.collaborationOpportunities,
        expertise_matches: preferences.expertiseMatches,
        email_notifications: preferences.emailNotifications,
        push_notifications: preferences.pushNotifications,
      });
  }

  /**
   * Monitor for similar work (called when user creates/edits work)
   */
  async monitorSimilarWork(
    userId: string,
    workType: 'project' | 'knowledge_item' | 'question',
    workTitle: string,
    _workId: string,
    workTags?: string[]
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    if (!preferences.similarWork) return;

    const alerts = await this.aiService.detectSimilarWork(userId, workType, workTitle, workTags);

    for (const alert of alerts) {
      await this.createNotification({
        userId,
        type: 'similar_work',
        title: '🔍 Similar Work Detected',
        message: `${alert.relatedUserName} is working on something similar: "${alert.workTitle}" (${alert.similarity}% match)`,
        metadata: alert,
        isRead: false,
        priority: alert.similarity >= 80 ? 'high' : 'medium',
        actionUrl: `/messages?user=${alert.relatedUserId}`,
        actionLabel: 'Connect',
      });
    }
  }

  /**
   * Notify about new connection suggestion
   */
  async notifyConnectionSuggestion(userId: string, targetUserId: string, reason: string): Promise<void> {
    const preferences = await this.getPreferences(userId);
    if (!preferences.connectionSuggestions) return;

    const { data: targetUser } = await this.supabase
      .from('profiles')
      .select('full_name')
      .eq('id', targetUserId)
      .single();

    await this.createNotification({
      userId,
      type: 'connection_suggestion',
      title: '🤝 Smart Connection Suggestion',
      message: `AI suggests connecting with ${targetUser?.full_name || 'a colleague'}: ${reason}`,
      metadata: { targetUserId, reason },
      isRead: false,
      priority: 'medium',
      actionUrl: `/experts?user=${targetUserId}`,
      actionLabel: 'View Profile',
    });
  }

  /**
   * Notify about collaboration opportunity
   */
  async notifyCollaborationOpportunity(
    userId: string,
    projectId: string,
    projectName: string,
    reason: string
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    if (!preferences.collaborationOpportunities) return;

    await this.createNotification({
      userId,
      type: 'collaboration_opportunity',
      title: '💡 Collaboration Opportunity',
      message: `Project "${projectName}" could benefit from your expertise: ${reason}`,
      metadata: { projectId, projectName, reason },
      isRead: false,
      priority: 'high',
      actionUrl: `/projects?id=${projectId}`,
      actionLabel: 'View Project',
    });
  }

  /**
   * Notify about expertise match
   */
  async notifyExpertiseMatch(
    userId: string,
    requesterId: string,
    requesterName: string,
    topic: string
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    if (!preferences.expertiseMatches) return;

    await this.createNotification({
      userId,
      type: 'expertise_match',
      title: '⭐ Your Expertise Needed',
      message: `${requesterName} is looking for help with "${topic}" - you've been identified as an expert!`,
      metadata: { requesterId, requesterName, topic },
      isRead: false,
      priority: 'high',
      actionUrl: `/messages?user=${requesterId}`,
      actionLabel: 'Respond',
    });
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(userId: string, callback: (notification: SmartNotification) => void) {
    const channel = this.supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'smart_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as any;
          callback({
            id: n.id,
            userId: n.user_id,
            type: n.type,
            title: n.title,
            message: n.message,
            metadata: n.metadata,
            isRead: n.is_read,
            createdAt: new Date(n.created_at),
            priority: n.priority,
            actionUrl: n.action_url,
            actionLabel: n.action_label,
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }

  /**
   * Get notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count } = await this.supabase
      .from('smart_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return count || 0;
  }

  /**
   * Background job to generate proactive notifications
   */
  async runProactiveNotifications(userId: string): Promise<void> {
    // Generate connection suggestions
    const suggestions = await this.aiService.generateConnectionSuggestions(userId);
    
    for (const suggestion of suggestions.slice(0, 3)) { // Top 3 suggestions
      await this.notifyConnectionSuggestion(
        userId,
        suggestion.targetUserId,
        suggestion.reason
      );
    }
  }
}

/**
 * Singleton instance
 */
let notificationService: SmartNotificationService | null = null;

export function getSmartNotifications(): SmartNotificationService {
  if (!notificationService) {
    notificationService = new SmartNotificationService();
  }
  return notificationService;
}
