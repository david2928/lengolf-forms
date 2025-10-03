'use client';

/**
 * Notifications Log Page
 *
 * Full notification history with filters, search, and pagination.
 *
 * Story: NOTIF-007
 *
 * Features:
 * - Search by customer name, phone, booking ID, notes
 * - Filter by type (created/cancelled/modified)
 * - Filter by status (all/unread/acknowledged)
 * - Inline notes editing
 * - LINE retry for failed notifications
 * - Real-time updates via Context Provider
 *
 * @module NotificationsPage
 */

import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Bell, Search, Filter, Pencil } from 'lucide-react';

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    acknowledgeNotification,
    addNotes,
    retryLineNotification,
  } = useNotifications();

  // Mock staff ID (TODO: get from session)
  const STAFF_ID = 1;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'created' | 'cancelled' | 'modified'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'acknowledged'>('all');

  // Notes editing
  const [notesInputs, setNotesInputs] = useState<{ [key: string]: string }>({});
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: boolean }>({});

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matches =
        n.customer_name.toLowerCase().includes(query) ||
        n.customer_phone?.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        n.internal_notes?.toLowerCase().includes(query) ||
        n.metadata?.bookingId?.toLowerCase().includes(query);

      if (!matches) return false;
    }

    // Type filter
    if (typeFilter !== 'all' && n.type !== typeFilter) {
      return false;
    }

    // Status filter
    if (statusFilter === 'unread' && n.read) {
      return false;
    }
    if (statusFilter === 'acknowledged' && !n.read) {
      return false;
    }

    return true;
  });

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error loading notifications</p>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Bell size={32} className="text-gray-700" />
            <h1 className="text-3xl font-bold text-gray-900">Notification Log</h1>
            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-semibold">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-gray-600">
            All booking notifications with acknowledgment tracking and notes
          </p>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Customer, phone, ID, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="created">Created</option>
                <option value="cancelled">Cancelled</option>
                <option value="modified">Modified</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="unread">Unread Only</option>
                <option value="acknowledged">Acknowledged Only</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredNotifications.length} of {notifications.length} notifications
          </div>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Bell size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No notifications found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'New booking notifications will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div key={notification.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Notification Item */}
                <NotificationItem
                  notification={notification}
                  variant="page"
                  onAcknowledge={() => acknowledgeNotification(notification.id, STAFF_ID)}
                />

                {/* LINE Status & Retry */}
                {!notification.line_notification_sent && notification.line_notification_error && (
                  <div className="px-4 pb-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p className="text-sm font-semibold text-yellow-800 mb-1">
                        LINE notification failed
                      </p>
                      <p className="text-xs text-yellow-700 mb-2">
                        {notification.line_notification_error}
                      </p>
                      <button
                        onClick={() => retryLineNotification(notification.id)}
                        className="px-3 py-1.5 bg-yellow-500 text-white rounded text-sm font-medium hover:bg-yellow-600 transition-colors"
                      >
                        Retry LINE Notification
                      </button>
                    </div>
                  </div>
                )}

                {/* Internal Notes Section */}
                <div className={`px-3 pb-3 border-t border-gray-100 pt-2 ${!notification.read ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Internal Notes
                    </label>
                    {notification.notes_updated_at && (
                      <span className="text-xs text-gray-500">
                        Updated by Staff #{notification.notes_updated_by} {new Date(notification.notes_updated_at).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Show existing notes or edit mode */}
                  {editingNotes[notification.id] ? (
                    <div className="flex gap-2 items-start">
                      <textarea
                        value={notesInputs[notification.id] ?? notification.internal_notes ?? ''}
                        onChange={(e) =>
                          setNotesInputs((prev) => ({ ...prev, [notification.id]: e.target.value }))
                        }
                        placeholder="Add internal notes (visible to all staff, searchable)..."
                        rows={2}
                        className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      />
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => {
                            const notes = notesInputs[notification.id] ?? notification.internal_notes ?? '';
                            if (notes.trim()) {
                              addNotes(notification.id, notes, STAFF_ID);
                              setEditingNotes((prev) => ({ ...prev, [notification.id]: false }));
                            }
                          }}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-xs font-semibold hover:bg-blue-600 transition-colors whitespace-nowrap"
                        >
                          Save
                        </button>
                        {notification.internal_notes && (
                          <button
                            onClick={() => {
                              setNotesInputs((prev) => ({ ...prev, [notification.id]: notification.internal_notes || '' }));
                              setEditingNotes((prev) => ({ ...prev, [notification.id]: false }));
                            }}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-semibold hover:bg-gray-300 transition-colors whitespace-nowrap"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setNotesInputs((prev) => ({ ...prev, [notification.id]: notification.internal_notes || '' }));
                        setEditingNotes((prev) => ({ ...prev, [notification.id]: true }));
                      }}
                      className="w-full bg-yellow-50 border border-yellow-200 rounded p-2 text-left hover:bg-yellow-100 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        {notification.internal_notes ? (
                          <p className="text-xs text-gray-800 whitespace-pre-wrap flex-1">{notification.internal_notes}</p>
                        ) : (
                          <p className="text-xs text-gray-400 italic flex-1">Notes...</p>
                        )}
                        <Pencil size={14} className="text-gray-400 group-hover:text-blue-600 flex-shrink-0 mt-0.5" />
                      </div>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
