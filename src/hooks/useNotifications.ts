/**
 * Re-export useNotifications hook
 *
 * This allows components to import from either:
 * - @/hooks/useNotifications (consistent with other hooks)
 * - @/contexts/NotificationsContext (direct from context)
 *
 * Story: NOTIF-006
 */

export { useNotifications } from '@/contexts/NotificationsContext';
export type { Notification } from '@/lib/notifications-realtime';
