// Main dashboard component
export { TimeClockDashboardOptimized as TimeClockDashboard } from './TimeClockDashboardOptimized'

// Context and provider
export { TimeClockProvider, useTimeClockContext } from './context/TimeClockProvider'

// Individual components
export { TimeClockSummaryCards } from './TimeClockSummaryCards'
export { TimeClockFilters } from './TimeClockFilters'
export { TimeClockTabs } from './TimeClockTabs'

// View components
export { TimeEntriesView } from './views/TimeEntriesView'
export { WorkShiftsView } from './views/WorkShiftsView'
export { StaffAnalyticsView } from './views/StaffAnalyticsView'

// Shared components
export { PhotoDialog } from './shared/PhotoDialog'
export { BaseStaffCard } from './shared/BaseStaffCard'
export { ResponsiveDataView } from './shared/ResponsiveDataView'

// Re-export types
export type { 
  TimeEntry, 
  ReportFilters, 
  WorkShift, 
  StaffTimeAnalytics 
} from './context/TimeClockProvider'