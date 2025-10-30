/**
 * Teams Presence Indicator Component
 * Shows real-time availability status using Microsoft Graph API
 */

import { useState, useEffect } from 'react';
import { getGraphClient, UserPresence, getPresenceColor, getPresenceIcon } from '../utils/graphAPI';
import { Badge } from './ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card';

interface PresenceIndicatorProps {
  userId: string;
  userEmail: string;
  userName: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PresenceIndicator({ 
  userId, 
  userEmail, 
  userName, 
  showLabel = false,
  size = 'md'
}: PresenceIndicatorProps) {
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchPresence = async () => {
      try {
        const graphClient = getGraphClient();
        
        if (!graphClient.isInitialized()) {
          // Graph API not configured, show offline
          setPresence({
            userId,
            availability: 'Offline',
            activity: 'Not configured',
          });
          setLoading(false);
          return;
        }

        const presenceData = await graphClient.getUserPresence(userEmail);
        setPresence(presenceData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching presence:', error);
        setPresence({
          userId,
          availability: 'Offline',
          activity: 'Unknown',
        });
        setLoading(false);
      }
    };

    fetchPresence();

    // Refresh presence every 30 seconds
    interval = setInterval(fetchPresence, 30000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userId, userEmail]);

  if (loading) {
    return <div className={`${getSizeClass(size)} rounded-full bg-gray-300 animate-pulse`} />;
  }

  if (!presence) {
    return null;
  }

  const sizeClass = getSizeClass(size);
  const colorClass = getPresenceColor(presence.availability);
  const icon = getPresenceIcon(presence.availability);

  if (!showLabel) {
    return (
      <HoverCard>
        <HoverCardTrigger>
          <div className="relative inline-block">
            <div 
              className={`${sizeClass} rounded-full ${colorClass} flex items-center justify-center text-white font-bold text-xs cursor-help`}
              title={`${presence.availability} - ${presence.activity}`}
            >
              {icon}
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-64">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{userName}</h4>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${colorClass}`} />
              <span className="text-sm font-medium">{presence.availability}</span>
            </div>
            <p className="text-sm text-muted-foreground">{presence.activity}</p>
            {presence.statusMessage && (
              <p className="text-xs text-muted-foreground italic">
                "{presence.statusMessage}"
              </p>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={`gap-2 ${colorClass} text-white border-0`}
    >
      <span>{icon}</span>
      <span>{presence.availability}</span>
    </Badge>
  );
}

function getSizeClass(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm':
      return 'w-2 h-2';
    case 'md':
      return 'w-3 h-3';
    case 'lg':
      return 'w-4 h-4';
  }
}

/**
 * Multiple Users Presence Component
 * Shows presence for multiple users efficiently
 */
interface MultiPresenceProps {
  users: Array<{
    id: string;
    email: string;
    name: string;
    avatar?: string;
  }>;
}

export function MultiPresence({ users }: MultiPresenceProps) {
  const [presences, setPresences] = useState<Map<string, UserPresence>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchPresences = async () => {
      try {
        const graphClient = getGraphClient();
        
        if (!graphClient.isInitialized()) {
          setLoading(false);
          return;
        }

        const userIds = users.map(u => u.email);
        const presenceData = await graphClient.getMultiplePresence(userIds);
        
        const presenceMap = new Map<string, UserPresence>();
        presenceData.forEach(p => {
          const user = users.find(u => u.email === p.userId);
          if (user) {
            presenceMap.set(user.id, p);
          }
        });
        
        setPresences(presenceMap);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching multiple presences:', error);
        setLoading(false);
      }
    };

    fetchPresences();

    // Refresh every 30 seconds
    interval = setInterval(fetchPresences, 30000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [users]);

  if (loading) {
    return (
      <div className="flex gap-2">
        {users.slice(0, 5).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full bg-gray-300 animate-pulse" />
        ))}
      </div>
    );
  }

  const availableCount = Array.from(presences.values()).filter(
    p => p.availability === 'Available'
  ).length;

  const busyCount = Array.from(presences.values()).filter(
    p => p.availability === 'Busy' || p.availability === 'DoNotDisturb'
  ).length;

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {users.slice(0, 5).map(user => {
          const presence = presences.get(user.id);
          return (
            <div key={user.id} className="relative">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="w-8 h-8 rounded-full border-2 border-white"
                />
              ) : (
                <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              )}
              {presence && (
                <div 
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getPresenceColor(presence.availability)}`}
                  title={presence.availability}
                />
              )}
            </div>
          );
        })}
        {users.length > 5 && (
          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-semibold">
            +{users.length - 5}
          </div>
        )}
      </div>
      
      <div className="text-sm text-muted-foreground">
        <span className="text-green-600 font-medium">{availableCount}</span> available
        {busyCount > 0 && (
          <>
            {' · '}
            <span className="text-red-600 font-medium">{busyCount}</span> busy
          </>
        )}
      </div>
    </div>
  );
}
