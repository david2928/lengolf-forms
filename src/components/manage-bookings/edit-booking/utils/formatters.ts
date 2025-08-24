/**
 * EditBookingModal Utility Functions
 * Pure functions extracted from the original component
 */

import { format, parseISO, isValid } from 'date-fns';

// Helper to convert HH:mm time and date string to a Date object
export const getDateTime = (dateString: string | Date, timeString: string): Date | null => {
  if (!dateString || !timeString) return null;
  try {
    // Assuming dateString is already a Date object from the form, or a YYYY-MM-DD string from booking
    const baseDate = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    const newDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes);
    return isValid(newDate) ? newDate : null;
  } catch (e) {
    console.error('Error in getDateTime:', e)
    return null;
  }
};

// Simple debounce function
export function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => ReturnType<F>;
}

// Format time for display
export const formatTimeForDisplay = (time: string): string => {
  if (!time) return '';
  // Ensure time is in HH:mm format
  const [hours, minutes] = time.split(':');
  if (hours && minutes) {
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }
  return time;
};

// Parse duration to minutes
export const parseDurationToMinutes = (duration: number | undefined): number => {
  if (typeof duration === 'number') {
    // Duration is stored in hours in the database, convert to minutes for form
    return duration <= 12 ? duration * 60 : duration;
  }
  return 60; // Default to 1 hour
};

// Convert minutes to hours for API
export const convertMinutesToHours = (minutes: number): number => {
  return minutes / 60;
};

// Check if booking is in the past
export const isPastBooking = (bookingDate: string, startTime: string, duration: number): boolean => {
  try {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const durationMinutes = duration <= 12 ? duration * 60 : duration;
    const endMinutes = startMinutes + durationMinutes;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    
    // Handle midnight crossover correctly
    let bookingEndDateTime;
    if (endHours >= 24) {
      // Booking crosses midnight - end time is next day
      const actualEndHours = endHours % 24;
      const endTime = `${actualEndHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      const dateObj = new Date(bookingDate);
      dateObj.setDate(dateObj.getDate() + 1);
      const endDateStr = dateObj.toISOString().split('T')[0];
      bookingEndDateTime = new Date(`${endDateStr}T${endTime}`);
    } else {
      // Normal booking - same day
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      bookingEndDateTime = new Date(`${bookingDate}T${endTime}`);
    }
    
    const now = new Date();
    // Allow editing within 2 hours after booking end time
    const twoHoursAfterEnd = new Date(bookingEndDateTime.getTime() + (2 * 60 * 60 * 1000));
    return now > twoHoursAfterEnd;
  } catch (e) {
    console.error('Error checking if booking is past:', e);
    return false;
  }
};

// Safe date formatting
export const safeFormatDate = (date: Date | string | undefined, fallback = ''): string => {
  if (!date) return fallback;
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj) ? format(dateObj, 'yyyy-MM-dd') : fallback;
  } catch {
    return fallback;
  }
};