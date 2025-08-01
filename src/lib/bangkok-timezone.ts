// Bangkok Timezone Utilities
// Centralized timezone handling for the LenGolf POS system

import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { format, parse } from 'date-fns';

// Bangkok timezone constant
export const BANGKOK_TIMEZONE = 'Asia/Bangkok';

/**
 * Get current date in Bangkok timezone as YYYY-MM-DD string
 */
export function getBangkokToday(): string {
  const now = new Date();
  return formatInTimeZone(now, BANGKOK_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Get current date and time in Bangkok timezone
 */
export function getBangkokNow(): Date {
  return toZonedTime(new Date(), BANGKOK_TIMEZONE);
}

/**
 * Convert a date to Bangkok timezone
 */
export function toBangkokTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(dateObj, BANGKOK_TIMEZONE);
}

/**
 * Format a date in Bangkok timezone
 */
export function formatBangkokTime(date: Date | string, formatString: string = 'yyyy-MM-dd HH:mm:ss'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, BANGKOK_TIMEZONE, formatString);
}

/**
 * Parse a date string as Bangkok time and convert to UTC
 */
export function parseBangkokTime(dateString: string, formatString: string = 'yyyy-MM-dd HH:mm:ss'): Date {
  const parsedDate = parse(dateString, formatString, new Date());
  return fromZonedTime(parsedDate, BANGKOK_TIMEZONE);
}

/**
 * Get Bangkok business date (handles after-midnight scenarios)
 * Business day changes at 6 AM Bangkok time
 */
export function getBangkokBusinessDate(): string {
  const bangkokNow = getBangkokNow();
  const hour = bangkokNow.getHours();
  
  // If it's before 6 AM, consider it the previous business day
  if (hour < 6) {
    const yesterday = new Date(bangkokNow);
    yesterday.setDate(yesterday.getDate() - 1);
    return formatInTimeZone(yesterday, BANGKOK_TIMEZONE, 'yyyy-MM-dd');
  }
  
  return formatInTimeZone(bangkokNow, BANGKOK_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Check if a timestamp is from "today" in Bangkok timezone
 */
export function isBangkokToday(timestamp: Date | string): boolean {
  const today = getBangkokToday();
  const timestampDate = formatBangkokTime(timestamp, 'yyyy-MM-dd');
  return today === timestampDate;
}

/**
 * Get date range in Bangkok timezone
 */
export function getBangkokDateRange(start: Date, end: Date): { start: string; end: string } {
  return {
    start: formatBangkokTime(start, 'yyyy-MM-dd'),
    end: formatBangkokTime(end, 'yyyy-MM-dd')
  };
}

/**
 * Convert API date parameter to proper Bangkok timezone aware date
 */
export function apiDateToBangkokDate(apiDate: string): Date {
  // Parse as Bangkok midnight
  return parseBangkokTime(`${apiDate} 00:00:00`);
}

/**
 * Convert Bangkok date to API format
 */
export function bangkokDateToApiFormat(date: Date): string {
  return formatBangkokTime(date, 'yyyy-MM-dd');
}

/**
 * Get timestamp display in Bangkok timezone
 */
export function getBangkokTimestampDisplay(timestamp: Date | string): string {
  return formatBangkokTime(timestamp, 'dd/MM/yyyy HH:mm:ss');
}

/**
 * Get time difference between Bangkok and UTC in hours
 */
export function getBangkokUtcOffset(): number {
  const bangkokTime = getBangkokNow();
  const utcTime = new Date();
  const diffMs = bangkokTime.getTime() - utcTime.setUTCHours(utcTime.getUTCHours());
  return Math.floor(diffMs / (1000 * 60 * 60));
}

/**
 * Debug timezone information
 */
export function getTimezoneDebugInfo() {
  const now = new Date();
  const bangkokNow = getBangkokNow();
  
  return {
    systemTime: now.toString(),
    systemTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    utcTime: now.toISOString(),
    bangkokTime: formatBangkokTime(now),
    bangkokToday: getBangkokToday(),
    bangkokBusinessDate: getBangkokBusinessDate(),
    utcOffset: getBangkokUtcOffset(),
    systemVsBangkokDiff: Math.floor((bangkokNow.getTime() - now.getTime()) / (1000 * 60 * 60))
  };
}

/**
 * Ensure date consistency for dashboard queries
 * Always use Bangkok timezone for business logic
 */
export function normalizeDateForDashboard(date: Date | string): string {
  if (typeof date === 'string') {
    // If it's already a YYYY-MM-DD string, verify it's correct for Bangkok
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // Parse and convert to Bangkok date
    return formatBangkokTime(new Date(date), 'yyyy-MM-dd');
  }
  
  return formatBangkokTime(date, 'yyyy-MM-dd');
}

// Export all utilities as a convenient object
export const BangkokTimezone = {
  getBangkokToday,
  getBangkokNow,
  toBangkokTime,
  formatBangkokTime,
  parseBangkokTime,
  getBangkokBusinessDate,
  isBangkokToday,
  getBangkokDateRange,
  apiDateToBangkokDate,
  bangkokDateToApiFormat,
  getBangkokTimestampDisplay,
  getBangkokUtcOffset,
  getTimezoneDebugInfo,
  normalizeDateForDashboard
}; 