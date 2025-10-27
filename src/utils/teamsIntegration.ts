/**
 * Microsoft Teams Integration Utilities
 * Provides functions to integrate with Microsoft Teams for video calls and collaboration
 */

export interface TeamsMeetingConfig {
  subject: string;
  startTime?: Date;
  endTime?: Date;
  participants?: string[];
}

export interface TeamsDeepLinkConfig {
  type: 'chat' | 'call' | 'meeting';
  users?: string[];
  message?: string;
  meetingUrl?: string;
}

/**
 * Generate a Microsoft Teams deep link to start a call or chat
 * Deep links work without requiring API authentication
 */
export function generateTeamsDeepLink(config: TeamsDeepLinkConfig): string {
  const baseUrl = 'https://teams.microsoft.com/l';
  
  switch (config.type) {
    case 'call':
      // Start a call with specific users
      if (config.users && config.users.length > 0) {
        const userIds = config.users.join(',');
        return `${baseUrl}/call/0/0?users=${encodeURIComponent(userIds)}`;
      }
      // Start a call without pre-selected users
      return `${baseUrl}/call/0/0`;
      
    case 'chat':
      // Start a chat with specific users
      if (config.users && config.users.length > 0) {
        const userIds = config.users.join(',');
        const message = config.message ? `&message=${encodeURIComponent(config.message)}` : '';
        return `${baseUrl}/chat/0/0?users=${encodeURIComponent(userIds)}${message}`;
      }
      return `${baseUrl}/chat/0/0`;
      
    case 'meeting':
      // Join a Teams meeting
      if (config.meetingUrl) {
        return config.meetingUrl;
      }
      // Create a new ad-hoc meeting
      return `${baseUrl}/meetup-join/19:meeting`;
      
    default:
      return `${baseUrl}/chat/0/0`;
  }
}

/**
 * Open Microsoft Teams with the specified configuration
 */
export function openTeams(config: TeamsDeepLinkConfig): void {
  const deepLink = generateTeamsDeepLink(config);
  window.open(deepLink, '_blank');
}

/**
 * Start an instant Teams call
 */
export function startTeamsCall(participants?: string[]): void {
  openTeams({
    type: 'call',
    users: participants
  });
}

/**
 * Start a Teams chat
 */
export function startTeamsChat(participants?: string[], message?: string): void {
  openTeams({
    type: 'chat',
    users: participants,
    message
  });
}

/**
 * Join a Teams meeting
 */
export function joinTeamsMeeting(meetingUrl: string): void {
  window.open(meetingUrl, '_blank');
}

/**
 * Microsoft Graph API integration for creating Teams meetings
 * This requires Azure AD authentication and appropriate permissions
 */
export class TeamsGraphAPI {
  private accessToken: string;
  
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }
  
  /**
   * Create a Teams meeting using Microsoft Graph API
   * Requires: OnlineMeetings.ReadWrite permission
   */
  async createMeeting(config: TeamsMeetingConfig): Promise<any> {
    const endpoint = 'https://graph.microsoft.com/v1.0/me/onlineMeetings';
    
    const meetingData = {
      subject: config.subject,
      startDateTime: config.startTime?.toISOString() || new Date().toISOString(),
      endDateTime: config.endTime?.toISOString() || new Date(Date.now() + 3600000).toISOString(),
      participants: {
        attendees: config.participants?.map(email => ({
          identity: {
            user: {
              email
            }
          }
        })) || []
      }
    };
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create Teams meeting: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating Teams meeting:', error);
      throw error;
    }
  }
  
  /**
   * Get user's Teams presence
   * Requires: Presence.Read permission
   */
  async getUserPresence(userId: string): Promise<any> {
    const endpoint = `https://graph.microsoft.com/v1.0/users/${userId}/presence`;
    
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get user presence: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting user presence:', error);
      throw error;
    }
  }
}

/**
 * Check if Microsoft Teams is installed
 */
export function isTeamsInstalled(): boolean {
  // This is a simplified check - in production, you'd want more robust detection
  return navigator.userAgent.indexOf('Teams') !== -1;
}

/**
 * Generate a Teams meeting URL for scheduling
 * This creates a simple meeting join link
 */
export function generateMeetingLink(meetingId: string): string {
  return `https://teams.microsoft.com/l/meetup-join/19:meeting_${meetingId}`;
}

/**
 * Share content to Teams
 */
export function shareToTeams(url: string, title?: string): void {
  const shareUrl = `https://teams.microsoft.com/share?href=${encodeURIComponent(url)}`;
  const fullUrl = title ? `${shareUrl}&msgText=${encodeURIComponent(title)}` : shareUrl;
  window.open(fullUrl, '_blank');
}
