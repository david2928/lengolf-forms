'use client';

/**
 * NotificationBell Component
 *
 * Displays a bell icon with an unread notification count badge.
 * Clicking the bell opens the NotificationDropdown.
 *
 * Story: NOTIF-007
 *
 * @module NotificationBell
 */

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationDropdown } from './NotificationDropdown';

/**
 * NotificationBell Props
 */
interface NotificationBellProps {
  /** Custom class name for the bell container */
  className?: string;

  /** Size of the bell icon in pixels */
  iconSize?: number;

  /** Whether to show connection status indicator */
  showConnectionStatus?: boolean;
}

/**
 * NotificationBell Component
 *
 * Displays a bell icon with unread count badge and dropdown.
 *
 * @example
 * ```tsx
 * // In header/navbar
 * <NotificationBell className="ml-4" />
 * ```
 */
export function NotificationBell({
  className = '',
  iconSize = 24,
  showConnectionStatus = false,
}: NotificationBellProps) {
  const { unreadCount, isConnected } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        title={`${unreadCount} unread notifications`}
      >
        <Bell size={iconSize} className="text-gray-700" />

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Connection Status Indicator (optional) */}
        {showConnectionStatus && (
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
              isConnected ? 'bg-green-500' : 'bg-gray-400'
            }`}
            title={isConnected ? 'Connected to real-time notifications' : 'Disconnected'}
          />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <NotificationDropdown
          onClose={() => setIsOpen(false)}
          className="absolute right-0 mt-2 z-50"
        />
      )}
    </div>
  );
}
