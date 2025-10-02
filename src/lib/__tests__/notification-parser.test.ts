/**
 * Unit tests for notification-parser.ts
 */

import {
  extractBookingId,
  detectNotificationType,
  extractBookingData,
  formatCleanNotification,
  removeEmojis,
  parseLineMessage,
  type NotificationType,
  type BookingData,
} from '../notification-parser';

describe('notification-parser', () => {
  describe('extractBookingId', () => {
    it('should extract booking ID from "Booking ID: BKxxx" format', () => {
      const message = 'Booking Notification (ID: BK-ABC123)\nName: John Doe';
      expect(extractBookingId(message)).toBe('BK-ABC123');
    });

    it('should extract booking ID from "ID: BKxxx" format', () => {
      const message = '🚫 BOOKING CANCELLED (ID: BK-XYZ789) 🚫';
      expect(extractBookingId(message)).toBe('BK-XYZ789');
    });

    it('should extract booking ID from "Booking ID:" format', () => {
      const message = 'Booking ID: BK-TEST001\nCustomer: Jane';
      expect(extractBookingId(message)).toBe('BK-TEST001');
    });

    it('should return null if no booking ID found', () => {
      const message = 'Customer: John Doe\nPhone: 0812345678';
      expect(extractBookingId(message)).toBeNull();
    });

    it('should handle empty string', () => {
      expect(extractBookingId('')).toBeNull();
    });
  });

  describe('detectNotificationType', () => {
    it('should detect "created" type for new bookings', () => {
      const message = 'Booking Notification (ID: BK-ABC123)\nName: John Doe';
      expect(detectNotificationType(message)).toBe('created');
    });

    it('should detect "cancelled" type from keyword', () => {
      const message = '🚫 BOOKING CANCELLED (ID: BK-ABC123) 🚫';
      expect(detectNotificationType(message)).toBe('cancelled');
    });

    it('should detect "cancelled" type from emoji', () => {
      const message = '🚫 Some cancellation message';
      expect(detectNotificationType(message)).toBe('cancelled');
    });

    it('should detect "modified" type from keyword', () => {
      const message = 'ℹ️ BOOKING MODIFIED (ID: BK-ABC123) 🔄';
      expect(detectNotificationType(message)).toBe('modified');
    });

    it('should detect "modified" type from emoji', () => {
      const message = '🔄 Booking updated';
      expect(detectNotificationType(message)).toBe('modified');
    });

    it('should default to "created" for unknown messages', () => {
      const message = 'Some random message';
      expect(detectNotificationType(message)).toBe('created');
    });
  });

  describe('extractBookingData', () => {
    it('should extract data from new booking LINE message', () => {
      const message = `Booking Notification (ID: BK-ABC123)
Name: John Doe (New Customer)
Phone: 0812345678
Date: Thu, 15th January
Time: 14:00 - 16:00
Bay: Bay 1
Type: Coaching (Premium Package)
People: 2
Channel: Walk-in
Created by: Staff Name`;

      const data = extractBookingData(message);

      expect(data.bookingId).toBe('BK-ABC123');
      expect(data.customerName).toBe('John Doe');
      expect(data.isNewCustomer).toBe(true);
      expect(data.customerPhone).toBe('0812345678');
      expect(data.date).toContain('Thu');
      expect(data.time).toBe('14:00');
      expect(data.bay).toBe('Bay 1');
      expect(data.bookingType).toBe('Coaching');
      expect(data.packageName).toBe('Premium Package');
      expect(data.numberOfPeople).toBe(2);
      expect(data.createdBy).toBe('Staff Name');
    });

    it('should extract data from cancellation LINE message with emojis', () => {
      const message = `🚫 BOOKING CANCELLED (ID: BK-XYZ789) 🚫
----------------------------------
👤 Customer: Jane Smith
📞 Phone: 0898765432
🗓️ Date: Fri, 16th January
⏰ Time: 10:00 (Duration: 2h)
⛳ Bay: Bay 2
🧑‍🤝‍🧑 Pax: 4
----------------------------------
🗑️ Cancelled By: Admin User
💬 Reason: Customer request`;

      const data = extractBookingData(message);

      expect(data.bookingId).toBe('BK-XYZ789');
      expect(data.customerName).toBe('Jane Smith');
      expect(data.isNewCustomer).toBe(false);
      expect(data.customerPhone).toBe('0898765432');
      expect(data.time).toBe('10:00');
      expect(data.bay).toBe('Bay 2');
      expect(data.numberOfPeople).toBe(4);
      expect(data.cancelledBy).toBe('Admin User');
      expect(data.cancellationReason).toBe('Customer request');
    });

    it('should extract data from modification LINE message', () => {
      const message = `ℹ️ BOOKING MODIFIED (ID: BK-MOD456) 🔄
----------------------------------
👤 Customer: Bob Johnson ⭐ NEW
📞 Phone: 0887654321
👥 Pax: 3
🗓️ Date: Sat, Jan 17
⏰ Time: 15:00 (Duration: 1.5H)
⛳ Bay: Bay 3
💡 Type: Practice (Family Package)
📍 Referral: Facebook
----------------------------------
🛠️ Changes: Date: 2025-01-16 -> 2025-01-17, Time: 14:00 -> 15:00
🧑‍💼 By: Manager Name`;

      const data = extractBookingData(message);

      expect(data.bookingId).toBe('BK-MOD456');
      expect(data.customerName).toBe('Bob Johnson');
      expect(data.isNewCustomer).toBe(true);
      expect(data.customerPhone).toBe('0887654321');
      expect(data.time).toBe('15:00');
      expect(data.bay).toBe('Bay 3');
      expect(data.bookingType).toBe('Practice');
      expect(data.packageName).toBe('Family Package');
      expect(data.numberOfPeople).toBe(3);
      expect(data.referralSource).toBe('Facebook');
      expect(data.changes).toContain('Date:');
      expect(data.modifiedBy).toBe('Manager Name');
    });

    it('should handle missing optional fields gracefully', () => {
      const message = 'Customer: Alice\nPhone: N/A';
      const data = extractBookingData(message);

      expect(data.customerName).toBe('Alice');
      expect(data.customerPhone).toBeFalsy();
      expect(data.bookingId).toBeNull();
      expect(data.date).toBeNull();
      expect(data.time).toBeNull();
    });

    it('should handle empty message', () => {
      const data = extractBookingData('');

      expect(data.bookingId).toBeNull();
      expect(data.customerName).toBeNull();
      expect(data.customerPhone).toBeNull();
    });
  });

  describe('formatCleanNotification', () => {
    it('should format clean notification for created type', () => {
      const data: BookingData = {
        bookingId: 'BK-ABC123',
        customerName: 'John Doe',
        customerPhone: '0812345678',
        date: 'Thu, 15th January',
        time: '14:00',
        bay: 'Bay 1',
        bookingType: 'Coaching',
        numberOfPeople: 2,
        packageName: 'Premium Package',
        isNewCustomer: true,
        createdBy: 'Staff Name',
        cancelledBy: null,
        modifiedBy: null,
        cancellationReason: null,
        changes: null,
        referralSource: 'Instagram',
      };

      const message = formatCleanNotification(data, 'created');

      expect(message).not.toContain('🚫');
      expect(message).not.toContain('👤');
      expect(message).not.toContain('📞');
      expect(message).toContain('New Booking');
      expect(message).toContain('BK-ABC123');
      expect(message).toContain('John Doe (New Customer)');
      expect(message).toContain('0812345678');
      expect(message).toContain('Bay 1');
      expect(message).toContain('Coaching (Premium Package)');
      expect(message).toContain('Staff Name');
      expect(message).toContain('Instagram');
    });

    it('should format clean notification for cancelled type', () => {
      const data: BookingData = {
        bookingId: 'BK-XYZ789',
        customerName: 'Jane Smith',
        customerPhone: '0898765432',
        date: 'Fri, 16th January',
        time: '10:00',
        bay: 'Bay 2',
        bookingType: null,
        numberOfPeople: 4,
        packageName: null,
        isNewCustomer: false,
        createdBy: null,
        cancelledBy: 'Admin User',
        modifiedBy: null,
        cancellationReason: 'Customer request',
        changes: null,
        referralSource: null,
      };

      const message = formatCleanNotification(data, 'cancelled');

      expect(message).not.toContain('🚫');
      expect(message).not.toContain('🗑️');
      expect(message).toContain('Booking Cancelled');
      expect(message).toContain('BK-XYZ789');
      expect(message).toContain('Jane Smith');
      expect(message).toContain('Admin User');
      expect(message).toContain('Customer request');
    });

    it('should format clean notification for modified type', () => {
      const data: BookingData = {
        bookingId: 'BK-MOD456',
        customerName: 'Bob Johnson',
        customerPhone: '0887654321',
        date: 'Sat, 17th January',
        time: '15:00',
        bay: 'Bay 3',
        bookingType: 'Practice',
        numberOfPeople: 3,
        packageName: null,
        isNewCustomer: false,
        createdBy: null,
        cancelledBy: null,
        modifiedBy: 'Manager Name',
        cancellationReason: null,
        changes: 'Date: 2025-01-16 -> 2025-01-17',
        referralSource: 'Facebook',
      };

      const message = formatCleanNotification(data, 'modified');

      expect(message).not.toContain('ℹ️');
      expect(message).not.toContain('🔄');
      expect(message).toContain('Booking Modified');
      expect(message).toContain('BK-MOD456');
      expect(message).toContain('Bob Johnson');
      expect(message).toContain('Date: 2025-01-16 -> 2025-01-17');
      expect(message).toContain('Manager Name');
      expect(message).toContain('Facebook');
    });

    it('should handle null/missing fields gracefully', () => {
      const data: BookingData = {
        bookingId: null,
        customerName: 'Test User',
        customerPhone: null,
        date: null,
        time: null,
        bay: null,
        bookingType: null,
        numberOfPeople: null,
        packageName: null,
        isNewCustomer: false,
        createdBy: null,
        cancelledBy: null,
        modifiedBy: null,
        cancellationReason: null,
        changes: null,
        referralSource: null,
      };

      const message = formatCleanNotification(data, 'created');

      expect(message).toContain('New Booking');
      expect(message).toContain('Test User');
      expect(message).not.toContain('null');
      expect(message).not.toContain('undefined');
    });
  });

  describe('removeEmojis', () => {
    it('should remove all emojis from text', () => {
      const text = '🚫 BOOKING CANCELLED 🚫 👤 Customer: John 📞 Phone: 123';
      const clean = removeEmojis(text);

      expect(clean).not.toContain('🚫');
      expect(clean).not.toContain('👤');
      expect(clean).not.toContain('📞');
      expect(clean).toContain('BOOKING CANCELLED');
      expect(clean).toContain('Customer: John');
      expect(clean).toContain('Phone: 123');
    });

    it('should handle text without emojis', () => {
      const text = 'This is a normal text message';
      const clean = removeEmojis(text);

      expect(clean).toBe('This is a normal text message');
    });

    it('should handle empty string', () => {
      expect(removeEmojis('')).toBe('');
    });
  });

  describe('parseLineMessage (integration)', () => {
    it('should parse complete new booking message', () => {
      const lineMessage = `Booking Notification (ID: BK-ABC123)
Name: John Doe (New Customer)
Phone: 0812345678
Date: Thu, 15th January
Time: 14:00 - 16:00
Bay: Bay 1
Type: Coaching (Premium Package)
People: 2
Channel: Walk-in
Created by: Staff Name`;

      const result = parseLineMessage(lineMessage);

      expect(result.type).toBe('created');
      expect(result.data.bookingId).toBe('BK-ABC123');
      expect(result.data.customerName).toBe('John Doe');
      expect(result.data.isNewCustomer).toBe(true);
      expect(result.cleanMessage).toContain('New Booking');
      expect(result.cleanMessage).toContain('BK-ABC123');
      expect(result.cleanMessage).not.toContain('📞');
    });

    it('should parse complete cancellation message with emojis', () => {
      const lineMessage = `🚫 BOOKING CANCELLED (ID: BK-XYZ789) 🚫
----------------------------------
👤 Customer: Jane Smith
📞 Phone: 0898765432
🗓️ Date: Fri, 16th January
⏰ Time: 10:00 (Duration: 2h)
⛳ Bay: Bay 2
🧑‍🤝‍🧑 Pax: 4
----------------------------------
🗑️ Cancelled By: Admin User
💬 Reason: Customer request`;

      const result = parseLineMessage(lineMessage);

      expect(result.type).toBe('cancelled');
      expect(result.data.bookingId).toBe('BK-XYZ789');
      expect(result.data.customerName).toBe('Jane Smith');
      expect(result.data.cancelledBy).toBe('Admin User');
      expect(result.cleanMessage).toContain('Booking Cancelled');
      expect(result.cleanMessage).not.toContain('🚫');
      expect(result.cleanMessage).not.toContain('👤');
    });

    it('should parse complete modification message', () => {
      const lineMessage = `ℹ️ BOOKING MODIFIED (ID: BK-MOD456) 🔄
----------------------------------
👤 Customer: Bob Johnson ⭐ NEW
📞 Phone: 0887654321
👥 Pax: 3
🗓️ Date: Sat, Jan 17
⏰ Time: 15:00 (Duration: 1.5H)
⛳ Bay: Bay 3
💡 Type: Practice (Family Package)
📍 Referral: Facebook
----------------------------------
🛠️ Changes: Date: 2025-01-16 -> 2025-01-17, Time: 14:00 -> 15:00
🧑‍💼 By: Manager Name`;

      const result = parseLineMessage(lineMessage);

      expect(result.type).toBe('modified');
      expect(result.data.bookingId).toBe('BK-MOD456');
      expect(result.data.customerName).toBe('Bob Johnson');
      expect(result.data.isNewCustomer).toBe(true);
      expect(result.data.modifiedBy).toBe('Manager Name');
      expect(result.cleanMessage).toContain('Booking Modified');
      expect(result.cleanMessage).not.toContain('ℹ️');
      expect(result.cleanMessage).not.toContain('🔄');
    });

    it('should handle malformed message gracefully', () => {
      const lineMessage = 'This is not a valid booking message';
      const result = parseLineMessage(lineMessage);

      expect(result.type).toBe('created'); // Default type
      expect(result.data.bookingId).toBeNull();
      expect(result.cleanMessage).toBeDefined();
    });
  });
});
