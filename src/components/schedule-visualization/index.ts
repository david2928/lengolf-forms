/**
 * Schedule Visualization Components
 * Export remaining components after cleanup
 */

export { CleanScheduleView } from './CleanScheduleView'
export { StaffScheduleBlock } from './StaffScheduleBlock'
export { TimelineHeader } from './TimelineHeader'

// Re-export types for convenience
export type {
  StaffScheduleBlockProps,
  TimelineHeaderProps,
  ProcessedScheduleBlock,
  GridPosition
} from '@/types/schedule-visualization'