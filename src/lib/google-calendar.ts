import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';

/**
 * Initialize Google Calendar API client
 * Used by the calendar sync system for external integration
 */
export function initializeCalendar(auth: any): calendar_v3.Calendar {
  return google.calendar({ version: 'v3', auth });
}