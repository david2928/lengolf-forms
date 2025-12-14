import { useEffect, useRef, useCallback, useState } from 'react';
import { supabaseRealtime } from '@/lib/supabase-realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface TypingUser {
  email: string;
  displayName: string;
  lastTypedAt: number;
}

interface RealtimeConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
  lastConnected?: Date;
  reconnectAttempts: number;
}

interface UseTypingIndicatorOptions {
  conversationId: string | null;
  userEmail: string;
  userDisplayName: string;
  enabled?: boolean;
}

export function useTypingIndicator({
  conversationId,
  userEmail,
  userDisplayName,
  enabled = true
}: UseTypingIndicatorOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>({
    status: supabaseRealtime ? 'disconnected' : 'error',
    error: supabaseRealtime ? undefined : 'Realtime client not available',
    reconnectAttempts: 0
  });

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
    setTypingUsers([]);
  }, []);

  const connect = useCallback(async () => {
    if (!supabaseRealtime || !conversationId || !userEmail || !enabled) {
      if (!supabaseRealtime) {
        setConnectionStatus(prev => ({
          ...prev,
          status: 'error',
          error: 'Realtime client not available'
        }));
      }
      return;
    }

    // Disconnect existing channel first
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      const channelName = `typing:${conversationId}`;
      setConnectionStatus(prev => ({ ...prev, status: 'connecting', error: undefined }));

      // Create presence channel
      const channel = supabaseRealtime.channel(channelName);

      // Listen for presence sync events
      channel.on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();

        // Transform presence state to TypingUser array
        const users: TypingUser[] = [];
        const now = Date.now();
        const STALE_THRESHOLD = 4000; // 4 seconds (3s timeout + 1s buffer)

        Object.keys(presenceState).forEach((key) => {
          const presences = presenceState[key];

          presences.forEach((presence: any) => {
            // Filter out self, non-typing users, and stale entries
            if (
              presence.email &&
              presence.email !== userEmail &&
              presence.typing === true &&
              presence.last_typed_at &&
              (now - presence.last_typed_at) < STALE_THRESHOLD
            ) {
              users.push({
                email: presence.email,
                displayName: presence.displayName || 'Unknown',
                lastTypedAt: presence.last_typed_at
              });
            }
          });
        });

        setTypingUsers(users);
      });

      // Subscribe to the channel
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          reconnectAttemptsRef.current = 0;
          setConnectionStatus({
            status: 'connected',
            lastConnected: new Date(),
            reconnectAttempts: 0
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus(prev => ({
            status: 'error',
            error: `Connection failed: ${status}`,
            reconnectAttempts: reconnectAttemptsRef.current
          }));

          // Retry with exponential backoff
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (status === 'CLOSED') {
          setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
        }
      });

      channelRef.current = channel;

    } catch (error) {
      reconnectAttemptsRef.current++;
      setConnectionStatus(prev => ({
        status: 'error',
        error: error instanceof Error ? error.message : 'Connection failed',
        reconnectAttempts: reconnectAttemptsRef.current
      }));
    }
  }, [conversationId, userEmail, enabled]);

  // Broadcast typing indicator
  const broadcastTyping = useCallback(async () => {
    const channel = channelRef.current;
    if (!channel || !userEmail || !userDisplayName) return;

    try {
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Track presence: user is typing
      await channel.track({
        email: userEmail,
        displayName: userDisplayName,
        typing: true,
        last_typed_at: Date.now()
      });

      // Set 3-second timeout to clear typing status
      typingTimeoutRef.current = setTimeout(async () => {
        if (channelRef.current) {
          await channelRef.current.track({
            email: userEmail,
            displayName: userDisplayName,
            typing: false,
            last_typed_at: Date.now()
          });
        }
      }, 3000);

    } catch (error) {
      console.error('Failed to broadcast typing indicator:', error);
    }
  }, [userEmail, userDisplayName]);

  // Connect when dependencies change
  useEffect(() => {
    if (supabaseRealtime && conversationId && userEmail && enabled) {
      connect();
    } else {
      // Disconnect if conditions not met
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
      setTypingUsers([]);
    }

    return () => {
      // Cleanup on unmount or dependency change
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [conversationId, userEmail, enabled, connect]);

  // Handle page visibility changes - reconnect when page becomes visible
  useEffect(() => {
    if (typeof window === 'undefined' || !supabaseRealtime) return;

    const lastActivityRef = { current: Date.now() };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;

        // If page was hidden for more than 30 seconds, reconnect
        if (timeSinceLastActivity > 30000) {
          connect();
        }
      } else {
        // Update last activity time when page becomes hidden
        lastActivityRef.current = Date.now();
      }
    };

    const handleFocus = () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;

      // If window was unfocused for more than 30 seconds, reconnect
      if (timeSinceLastActivity > 30000) {
        connect();
      }
    };

    const handleBlur = () => {
      lastActivityRef.current = Date.now();
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [connect]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    setConnectionStatus(prev => ({ ...prev, reconnectAttempts: 0 }));
    connect();
  }, [connect]);

  return {
    typingUsers,
    broadcastTyping,
    connectionStatus,
    reconnect,
    disconnect
  };
}
