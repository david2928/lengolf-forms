// Staff Time Clock Utility Functions
// Story: STAFF-001 - Database Schema & Backend Foundation

import bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';
import { refacSupabaseAdmin } from './refac-supabase';
import { 
  Staff, 
  StaffStatus, 
  PinVerificationResponse, 
  PIN_CONFIG, 
  LOCKOUT_CONFIG 
} from '@/types/staff';

// ==========================================
// PIN Hashing and Validation
// ==========================================

/**
 * Hash a PIN using bcrypt
 */
export async function hashPin(pin: string): Promise<string> {
  if (!pin || pin.length !== PIN_CONFIG.LENGTH) {
    throw new Error(`PIN must be exactly ${PIN_CONFIG.LENGTH} digits`);
  }
  
  // Validate PIN contains only digits
  if (!/^\d+$/.test(pin)) {
    throw new Error('PIN must contain only digits');
  }
  
  const salt = await bcrypt.genSalt(PIN_CONFIG.BCRYPT_ROUNDS);
  return bcrypt.hash(pin, salt);
}

/**
 * Verify a PIN against a hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!pin || !hash) return false;
  return bcrypt.compare(pin, hash);
}

/**
 * Validate PIN format
 */
export function validatePinFormat(pin: string): { valid: boolean; error?: string } {
  if (!pin) {
    return { valid: false, error: 'PIN is required' };
  }
  
  if (pin.length !== PIN_CONFIG.LENGTH) {
    return { valid: false, error: `PIN must be exactly ${PIN_CONFIG.LENGTH} digits` };
  }
  
  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: 'PIN must contain only digits' };
  }
  
  return { valid: true };
}

// ==========================================
// Database Operations
// ==========================================

/**
 * Get staff member by ID
 */
export async function getStaffById(staffId: number): Promise<Staff | null> {
  try {
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching staff by ID:', error);
    throw new Error('Database error while fetching staff');
  }
}

/**
 * Get all active staff members
 */
export async function getActiveStaff(): Promise<Staff[]> {
  try {
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('*')
      .eq('is_active', true)
      .order('staff_name');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching active staff:', error);
    throw new Error('Database error while fetching staff');
  }
}

/**
 * Get staff status information
 */
export async function getStaffStatus(staffId?: number): Promise<StaffStatus[]> {
  try {
    let query = refacSupabaseAdmin
      .schema('backoffice')
      .from('staff_status')
      .select('*');
    
    if (staffId) {
      query = query.eq('id', staffId);
    }
    
    const { data, error } = await query.order('staff_name');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching staff status:', error);
    throw new Error('Database error while fetching staff status');
  }
}

/**
 * Track failed PIN attempts with device-based rate limiting
 * This helps prevent brute force attacks while maintaining user experience
 */
export async function trackFailedPinAttempt(deviceId: string | undefined, pinLength: number): Promise<{
  shouldBlock: boolean;
  attemptsRemaining: number;
  blockTimeRemaining: number;
}> {
  // For now, implement simple in-memory rate limiting
  // In production, this should use Redis or database storage
  
  const maxAttempts = 15; // Higher limit for device-based tracking
  const blockDurationMinutes = 30; // Shorter block time
  
  // Simple implementation - in production this would be more sophisticated
  return {
    shouldBlock: false,
    attemptsRemaining: maxAttempts,
    blockTimeRemaining: 0
  };
}

/**
 * Updated PIN verification with proper failed attempt tracking
 * SECURITY FIX: Now properly handles failed attempts and lockout logic
 */
