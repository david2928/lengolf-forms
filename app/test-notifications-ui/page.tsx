'use client';

/**
 * Test page for Notification UI Components
 *
 * Story: NOTIF-007
 *
 * This page tests all the UI components together:
 * - NotificationBell with badge
 * - NotificationDropdown
 * - NotificationItem
 * - Real-time updates
 *
 * Usage:
 * 1. Navigate to http://localhost:3000/test-notifications-ui
 * 2. See the NotificationBell in the top-right corner
 * 3. Click the bell to open dropdown
 * 4. Create a notification via curl (see below)
 * 5. Watch it appear in real-time
 *
 * Test notification:
 * curl -X POST http://localhost:3000/api/notify -H "Content-Type: application/json" -d '{
 *   "message": "Booking Notification (ID: BK-UI-TEST)\nName: UI Test Customer\nPhone: 0812345678\nDate: Thu, 15th January\nTime: 14:00\nBay: Bay 1\nType: Test\nPeople: 2\nCreated by: Test",
 *   "bookingType": "Test"
 * }'
 */

import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import Link from 'next/link';

function TestContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mock Header with NotificationBell */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">LENGOLF Forms</h1>
            <p className="text-xs text-gray-500">Notification UI Test</p>
          </div>

          {/* NotificationBell Component */}
          <div className="flex items-center gap-4">
            <NotificationBell
              showConnectionStatus={true}
              iconSize={24}
            />
            <Link
              href="/notifications"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      </header>

      {/* Instructions */}
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Notification UI Components Test</h2>
          <p className="text-gray-600 mb-4">
            This page tests the NotificationBell and NotificationDropdown components with live Realtime updates.
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">✅ Components on this page:</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li><strong>NotificationBell</strong> - Top right corner with unread badge</li>
                <li><strong>Connection Status</strong> - Green/gray dot showing Realtime connection</li>
                <li><strong>NotificationDropdown</strong> - Opens when you click the bell</li>
                <li><strong>NotificationItem</strong> - Individual notification display</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h3 className="font-semibold mb-2">🧪 How to test:</h3>
              <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
                <li>Check that the bell icon appears in the header (top-right)</li>
                <li>Look for the green connection status indicator (means Realtime is working)</li>
                <li>Click the bell to open the dropdown</li>
                <li>Run the curl command below to create a test notification</li>
                <li>Watch the notification appear instantly in the dropdown</li>
                <li>Click &quot;Mark as Read&quot; to test acknowledgment</li>
                <li>Click &quot;View All Notifications&quot; to see the full log page</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <h3 className="font-semibold mb-2">📋 Create Test Notification:</h3>
              <p className="text-xs text-gray-600 mb-2">Open a terminal and run:</p>
              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`curl -X POST http://localhost:3000/api/notify \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Booking Notification (ID: BK-UI-TEST)\\nName: UI Test Customer\\nPhone: 0812345678\\nDate: Thu, 15th January\\nTime: 14:00\\nBay: Bay 1\\nType: Test\\nPeople: 2\\nCreated by: Test",
    "bookingType": "Test"
  }'`}
              </pre>
            </div>

            <div className="bg-green-50 border border-green-200 rounded p-4">
              <h3 className="font-semibold mb-2">✨ Expected Results:</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>Unread badge on bell should increment</li>
                <li>New notification should appear in dropdown instantly</li>
                <li>Notification should have green &quot;New Booking&quot; badge</li>
                <li>Customer name, time, and bay should be visible</li>
                <li>&quot;Mark as Read&quot; button should work</li>
                <li>After acknowledging, badge count should decrease</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold mb-3">🔗 Related Pages:</h3>
          <div className="space-y-2">
            <Link
              href="/notifications"
              className="block px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors font-medium"
            >
              → Full Notification Log (with filters & search)
            </Link>
            <Link
              href="/test-notifications"
              className="block px-4 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors font-medium"
            >
              → Context Provider Test (backend testing)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TestNotificationsUIPage() {
  return (
    <NotificationsProvider staffId={1} pageSize={20} refreshInterval={30000}>
      <TestContent />
    </NotificationsProvider>
  );
}
