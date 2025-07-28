import { refacSupabaseAdmin } from './refac-supabase';
import { calculateDailyHours, getTimeEntriesForMonth, type TimeEntry, type DailyHours } from './payroll-calculations';
import { validateTimeEntry, withRetry, createPayrollError, PAYROLL_ERROR_CODES } from './payroll-error-handling';

// Types for review entries
export interface ReviewEntry {
  entry_id: number;
  date: string;
  staff_id: number;
  staff_name: string;
  clock_in_time: string;
  clock_out_time: string | null;
  note: 'Short duration shift' | 'Long duration shift' | 'Short session' | 'Long session' | 'Missing clock-out' | 'Other';
  hours_worked: number;
  session_duration: number;
  has_missing_clockout: boolean;
  total_daily_hours: number;
  flagged_reasons: string[];
}

export interface TimeEntryUpdate {
  entry_id: number;
  clock_in_time?: string;
  clock_out_time?: string;
  notes?: string;
}

/**
 * Identify time entries that need review based on business criteria
 */
export async function getReviewEntries(monthYear: string): Promise<ReviewEntry[]> {
  try {
    console.log(`Identifying review entries for ${monthYear}...`);

    // Get all time entries for the month
    const timeEntries = await getTimeEntriesForMonth(monthYear);
    
    // Get daily hours calculations
    const dailyHours = await calculateDailyHours(monthYear);
    
    // Get staff names
    const { data: staff, error: staffError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name');
    
    if (staffError) {
      throw new Error(`Failed to fetch staff: ${staffError.message}`);
    }
    
    const staffMap = new Map<number, string>(staff?.map((s: any) => [s.id, s.staff_name]) || []);
    
    const reviewEntries: ReviewEntry[] = [];
    
    // Process each daily hours entry to find issues
    for (const daily of dailyHours) {
      const staffName: string = staffMap.get(daily.staff_id) || `Staff ${daily.staff_id}`;
      
      // Check for daily hours issues
      const isDailyHoursShort = daily.total_hours < 3 && daily.total_hours > 0;
      const isDailyHoursLong = daily.total_hours > 9;
      
      // Check for missing clock-out
      if (daily.has_missing_clockout) {
        // Find the clock-in entry without a matching clock-out
        const dayEntries = timeEntries.filter(entry => {
          const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
          return entryDate === daily.date && entry.staff_id === daily.staff_id;
        });
        
        // Find last clock-in without matching clock-out
        let lastClockIn: TimeEntry | null = null;
        for (const entry of dayEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())) {
          if (entry.action === 'clock_in') {
            lastClockIn = entry;
          } else if (entry.action === 'clock_out' && lastClockIn) {
            lastClockIn = null; // This clock-in has a matching clock-out
          }
        }
        
        if (lastClockIn) {
          const flaggedReasons = ['Missing clock-out'];
          
          reviewEntries.push({
            entry_id: lastClockIn.id,
            date: daily.date,
            staff_id: daily.staff_id,
            staff_name: staffName,
            clock_in_time: lastClockIn.timestamp,
            clock_out_time: null,
            note: 'Missing clock-out',
            hours_worked: 0,
            session_duration: 0,
            has_missing_clockout: true,
            total_daily_hours: daily.total_hours,
            flagged_reasons: flaggedReasons
          });
        }
      }
      
      // Check each session for duration issues
      for (const session of daily.sessions) {
        const isSessionShort = session.duration_hours < 1;
        const isSessionLong = session.duration_hours > 8;
        
        // Only flag if it meets review criteria
        if (isDailyHoursShort || isDailyHoursLong || isSessionShort || isSessionLong) {
          const flaggedReasons: string[] = [];
          let note: ReviewEntry['note'] = 'Other';
          
          if (isDailyHoursShort) {
            flaggedReasons.push('Daily hours < 3');
            note = 'Short duration shift';
          }
          if (isDailyHoursLong) {
            flaggedReasons.push('Daily hours > 9');
            note = 'Long duration shift';
          }
          if (isSessionShort) {
            flaggedReasons.push('Session < 1 hour');
            note = 'Short session';
          }
          if (isSessionLong) {
            flaggedReasons.push('Session > 8 hours');
            note = 'Long session';
          }
          
          // Find the corresponding time entries for this session
          const clockInEntry = timeEntries.find(entry => entry.timestamp === session.clock_in);
          
          if (clockInEntry) {
            reviewEntries.push({
              entry_id: clockInEntry.id,
              date: daily.date,
              staff_id: daily.staff_id,
              staff_name: staffName,
              clock_in_time: session.clock_in,
              clock_out_time: session.clock_out,
              note,
              hours_worked: session.duration_hours,
              session_duration: session.duration_hours,
              has_missing_clockout: false,
              total_daily_hours: daily.total_hours,
              flagged_reasons: flaggedReasons
            });
          }
        }
      }
    }
    
    // Remove duplicates (same entry_id)
    const uniqueEntries = reviewEntries.reduce((acc, entry) => {
      const existingIndex = acc.findIndex(e => e.entry_id === entry.entry_id);
      if (existingIndex >= 0) {
        // Merge flagged reasons
        acc[existingIndex].flagged_reasons = Array.from(
          new Set([...acc[existingIndex].flagged_reasons, ...entry.flagged_reasons])
        );
      } else {
        acc.push(entry);
      }
      return acc;
    }, [] as ReviewEntry[]);
    
    console.log(`Found ${uniqueEntries.length} entries requiring review`);
    return uniqueEntries;
    
  } catch (error) {
    console.error('Error getting review entries:', error);
    throw error;
  }
}

