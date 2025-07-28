'use client'

import React from 'react'
import { RotateCcw } from 'lucide-react'
import { StaffScheduleBlockProps } from '@/types/schedule-visualization'
import { formatTimeRange, getResponsiveConfig } from '@/lib/schedule-visualization-utils'
import { 
  generateScheduleBlockAriaLabel, 
  getAccessibleTextColor, 
  hasAccessibleContrast,
  prefersReducedMotion 
} from '@/lib/schedule-accessibility'

/**
 * StaffScheduleBlock Component
 * Renders individual staff schedule blocks within the timeline visualization
 */
export function StaffScheduleBlock({ 
  schedule, 
  staffColor, 
  gridPosition, 
  duration,
  className = '',
  onFocus,
  onBlur,
  onKeyDown,
  tabIndex = 0,
  isFocused = false,
  registerRef
}: StaffScheduleBlockProps & {
  onFocus?: (event: React.FocusEvent) => void
  onBlur?: (event: React.FocusEvent) => void
  onKeyDown?: (event: React.KeyboardEvent) => void
  tabIndex?: number
  isFocused?: boolean
  registerRef?: (element: HTMLDivElement | null) => void
}) {
  const [screenWidth, setScreenWidth] = React.useState(1024) // Default to desktop
  
  // Update screen width on resize
  React.useEffect(() => {
    const updateScreenWidth = () => setScreenWidth(window.innerWidth)
    updateScreenWidth() // Set initial value
    
    window.addEventListener('resize', updateScreenWidth)
    return () => window.removeEventListener('resize', updateScreenWidth)
  }, [])

  // Ref callback for keyboard navigation
  const refCallback = React.useCallback((element: HTMLDivElement | null) => {
    registerRef?.(element)
  }, [registerRef])

  // Safety check for staffColor
  if (!staffColor || !staffColor.color) {
    console.warn('StaffScheduleBlock: Invalid staffColor provided')
    return null
  }
  
  const responsiveConfig = getResponsiveConfig(screenWidth)
  const timeRange = formatTimeRange(schedule.startTime, schedule.endTime, responsiveConfig.showMinutes)
  
  // Calculate block height based on duration and responsive config
  const blockHeight = Math.max(
    responsiveConfig.timeSlotHeight * gridPosition.rowSpan - 4, // -4 for gap
    responsiveConfig.timeSlotHeight * 0.8 // Minimum height
  )

  // Accessibility enhancements
  const ariaLabel = generateScheduleBlockAriaLabel(schedule)
  const reducedMotion = prefersReducedMotion()
  
  // Ensure accessible text color on staff name tab
  const accessibleTextColor = getAccessibleTextColor(staffColor.color.hex)
  const hasGoodContrast = hasAccessibleContrast(accessibleTextColor, staffColor.color.hex)
  
  return (
    <div
      ref={refCallback}
      className={`
        staff-schedule-block relative w-full h-full
        bg-white rounded-lg border border-slate-200 
        shadow-sm hover:shadow-md transition-all duration-200
        overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        ${staffColor.color.bg} ${staffColor.color.border}
        ${isFocused ? 'ring-2 ring-blue-500 ring-opacity-75' : ''}
        ${reducedMotion ? 'transition-none' : ''}
        ${className}
      `}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: staffColor.color.hex,
        fontSize: responsiveConfig.fontSize,
        padding: `${Math.max(responsiveConfig.blockPadding - 2, 2)}px`,
        minHeight: '100%'
      }}
      role="button"
      aria-label={ariaLabel}
      aria-describedby={`schedule-block-details-${schedule.id}`}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      {/* Staff Name Tab */}
      <div 
        className="staff-name-tab absolute top-0 left-0 right-0 px-1 py-0.5 text-center font-semibold text-xs truncate"
        style={{
          backgroundColor: staffColor.color.hex,
          color: hasGoodContrast ? accessibleTextColor : '#ffffff',
          borderTopLeftRadius: '0.5rem',
          borderTopRightRadius: '0.5rem',
          marginTop: '-1px', // Overlap the border slightly
          marginLeft: '-1px',
          marginRight: '-1px',
          fontSize: '0.7rem',
          lineHeight: '1.2'
        }}
        title={schedule.staffName}
        aria-hidden="true" // Content is already in aria-label
      >
        {schedule.staffName}
      </div>
      
      {/* Schedule Content */}
      <div className="schedule-content pt-4 h-full flex flex-col justify-center">
        {/* Time Display */}
        <div className="time-display text-center">
          <div 
            className={`font-medium text-xs ${staffColor.color.text}`}
            style={{ lineHeight: '1.3' }}
          >
            {timeRange}
          </div>
          
          {/* Duration indicator for longer blocks */}
          {duration >= 2 && responsiveConfig.showMinutes && blockHeight > 50 && (
            <div 
              className={`text-xs mt-1 opacity-75 ${staffColor.color.text}`}
              style={{ fontSize: '0.65rem', lineHeight: '1.2' }}
            >
              {duration === 1 ? '1 hour' : `${duration}h`}
            </div>
          )}
        </div>
        
        {/* Location (if available and space permits) */}
        {schedule.location && blockHeight > 80 && (
          <div 
            className={`location-display text-xs text-center mt-2 truncate opacity-75 ${staffColor.color.text}`}
            title={schedule.location}
          >
            📍 {schedule.location}
          </div>
        )}
        
        {/* Bottom spacing for recurring indicator */}
        <div className="flex-1" />
      </div>
      
      {/* Recurring Schedule Indicator */}
      {schedule.isRecurring && (
        <div className="absolute bottom-1 right-1">
          <div 
            className="w-4 h-4 rounded-full bg-white border border-slate-300 flex items-center justify-center shadow-sm"
            title="Recurring schedule"
            aria-hidden="true" // Already described in main aria-label
          >
            <RotateCcw className="h-2.5 w-2.5 text-slate-600" />
          </div>
        </div>
      )}
      
      {/* Hidden details for screen readers */}
      <div 
        id={`schedule-block-details-${schedule.id}`}
        className="sr-only"
      >
        Additional details: Duration {duration === 1 ? '1 hour' : `${duration} hours`}
        {schedule.location && `, Location: ${schedule.location}`}
        {schedule.isRecurring && ', This is a recurring schedule'}
      </div>
      
      {/* Hover overlay for better interaction feedback */}
      <div className="absolute inset-0 bg-black opacity-0 hover:opacity-5 transition-opacity duration-200 rounded-xl pointer-events-none" />
    </div>
  )
}

