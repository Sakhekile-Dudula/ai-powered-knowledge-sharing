/**
 * Microsoft Graph API Integration
 * Provides advanced Teams features: meetings, calendar, presence detection
 */

import { Client } from '@microsoft/microsoft-graph-client';

export interface GraphAPIConfig {
  clientId: string;
  tenantId: string;
  redirectUri: string;
}

export interface MeetingRequest {
  subject: string;
  startDateTime: string;
  endDateTime: string;
  participants: string[];
  description?: string;
  isOnlineMeeting?: boolean;
}

export interface OnlineMeeting {
  id: string;
  joinUrl: string;
  subject: string;
  startDateTime: string;
  endDateTime: string;
}

export interface UserPresence {
  userId: string;
  availability: 'Available' | 'Busy' | 'DoNotDisturb' | 'BeRightBack' | 'Away' | 'Offline';
  activity: string;
  statusMessage?: string;
}

export interface CalendarEvent {
  id: string;
  subject: string;
  start: string;
  end: string;
  attendees: string[];
  isOnlineMeeting: boolean;
  onlineMeetingUrl?: string;
}

/**
 * Microsoft Graph API Client for Teams Integration
 */
export class GraphAPIClient {
  private client: Client | null = null;
  private accessToken: string | null = null;

  constructor(accessToken?: string) {
    if (accessToken) {
      this.initialize(accessToken);
    }
  }

  /**
   * Initialize the Graph API client with access token
   */
  initialize(accessToken: string) {
    this.accessToken = accessToken;
    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.client !== null && this.accessToken !== null;
  }

  /**
   * Create a Teams meeting
   */
  async createMeeting(request: MeetingRequest): Promise<OnlineMeeting> {
    if (!this.client) throw new Error('Graph API client not initialized');

    try {
      const event = {
        subject: request.subject,
        body: {
          contentType: 'HTML',
          content: request.description || '',
        },
        start: {
          dateTime: request.startDateTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: request.endDateTime,
          timeZone: 'UTC',
        },
        attendees: request.participants.map(email => ({
          emailAddress: {
            address: email,
          },
          type: 'required',
        })),
        isOnlineMeeting: request.isOnlineMeeting ?? true,
        onlineMeetingProvider: 'teamsForBusiness',
      };

      const response = await this.client.api('/me/events').post(event);

      return {
        id: response.id,
        joinUrl: response.onlineMeeting?.joinUrl || '',
        subject: response.subject,
        startDateTime: response.start.dateTime,
        endDateTime: response.end.dateTime,
      };
    } catch (error) {
      console.error('Error creating Teams meeting:', error);
      throw new Error('Failed to create Teams meeting');
    }
  }

  /**
   * Get user presence status
   */
  async getUserPresence(userId: string): Promise<UserPresence> {
    if (!this.client) throw new Error('Graph API client not initialized');

    try {
      const response = await this.client.api(`/users/${userId}/presence`).get();

      return {
        userId,
        availability: response.availability,
        activity: response.activity,
        statusMessage: response.statusMessage?.message?.content,
      };
    } catch (error) {
      console.error('Error getting user presence:', error);
      return {
        userId,
        availability: 'Offline',
        activity: 'Unknown',
      };
    }
  }

  /**
   * Get multiple users' presence status
   */
  async getMultiplePresence(userIds: string[]): Promise<UserPresence[]> {
    if (!this.client) throw new Error('Graph API client not initialized');

    try {
      const response = await this.client
        .api('/communications/getPresencesByUserId')
        .post({ ids: userIds });

      return response.value.map((presence: any) => ({
        userId: presence.id,
        availability: presence.availability,
        activity: presence.activity,
        statusMessage: presence.statusMessage?.message?.content,
      }));
    } catch (error) {
      console.error('Error getting multiple presence:', error);
      return userIds.map(userId => ({
        userId,
        availability: 'Offline' as const,
        activity: 'Unknown',
      }));
    }
  }

  /**
   * Get user's calendar events
   */
  async getCalendarEvents(
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    if (!this.client) throw new Error('Graph API client not initialized');

    try {
      const start = startDate.toISOString();
      const end = endDate.toISOString();

      const response = await this.client
        .api('/me/calendarView')
        .query({
          startDateTime: start,
          endDateTime: end,
        })
        .select('subject,start,end,attendees,isOnlineMeeting,onlineMeeting')
        .get();

      return response.value.map((event: any) => ({
        id: event.id,
        subject: event.subject,
        start: event.start.dateTime,
        end: event.end.dateTime,
        attendees: event.attendees.map((a: any) => a.emailAddress.address),
        isOnlineMeeting: event.isOnlineMeeting,
        onlineMeetingUrl: event.onlineMeeting?.joinUrl,
      }));
    } catch (error) {
      console.error('Error getting calendar events:', error);
      return [];
    }
  }

  /**
   * Check if user is available at a specific time
   */
  async checkAvailability(
    userEmail: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    if (!this.client) throw new Error('Graph API client not initialized');

    try {
      const response = await this.client.api('/me/calendar/getSchedule').post({
        schedules: [userEmail],
        startTime: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC',
        },
        endTime: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
        availabilityViewInterval: 30,
      });

      const schedule = response.value[0];
      return schedule.availabilityView === '0'; // '0' means free
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    }
  }

  /**
   * Send Teams chat message
   */
  async sendChatMessage(chatId: string, message: string): Promise<void> {
    if (!this.client) throw new Error('Graph API client not initialized');

    try {
      await this.client.api(`/chats/${chatId}/messages`).post({
        body: {
          content: message,
        },
      });
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw new Error('Failed to send chat message');
    }
  }

  /**
   * Create a Teams chat with users
   */
  async createChat(userEmails: string[], topic?: string): Promise<string> {
    if (!this.client) throw new Error('Graph API client not initialized');

    try {
      const members = userEmails.map(email => ({
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ['owner'],
        'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${email}')`,
      }));

      const response = await this.client.api('/chats').post({
        chatType: 'group',
        topic: topic || 'Collaboration',
        members,
      });

      return response.id;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw new Error('Failed to create chat');
    }
  }
}

/**
 * Singleton instance for the app
 */
let graphClient: GraphAPIClient | null = null;

export function getGraphClient(accessToken?: string): GraphAPIClient {
  if (!graphClient) {
    graphClient = new GraphAPIClient(accessToken);
  } else if (accessToken && !graphClient.isInitialized()) {
    graphClient.initialize(accessToken);
  }
  return graphClient;
}

/**
 * Helper to format presence status for display
 */
export function getPresenceColor(availability: string): string {
  switch (availability) {
    case 'Available':
      return 'bg-green-500';
    case 'Busy':
      return 'bg-red-500';
    case 'DoNotDisturb':
      return 'bg-red-600';
    case 'BeRightBack':
    case 'Away':
      return 'bg-yellow-500';
    case 'Offline':
    default:
      return 'bg-gray-400';
  }
}

export function getPresenceIcon(availability: string): string {
  switch (availability) {
    case 'Available':
      return '✓';
    case 'Busy':
      return '●';
    case 'DoNotDisturb':
      return '⊗';
    case 'BeRightBack':
    case 'Away':
      return '○';
    case 'Offline':
    default:
      return '—';
  }
}