/**
 * Validate time entry update data
 */
export function validateTimeEntryUpdate(update: TimeEntryUpdate): { isValid: boolean; errors: string[] } {
  // Use the enhanced validation from the error handling utility
  const validation = validateTimeEntry({
    clock_in_time: update.clock_in_time,
    clock_out_time: update.clock_out_time,
    notes: update.notes
  });
  
  return {
    isValid: validation.isValid,
    errors: validation.errors
  };
}

/**
 * Update a time entry and create audit log
 */
export async function updateTimeEntry(
  entryId: number, 
  updates: TimeEntryUpdate, 
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate the update
    const validation = validateTimeEntryUpdate(updates);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }
    
    // Get the original entry for audit log
    const { data: originalEntry, error: fetchError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select('*')
      .eq('id', entryId)
      .single();
    
    if (fetchError) {
      return {
        success: false,
        error: `Failed to fetch original entry: ${fetchError.message}`
      };
    }
    
    if (!originalEntry) {
      return {
        success: false,
        error: 'Time entry not found'
      };
    }
    
    // Prepare update data
    const updateData: any = {};
    
    if (updates.clock_in_time && originalEntry.action === 'clock_in') {
      updateData.timestamp = updates.clock_in_time;
    }
    
    if (updates.clock_out_time && originalEntry.action === 'clock_out') {
      updateData.timestamp = updates.clock_out_time;
    }
    
    // Handle missing clock-out case - create new clock-out entry
    if (updates.clock_out_time && originalEntry.action === 'clock_in' && !updates.clock_in_time) {
      // Create a new clock-out entry
      const { error: insertError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('time_entries')
        .insert({
          staff_id: originalEntry.staff_id,
          timestamp: updates.clock_out_time,
          action: 'clock_out',
          photo_url: null // No photo for manually created entries
        });
      
      if (insertError) {
        return {
          success: false,
          error: `Failed to create clock-out entry: ${insertError.message}`
        };
      }
      
      // Create audit log for the new entry
      await createAuditLog({
        action_type: 'time_entry_created',
        changed_by_type: 'admin',
        changed_by_identifier: updatedBy,
        changes_summary: `Created missing clock-out entry for staff ${originalEntry.staff_id}`,
        old_data_snapshot: null,
        new_data_snapshot: {
          staff_id: originalEntry.staff_id,
          timestamp: updates.clock_out_time,
          action: 'clock_out'
        },
        reason: updates.notes || 'Missing clock-out correction for payroll processing'
      });
      
      return { success: true };
    }
    
    // Update existing entry
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('time_entries')
        .update(updateData)
        .eq('id', entryId);
      
      if (updateError) {
        return {
          success: false,
          error: `Failed to update time entry: ${updateError.message}`
        };
      }
    }
    
    // Create audit log
    await createAuditLog({
      action_type: 'time_entry_edited',
      changed_by_type: 'admin',
      changed_by_identifier: updatedBy,
      changes_summary: `Updated time entry ${entryId}: ${Object.keys(updateData).join(', ')}`,
      old_data_snapshot: {
        timestamp: originalEntry.timestamp,
        action: originalEntry.action
      },
      new_data_snapshot: updateData,
      reason: updates.notes || 'Time entry correction for payroll processing'
    });
    
    return { success: true };
    
  } catch (error) {
    console.error('Error updating time entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create audit log entry
 */
async function createAuditLog(logData: {
  action_type: string;
  changed_by_type: string;
  changed_by_identifier: string;
  changes_summary: string;
  old_data_snapshot: any;
  new_data_snapshot: any;
  reason: string;
}): Promise<void> {
  try {
    // Check if audit_logs table exists, if not, just log to console
    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('audit_logs')
      .insert({
        ...logData,
        old_data_snapshot: JSON.stringify(logData.old_data_snapshot),
        new_data_snapshot: JSON.stringify(logData.new_data_snapshot),
        created_at: new Date().toISOString()
      });
    
    if (error) {
      // Fallback to console logging if audit table doesn't exist
      console.log('AUDIT LOG:', logData);
    }
  } catch (error) {
    // Fallback to console logging
    console.log('AUDIT LOG (fallback):', logData);
  }
} 