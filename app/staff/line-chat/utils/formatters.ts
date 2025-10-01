// Formatter utilities extracted from the main LINE chat component
// These are pure functions for formatting time, dates, and file sizes

/**
 * Format time display for conversation list
 * @param dateString - ISO date string
 * @returns Human-readable time format
 */
export const formatTime = (dateString?: string | null): string => {
  if (!dateString) {
    return 'No messages';
  }

  const date = new Date(dateString);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.error('Invalid date in formatTime:', dateString);
    return 'Invalid date';
  }

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('formatTime:', {
      input: dateString,
      parsed: date.toISOString(),
      now: now.toISOString(),
      diffHours: hours,
      diffDays: hours / 24
    });
  }

  if (hours < 1) {
    return 'Just now';
  } else if (hours < 24) {
    return `${Math.floor(hours)}h ago`;
  } else {
    const days = Math.floor(hours / 24);
    if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
};

/**
 * Format message time for individual messages
 * @param dateString - ISO date string
 * @returns Time in HH:MM format
 */
export const formatMessageTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const size = bytes / Math.pow(k, i);

  // Show 1 decimal place for MB and above, whole numbers for KB and below
  if (i >= 2) {
    return `${size.toFixed(1)}${sizes[i]}`;
  } else {
    return `${Math.round(size)}${sizes[i]}`;
  }
};

/**
 * Format booking date for display
 * @param dateString - Date string
 * @returns Formatted date display (Today, Tomorrow, or formatted date)
 */
export const formatBookingDate = (dateString: string): string => {
  const bookingDate = new Date(dateString);

  // Use Thailand timezone for date comparisons
  const thailandNow = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
  const thailandToday = new Date(thailandNow.getFullYear(), thailandNow.getMonth(), thailandNow.getDate());
  const thailandTomorrow = new Date(thailandToday.getTime() + 24 * 60 * 60 * 1000);

  const isToday = bookingDate.toDateString() === thailandToday.toDateString();
  const isTomorrow = bookingDate.toDateString() === thailandTomorrow.toDateString();

  if (isToday) {
    return 'Today';
  } else if (isTomorrow) {
    return 'Tomorrow';
  } else {
    return bookingDate.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }
};

/**
 * Calculate days until package expiry
 * @param expirationDate - Expiration date string
 * @returns Number of days until expiry
 */
export const calculateDaysUntilExpiry = (expirationDate: string): number => {
  const expiryDate = new Date(expirationDate);
  return Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

/**
 * Check if booking is upcoming
 * @param booking - Booking object with date and start_time
 * @returns true if booking is in the future
 */
export const isBookingUpcoming = (booking: { date: string; start_time: string }): boolean => {
  const bookingDate = new Date(booking.date);
  const [hours, minutes] = booking.start_time.split(':').map(Number);
  const bookingDateTime = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate(), hours, minutes);

  // Use Thailand timezone for comparison
  const thailandNow = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));

  return bookingDateTime > thailandNow;
};

/**
 * Check if two dates are on different days
 * @param date1 - First date string
 * @param date2 - Second date string
 * @returns true if dates are on different days
 */
export const isDifferentDay = (date1: string, date2: string): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  return d1.getFullYear() !== d2.getFullYear() ||
         d1.getMonth() !== d2.getMonth() ||
         d1.getDate() !== d2.getDate();
};

/**
 * Format date separator text like LINE OA (Today, Yesterday, or date)
 * @param dateString - ISO date string
 * @returns Formatted date separator text
 */
export const formatDateSeparator = (dateString: string): string => {
  const messageDate = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Compare just the date parts (ignore time)
  const isToday = messageDate.toDateString() === today.toDateString();
  const isYesterday = messageDate.toDateString() === yesterday.toDateString();

  if (isToday) {
    return 'Today';
  } else if (isYesterday) {
    return 'Yesterday';
  } else {
    // For older dates, show in format like "Monday, Sep 23"
    return messageDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  }
};