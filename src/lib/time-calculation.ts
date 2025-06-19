import { DateTime } from 'luxon';
import { formatBangkokTime } from './bangkok-timezone';

// Business configuration - these could be moved to environment variables or database
const BUSINESS_RULES = {
  MAX_SHIFT_HOURS: 12,
  OVERTIME_DAILY_THRESHOLD: 8,
  OVERTIME_WEEKLY_THRESHOLD: 40,
  BREAK_DEDUCTION_MINUTES: 30, // Automatic break deduction for shifts > 6 hours
  BREAK_THRESHOLD_HOURS: 6,
  MIN_SHIFT_MINUTES: 15,
  SHIFT_BOUNDARY_HOUR: 6, // 6 AM - shifts crossing this time are considered next day
} as const;

export interface WorkShift {
  staff_id: number;
  staff_name: string;
  date: string; // YYYY-MM-DD in Bangkok timezone (shift start date)
  clock_in_time: string; // ISO timestamp
  clock_out_time?: string; // ISO timestamp or null if incomplete
  clock_in_entry_id: number;
  clock_out_entry_id?: number;
  total_minutes: number; // Raw minutes between clock in/out
  break_minutes: number; // Deducted break time
  net_minutes: number; // total_minutes - break_minutes
  net_hours: number; // net_minutes / 60
  is_complete: boolean;
  is_overtime: boolean;
  overtime_hours: number;
  crosses_midnight: boolean;
  shift_notes: string[];
  validation_issues: string[];
}

export interface StaffTimeAnalytics {
  staff_id: number;
  staff_name: string;
  total_shifts: number;
  complete_shifts: number;
  incomplete_shifts: number;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  days_worked: number;
  average_shift_hours: number;
  longest_shift_hours: number;
  shortest_shift_hours: number;
  total_breaks_minutes: number;
  shifts_with_issues: number;
  photo_compliance_rate: number; // Percentage of entries with photos
}

export interface TimeEntry {
  entry_id: number;
  staff_id: number;
  staff_name: string;
  action: 'clock_in' | 'clock_out';
  timestamp: string; // ISO timestamp
  date_only: string; // YYYY-MM-DD in Bangkok timezone
  time_only: string; // HH:MM:SS in Bangkok timezone
  photo_captured: boolean;
  camera_error?: string | null;
}

/**
 * Calculate work shifts from time entries with proper cross-day support
 * Handles shifts that start on one day and end on the next (e.g., 5pm - 1am)
 */
export function calculateWorkShifts(entries: TimeEntry[]): WorkShift[] {
  const shifts: WorkShift[] = [];
  
  // Group entries by staff member
  const staffEntries = new Map<number, TimeEntry[]>();
  
  entries.forEach(entry => {
    if (!staffEntries.has(entry.staff_id)) {
      staffEntries.set(entry.staff_id, []);
    }
    staffEntries.get(entry.staff_id)!.push(entry);
  });
  
  // Process each staff member's entries
  staffEntries.forEach((staffTimeEntries, staffId) => {
    // Sort entries by timestamp
    const sortedEntries = staffTimeEntries.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    const staffShifts = calculateStaffShifts(sortedEntries);
    shifts.push(...staffShifts);
  });
  
  return shifts;
}

/**
 * Calculate shifts for a single staff member with cross-day support
 */
function calculateStaffShifts(entries: TimeEntry[]): WorkShift[] {
  const shifts: WorkShift[] = [];
  let i = 0;
  
  while (i < entries.length) {
    const entry = entries[i];
    
    if (entry.action === 'clock_in') {
      // Look for corresponding clock_out
      const clockOutIndex = findMatchingClockOut(entries, i);
      
      if (clockOutIndex !== -1) {
        // Found matching clock_out - create complete shift
        const clockOutEntry = entries[clockOutIndex];
        const shift = createCompleteShift(entry, clockOutEntry);
        shifts.push(shift);
        i = clockOutIndex + 1; // Skip past the clock_out entry
      } else {
        // No matching clock_out - create incomplete shift
        const shift = createIncompleteShift(entry);
        shifts.push(shift);
        i++;
      }
    } else {
      // Orphaned clock_out - skip but could log for data quality
      console.warn(`Orphaned clock_out entry found:`, entry);
      i++;
    }
  }
  
  return shifts;
}

/**
 * Find matching clock_out for a clock_in entry, supporting cross-day shifts
 */
