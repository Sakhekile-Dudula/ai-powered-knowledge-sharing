// Activity Logging Utility
// Use this to track user activities throughout the app

import { createClient } from './supabase/client';

export type ActivityType = 
  | 'shared'      // Shared knowledge
  | 'asked'       // Asked question
  | 'answered'    // Answered question
  | 'connected'   // Connected with user
  | 'messaged'    // Sent message
  | 'updated'     // Updated content
  | 'viewed'      // Viewed content
  | 'searched'    // Performed search
  | 'exported'    // Exported content
  | 'bookmarked'  // Bookmarked item
  | 'upvoted'     // Upvoted content
  | 'commented';  // Added comment

export interface LogActivityParams {
  action: string;
  topic: string;
  entityType?: string;
  entityId?: number;
}

/**
 * Log user activity to the activity_log table
 * This will show up in the Recent Activity section on the Dashboard
 * 
 * @example
 * ```typescript
 * // Log knowledge sharing
 * await logActivity({
 *   action: 'shared',
 *   topic: 'React Best Practices',
 *   entityType: 'knowledge_item',
 *   entityId: knowledgeItemId
 * });
 * 
 * // Log question asking
 * await logActivity({
 *   action: 'asked',
 *   topic: 'How to optimize database queries?',
 *   entityType: 'question',
 *   entityId: questionId
 * });
 * ```
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot log activity: User not authenticated');
      return;
    }

    const { error } = await supabase.rpc('log_activity', {
      p_user_id: user.id,
      p_action: params.action,
      p_topic: params.topic,
      p_entity_type: params.entityType || null,
      p_entity_id: params.entityId || null
    });

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

/**
 * Log knowledge sharing activity
 */
export async function logKnowledgeShared(title: string, itemId: number): Promise<void> {
  await logActivity({
    action: 'shared',
    topic: title,
    entityType: 'knowledge_item',
    entityId: itemId
  });
}

/**
 * Log question asking activity
 */
export async function logQuestionAsked(title: string, questionId: number): Promise<void> {
  await logActivity({
    action: 'asked',
    topic: title,
    entityType: 'question',
    entityId: questionId
  });
}

/**
 * Log answer activity
 */
export async function logAnswerProvided(questionTitle: string, answerId: number): Promise<void> {
  await logActivity({
    action: 'answered',
    topic: questionTitle,
    entityType: 'answer',
    entityId: answerId
  });
}

/**
 * Log connection activity
 */
export async function logUserConnection(userName: string): Promise<void> {
  await logActivity({
    action: 'connected with',
    topic: userName,
    entityType: 'connection'
  });
}

/**
 * Log search activity
 */
export async function logSearch(searchQuery: string): Promise<void> {
  await logActivity({
    action: 'searched for',
    topic: searchQuery,
    entityType: 'search'
  });
}

/**
 * Log content view
 */
export async function logContentView(title: string, entityType: 'knowledge_item' | 'question', entityId: number): Promise<void> {
  await logActivity({
    action: 'viewed',
    topic: title,
    entityType,
    entityId
  });
}

/**
 * Log export activity
 */
export async function logExport(title: string, format: 'pdf' | 'word'): Promise<void> {
  await logActivity({
    action: `exported to ${format.toUpperCase()}`,
    topic: title,
    entityType: 'export'
  });
}

/**
 * Log bookmark activity
 */
export async function logBookmark(title: string, itemId: number): Promise<void> {
  await logActivity({
    action: 'bookmarked',
    topic: title,
    entityType: 'knowledge_item',
    entityId: itemId
  });
}
