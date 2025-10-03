/**
 * Notification Parser Utility
 *
 * Parses LINE notification messages to extract booking data and create clean,
 * emoji-free in-app notifications.
 *
 * @module notification-parser
 */

/**
 * Extracted booking data from LINE messages
 */
export interface BookingData {
  bookingId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  date: string | null;  // YYYY-MM-DD format
  time: string | null;  // HH:mm format
  bay: string | null;   // "Bay 1", "Bay 2", etc.
  bookingType: string | null;
  numberOfPeople: number | null;
  packageName: string | null;
  isNewCustomer: boolean;
  createdBy: string | null;
  cancelledBy: string | null;
  modifiedBy: string | null;
  cancellationReason: string | null;
  changes: string | null;
  referralSource: string | null;
}

/**
 * Notification types matching database enum
 */
export type NotificationType = 'created' | 'cancelled' | 'modified';

/**
 * Result of parsing a LINE message
 */
export interface ParseResult {
  type: NotificationType;
  data: BookingData;
  cleanMessage: string;
}

/**
 * Extract booking ID from LINE message
 * Supports formats: "Booking ID: BKxxx", "ID: BKxxx", "(ID: BKxxx)"
 */
export function extractBookingId(lineMessage: string): string | null {
  const patterns = [
    /Booking ID:\s*([A-Z0-9-]+)/i,
    /\(ID:\s*([A-Z0-9-]+)\)/i,
    /ID:\s*([A-Z0-9-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = lineMessage.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract customer name from LINE message
 * Handles "Customer:", "Name:", and "(New Customer)" suffix
 */
function extractCustomerName(lineMessage: string): { name: string | null; isNew: boolean } {
  const patterns = [
    /(?:Customer|Name|👤 Customer):\s*([^(\n]+?)(?:\s*\(New Customer\)|\s*⭐ NEW)?(?:\n|$)/i,
    /Name:\s*([^\n]+?)(?:\s*\(New Customer\))?(?:\n|$)/i,
  ];

  let name: string | null = null;
  let isNew = false;

  for (const pattern of patterns) {
    const match = lineMessage.match(pattern);
    if (match) {
      name = match[1].trim();
      isNew = /\(New Customer\)|⭐ NEW/i.test(lineMessage);
      break;
    }
  }

  return { name, isNew };
}

/**
 * Extract phone number from LINE message
 */
function extractPhone(lineMessage: string): string | null {
  const pattern = /(?:Phone|📞 Phone):\s*([^\n]+)/i;
  const match = lineMessage.match(pattern);
  return match ? match[1].trim().replace(/N\/A/i, '') : null;
}

/**
 * Extract and normalize date from LINE message
 * Converts formats like "Thu, 15th January" to "2025-01-15"
 */
function extractDate(lineMessage: string): string | null {
  // Try to extract the formatted date (e.g., "Thu, 15th January" or "EEE, MMM dd")
  const datePattern = /(?:Date|🗓️ Date):\s*([A-Za-z]{3},\s*[A-Za-z]{3}\s*\d{1,2}(?:st|nd|rd|th)?|[A-Za-z]{3},\s*\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+)/i;
  const match = lineMessage.match(datePattern);

  if (match) {
    // For now, return the formatted string as-is
    // In production, you'd parse this to YYYY-MM-DD using date-fns
    return match[1].trim();
  }

  return null;
}

/**
 * Extract time from LINE message
 * Returns start time in HH:mm format
 */
function extractTime(lineMessage: string): string | null {
  // Pattern: "Time: 14:00 - 16:00" or "⏰ Time: 14:00 (Duration: 2h)"
  const patterns = [
    /(?:Time|⏰ Time):\s*(\d{2}:\d{2})/i,
  ];

  for (const pattern of patterns) {
    const match = lineMessage.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract bay from LINE message
 */
function extractBay(lineMessage: string): string | null {
  const pattern = /(?:Bay|⛳ Bay):\s*([^\n]+?)(?:\n|$)/i;
  const match = lineMessage.match(pattern);
  if (match) {
    const bay = match[1].trim();
    return bay.replace(/N\/A/i, '');
  }
  return null;
}

/**
 * Extract booking type from LINE message
 */
function extractBookingType(lineMessage: string): string | null {
  const pattern = /(?:Type|💡 Type):\s*([^\n(]+?)(?:\s*\([^)]+\))?(?:\n|$)/i;
  const match = lineMessage.match(pattern);
  return match ? match[1].trim().replace(/N\/A/i, '') : null;
}

/**
 * Extract package name from LINE message
 */
function extractPackageName(lineMessage: string): string | null {
  const pattern = /(?:Type|💡 Type):[^(]*\(([^)]+)\)/i;
  const match = lineMessage.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Extract number of people from LINE message
 */
function extractNumberOfPeople(lineMessage: string): number | null {
  const pattern = /(?:People|Pax|👥 Pax|🧑‍🤝‍🧑 Pax):\s*(\d+)/i;
  const match = lineMessage.match(pattern);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract created by staff name from LINE message
 */
function extractCreatedBy(lineMessage: string): string | null {
  const pattern = /(?:Created by|🧑‍💼 By):\s*([^\n]+)/i;
  const match = lineMessage.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Extract cancelled by staff name from LINE message
 */
function extractCancelledBy(lineMessage: string): string | null {
  const pattern = /(?:Cancelled By|🗑️ Cancelled By):\s*([^\n]+)/i;
  const match = lineMessage.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Extract cancellation reason from LINE message
 */
function extractCancellationReason(lineMessage: string): string | null {
  const pattern = /(?:Reason|💬 Reason):\s*([^\n]+)/i;
  const match = lineMessage.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Extract modified by staff name from LINE message
 */
function extractModifiedBy(lineMessage: string): string | null {
  const pattern = /(?:By|🧑‍💼 By):\s*([^\n]+)/i;
  const match = lineMessage.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Extract changes from modification LINE message
 */
function extractChanges(lineMessage: string): string | null {
  const pattern = /(?:Changes|🛠️ Changes):\s*([^\n]+)/i;
  const match = lineMessage.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Extract referral source from LINE message
 */
function extractReferralSource(lineMessage: string): string | null {
  const pattern = /(?:Referral|📍 Referral):\s*([^\n]+)/i;
  const match = lineMessage.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Detect notification type from LINE message content
 */
export function detectNotificationType(lineMessage: string): NotificationType {
  const messageLower = lineMessage.toLowerCase();

  if (messageLower.includes('cancelled') || messageLower.includes('🚫')) {
    return 'cancelled';
  }

  if (messageLower.includes('modified') || messageLower.includes('🔄') || messageLower.includes('ℹ️')) {
    return 'modified';
  }

  // Default to 'created' for new bookings
  return 'created';
}

/**
 * Extract all booking data from LINE message
 */
export function extractBookingData(lineMessage: string): BookingData {
  const { name, isNew } = extractCustomerName(lineMessage);

  return {
    bookingId: extractBookingId(lineMessage),
    customerName: name,
    customerPhone: extractPhone(lineMessage),
    date: extractDate(lineMessage),
    time: extractTime(lineMessage),
    bay: extractBay(lineMessage),
    bookingType: extractBookingType(lineMessage),
    numberOfPeople: extractNumberOfPeople(lineMessage),
    packageName: extractPackageName(lineMessage),
    isNewCustomer: isNew,
    createdBy: extractCreatedBy(lineMessage),
    cancelledBy: extractCancelledBy(lineMessage),
    modifiedBy: extractModifiedBy(lineMessage),
    cancellationReason: extractCancellationReason(lineMessage),
    changes: extractChanges(lineMessage),
    referralSource: extractReferralSource(lineMessage),
  };
}

/**
 * Format clean notification message (no emojis)
 */
export function formatCleanNotification(
  data: BookingData,
  type: NotificationType
): string {
  const customerDisplay = data.isNewCustomer
    ? `${data.customerName} (New Customer)`
    : data.customerName;

  const typeDisplay = data.packageName
    ? `${data.bookingType} (${data.packageName})`
    : data.bookingType;

  switch (type) {
    case 'created':
      let createdMessage = `New Booking${data.bookingId ? ` (ID: ${data.bookingId})` : ''}\n`;
      createdMessage += `Customer: ${customerDisplay}\n`;
      if (data.customerPhone) createdMessage += `Phone: ${data.customerPhone}\n`;
      if (data.date) createdMessage += `Date: ${data.date}\n`;
      if (data.time) createdMessage += `Time: ${data.time}\n`;
      if (data.bay) createdMessage += `Bay: ${data.bay}\n`;
      if (typeDisplay) createdMessage += `Type: ${typeDisplay}\n`;
      if (data.numberOfPeople) createdMessage += `Pax: ${data.numberOfPeople}\n`;
      if (data.referralSource) createdMessage += `Referral: ${data.referralSource}\n`;
      if (data.createdBy) createdMessage += `Created by: ${data.createdBy}`;
      return createdMessage.trim();

    case 'cancelled':
      let cancelledMessage = `Booking Cancelled${data.bookingId ? ` (ID: ${data.bookingId})` : ''}\n`;
      cancelledMessage += `Customer: ${data.customerName}\n`;
      if (data.customerPhone) cancelledMessage += `Phone: ${data.customerPhone}\n`;
      if (data.date) cancelledMessage += `Date: ${data.date}\n`;
      if (data.time) cancelledMessage += `Time: ${data.time}\n`;
      if (data.bay) cancelledMessage += `Bay: ${data.bay}\n`;
      if (data.numberOfPeople) cancelledMessage += `Pax: ${data.numberOfPeople}\n`;
      if (data.cancelledBy) cancelledMessage += `Cancelled by: ${data.cancelledBy}\n`;
      if (data.cancellationReason) cancelledMessage += `Reason: ${data.cancellationReason}`;
      return cancelledMessage.trim();

    case 'modified':
      let modifiedMessage = `Booking Modified${data.bookingId ? ` (ID: ${data.bookingId})` : ''}\n`;
      modifiedMessage += `Customer: ${customerDisplay}\n`;
      if (data.customerPhone) modifiedMessage += `Phone: ${data.customerPhone}\n`;
      if (data.date) modifiedMessage += `Date: ${data.date}\n`;
      if (data.time) modifiedMessage += `Time: ${data.time}\n`;
      if (data.bay) modifiedMessage += `Bay: ${data.bay}\n`;
      if (typeDisplay) modifiedMessage += `Type: ${typeDisplay}\n`;
      if (data.numberOfPeople) modifiedMessage += `Pax: ${data.numberOfPeople}\n`;
      if (data.referralSource) modifiedMessage += `Referral: ${data.referralSource}\n`;
      if (data.changes) modifiedMessage += `Changes: ${data.changes}\n`;
      if (data.modifiedBy) modifiedMessage += `Modified by: ${data.modifiedBy}`;
      return modifiedMessage.trim();

    default:
      return 'Unknown notification type';
  }
}

/**
 * Remove all emojis from text
 */
export function removeEmojis(text: string): string {
  // Remove emojis using Unicode ranges (without u flag for ES5 compatibility)
  return text.replace(
    /[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g,
    ''
  ).trim();
}

/**
 * Parse LINE message and return all extracted data with clean notification
 *
 * This is the main entry point for parsing LINE messages.
 *
 * @param lineMessage - The LINE notification message with emojis
 * @returns ParseResult with type, extracted data, and clean message
 *
 * @example
 * const result = parseLineMessage(lineMessage);
 * console.log(result.type); // 'created' | 'cancelled' | 'modified'
 * console.log(result.data.bookingId); // 'BK-ABC123'
 * console.log(result.cleanMessage); // Clean, emoji-free notification
 */
export function parseLineMessage(lineMessage: string): ParseResult {
  const type = detectNotificationType(lineMessage);
  const data = extractBookingData(lineMessage);
  const cleanMessage = formatCleanNotification(data, type);

  return {
    type,
    data,
    cleanMessage,
  };
}