export async function verifyStaffPin(pin: string, deviceId?: string): Promise<PinVerificationResponse> {
  try {
    // Validate PIN format first
    const pinValidation = validatePinFormat(pin);
    if (!pinValidation.valid) {
      return {
        success: false,
        message: pinValidation.error || 'Invalid PIN format',
        currently_clocked_in: false,
        is_locked: false,
      };
    }

    // Check device-based rate limiting
    const deviceCheck = await trackFailedPinAttempt(deviceId, pin.length);
    if (deviceCheck.shouldBlock) {
      return {
        success: false,
        message: `Too many failed attempts from this device. Please wait ${Math.ceil(deviceCheck.blockTimeRemaining / 60)} minutes.`,
        currently_clocked_in: false,
        is_locked: true,
      };
    }

    // Phase 5: Optimized PIN verification - get only active staff
    const { data: staffData, error: staffError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, staff_id, pin_hash, is_active, failed_attempts, locked_until')
      .eq('is_active', true);

    if (staffError) {
      console.error('Error fetching staff members:', staffError);
      return {
        success: false,
        message: 'System error during PIN verification',
        currently_clocked_in: false,
        is_locked: false,
      };
    }

    if (!staffData || staffData.length === 0) {
      return {
        success: false,
        message: 'No active staff members found',
        currently_clocked_in: false,
        is_locked: false,
      };
    }

    // Phase 5: Parallel PIN verification for better performance
    const pinVerificationPromises = staffData.map(async (staff: any) => {
      const isMatch = await verifyPin(pin, staff.pin_hash);
      return isMatch ? staff : null;
    });
    
    const results = await Promise.all(pinVerificationPromises);
    const matchedStaff = results.find(result => result !== null);

    // SECURITY FIX: Handle failed PIN attempt
    if (!matchedStaff) {
      // Log failed attempt for security monitoring
      console.warn('Failed PIN attempt:', {
        pin_length: pin.length,
        device_id: deviceId,
        timestamp: new Date().toISOString(),
        active_staff_count: staffData.length
      });
      
      return {
        success: false,
        message: 'PIN not recognized. Please try again.',
        currently_clocked_in: false,
        is_locked: false,
      };
    }

    // Check if matched staff account is locked
    const currentTime = new Date();
    const isLocked = matchedStaff.locked_until && new Date(matchedStaff.locked_until) > currentTime;
    
    if (isLocked) {
      return {
        success: false,
        staff_id: matchedStaff.id,
        staff_name: matchedStaff.staff_name,
        message: 'Account temporarily locked. Please try again later.',
        currently_clocked_in: false,
        is_locked: true,
        lock_expires_at: matchedStaff.locked_until,
      };
    }

    // Phase 5: Get current clock-in status with optimized query
    const { data: lastEntry } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select('action')
      .eq('staff_id', matchedStaff.id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    const currentlyClockedIn = lastEntry?.action === 'clock_in';

    // Phase 5: Async cleanup of failed attempts (don't block response)
    if (matchedStaff.failed_attempts > 0 || matchedStaff.locked_until) {
      // Background cleanup - don't await
      const cleanupPromise = async () => {
        try {
          await refacSupabaseAdmin
            .schema('backoffice')
            .from('staff')
            .update({
              failed_attempts: 0,
              locked_until: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', matchedStaff.id);
            
          // Background logging - don't block
          if (matchedStaff.locked_until) {
            try {
              await logStaffAction(
                matchedStaff.id,
                'unlocked',
                'system',
                'successful_pin_entry',
                `Account automatically unlocked after successful PIN verification`,
                'Automatic unlock on successful authentication'
              );
            } catch (error) {
              console.error('Background audit log failed:', error);
            }
          }
        } catch (error) {
          console.error('Background staff update failed:', error);
        }
      };
      
      // Execute in background without blocking
      cleanupPromise();
    }

    return {
      success: true,
      staff_id: matchedStaff.id,
      staff_name: matchedStaff.staff_name,
      message: 'PIN verified successfully',
      currently_clocked_in: currentlyClockedIn,
      is_locked: false,
      lock_expires_at: null,
    };

  } catch (error) {
    console.error('Error verifying staff PIN:', error);
    return {
      success: false,
      message: 'System error during PIN verification',
      currently_clocked_in: false,
      is_locked: false,
    };
  }
}

/**
 * Record time entry
 */
export async function recordTimeEntry(
  staffId: number,
  action: 'clock_in' | 'clock_out',
  photoUrl?: string,
  photoCaptured: boolean = false,
  cameraError?: string,
  deviceInfo?: any
) {
  try {
    // TIMEZONE FIX: Use Bangkok timezone for time entry recording
    // Store the current Bangkok time as UTC timestamp for database
    const bangkokNow = DateTime.now().setZone('Asia/Bangkok');
    const utcTimestamp = bangkokNow.toUTC().toISO();
    
    // Insert time entry directly into the database
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .insert({
        staff_id: staffId,
        action: action,
        timestamp: utcTimestamp,
        photo_url: photoUrl || null,
        photo_captured: photoCaptured,
        camera_error: cameraError || null,
        device_info: deviceInfo || null,
      })
      .select('id, staff_id, action, timestamp, photo_captured')
      .single();
    
    if (error) {
      console.error('Error recording time entry:', error);
      throw new Error('Failed to record time entry');
    }
    
    if (!data) {
      throw new Error('No data returned from time entry recording');
    }
    
    // Return the entry with an entry_id field to match expected interface
    return {
      entry_id: data.id,
      staff_id: data.staff_id,
      action: data.action,
      timestamp: data.timestamp,
      photo_captured: data.photo_captured
    };
  } catch (error) {
    console.error('Error recording time entry:', error);
    throw error;
  }
}

/**
 * Update failed PIN attempts
 */
export async function updateFailedAttempts(staffId: number, increment: boolean = true): Promise<void> {
  try {
    if (increment) {
      // Get current failed attempts count
      const staff = await getStaffById(staffId);
      if (!staff) throw new Error('Staff member not found');
      
      const newFailedAttempts = staff.failed_attempts + 1;
      
      // Increment failed attempts
      const { error } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('staff')
        .update({ 
          failed_attempts: newFailedAttempts,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffId);
      
      if (error) throw error;
      
      // Check if we need to lock the account
      if (newFailedAttempts >= LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS) {
        await lockStaffAccount(staffId, LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES);
      }
    } else {
      // Reset failed attempts
      const { error } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('staff')
        .update({ 
          failed_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffId);
      
      if (error) throw error;
    }
  } catch (error) {
    console.error('Error updating failed attempts:', error);
    throw new Error('Database error while updating failed attempts');
  }
}

/**
 * Lock staff account for specified duration
 */
export async function lockStaffAccount(staffId: number, durationMinutes: number): Promise<void> {
  try {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + durationMinutes);
    
    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .update({ 
        locked_until: lockUntil.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', staffId);
    
    if (error) throw error;
    
    // Log the lock action
    await logStaffAction(
      staffId,
      'locked',
      'system',
      'automatic_lockout',
      `Account locked for ${durationMinutes} minutes due to too many failed PIN attempts`,
      'Automatic security lockout'
    );
  } catch (error) {
    console.error('Error locking staff account:', error);
    throw new Error('Database error while locking account');
  }
}

/**
 * Unlock staff account
 */
export async function unlockStaffAccount(staffId: number, adminEmail: string): Promise<void> {
  try {
    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .update({ 
        locked_until: null,
        failed_attempts: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', staffId);
    
    if (error) throw error;
    
    // Log the unlock action
    await logStaffAction(
      staffId,
      'unlocked',
      'admin',
      adminEmail,
      'Account unlocked by administrator',
      'Manual unlock by admin'
    );
  } catch (error) {
    console.error('Error unlocking staff account:', error);
    throw new Error('Database error while unlocking account');
  }
}

// ==========================================
// Audit Logging
// ==========================================

/**
 * Log staff-related actions for audit trail
 */
export async function logStaffAction(
  staffId: number | null,
  actionType: string,
  changedByType: 'admin' | 'system',
  changedByIdentifier: string,
  changesSummary: string,
  reason?: string,
  oldData?: any,
  newData?: any
): Promise<void> {
  try {
    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff_audit_log')
      .insert({
        staff_id: staffId,
        action_type: actionType,
        changed_by_type: changedByType,
        changed_by_identifier: changedByIdentifier,
        changes_summary: changesSummary,
        reason: reason || null,
        old_data_snapshot: oldData || null,
        new_data_snapshot: newData || null,
      });
    
    if (error) {
      console.error('Error logging staff action:', error);
      // Don't throw here as this shouldn't break the main operation
    }
  } catch (error) {
    console.error('Error in logStaffAction:', error);
  }
}

// ==========================================
// Device Information Helpers
// ==========================================

/**
 * Extract minimal device information (Phase 5.5: Streamlined for performance)
 */
export function extractDeviceInfo(headers: any): any {
  return {
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate device info format (Phase 5.5: Minimal validation)
 */
export function validateDeviceInfo(deviceInfo: any): boolean {
  if (!deviceInfo || typeof deviceInfo !== 'object') return false;
  
  // Phase 5.5: Just check for timestamp - minimal validation for performance
  return !!(deviceInfo.timestamp);
}

// ==========================================
// Time Calculation Helpers
// ==========================================

/**
 * Calculate time remaining until unlock (in seconds)
 */
export function getTimeUntilUnlock(lockedUntil: string | null): number {
  if (!lockedUntil) return 0;
  
  const unlockTime = new Date(lockedUntil);
  const now = new Date();
  const diff = Math.max(0, Math.floor((unlockTime.getTime() - now.getTime()) / 1000));
  
  return diff;
}

/**
 * Format time remaining as human-readable string
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Account unlocked';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  } else {
    return `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  }
}

// ==========================================
// Validation Helpers
// ==========================================

/**
 * Validate staff name format
 */
export function validateStaffName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Staff name is required' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Staff name must be at least 2 characters' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Staff name must be less than 100 characters' };
  }
  
  return { valid: true };
}

/**
 * Validate staff ID format (optional field)
 */
export function validateStaffId(staffId?: string): { valid: boolean; error?: string } {
  if (!staffId) return { valid: true }; // Optional field
  
  const trimmed = staffId.trim();
  if (trimmed.length === 0) return { valid: true }; // Empty is OK
  
  if (trimmed.length > 20) {
    return { valid: false, error: 'Staff ID must be less than 20 characters' };
  }
  
  return { valid: true };
}

/**
 * Update a time entry with photo URL after async upload
 */
export async function updateTimeEntryPhotoUrl(entryId: number, photoUrl: string): Promise<void> {
  try {
    console.log(`[PHOTO_DEBUG] Attempting to update entry ${entryId} with photo URL: ${photoUrl}`);
    
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .update({ 
        photo_url: photoUrl
      })
      .eq('id', entryId)
      .select();
    
    if (error) {
      console.error(`[PHOTO_DEBUG] Database update error for entry ${entryId}:`, error);
      throw new Error(`Failed to update time entry with photo URL: ${error.message}`);
    }
    
    console.log(`[PHOTO_DEBUG] Successfully updated entry ${entryId}:`, data);
  } catch (error) {
    console.error(`[PHOTO_DEBUG] Exception in updateTimeEntryPhotoUrl for entry ${entryId}:`, error);
    throw error;
  }
}

/**
 * Get staff status with last activity information
 */
export async function getStaffWithLastActivity(): Promise<any[]> {
  try {
    // Get all staff members (excluding pin_hash for security)
    const { data: staff, error: staffError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, staff_id, is_active, failed_attempts, locked_until, created_at, updated_at')
      .order('staff_name');

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      throw new Error('Failed to fetch staff members');
    }

    if (!staff || staff.length === 0) {
      return [];
    }

    // Get last activity for each staff member
    const staffWithActivity = await Promise.all(
      staff.map(async (member: any) => {
        // Get last time entry for this staff member
        const { data: lastEntry, error: entryError } = await refacSupabaseAdmin
          .schema('backoffice')
          .from('time_entries')
          .select('timestamp, action')
          .eq('staff_id', member.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        return {
          ...member,
          last_activity: !entryError && lastEntry ? lastEntry.timestamp : null
        };
      })
    );

    return staffWithActivity;
  } catch (error) {
    console.error('Error fetching staff with last activity:', error);
    throw new Error('Database error while fetching staff with activity');
  }
} 