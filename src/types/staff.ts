// Staff Time Clock System Types
// Story: STAFF-001 - Database Schema & Backend Foundation

// ==========================================
// Database Entity Types
// ==========================================

export interface Staff {
  id: number;
  staff_name: string;
  staff_id?: string | null;
  pin_hash: string;
  is_active: boolean;
  failed_attempts: number;
  locked_until?: string | null; // ISO timestamp
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: number;
  staff_id: number;
  action: 'clock_in' | 'clock_out';
  timestamp: string; // ISO timestamp
  photo_url?: string | null;
  photo_captured: boolean;
  camera_error?: string | null;
  device_info?: any; // JSONB
  created_at: string;
}

export interface StaffAuditLog {
  id: number;
  staff_id?: number | null;
  action_type: 'created' | 'pin_changed' | 'activated' | 'deactivated' | 'locked' | 'unlocked';
  changed_by_type: 'admin' | 'system';
  changed_by_identifier: string;
  changes_summary?: string | null;
  old_data_snapshot?: any | null; // JSONB
  new_data_snapshot?: any | null; // JSONB
  reason?: string | null;
  created_at: string;
}

export interface StaffStatus {
  id: number;
  staff_name: string;
  staff_id?: string | null;
  is_active: boolean;
  failed_attempts: number;
  locked_until?: string | null;
  is_currently_locked: boolean;
  last_action?: 'clock_in' | 'clock_out' | null;
  last_action_time?: string | null;
  currently_clocked_in: boolean;
}

// ==========================================
// API Request/Response Types
// ==========================================

// Staff Management
export interface CreateStaffRequest {
  staff_name: string;
  staff_id?: string;
  pin: string; // Will be hashed before storage
}

export interface UpdateStaffRequest {
  staff_name?: string;
  staff_id?: string;
  is_active?: boolean;
}

export interface ResetPinRequest {
  new_pin: string; // Will be hashed before storage
}

// Time Clock Operations
export interface TimeClockPunchRequest {
  pin: string;
  photo_data?: string | null; // Base64 or blob data
  device_info?: DeviceInfo;
}

export interface TimeClockPunchResponse {
  success: boolean;
  staff_id?: number;
  staff_name?: string;
  action?: 'clock_in' | 'clock_out';
  timestamp?: string;
  message: string;
  currently_clocked_in?: boolean;
  is_locked?: boolean;
  lock_expires_at?: string | null;
  photo_captured?: boolean;
  entry_id?: number;
}

export interface PinVerificationResponse {
  success: boolean;
  staff_id?: number;
  staff_name?: string;
  message: string;
  currently_clocked_in: boolean;
  is_locked: boolean;
  lock_expires_at?: string | null;
}

// Time Entries Query
export interface TimeEntriesRequest {
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  staff_id?: number;
}

export interface TimeEntriesResponse {
  entries: TimeEntryReport[];
  summary: {
    total_entries: number;
    clock_ins: number;
    clock_outs: number;
    unique_staff: number;
  };
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface TimeEntryReport {
  entry_id: number;
  staff_id: number;
  staff_name: string;
  action: 'clock_in' | 'clock_out';
  timestamp: string;
  date_only: string; // YYYY-MM-DD
  time_only: string; // HH:MM:SS
  photo_captured: boolean;
  photo_url?: string | null; // Added photo_url property
  camera_error?: string | null;
}

// ==========================================
// Utility Types
// ==========================================

export interface DeviceInfo {
  userAgent?: string;
  platform?: string;
  screen?: {
    width: number;
    height: number;
  };
  timestamp?: string;
}

export interface PinAttemptInfo {
  attempts: number;
  max_attempts: number;
  locked_until?: string | null;
  time_remaining?: number; // seconds
}

// ==========================================
// Frontend Admin Types
// ==========================================

// Frontend-specific interface for admin dashboard
export interface StaffMember {
  id: number;
  name: string;
  pin: string;
  is_active: boolean;
  failed_attempts: number;
  is_locked_out: boolean;
  last_clock_activity: string | null;
  created_at: string;
  updated_at: string;
}

// ==========================================
// Admin Dashboard Types
// ==========================================

export interface StaffSummary {
  total_staff: number;
  active_staff: number;
  locked_accounts: number;
  currently_clocked_in: number;
}

export interface DailyStaffReport {
  date: string;
  staff_entries: {
    staff_id: number;
    staff_name: string;
    clock_in_time?: string;
    clock_out_time?: string;
    total_hours?: number;
    status: 'complete' | 'clocked_in' | 'missing_out' | 'no_entries';
  }[];
  summary: {
    total_hours: number;
    complete_entries: number;
    incomplete_entries: number;
  };
}

export interface WeeklyStaffReport {
  week_start: string;
  week_end: string;
  staff_summaries: {
    staff_id: number;
    staff_name: string;
    total_hours: number;
    days_worked: number;
    overtime_hours: number;
    has_issues: boolean;
  }[];
  summary: {
    total_staff: number;
    total_hours: number;
    overtime_alerts: number;
    camera_failures: number;
  };
}

// ==========================================
// Error Types
// ==========================================

export interface TimeClockError {
  code: string;
  message: string;
  details?: any;
}

export const TIME_CLOCK_ERROR_CODES = {
  INVALID_PIN: 'INVALID_PIN',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  STAFF_NOT_FOUND: 'STAFF_NOT_FOUND',
  CAMERA_PERMISSION_DENIED: 'CAMERA_PERMISSION_DENIED',
  CAMERA_NOT_AVAILABLE: 'CAMERA_NOT_AVAILABLE',
  PHOTO_UPLOAD_FAILED: 'PHOTO_UPLOAD_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

export type TimeClockErrorCode = typeof TIME_CLOCK_ERROR_CODES[keyof typeof TIME_CLOCK_ERROR_CODES];

// ==========================================
// Constants
// ==========================================

export const LOCKOUT_CONFIG = {
  MAX_FAILED_ATTEMPTS: 10,
  WARNING_THRESHOLD: 9,
  LOCKOUT_DURATION_MINUTES: 60,
} as const;

export const PIN_CONFIG = {
  LENGTH: 6,
  ALLOWED_CHARACTERS: '0123456789',
  BCRYPT_ROUNDS: 12,
} as const;

export const PHOTO_CONFIG = {
  MAX_FILE_SIZE: 1 * 1024 * 1024, // 1MB (Phase 4: reduced from 2MB for ultra performance)
  ALLOWED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
  STORAGE_BUCKET: 'time-clock-photos',
  RETENTION_DAYS: 30,
  // Phase 4: Ultra-compressed photo settings for maximum performance
  CAPTURE_RESOLUTION: {
    WIDTH: 240,  // Reduced from 320
    HEIGHT: 180  // Reduced from 240 (maintains 4:3 aspect ratio)
  },
  JPEG_QUALITY: 0.3, // Phase 4: 30% quality (reduced from 50%) - still adequate for staff identification
  // Phase 4: Performance targets
  TARGET_FILE_SIZE_KB: 50, // Target <50KB per photo for optimal performance
} as const;

// ==========================================
// POS Staff Authentication Types
// ==========================================

export interface POSStaffSession {
  staff: Staff;
  loginTime: Date;
  sessionId: string;
}

export interface POSStaffAuthResponse {
  success: boolean;
  staff?: Staff;
  sessionId?: string;
  error?: string;
}

export interface POSStaffContext {
  currentStaff: Staff | null;
  session: POSStaffSession | null;
  currentPin: string | null;
  isAuthenticated: boolean;
  login: (pin: string) => Promise<POSStaffAuthResponse>;
  logout: () => void;
} 