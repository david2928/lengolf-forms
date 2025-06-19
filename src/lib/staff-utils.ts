// Staff Time Clock Utility Functions
// Story: STAFF-001 - Database Schema & Backend Foundation

import bcrypt from 'bcryptjs';
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
 * Verify PIN using direct database queries
 */
export async function verifyStaffPin(pin: string): Promise<PinVerificationResponse> {
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

    // Get all active staff members and check PIN against each
    const { data: staffMembers, error: staffError } = await refacSupabaseAdmin
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

    if (!staffMembers || staffMembers.length === 0) {
      return {
        success: false,
        message: 'No active staff members found',
        currently_clocked_in: false,
        is_locked: false,
      };
    }

    // Check PIN against each staff member
    let matchedStaff: any = null;
    for (const staff of staffMembers) {
      const isMatch = await verifyPin(pin, staff.pin_hash);
      if (isMatch) {
        matchedStaff = staff;
        break;
      }
    }

    if (!matchedStaff) {
      return {
        success: false,
        message: 'PIN not recognized. Please try again.',
        currently_clocked_in: false,
        is_locked: false,
      };
    }

    // Check if account is locked
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

    // Get current clock-in status by checking the last time entry
    const { data: lastEntry, error: entryError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select('action')
      .eq('staff_id', matchedStaff.id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    // Determine current status (default to clocked out if no entries or error)
    const currentlyClockedIn = !entryError && lastEntry?.action === 'clock_in';

    // Clear failed attempts and unlock if needed (PIN was successful)
    if (matchedStaff.failed_attempts > 0 || matchedStaff.locked_until) {
      await refacSupabaseAdmin
        .schema('backoffice')
        .from('staff')
        .update({
          failed_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchedStaff.id);
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
    // Insert time entry directly into the database
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .insert({
        staff_id: staffId,
        action: action,
        timestamp: new Date().toISOString(),
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
 * Extract device information from request headers (server-side)
 */
export function extractDeviceInfo(headers: any): any {
  return {
    userAgent: headers['user-agent'] || 'Unknown',
    xForwardedFor: headers['x-forwarded-for'],
    xRealIp: headers['x-real-ip'],
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate device info format
 */
export function validateDeviceInfo(deviceInfo: any): boolean {
  if (!deviceInfo || typeof deviceInfo !== 'object') return false;
  
  // Basic validation - should have at least userAgent or platform
  return !!(deviceInfo.userAgent || deviceInfo.platform);
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