function findMatchingClockOut(entries: TimeEntry[], clockInIndex: number): number {
  const clockInEntry = entries[clockInIndex];
  const clockInDateTime = DateTime.fromISO(clockInEntry.timestamp).setZone('Asia/Bangkok');
  
  // Look for the next clock_out entry for the same staff member
  for (let i = clockInIndex + 1; i < entries.length; i++) {
    const entry = entries[i];
    
    if (entry.staff_id !== clockInEntry.staff_id) continue;
    if (entry.action !== 'clock_out') continue;
    
    const clockOutDateTime = DateTime.fromISO(entry.timestamp).setZone('Asia/Bangkok');
    
    // Check if this is a reasonable clock_out for the clock_in
    const hoursDifference = clockOutDateTime.diff(clockInDateTime, 'hours').hours;
    
    // CROSS-DAY SUPPORT: Allow up to MAX_SHIFT_HOURS even if crossing midnight
    if (hoursDifference > 0 && hoursDifference <= BUSINESS_RULES.MAX_SHIFT_HOURS) {
      return i;
    }
    
    // If we find a clock_out that's too far in the future, stop looking
    if (hoursDifference > BUSINESS_RULES.MAX_SHIFT_HOURS) {
      break;
    }
  }
  
  return -1; // No matching clock_out found
}

/**
 * Create a complete work shift from clock_in and clock_out entries
 */
function createCompleteShift(clockInEntry: TimeEntry, clockOutEntry: TimeEntry): WorkShift {
  const clockInDateTime = DateTime.fromISO(clockInEntry.timestamp).setZone('Asia/Bangkok');
  const clockOutDateTime = DateTime.fromISO(clockOutEntry.timestamp).setZone('Asia/Bangkok');
  
  // Calculate time difference
  const totalMinutes = Math.round(clockOutDateTime.diff(clockInDateTime, 'minutes').minutes);
  
  // Determine shift date (use clock_in date as the shift date)
  const shiftDate = clockInDateTime.toFormat('yyyy-MM-dd');
  
  // Check if shift crosses midnight
  const crossesMidnight = clockOutDateTime.day !== clockInDateTime.day;
  
  // Calculate break deduction
  const totalHours = totalMinutes / 60;
  const breakMinutes = totalHours > BUSINESS_RULES.BREAK_THRESHOLD_HOURS 
    ? BUSINESS_RULES.BREAK_DEDUCTION_MINUTES 
    : 0;
  
  const netMinutes = Math.max(0, totalMinutes - breakMinutes);
  const netHours = netMinutes / 60;
  
  // Calculate overtime
  const isOvertime = netHours > BUSINESS_RULES.OVERTIME_DAILY_THRESHOLD;
  const overtimeHours = isOvertime 
    ? netHours - BUSINESS_RULES.OVERTIME_DAILY_THRESHOLD 
    : 0;
  
  // Generate notes and validate
  const notes: string[] = [];
  const validationIssues: string[] = [];
  
  if (crossesMidnight) {
    notes.push(`Shift crosses midnight: ${clockInDateTime.toFormat('MMM dd HH:mm')} → ${clockOutDateTime.toFormat('MMM dd HH:mm')}`);
  }
  
  if (breakMinutes > 0) {
    notes.push(`${breakMinutes} minute break deducted (shift > ${BUSINESS_RULES.BREAK_THRESHOLD_HOURS} hours)`);
  }
  
  if (isOvertime) {
    notes.push(`${overtimeHours.toFixed(2)} hours overtime (daily threshold: ${BUSINESS_RULES.OVERTIME_DAILY_THRESHOLD}h)`);
  }
  
  // Validation checks
  if (totalMinutes < BUSINESS_RULES.MIN_SHIFT_MINUTES) {
    validationIssues.push(`Shift too short: ${totalMinutes} minutes (minimum: ${BUSINESS_RULES.MIN_SHIFT_MINUTES})`);
  }
  
  if (totalHours > BUSINESS_RULES.MAX_SHIFT_HOURS) {
    validationIssues.push(`Shift too long: ${totalHours.toFixed(2)} hours (maximum: ${BUSINESS_RULES.MAX_SHIFT_HOURS}h)`);
  }
  
  return {
    staff_id: clockInEntry.staff_id,
    staff_name: clockInEntry.staff_name,
    date: shiftDate,
    clock_in_time: clockInEntry.timestamp,
    clock_out_time: clockOutEntry.timestamp,
    clock_in_entry_id: clockInEntry.entry_id,
    clock_out_entry_id: clockOutEntry.entry_id,
    total_minutes: totalMinutes,
    break_minutes: breakMinutes,
    net_minutes: netMinutes,
    net_hours: parseFloat(netHours.toFixed(2)),
    is_complete: true,
    is_overtime: isOvertime,
    overtime_hours: parseFloat(overtimeHours.toFixed(2)),
    crosses_midnight: crossesMidnight,
    shift_notes: notes,
    validation_issues: validationIssues,
  };
}

/**
 * Create an incomplete work shift from clock_in entry only
 */
