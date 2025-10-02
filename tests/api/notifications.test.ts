import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Notifications API', () => {
  let testNotificationId: string;
  const testStaffId = 1; // Assuming staff with ID 1 exists in test database

  test.describe('POST /api/notify - Create notification (prerequisite)', () => {
    test('should create a test notification via /api/notify', async ({ request }) => {
      const lineMessage = `Booking Notification (ID: BK-TEST-${Date.now()})
Name: Test Customer
Phone: 0812345678
Date: Thu, 15th January
Time: 14:00 - 16:00
Bay: Bay 1
Type: Coaching
People: 2
Created by: Test Staff`;

      const response = await request.post(`${BASE_URL}/api/notify`, {
        data: {
          message: lineMessage,
          bookingType: 'Coaching',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Store notification ID for later tests
      if (data.notificationId) {
        testNotificationId = data.notificationId;
      }
    });
  });

  test.describe('GET /api/notifications', () => {
    test('should return paginated notifications with default parameters', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/notifications`);

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('notifications');
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('unreadCount');

      expect(Array.isArray(data.notifications)).toBe(true);
      expect(data.pagination).toHaveProperty('page');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('totalPages');
      expect(typeof data.unreadCount).toBe('number');
    });

    test('should filter by type', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/notifications?type=created`);

      expect(response.status()).toBe(200);
      const data = await response.json();

      // All returned notifications should be of type 'created'
      data.notifications.forEach((notification: any) => {
        expect(notification.type).toBe('created');
      });
    });

    test('should filter by status (unread)', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/notifications?status=unread`);

      expect(response.status()).toBe(200);
      const data = await response.json();

      // All returned notifications should be unread
      data.notifications.forEach((notification: any) => {
        expect(notification.read).toBe(false);
      });
    });

    test('should paginate results', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/notifications?page=1&limit=5`);

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(5);
      expect(data.notifications.length).toBeLessThanOrEqual(5);
    });

    test('should perform full-text search', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/notifications?search=Test`);

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(Array.isArray(data.notifications)).toBe(true);
      // If there are results, they should contain the search term in some field
    });

    test('should reject invalid page parameter', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/notifications?page=0`);

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toBeTruthy();
    });

    test('should cap limit at 100', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/notifications?limit=200`);

      expect(response.status()).toBe(200);
      const data = await response.json();

      // Limit should be capped at 100
      expect(data.pagination.limit).toBe(100);
    });
  });

  test.describe('POST /api/notifications/:id/acknowledge', () => {
    test('should acknowledge a notification', async ({ request }) => {
      // First, get an unread notification
      const listResponse = await request.get(`${BASE_URL}/api/notifications?status=unread&limit=1`);
      const listData = await listResponse.json();

      if (listData.notifications.length === 0) {
        test.skip();
        return;
      }

      const notificationId = listData.notifications[0].id;

      // Acknowledge it
      const response = await request.post(
        `${BASE_URL}/api/notifications/${notificationId}/acknowledge`,
        {
          data: {
            staff_id: testStaffId,
          },
        }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.acknowledged_by).toBe(testStaffId);
      expect(data.acknowledged_at).toBeTruthy();
      expect(data.notification.read).toBe(true);
    });

    test('should be idempotent (can acknowledge multiple times)', async ({ request }) => {
      // Get a notification
      const listResponse = await request.get(`${BASE_URL}/api/notifications?limit=1`);
      const listData = await listResponse.json();

      if (listData.notifications.length === 0) {
        test.skip();
        return;
      }

      const notificationId = listData.notifications[0].id;

      // Acknowledge it twice
      const response1 = await request.post(
        `${BASE_URL}/api/notifications/${notificationId}/acknowledge`,
        {
          data: {
            staff_id: testStaffId,
          },
        }
      );

      const response2 = await request.post(
        `${BASE_URL}/api/notifications/${notificationId}/acknowledge`,
        {
          data: {
            staff_id: testStaffId,
          },
        }
      );

      expect(response1.status()).toBe(200);
      expect(response2.status()).toBe(200);
    });

    test('should reject invalid notification ID', async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/notifications/invalid-id/acknowledge`,
        {
          data: {
            staff_id: testStaffId,
          },
        }
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid notification ID');
    });

    test('should reject missing staff_id', async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/notifications/123e4567-e89b-12d3-a456-426614174000/acknowledge`,
        {
          data: {},
        }
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('staff_id');
    });

    test('should return 404 for non-existent notification', async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/notifications/123e4567-e89b-12d3-a456-426614174000/acknowledge`,
        {
          data: {
            staff_id: testStaffId,
          },
        }
      );

      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('not found');
    });
  });

  test.describe('PUT /api/notifications/:id/notes', () => {
    test('should update notification notes', async ({ request }) => {
      // Get a notification
      const listResponse = await request.get(`${BASE_URL}/api/notifications?limit=1`);
      const listData = await listResponse.json();

      if (listData.notifications.length === 0) {
        test.skip();
        return;
      }

      const notificationId = listData.notifications[0].id;
      const testNotes = `Test notes updated at ${new Date().toISOString()}`;

      // Update notes
      const response = await request.put(
        `${BASE_URL}/api/notifications/${notificationId}/notes`,
        {
          data: {
            notes: testNotes,
            staff_id: testStaffId,
          },
        }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.internal_notes).toBe(testNotes);
      expect(data.notes_updated_by).toBe(testStaffId);
      expect(data.notes_updated_at).toBeTruthy();
    });

    test('should allow empty notes', async ({ request }) => {
      // Get a notification
      const listResponse = await request.get(`${BASE_URL}/api/notifications?limit=1`);
      const listData = await listResponse.json();

      if (listData.notifications.length === 0) {
        test.skip();
        return;
      }

      const notificationId = listData.notifications[0].id;

      // Update with empty notes
      const response = await request.put(
        `${BASE_URL}/api/notifications/${notificationId}/notes`,
        {
          data: {
            notes: '',
            staff_id: testStaffId,
          },
        }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.internal_notes).toBe('');
    });

    test('should reject notes exceeding max length', async ({ request }) => {
      const longNotes = 'a'.repeat(5001); // Exceeds 5000 char limit

      const response = await request.put(
        `${BASE_URL}/api/notifications/123e4567-e89b-12d3-a456-426614174000/notes`,
        {
          data: {
            notes: longNotes,
            staff_id: testStaffId,
          },
        }
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('5000');
    });

    test('should reject missing notes field', async ({ request }) => {
      const response = await request.put(
        `${BASE_URL}/api/notifications/123e4567-e89b-12d3-a456-426614174000/notes`,
        {
          data: {
            staff_id: testStaffId,
          },
        }
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('notes');
    });

    test('should reject invalid notification ID', async ({ request }) => {
      const response = await request.put(
        `${BASE_URL}/api/notifications/invalid-id/notes`,
        {
          data: {
            notes: 'Test',
            staff_id: testStaffId,
          },
        }
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid notification ID');
    });
  });

  test.describe('POST /api/notifications/:id/retry-line', () => {
    test('should handle retry for already sent notification', async ({ request }) => {
      // Get a notification (may or may not have been sent to LINE)
      const listResponse = await request.get(`${BASE_URL}/api/notifications?limit=1`);
      const listData = await listResponse.json();

      if (listData.notifications.length === 0) {
        test.skip();
        return;
      }

      const notificationId = listData.notifications[0].id;

      // Try to retry
      const response = await request.post(
        `${BASE_URL}/api/notifications/${notificationId}/retry-line`
      );

      // Could be 200 (already sent) or 200 (retry attempted) or 500 (retry failed)
      expect([200, 500]).toContain(response.status());
    });

    test('should reject invalid notification ID', async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/notifications/invalid-id/retry-line`
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid notification ID');
    });

    test('should return 404 for non-existent notification', async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/notifications/123e4567-e89b-12d3-a456-426614174000/retry-line`
      );

      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('not found');
    });
  });
});
