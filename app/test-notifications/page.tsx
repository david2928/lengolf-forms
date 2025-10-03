'use client';

/**
 * Test page for Notifications Context Provider
 *
 * Story: NOTIF-006
 *
 * This page tests the NotificationsProvider and useNotifications hook.
 *
 * Usage:
 * 1. Navigate to http://localhost:3002/test-notifications
 * 2. Check console for Realtime connection logs
 * 3. Create a notification via curl (see below)
 * 4. Verify notification appears in the list
 * 5. Click "Acknowledge" to test acknowledgment
 * 6. Add notes to test notes functionality
 *
 * Test notification:
 * curl -X POST http://localhost:3002/api/notify -H "Content-Type: application/json" -d '{
 *   "message": "Booking Notification (ID: BK-TEST-CTX)\nName: Context Test\nPhone: 0812345678\nDate: Thu, 15th January\nTime: 14:00\nBay: Bay 1\nType: Test\nPeople: 2\nCreated by: Test",
 *   "bookingType": "Test"
 * }'
 */

import { useNotifications } from '@/hooks/useNotifications';
import { useState } from 'react';

export default function TestNotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    isConnected,
    acknowledgeNotification,
    addNotes,
    refreshNotifications,
    retryLineNotification,
  } = useNotifications();

  const [notesInput, setNotesInput] = useState<{ [key: string]: string }>({});

  // Mock staff ID (in production, this comes from session)
  const MOCK_STAFF_ID = 1;

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Notifications Context Test</h1>
        <p>Loading notifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Notifications Context Test</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error loading notifications</p>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Notifications Context Test</h1>

      {/* Connection Status */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Connection Status</h2>
        <div className="flex items-center gap-4">
          <div>
            <span className="font-semibold">Realtime:</span>{' '}
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? '✅ Connected' : '❌ Disconnected'}
            </span>
          </div>
          <div>
            <span className="font-semibold">Unread Count:</span>{' '}
            <span className="font-mono bg-blue-100 px-2 py-1 rounded">{unreadCount}</span>
          </div>
          <div>
            <span className="font-semibold">Total Loaded:</span>{' '}
            <span className="font-mono">{notifications.length}</span>
          </div>
        </div>
        <button
          onClick={refreshNotifications}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Notifications
        </button>
      </div>

      {/* Test Instructions */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h2 className="font-bold mb-2">Test Instructions</h2>
        <p className="text-sm mb-2">Open a new terminal and run:</p>
        <pre className="bg-gray-800 text-white p-2 rounded text-xs overflow-x-auto">
{`curl -X POST http://localhost:3002/api/notify -H "Content-Type: application/json" -d '{
  "message": "Booking Notification (ID: BK-TEST-CTX)\\nName: Context Test\\nPhone: 0812345678\\nDate: Thu, 15th January\\nTime: 14:00\\nBay: Bay 1\\nType: Test\\nPeople: 2\\nCreated by: Test",
  "bookingType": "Test"
}'`}
        </pre>
        <p className="text-sm mt-2">
          Watch this page - the notification should appear instantly via Realtime!
        </p>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Notifications ({notifications.length})</h2>

        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 border border-gray-300 rounded">
            No notifications yet. Create one using the curl command above.
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`border rounded p-4 ${
                !notification.read ? 'bg-blue-50 border-blue-300 border-l-4' : 'bg-white border-gray-300'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      notification.type === 'created'
                        ? 'bg-green-100 text-green-800'
                        : notification.type === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {notification.type.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-600">
                    {new Date(notification.created_at).toLocaleString()}
                  </span>
                  {!notification.read && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                      UNREAD
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400 font-mono">{notification.id.substring(0, 8)}</span>
              </div>

              {/* Customer Info */}
              <div className="mb-2">
                <p className="font-bold">{notification.customer_name}</p>
                {notification.customer_phone && (
                  <p className="text-sm text-gray-600">{notification.customer_phone}</p>
                )}
              </div>

              {/* Message */}
              <pre className="bg-gray-50 p-2 rounded text-sm whitespace-pre-wrap mb-3">
                {notification.message}
              </pre>

              {/* LINE Status */}
              <div className="mb-3 text-sm">
                <span className="font-semibold">LINE Status:</span>{' '}
                {notification.line_notification_sent ? (
                  <span className="text-green-600">✅ Sent</span>
                ) : (
                  <>
                    <span className="text-red-600">❌ Failed</span>
                    {notification.line_notification_error && (
                      <span className="text-xs text-gray-600 ml-2">
                        ({notification.line_notification_error})
                      </span>
                    )}
                    <button
                      onClick={() => retryLineNotification(notification.id)}
                      className="ml-2 px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
                    >
                      Retry
                    </button>
                  </>
                )}
              </div>

              {/* Acknowledgment Status */}
              {notification.read && notification.acknowledged_at ? (
                <div className="text-sm text-green-600 mb-3">
                  ✅ Acknowledged by Staff #{notification.acknowledged_by} at{' '}
                  {new Date(notification.acknowledged_at).toLocaleString()}
                </div>
              ) : (
                <button
                  onClick={() => acknowledgeNotification(notification.id, MOCK_STAFF_ID)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm mb-3"
                >
                  Mark as Read
                </button>
              )}

              {/* Internal Notes */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <label className="block text-sm font-semibold mb-1">Internal Notes:</label>
                {notification.internal_notes ? (
                  <div className="bg-yellow-50 p-2 rounded text-sm mb-2">
                    <p>{notification.internal_notes}</p>
                    {notification.notes_updated_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Updated by Staff #{notification.notes_updated_by} at{' '}
                        {new Date(notification.notes_updated_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic mb-2">No notes yet</p>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add or update notes..."
                    value={notesInput[notification.id] || ''}
                    onChange={(e) =>
                      setNotesInput((prev) => ({ ...prev, [notification.id]: e.target.value }))
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <button
                    onClick={() => {
                      const notes = notesInput[notification.id];
                      if (notes?.trim()) {
                        addNotes(notification.id, notes, MOCK_STAFF_ID);
                        setNotesInput((prev) => ({ ...prev, [notification.id]: '' }));
                      }
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
