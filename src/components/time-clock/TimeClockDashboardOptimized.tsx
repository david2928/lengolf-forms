'use client'

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { TimeClockProvider, useTimeClockContext } from './context/TimeClockProvider'
import { TimeClockSummaryCards } from './TimeClockSummaryCards'
import { TimeClockFilters } from './TimeClockFilters'
import { TimeClockTabs } from './TimeClockTabs'

// Inner component that consumes the context
const TimeClockDashboardContent: React.FC = () => {
  const { error } = useTimeClockContext()

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <TimeClockSummaryCards />

      {/* Error Display */}
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <TimeClockFilters />

      {/* Reports Tabs */}
      <TimeClockTabs />
    </div>
  )
}

// Main component with provider wrapper
export function TimeClockDashboardOptimized() {
  return (
    <TimeClockProvider>
      <TimeClockDashboardContent />
    </TimeClockProvider>
  )
}

// Export for backward compatibility
export { TimeClockDashboardOptimized as TimeClockDashboard }