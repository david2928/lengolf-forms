'use client';

/**
 * NotificationDropdown Component
 *
 * Displays the latest 5 notifications in a dropdown panel.
 * Appears when NotificationBell is clicked.
 *
 * Story: NOTIF-007
 *
 * @module NotificationDropdown
 */

import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import Link from 'next/link';

/**
 * NotificationDropdown Props
 */
interface NotificationDropdownProps {
  /** Callback when dropdown should close */
  onClose?: () => void;

  /** Custom class name */
  className?: string;

  /** Maximum notifications to show (default: 5) */
  maxItems?: number;

  /** Staff ID for acknowledgment (from session) */
  staffId?: number;
}

/**
 * NotificationDropdown Component
 *
 * Shows latest notifications with "View All" link.
 *
 * @example
 * ```tsx
 * <NotificationDropdown
 *   onClose={() => setIsOpen(false)}
 *   className="absolute right-0 mt-2"
 *   staffId={session.user.staffId}
 * />
 * ```
 */
export function NotificationDropdown({
  onClose,
  className = '',
  maxItems = 5,
  staffId = 1, // TODO: Get from session in production
}: NotificationDropdownProps) {
  const { notifications, unreadCount, acknowledgeNotification } = useNotifications();

  // Get latest N notifications
  const latestNotifications = notifications.slice(0, maxItems);

  return (
    <div
      className={`
        w-96 max-h-[600px] bg-white rounded-lg shadow-xl border border-gray-200
        overflow-hidden flex flex-col
        ${className}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
              {unreadCount} unread
            </span>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {latestNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs mt-1">New booking notifications will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {latestNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                variant="dropdown"
                onAcknowledge={() => {
                  acknowledgeNotification(notification.id, staffId);
                }}
                onClick={() => {
                  // TODO: Navigate to booking details or notification log
                  if (onClose) onClose();
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {latestNotifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <Link
            href="/notifications"
            className="block w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700 py-2"
            onClick={onClose}
          >
            View All Notifications
          </Link>
        </div>
      )}
    </div>
  );
}
