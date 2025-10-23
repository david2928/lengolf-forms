// Helper functions for AI parameter extraction
// Improves date/time parsing from Thai and English customer messages

import { DateTime } from 'luxon';

/**
 * Parse relative date expressions to YYYY-MM-DD format
 * Handles both Thai and English
 */
export function parseRelativeDate(input: string, timezone: string = 'Asia/Bangkok'): string | null {
  const now = DateTime.now().setZone(timezone);
  const lowerInput = input.toLowerCase();

  // Thai relative dates
  if (lowerInput.includes('วันนี้') || lowerInput.includes('today')) {
    return now.toFormat('yyyy-MM-dd');
  }

  if (lowerInput.includes('พรุ่งนี้') || lowerInput.includes('tomorrow')) {
    return now.plus({ days: 1 }).toFormat('yyyy-MM-dd');
  }

  if (lowerInput.includes('มะรืน') || lowerInput.includes('day after tomorrow')) {
    return now.plus({ days: 2 }).toFormat('yyyy-MM-dd');
  }

  // English specific
  if (lowerInput.includes('next week')) {
    return now.plus({ weeks: 1 }).toFormat('yyyy-MM-dd');
  }

  // Try to extract explicit date (YYYY-MM-DD or DD/MM/YYYY)
  const explicitDateMatch = input.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (explicitDateMatch) {
    return explicitDateMatch[0];
  }

  const ddmmyyyyMatch = input.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

/**
 * Parse time expressions to HH:mm format
 * Handles both 12-hour and 24-hour formats
 */
export function parseTime(input: string): string | null {
  const lowerInput = input.toLowerCase();

  // 24-hour format: 14:00, 14.00
  const hour24Match = input.match(/(\d{1,2})[:.หนาฬิก]+(\d{2})?/);
  if (hour24Match) {
    const hour = parseInt(hour24Match[1]);
    const minute = hour24Match[2] || '00';

    if (hour >= 0 && hour <= 23) {
      return `${hour.toString().padStart(2, '0')}:${minute}`;
    }
  }

  // Thai time: 2 ทุ่ม (20:00), 4 โมงเย็น (16:00)
  const thaiEvening = input.match(/(\d+)\s*ทุ่ม/);
  if (thaiEvening) {
    const hour = parseInt(thaiEvening[1]) + 18; // ทุ่ม starts at 18:00
    if (hour <= 23) {
      return `${hour.toString().padStart(2, '0')}:00`;
    }
  }

  const thaiAfternoon = input.match(/(\d+)\s*โมงเย็น/);
  if (thaiAfternoon) {
    const hour = parseInt(thaiAfternoon[1]) + 12; // เย็น is afternoon (PM)
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  // 12-hour format with AM/PM
  const hour12Match = input.match(/(\d{1,2})\s*(am|pm)/i);
  if (hour12Match) {
    let hour = parseInt(hour12Match[1]);
    const isPM = hour12Match[2].toLowerCase() === 'pm';

    if (isPM && hour < 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, '0')}:00`;
  }

  // Time ranges: extract start time
  const rangeMatch = input.match(/(\d{1,2})[:.หนาฬิก]+(\d{2})?\s*-\s*(\d{1,2})[:.หนาฬิก]+(\d{2})?/);
  if (rangeMatch) {
    const hour = parseInt(rangeMatch[1]);
    const minute = rangeMatch[2] || '00';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }

  return null;
}

/**
 * Infer duration from time range
 * Example: "14:00-16:00" → 2 hours
 */
export function inferDurationFromRange(input: string): number | null {
  const rangeMatch = input.match(/(\d{1,2})[:.หนาฬิก]+(\d{2})?\s*[-ถึงto]+\s*(\d{1,2})[:.หนาฬิก]+(\d{2})?/);

  if (rangeMatch) {
    const startHour = parseInt(rangeMatch[1]);
    const startMinute = parseInt(rangeMatch[2] || '0');
    const endHour = parseInt(rangeMatch[3]);
    const endMinute = parseInt(rangeMatch[4] || '0');

    const durationHours = (endHour - startHour) + (endMinute - startMinute) / 60;

    // Round to nearest valid duration
    const validDurations = [0.5, 1, 1.5, 2, 2.5, 3];
    let closest = validDurations[0];
    let minDiff = Math.abs(durationHours - closest);

    for (const duration of validDurations) {
      const diff = Math.abs(durationHours - duration);
      if (diff < minDiff) {
        minDiff = diff;
        closest = duration;
      }
    }

    return closest;
  }

  // Explicit duration mentions
  const hourMatch = input.match(/(\d+(?:\.\d+)?)\s*(hour|hr|ชั่วโมง|ชม)/i);
  if (hourMatch) {
    return parseFloat(hourMatch[1]);
  }

  return null;
}

/**
 * Detect bay type preference from message
 */
export function detectBayType(input: string): 'social' | 'ai' | 'all' {
  const lowerInput = input.toLowerCase();

  // AI bay keywords
  if (lowerInput.includes('ai bay') ||
      lowerInput.includes('bay 4') ||
      lowerInput.includes('analytics') ||
      lowerInput.includes('เบย์ ai')) {
    return 'ai';
  }

  // Social bay keywords
  if (lowerInput.includes('social') ||
      lowerInput.includes('bay 1') ||
      lowerInput.includes('bay 2') ||
      lowerInput.includes('bay 3') ||
      lowerInput.includes('เบย์โซเชียล') ||
      lowerInput.includes('เบย์ 1') ||
      lowerInput.includes('เบย์ 2') ||
      lowerInput.includes('เบย์ 3')) {
    return 'social';
  }

  return 'all'; // Default to showing all available bays
}

/**
 * Extract number of people from message
 */
export function extractNumberOfPeople(input: string): number | null {
  // Direct number mentions
  const peopleMatch = input.match(/(\d+)\s*(people|players|คน|ท่าน)/i);
  if (peopleMatch) {
    return parseInt(peopleMatch[1]);
  }

  // Thai counting words
  const thaiCountMatch = input.match(/(\d+)\s*คน/);
  if (thaiCountMatch) {
    return parseInt(thaiCountMatch[1]);
  }

  return null;
}

/**
 * Comprehensive parameter extraction from customer message
 * Use this as a helper before calling OpenAI functions
 */
export function extractBookingParameters(message: string) {
  return {
    date: parseRelativeDate(message),
    time: parseTime(message),
    duration: inferDurationFromRange(message),
    bayType: detectBayType(message),
    numberOfPeople: extractNumberOfPeople(message)
  };
}
