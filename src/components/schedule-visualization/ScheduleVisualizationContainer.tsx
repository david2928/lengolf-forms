'use client'

import React from 'react'
import { ScheduleVisualizationProps, VisualizationError } from '@/types/schedule-visualization'
import { TimelineGrid } from './TimelineGrid'
import { processScheduleData, validateScheduleData } from '@/lib/schedule-visualization-utils'
import { generateStaffColorAssignments } from '@/lib/staff-colors'
import { ScheduleVisualizationSkeleton } from './ScheduleVisualizationSkeleton'
import { ScheduleVisualizationErrorBoundary } from './ScheduleVisualizationErrorBoundary'
import { OfflineIndicator, useOnlineStatus } from './OfflineIndicator'
import { RetryMechanism } from './RetryMechanism'
import { useScheduleVisualizationError } from '@/hooks/useScheduleVisualizationError'

/**
 * ScheduleVisualizationContainer Component
 * Main container that orchestrates the schedule visualization display
 */
export function ScheduleVisualizationContainer({
  scheduleData,
  staffAssignments,
  weekStart,
  loading = false,
  className = ''
}: ScheduleVisualizationProps) {
  const [isClient, setIsClient] = React.useState(false)
  const { isOnline } = useOnlineStatus()
  const { 
    error, 
    isRetrying, 
    retryCount, 
    hasError, 
    canRetry, 
    setError, 
    clearError, 
    retry, 
    handleAsyncError 
  } = useScheduleVisualizationError({
    maxRetries: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error('Schedule visualization error:', error)
    },
    onMaxRetriesReached: (error) => {
      console.error('Max retries reached for schedule visualization:', error)
    }
  })

  // Fix hydration mismatch by only showing client-specific features after hydration
  React.useEffect(() => {
    setIsClient(true)
  }, [])

  const [processedData, setProcessedData] = React.useState<{
    scheduleBlocks: any[]
    validatedStaffAssignments: any[]
  } | null>(null)

  // Process schedule data when it changes
  const processScheduleDataAsync = React.useCallback(async () => {
    if (!scheduleData || loading) {
      console.log('ScheduleVisualizationContainer: No data or loading', { scheduleData: !!scheduleData, loading })
      setProcessedData(null)
      return
    }

    console.log('ScheduleVisualizationContainer: Processing data', { scheduleData, staffAssignments })

    const result = await handleAsyncError(async () => {
      // Validate and process raw schedule data
      const rawSchedules = scheduleData.raw_schedules || []
      console.log('ScheduleVisualizationContainer: Raw schedules', rawSchedules)
      
      if (rawSchedules.length === 0) {
        console.log('ScheduleVisualizationContainer: No raw schedules, returning empty result')
        // Don't throw error for empty data, just return empty result
        return {
          scheduleBlocks: [],
          validatedStaffAssignments: staffAssignments || []
        }
      }
      
      // Filter out invalid schedules
      const validSchedules = rawSchedules.filter(schedule => {
        const isValid = validateScheduleData(schedule)
        if (!isValid) {
          console.warn('Invalid schedule data:', schedule)
        }
        return isValid
      })

      console.log('ScheduleVisualizationContainer: Valid schedules', validSchedules)

      // Process schedules into visualization blocks
      const scheduleBlocks = processScheduleData(validSchedules)
      console.log('ScheduleVisualizationContainer: Schedule blocks', scheduleBlocks)

      // Ensure staff assignments are available
      let validatedStaffAssignments = staffAssignments
      if (!staffAssignments || staffAssignments.length === 0) {
        // Generate staff assignments from schedule data if not provided
        const staffFromSchedules = validSchedules.map(s => ({
          id: s.staff_id,
          staff_name: s.staff_name
        }))
        
        // Remove duplicates
        const uniqueStaff = staffFromSchedules.filter((staff, index, self) => 
          index === self.findIndex(s => s.id === staff.id)
        )
        
        validatedStaffAssignments = generateStaffColorAssignments(uniqueStaff)
        console.log('ScheduleVisualizationContainer: Generated staff assignments', validatedStaffAssignments)
      }

      const finalResult = {
        scheduleBlocks,
        validatedStaffAssignments
      }
      console.log('ScheduleVisualizationContainer: Final result', finalResult)

      return finalResult
    }, 'data processing')

    if (result) {
      console.log('ScheduleVisualizationContainer: Setting processed data', result)
      setProcessedData(result)
    } else {
      console.log('ScheduleVisualizationContainer: No result, setting null')
      setProcessedData(null)
    }
  }, [scheduleData, staffAssignments, loading, handleAsyncError])

  React.useEffect(() => {
    processScheduleDataAsync()
  }, [processScheduleDataAsync])

  // Handle retry for recoverable errors
  const handleRetry = React.useCallback(async () => {
    await retry(processScheduleDataAsync)
  }, [retry, processScheduleDataAsync])

  // Loading state or not yet hydrated
  if (!isClient || loading || (!processedData && !hasError)) {
    return (
      <div className={`schedule-visualization-container ${className}`}>
        <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Schedule Overview</h3>
            <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
              {!isClient ? 'Loading...' : loading ? 'Loading...' : 'View Only'}
            </div>
          </div>
          
          <ScheduleVisualizationSkeleton
            weekStart={weekStart}
            businessHours={{ start: 10, end: 23 }}
          />
        </div>
      </div>
    )
  }

  // Error state
  if (hasError && error) {
    return (
      <div className={`schedule-visualization-container ${className}`}>
        <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Schedule Overview</h3>
            <div className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
              Error
            </div>
          </div>
          
          {/* Offline indicator */}
          {isClient && !isOnline && (
            <div className="mb-4">
              <OfflineIndicator onRetry={handleRetry} />
            </div>
          )}
          
          <RetryMechanism
            error={error}
            onRetry={handleRetry}
            maxRetries={3}
            currentRetries={retryCount}
            variant="banner"
          />
        </div>
      </div>
    )
  }

  // Main visualization
  return (
    <ScheduleVisualizationErrorBoundary
      weekStart={weekStart}
      onError={(error, errorInfo) => {
        console.error('Schedule visualization boundary error:', error, errorInfo)
        setError({
          type: 'render',
          message: 'Failed to render schedule visualization',
          details: { error: error.message, errorInfo },
          recoverable: true
        })
      }}
    >
      <div className={`schedule-visualization-container ${className}`}>
        <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Schedule Overview</h3>
            <div className="flex items-center space-x-2">
              {isClient && !isOnline && (
                <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  Offline
                </div>
              )}
              <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                View Only
              </div>
            </div>
          </div>
          
          {/* Offline indicator */}
          {isClient && !isOnline && (
            <div className="mb-4">
              <OfflineIndicator 
                onRetry={handleRetry} 
                showRetryButton={false}
              />
            </div>
          )}
          
          {processedData && (
            <TimelineGrid
              weekStart={weekStart}
              businessHours={{ start: 10, end: 23 }}
              scheduleBlocks={processedData.scheduleBlocks}
              staffAssignments={processedData.validatedStaffAssignments}
            />
          )}
        </div>
      </div>
    </ScheduleVisualizationErrorBoundary>
  )
}

// Export the error boundary for external use
export { ScheduleVisualizationErrorBoundary as ScheduleVisualizationError }

export default ScheduleVisualizationContainer