/**
 * StaffScheduleBlockSkeleton Component
 * Loading skeleton that matches the schedule block layout
 */
export function StaffScheduleBlockSkeleton({ 
  gridPosition,
  className = '' 
}: { 
  gridPosition: { rowSpan: number }
  className?: string 
}) {
  const blockHeight = Math.max(60 * gridPosition.rowSpan - 4, 48)
  
  return (
    <div
      className={`
        staff-schedule-block-skeleton relative
        bg-slate-100 rounded-xl border border-slate-200 
        animate-pulse overflow-hidden
        ${className}
      `}
      style={{
        minHeight: `${blockHeight}px`,
        padding: '8px'
      }}
      role="gridcell"
      aria-label="Loading schedule block"
    >
      {/* Skeleton Staff Name Tab */}
      <div 
        className="absolute top-0 left-0 right-0 h-6 bg-slate-300 rounded-t-xl"
        style={{
          marginTop: '-1px',
          marginLeft: '-1px',
          marginRight: '-1px'
        }}
      />
      
      {/* Skeleton Content */}
      <div className="pt-6 space-y-2">
        <div className="h-4 bg-slate-200 rounded mx-auto w-3/4" />
        {blockHeight > 80 && (
          <div className="h-3 bg-slate-200 rounded mx-auto w-1/2" />
        )}
      </div>
    </div>
  )
}

export default StaffScheduleBlock