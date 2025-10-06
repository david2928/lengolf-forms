'use client';

/**
 * NotificationItem Component
 *
 * Reusable component for displaying a single notification.
 * Supports two variants: 'dropdown' (compact) and 'page' (full details).
 *
 * Story: NOTIF-007
 *
 * @module NotificationItem
 */

import { CalendarPlus, CalendarX, CalendarClock } from 'lucide-react';
import { Notification } from '@/lib/notifications-realtime';
import { formatDistanceToNow, format } from 'date-fns';

/**
 * NotificationItem Props
 */
interface NotificationItemProps {
  /** The notification to display */
  notification: Notification;

  /** Variant: 'dropdown' for compact view, 'page' for full details */
  variant?: 'dropdown' | 'page';

  /** Callback when "Mark as Read" is clicked */
  onAcknowledge?: () => void;

  /** Callback when notification is clicked (navigate to details) */
  onClick?: () => void;

  /** Custom class name */
  className?: string;
}

/**
 * Get icon for notification type
 */
function getTypeIcon(type: Notification['type']) {
  switch (type) {
    case 'created':
      return <CalendarPlus className="text-green-600" size={20} />;
    case 'cancelled':
      return <CalendarX className="text-red-600" size={20} />;
    case 'modified':
      return <CalendarClock className="text-yellow-600" size={20} />;
  }
}

/**
 * Get badge color for notification type
 */
function getBadgeColor(type: Notification['type']) {
  switch (type) {
    case 'created':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'modified':
      return 'bg-yellow-100 text-yellow-800';
  }
}

/**
 * Get badge text for notification type
 */
function getBadgeText(type: Notification['type']) {
  switch (type) {
    case 'created':
      return 'New Booking';
    case 'cancelled':
      return 'Cancelled';
    case 'modified':
      return 'Modified';
  }
}

/**
 * NotificationItem Component
 *
 * Displays a single notification with type icon, message, and actions.
 *
 * @example
 * ```tsx
 * // In dropdown (compact)
 * <NotificationItem
 *   notification={notification}
 *   variant="dropdown"
 *   onAcknowledge={() => acknowledge(notification.id)}
 * />
 *
 * // In page (full details)
 * <NotificationItem
 *   notification={notification}
 *   variant="page"
 *   onAcknowledge={() => acknowledge(notification.id)}
 * />
 * ```
 */
export function NotificationItem({
  notification,
  variant = 'dropdown',
  onAcknowledge,
  onClick,
  className = '',
}: NotificationItemProps) {
  const isDropdown = variant === 'dropdown';

  // Format timestamp with exact time
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });
  const exactTime = format(new Date(notification.created_at), 'MMM d, h:mm a');

  return (
    <div
      className={`
        ${!notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'bg-white'}
        ${isDropdown ? 'p-2' : 'p-3 sm:p-4'}
        ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Header with Acknowledge button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-1">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {/* Type Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getTypeIcon(notification.type)}
          </div>

          {/* Type Badge + Time */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getBadgeColor(notification.type)}`}>
                {getBadgeText(notification.type)}
              </span>
              <span className="text-xs text-gray-500">{exactTime}</span>
              {!notification.read && isDropdown && (
                <span className="w-2 h-2 bg-blue-500 rounded-full" title="Unread" />
              )}
            </div>
          </div>
        </div>

        {/* Acknowledge Button */}
        {!notification.read && onAcknowledge && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAcknowledge();
            }}
            className="px-4 py-2 sm:py-1.5 bg-blue-500 text-white rounded text-sm sm:text-xs font-semibold hover:bg-blue-600 transition-colors flex-shrink-0 min-h-[44px] sm:min-h-0 w-full sm:w-auto"
          >
            Acknowledge
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 ml-6 sm:ml-7">{/* ml-6 on mobile, ml-7 on desktop to align with icon */}

          {/* Customer Name with Booking ID and Customer Code */}
          <p className="font-semibold text-gray-900 text-sm sm:text-base mb-1 break-words">
            {notification.customer_name}
            {notification.metadata?.bookingId && (
              <span className="ml-1.5 sm:ml-2 text-xs font-mono text-blue-600 font-normal break-all">
                [{notification.metadata.bookingId}]
              </span>
            )}
            {notification.customer_code && (
              <span className="ml-1.5 sm:ml-2 text-xs font-mono text-gray-600 font-normal">
                ({notification.customer_code})
              </span>
            )}
          </p>

          {/* Booking Details (compact) */}
          {isDropdown && (
            <div className="text-xs text-gray-600 space-y-0.5">
              {notification.booking_time && <p>Time: {notification.booking_time}</p>}
              {notification.bay && <p>Bay: {notification.bay}</p>}
            </div>
          )}

          {/* Booking Details (page variant - responsive grid) */}
          {!isDropdown && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 sm:gap-y-1 text-xs sm:text-sm">
                {notification.customer_phone && (
                  <div className="break-all">
                    <span className="text-gray-500 font-medium">Phone:</span>{' '}
                    <span className="text-gray-900">{notification.customer_phone}</span>
                  </div>
                )}
                {notification.booking_time && (
                  <div>
                    <span className="text-gray-500 font-medium">Time:</span>{' '}
                    <span className="text-gray-900">{notification.booking_time}</span>
                  </div>
                )}
                {notification.bay && (
                  <div>
                    <span className="text-gray-500 font-medium">Bay:</span>{' '}
                    <span className="text-gray-900">{notification.bay}</span>
                  </div>
                )}
                {notification.metadata?.numberOfPeople && (
                  <div>
                    <span className="text-gray-500 font-medium">Pax:</span>{' '}
                    <span className="text-gray-900">{notification.metadata.numberOfPeople}</span>
                  </div>
                )}
                {notification.metadata?.bookingType && (
                  <div>
                    <span className="text-gray-500 font-medium">Type:</span>{' '}
                    <span className="text-gray-900">{notification.metadata.bookingType}</span>
                  </div>
                )}
                {notification.metadata?.formattedDate && (
                  <div>
                    <span className="text-gray-500 font-medium">Date:</span>{' '}
                    <span className="text-gray-900">{notification.metadata.formattedDate}</span>
                  </div>
                )}
              </div>

              {/* Changes (for modified bookings) */}
              {notification.type === 'modified' && notification.metadata?.changes && Array.isArray(notification.metadata.changes) && notification.metadata.changes.length > 0 && (
                <div className="mt-2 p-2 sm:p-2.5 bg-yellow-50 border border-yellow-200 rounded text-xs sm:text-sm">
                  <span className="font-semibold text-yellow-900">Changes:</span>
                  <ul className="mt-1 space-y-1 sm:space-y-0.5 ml-4">
                    {notification.metadata.changes.map((change: any, idx: number) => (
                      <li key={idx} className="text-yellow-900 break-words">
                        <span className="font-medium capitalize">{change.field.replace('_', ' ')}:</span>{' '}
                        <span className="line-through text-gray-600">{change.old || 'none'}</span>
                        {' → '}
                        <span className="font-semibold">{change.new || 'none'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Acknowledgment Status (page variant) */}
          {!isDropdown && notification.read && notification.acknowledged_at && (
            <p className="text-xs sm:text-sm text-green-600 mt-2 break-words">
              ✅ Acknowledged by {notification.acknowledged_by_display_name || `Staff #${notification.acknowledged_by}`} {formatDistanceToNow(new Date(notification.acknowledged_at), { addSuffix: true })}
            </p>
          )}
        </div>
    </div>
  );
}
