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

import { CalendarPlus, CalendarX, CalendarClock, Calendar, Clock } from 'lucide-react';
import { Notification } from '@/lib/notifications-realtime';
import { formatDistanceToNow, format } from 'date-fns';
import { CustomerLink } from '@/components/shared/CustomerLink';

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
 * Get colored circle for notification type (minimalist design)
 */
function getTypeCircle(type: Notification['type']) {
  switch (type) {
    case 'created':
      return <div className="w-5 h-5 rounded-full bg-green-500 flex-shrink-0" />;
    case 'cancelled':
      return <div className="w-5 h-5 rounded-full bg-red-500 flex-shrink-0" />;
    case 'modified':
      return <div className="w-5 h-5 rounded-full bg-yellow-500 flex-shrink-0" />;
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
 * Determine the source of the booking action (online, self-service, or staff)
 */
function getActionSource(notification: Notification): string | null {
  const { type, metadata } = notification;

  let actorName: string | null = null;

  // Extract the actor based on notification type
  if (type === 'created' && metadata?.createdBy) {
    actorName = metadata.createdBy;
  } else if (type === 'cancelled' && metadata?.cancelledBy) {
    actorName = metadata.cancelledBy;
  } else if (type === 'modified' && metadata?.modifiedBy) {
    actorName = metadata.modifiedBy;
  }

  if (!actorName) return null;

  // Determine source based on actor name
  const lowerName = actorName.toLowerCase();

  if (lowerName.includes('online') || lowerName === 'system' || lowerName.includes('auto')) {
    return 'Online Booking';
  } else if (lowerName.includes('customer') || lowerName.includes('self')) {
    return 'Self-Service';
  } else {
    // If it's a staff name, return "Staff: Name"
    return `Staff: ${actorName}`;
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

  // Get action source for display
  const actionSource = getActionSource(notification);

  // Minimalist dropdown design
  if (isDropdown) {
    return (
      <div
        className={`
          flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0
          ${className}
        `}
        onClick={onClick}
      >
        {/* Colored Circle Icon */}
        {getTypeCircle(notification.type)}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Notification Type + Timestamp */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`inline-flex px-2 py-0.5 rounded-full font-medium text-xs ${getBadgeColor(notification.type)}`}>
              {getBadgeText(notification.type)}
            </span>
            <span className="text-xs text-gray-500">{timeAgo}</span>
          </div>

          {/* Row 2: Customer Identity */}
          <div className="flex items-baseline gap-1.5 mb-1.5 flex-wrap">
            <CustomerLink
              customerId={notification.customer_id}
              customerName={notification.customer_name}
              fromLocation="notifications-dropdown"
              fromLabel="Notification Dropdown"
              className="font-semibold text-base leading-tight text-gray-900"
            />
            {notification.customer_phone && (
              <span className="text-xs text-gray-500 font-normal">
                {notification.customer_phone}
              </span>
            )}
          </div>

          {/* Row 3: Date & Time with Icons */}
          <div className="flex items-center gap-3 text-sm text-gray-700 mb-1.5 flex-wrap">
            {notification.metadata?.formattedDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{notification.metadata.formattedDate}</span>
              </div>
            )}
            {notification.booking_time && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-medium">
                  {notification.booking_time}
                  {notification.duration && (
                    <>
                      <span className="text-gray-400 mx-1">•</span>
                      {notification.duration}h
                    </>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Row 4: Bay + Pax + Type (Pills) */}
          <div className="flex items-center flex-wrap gap-2 text-xs mb-1">
            {notification.bay && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                {notification.bay}
              </span>
            )}
            {notification.metadata?.numberOfPeople && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
                {notification.metadata.numberOfPeople} pax
              </span>
            )}
            {notification.metadata?.bookingType && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
                {notification.metadata.bookingType}
              </span>
            )}
          </div>

          {/* Row 5: Confirmation Status (Only if confirmed) */}
          {notification.read && notification.acknowledged_at && (
            <div className="text-xs text-gray-400 mt-1">
              ✓ Confirmed by {notification.acknowledged_by_display_name || `Staff #${notification.acknowledged_by}`} • {formatDistanceToNow(new Date(notification.acknowledged_at), { addSuffix: true })}
            </div>
          )}
        </div>

        {/* Checkmark for acknowledged or Confirm button */}
        <div className="flex-shrink-0">
          {notification.read ? (
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            onAcknowledge && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAcknowledge();
                }}
                className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors"
              >
                Confirm
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  // Full page variant - enhanced visual hierarchy
  return (
    <div
      className={`
        flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors
        ${className}
      `}
      onClick={onClick}
    >
      {/* Colored Circle Icon */}
      {getTypeCircle(notification.type)}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Notification Type + Timestamp */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`inline-flex px-2 py-0.5 rounded-full font-medium text-xs ${getBadgeColor(notification.type)}`}>
            {getBadgeText(notification.type)}
          </span>
          <span className="text-xs text-gray-500" title={exactTime}>{timeAgo}</span>
        </div>

        {/* Row 2: Customer Identity */}
        <div className="flex items-baseline gap-1.5 flex-wrap mb-1.5">
          <CustomerLink
            customerId={notification.customer_id}
            customerName={notification.customer_name}
            fromLocation="notifications-page"
            fromLabel="Notifications Log"
            className="font-semibold text-base leading-tight text-gray-900"
          />
          {notification.customer_phone && (
            <span className="text-xs text-gray-500 font-normal">
              {notification.customer_phone}
            </span>
          )}
        </div>

        {/* Row 3: Date & Time with Icons */}
        <div className="flex items-center flex-wrap gap-3 text-sm text-gray-700 mb-1.5">
          {notification.metadata?.formattedDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{notification.metadata.formattedDate}</span>
            </div>
          )}
          {notification.booking_time && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-medium">
                {notification.booking_time}
                {notification.duration && (
                  <>
                    <span className="text-gray-400 mx-1">•</span>
                    {notification.duration}h
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Row 4: Bay + Pax + Type (Pills) */}
        <div className="flex items-center flex-wrap gap-2 text-xs mb-1">
          {notification.bay && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
              {notification.bay}
            </span>
          )}
          {notification.metadata?.numberOfPeople && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
              {notification.metadata.numberOfPeople} pax
            </span>
          )}
          {notification.metadata?.bookingType && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
              {notification.metadata.bookingType}
            </span>
          )}
        </div>

        {/* Row 5: Confirmation Status (Only if confirmed) */}
        {notification.read && notification.acknowledged_at && (
          <div className="text-xs text-gray-400 mt-1.5">
            ✓ Confirmed by {notification.acknowledged_by_display_name || `Staff #${notification.acknowledged_by}`} • {formatDistanceToNow(new Date(notification.acknowledged_at), { addSuffix: true })}
          </div>
        )}

        {/* Changes Section (for modified bookings) - Collapsible style */}
        {notification.type === 'modified' && notification.metadata?.changes && Array.isArray(notification.metadata.changes) && notification.metadata.changes.length > 0 && (
          <div className="mt-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded-md text-xs">
            <div className="font-semibold text-yellow-900 mb-1.5">Changes:</div>
            <ul className="space-y-1">
              {notification.metadata.changes.map((change: any, idx: number) => (
                <li key={idx} className="text-yellow-900 flex items-baseline gap-1.5">
                  <span className="font-medium capitalize min-w-[60px]">{change.field.replace('_', ' ')}:</span>
                  <span className="flex-1">
                    <span className="line-through text-gray-600">{change.old || 'none'}</span>
                    <span className="mx-1.5 text-yellow-700">→</span>
                    <span className="font-semibold text-yellow-900">{change.new || 'none'}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action Button Area */}
      <div className="flex-shrink-0">
        {notification.read ? (
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          onAcknowledge && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAcknowledge();
              }}
              className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors shadow-sm"
            >
              Confirm
            </button>
          )
        )}
      </div>
    </div>
  );
}
