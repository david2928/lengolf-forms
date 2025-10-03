'use client';

/**
 * Notifications Context Provider
 *
 * Manages global notification state, Realtime subscriptions, and provides
 * notification-related functions to all components in the app.
 *
 * Story: NOTIF-006 (Notifications Context Provider)
 *
 * @module NotificationsContext
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import {
  subscribeToNotifications,
  unsubscribeFromNotifications,
  type Notification,
} from '@/lib/notifications-realtime';

/**
 * Context value shape
 */
interface NotificationsContextValue {
  /** All loaded notifications (latest first) */
  notifications: Notification[];

  /** Count of unread notifications */
  unreadCount: number;

  /** Loading state for initial fetch */
  isLoading: boolean;

  /** Error state */
  error: Error | null;

  /** Realtime connection status */
  isConnected: boolean;

  /** Mark a notification as acknowledged/read */
  acknowledgeNotification: (id: string, staffId: number) => Promise<void>;

  /** Add or update internal notes on a notification */
  addNotes: (id: string, notes: string, staffId: number) => Promise<void>;

  /** Refresh notifications from API */
  refreshNotifications: () => Promise<void>;

  /** Retry failed LINE notification */
  retryLineNotification: (id: string) => Promise<void>;
}

/**
 * Create context with undefined default (requires provider)
 */
const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

/**
 * Provider props
 */
interface NotificationsProviderProps {
  children: ReactNode;

  /** Staff ID for the current user (from session) */
  staffId?: number;

  /** Initial page size for notifications fetch */
  pageSize?: number;

  /** Unread count refresh interval in milliseconds */
  refreshInterval?: number;
}

/**
 * Notifications Provider Component
 *
 * Wraps the application (or a subtree) to provide notification state and functions.
 *
 * @example
 * ```tsx
 * // In app/layout.tsx or a page component
 * <NotificationsProvider staffId={currentUser.id}>
 *   <YourApp />
 * </NotificationsProvider>
 * ```
 */
export function NotificationsProvider({
  children,
  staffId,
  pageSize = 20,
  refreshInterval = 30000, // 30 seconds
}: NotificationsProviderProps) {
  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Refs
  const channelRef = useRef<RealtimeChannel | null | undefined>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications?limit=${pageSize}&page=1`);

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();

      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  /**
   * Refresh unread count only (lightweight query)
   */
  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=1&page=1&status=unread');

      if (!response.ok) {
        console.warn('Failed to refresh unread count');
        return;
      }

      const data = await response.json();
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.warn('Error refreshing unread count:', err);
    }
  }, []);

  /**
   * Mark notification as acknowledged
   */
  const acknowledgeNotification = useCallback(async (id: string, currentStaffId: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: currentStaffId }),
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge notification');
      }

      const data = await response.json();

      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                read: true,
                acknowledged_by: data.acknowledged_by,
                acknowledged_at: data.acknowledged_at,
              }
            : n
        )
      );

      // Decrease unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error acknowledging notification:', err);
      throw err;
    }
  }, []);

  /**
   * Add or update internal notes
   */
  const addNotes = useCallback(async (id: string, notes: string, currentStaffId: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, staff_id: currentStaffId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notes');
      }

      const data = await response.json();

      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                internal_notes: data.internal_notes,
                notes_updated_by: data.notes_updated_by,
                notes_updated_at: data.notes_updated_at,
              }
            : n
        )
      );
    } catch (err) {
      console.error('Error updating notes:', err);
      throw err;
    }
  }, []);

  /**
   * Refresh notifications from API
   */
  const refreshNotifications = useCallback(async () => {
    setIsLoading(true);
    await fetchNotifications();
  }, [fetchNotifications]);

  /**
   * Retry failed LINE notification
   */
  const retryLineNotification = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/retry-line`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to retry LINE notification');
      }

      const data = await response.json();

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                line_notification_sent: data.line_notification_sent,
                line_notification_error: null,
              }
            : n
        )
      );
    } catch (err) {
      console.error('Error retrying LINE notification:', err);
      throw err;
    }
  }, []);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  /**
   * Set up Realtime subscription
   */
  useEffect(() => {
    console.log('[NotificationsContext] Setting up Realtime subscription');

    const channel = subscribeToNotifications({
      onInsert: (notification) => {
        console.log('[NotificationsContext] New notification received:', notification);

        // Add to top of list
        setNotifications((prev) => [notification, ...prev]);

        // Increment unread count (new notifications are always unread)
        setUnreadCount((prev) => prev + 1);

        // Show toast notification
        const toastMessage = `${notification.customer_name} - ${notification.booking_time || 'No time'}`;
        if (notification.type === 'created') {
          toast.success('New Booking', { description: toastMessage });
        } else if (notification.type === 'cancelled') {
          toast.error('Booking Cancelled', { description: toastMessage });
        } else {
          toast.warning('Booking Modified', { description: toastMessage });
        }
      },
      onUpdate: (notification, old) => {
        console.log('[NotificationsContext] Notification updated:', notification);

        // Update in list
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? notification : n))
        );

        // Update unread count if read status changed
        if (old.read === false && notification.read === true) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        } else if (old.read === true && notification.read === false) {
          setUnreadCount((prev) => prev + 1);
        }
      },
      onDelete: (oldNotification) => {
        console.log('[NotificationsContext] Notification deleted:', oldNotification);

        // Remove from list
        setNotifications((prev) => prev.filter((n) => n.id !== oldNotification.id));

        // Update unread count if was unread
        if (!oldNotification.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      },
      onSubscribed: (status) => {
        console.log('[NotificationsContext] Realtime subscribed:', status);
        setIsConnected(true);
      },
      onError: (err) => {
        console.error('[NotificationsContext] Realtime error:', err);
        setIsConnected(false);
      },
      onClosed: () => {
        console.log('[NotificationsContext] Realtime connection closed');
        setIsConnected(false);
      },
    });

    // Handle null channel (failed to subscribe)
    if (!channel) {
      console.warn('[NotificationsContext] Failed to create Realtime subscription');
      setIsConnected(false);
      return;
    }

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      console.log('[NotificationsContext] Cleaning up Realtime subscription');
      if (channelRef.current) {
        unsubscribeFromNotifications(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  /**
   * Set up periodic unread count refresh
   */
  useEffect(() => {
    console.log('[NotificationsContext] Setting up unread count refresh interval:', refreshInterval);

    refreshIntervalRef.current = setInterval(() => {
      refreshUnreadCount();
    }, refreshInterval);

    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [refreshInterval, refreshUnreadCount]);

  const value: NotificationsContextValue = {
    notifications,
    unreadCount,
    isLoading,
    error,
    isConnected,
    acknowledgeNotification,
    addNotes,
    refreshNotifications,
    retryLineNotification,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

/**
 * Hook to use notifications context
 *
 * Must be used within a NotificationsProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { notifications, unreadCount, acknowledgeNotification } = useNotifications();
 *
 *   return (
 *     <div>
 *       <span>Unread: {unreadCount}</span>
 *       {notifications.map(n => (
 *         <div key={n.id} onClick={() => acknowledgeNotification(n.id, staffId)}>
 *           {n.message}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }

  return context;
}