function createIncompleteShift(clockInEntry: TimeEntry): WorkShift {
  const clockInDateTime = DateTime.fromISO(clockInEntry.timestamp).setZone('Asia/Bangkok');
  const shiftDate = clockInDateTime.toFormat('yyyy-MM-dd');
  
  const notes = ['Incomplete shift - missing clock_out entry'];
  const validationIssues = ['Missing clock_out entry'];
  
  // Check if clock_in was a long time ago (potential forgotten clock_out)
  const now = DateTime.now().setZone('Asia/Bangkok');
  const hoursSinceClockIn = now.diff(clockInDateTime, 'hours').hours;
  
  if (hoursSinceClockIn > BUSINESS_RULES.MAX_SHIFT_HOURS) {
    validationIssues.push(`Clock_in over ${BUSINESS_RULES.MAX_SHIFT_HOURS} hours ago - potential forgotten clock_out`);
  }
  
  return {
    staff_id: clockInEntry.staff_id,
    staff_name: clockInEntry.staff_name,
    date: shiftDate,
    clock_in_time: clockInEntry.timestamp,
    clock_out_time: undefined,
    clock_in_entry_id: clockInEntry.entry_id,
    clock_out_entry_id: undefined,
    total_minutes: 0,
    break_minutes: 0,
    net_minutes: 0,
    net_hours: 0,
    is_complete: false,
    is_overtime: false,
    overtime_hours: 0,
    crosses_midnight: false,
    shift_notes: notes,
    validation_issues: validationIssues,
  };
}

/**
 * Calculate comprehensive analytics for staff members
 */
export function calculateStaffAnalytics(shifts: WorkShift[], allEntries: TimeEntry[]): StaffTimeAnalytics[] {
  const staffMap = new Map<number, StaffTimeAnalytics>();
  
  // Initialize analytics for each staff member
  shifts.forEach(shift => {
    if (!staffMap.has(shift.staff_id)) {
      staffMap.set(shift.staff_id, {
        staff_id: shift.staff_id,
        staff_name: shift.staff_name,
        total_shifts: 0,
        complete_shifts: 0,
        incomplete_shifts: 0,
        total_hours: 0,
        regular_hours: 0,
        overtime_hours: 0,
        days_worked: 0,
        average_shift_hours: 0,
        longest_shift_hours: 0,
        shortest_shift_hours: Number.MAX_SAFE_INTEGER,
        total_breaks_minutes: 0,
        shifts_with_issues: 0,
        photo_compliance_rate: 0,
      });
    }
  });
  
  // Calculate analytics from shifts
  staffMap.forEach((analytics, staffId) => {
    const staffShifts = shifts.filter(s => s.staff_id === staffId);
    const completeShifts = staffShifts.filter(s => s.is_complete);
    
    analytics.total_shifts = staffShifts.length;
    analytics.complete_shifts = completeShifts.length;
    analytics.incomplete_shifts = staffShifts.length - completeShifts.length;
    
    // Hours calculations
    analytics.total_hours = completeShifts.reduce((sum, shift) => sum + shift.net_hours, 0);
    analytics.overtime_hours = completeShifts.reduce((sum, shift) => sum + shift.overtime_hours, 0);
    analytics.regular_hours = analytics.total_hours - analytics.overtime_hours;
    
    // Days worked (unique dates)
    const uniqueDates = new Set(staffShifts.map(s => s.date));
    analytics.days_worked = uniqueDates.size;
    
    // Shift statistics
    if (completeShifts.length > 0) {
      analytics.average_shift_hours = analytics.total_hours / completeShifts.length;
      analytics.longest_shift_hours = Math.max(...completeShifts.map(s => s.net_hours));
      analytics.shortest_shift_hours = Math.min(...completeShifts.map(s => s.net_hours));
    } else {
      analytics.shortest_shift_hours = 0;
    }
    
    // Break time
    analytics.total_breaks_minutes = completeShifts.reduce((sum, shift) => sum + shift.break_minutes, 0);
    
    // Issues
    analytics.shifts_with_issues = staffShifts.filter(s => s.validation_issues.length > 0).length;
    
    // Photo compliance
    const staffEntries = allEntries.filter(e => e.staff_id === staffId);
    const entriesWithPhotos = staffEntries.filter(e => e.photo_captured);
    analytics.photo_compliance_rate = staffEntries.length > 0 
      ? (entriesWithPhotos.length / staffEntries.length) * 100 
      : 0;
  });
  
  return Array.from(staffMap.values());
}

/**
 * Helper function to format shift duration for display
 */
export function formatShiftDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Helper function to get business rules configuration
 */
export function getBusinessRules() {
  return { ...BUSINESS_RULES };
} 