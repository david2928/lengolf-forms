/**
 * Schedule Visualization Type Definitions
 * Types and utilities for the admin schedule timeline visualization
 */

import { StaffSchedule } from './staff-schedule'
import { StaffColorAssignment } from '@/lib/staff-colors'

// Core visualization interfaces
export interface ProcessedScheduleBlock {
  id: string
  staffId: number
  staffName: string
  startTime: string
  endTime: string
  date: string
  location?: string
  notes?: string
  gridPosition: GridPosition
  duration: number
  isRecurring?: boolean
  originalSchedule: StaffSchedule
}

export interface GridPosition {
  dayIndex: number      // 0-6 (Monday to Sunday)
  startRow: number      // 0-12 (10am to 11pm)
  endRow: number        // 0-12 (10am to 11pm)
  rowSpan: number       // Number of hour slots to span
}

export interface VisualizationConfig {
  businessHours: {
    start: number       // 10 (10am)
    end: number         // 23 (11pm)
  }
  timeSlotHeight: number  // Height of each hour slot in pixels
  dayColumnWidth: string  // CSS width for each day column
  blockPadding: number    // Padding inside schedule blocks
  responsive: {
    mobile: VisualizationBreakpoint
    tablet: VisualizationBreakpoint
    desktop: VisualizationBreakpoint
  }
}

export interface VisualizationBreakpoint {
  timeSlotHeight: number
  fontSize: string
  blockPadding: number
  showMinutes: boolean
}

// Component prop interfaces
export interface ScheduleVisualizationProps {
  scheduleData: ScheduleOverview
  staffAssignments: StaffColorAssignment[]
  weekStart: string
  loading?: boolean
  className?: string
}

export interface TimelineGridProps {
  weekStart: string
  businessHours: { start: number; end: number }
  scheduleBlocks: ProcessedScheduleBlock[]
  staffAssignments: StaffColorAssignment[]
  onBlockHover?: (block: ProcessedScheduleBlock | null) => void
  className?: string
}

export interface StaffScheduleBlockProps {
  schedule: ProcessedScheduleBlock
  staffColor: StaffColorAssignment
  gridPosition: GridPosition
  duration: number
  className?: string
}

export interface TimelineHeaderProps {
  weekStart: string
  businessHours: { start: number; end: number }
  className?: string
}

// Schedule overview interface (from existing admin system)
export interface ScheduleOverview {
  week_period: {
    start_date: string
    end_date: string
  }
  kpis: {
    total_staff: number
    scheduled_shifts: number
    staff_scheduled: number
    coverage_percentage: number
    conflicts_count: number
  }
  schedule_grid: { [date: string]: any[] }
  conflicts: any[]
  raw_schedules: any[]
}

// Error handling interfaces
export interface VisualizationError {
  type: 'data' | 'render' | 'network' | 'validation'
  message: string
  details?: any
  recoverable: boolean
}

export interface ErrorHandlingStrategy {
  retryAttempts: number
  retryDelay: number
  fallbackDisplay: 'empty' | 'skeleton' | 'error'
  errorReporting: boolean
}

// Default configuration
export const DEFAULT_VISUALIZATION_CONFIG: VisualizationConfig = {
  businessHours: {
    start: 10,  // 10am
    end: 23     // 11pm
  },
  timeSlotHeight: 60,
  dayColumnWidth: '14.28%', // 100% / 7 days
  blockPadding: 8,
  responsive: {
    mobile: {
      timeSlotHeight: 40,
      fontSize: '0.75rem',
      blockPadding: 4,
      showMinutes: false
    },
    tablet: {
      timeSlotHeight: 50,
      fontSize: '0.875rem',
      blockPadding: 6,
      showMinutes: true
    },
    desktop: {
      timeSlotHeight: 60,
      fontSize: '1rem',
      blockPadding: 8,
      showMinutes: true
    }
  }
}