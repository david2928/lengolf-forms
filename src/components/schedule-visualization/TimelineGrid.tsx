'use client'

import React from 'react'
import { TimelineGridProps, ProcessedScheduleBlock } from '@/types/schedule-visualization'
import { TimelineHeader, TimeLabels } from './TimelineHeader'
import { StaffScheduleBlock } from './StaffScheduleBlock'
import { groupOverlappingSchedules, calculateBlockStyles } from '@/lib/schedule-visualization-utils'
import { getStaffColor } from '@/lib/staff-colors'
import { visualizationPerformance, throttle } from '@/lib/visualization-performance'
import { generateGridCellAriaLabel, createLiveRegionAnnouncement } from '@/lib/schedule-accessibility'
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation'
import { useResponsiveConfig, enableHorizontalScroll, createStickyTimeLabels } from '@/lib/responsive-design'

// Re-export skeleton for convenience
export { TimelineGridSkeleton } from './ScheduleVisualizationSkeleton'

/**
 * TimelineGrid Component
 * Main grid layout with 7 columns (days) and 13 rows (hours) for schedule visualization
 */
export function TimelineGrid({ 
  weekStart, 
  businessHours, 
  scheduleBlocks, 
  staffAssignments,
  onBlockHover,
  className = '' 
}: TimelineGridProps) {
  const [hoveredBlock, setHoveredBlock] = React.useState<ProcessedScheduleBlock | null>(null)
  const [selectedBlock, setSelectedBlock] = React.useState<ProcessedScheduleBlock | null>(null)
  
  // Responsive configuration
  const responsiveConfig = useResponsiveConfig()
  const gridRef = React.useRef<HTMLDivElement>(null)
  const timeLabelsRef = React.useRef<HTMLDivElement>(null)
  
  // Keyboard navigation
  const {
    focusedBlockId,
    isNavigationMode,
    containerRef,
    liveRegionRef,
    registerBlockRef,
    onContainerFocus,
    onContainerBlur
  } = useKeyboardNavigation({
    scheduleBlocks,
    onBlockFocus: (block) => {
      setSelectedBlock(block)
      onBlockHover?.(block)
    },
    onBlockSelect: (block) => {
      // Could trigger a modal or action
      console.log('Selected block:', block)
    }
  })
  
  // Group overlapping schedules for better display
  const groupedSchedules = groupOverlappingSchedules(scheduleBlocks)
  
  // Handle block hover
  const handleBlockHover = (block: ProcessedScheduleBlock | null) => {
    setHoveredBlock(block)
    onBlockHover?.(block)
  }
  
  // Generate responsive grid template
  const gridTemplateColumns = responsiveConfig.gridColumns
  const gridTemplateRows = `auto repeat(14, ${responsiveConfig.timeSlotHeight}px)`
  
  // Set up horizontal scrolling for mobile/tablet
  React.useEffect(() => {
    if (gridRef.current && responsiveConfig.scrollable) {
      enableHorizontalScroll(gridRef.current)
      
      // Set up sticky time labels
      if (timeLabelsRef.current) {
        const cleanup = createStickyTimeLabels(gridRef.current, timeLabelsRef.current)
        return cleanup
      }
    }
  }, [responsiveConfig.scrollable])
  
  return (
    <div className={`timeline-grid-container ${className}`}>
      {/* Live region for screen reader announcements */}
      <div 
        ref={liveRegionRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />
      
      {/* Timeline Header */}
      <TimelineHeader 
        weekStart={weekStart} 
        businessHours={businessHours}
        className="mb-4"
      />
      
      {/* Keyboard navigation instructions */}
      <div className="sr-only" id="grid-instructions">
        Use Tab to enter the schedule grid, then arrow keys to navigate between shifts. 
        Press Enter or Space to select a shift. Press Escape to exit navigation mode.
      </div>
      
      {/* Main Grid */}
      <div 
        ref={(el) => {
          containerRef.current = el
          gridRef.current = el
        }}
        className={`
          timeline-grid relative bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
          ${responsiveConfig.scrollable ? 'overflow-x-auto overflow-y-hidden' : 'overflow-hidden'}
          ${responsiveConfig.compactMode ? 'text-sm' : ''}
        `}
        style={{
          display: 'grid',
          gridTemplateColumns,
          gridTemplateRows,
          gap: '1px',
          backgroundColor: '#f1f5f9', // Slate-100 for grid lines
          minWidth: responsiveConfig.scrollable ? '800px' : 'auto'
        }}
        role="grid"
        aria-label="Weekly staff schedule timeline"
        aria-describedby="grid-instructions"
        tabIndex={0}
        onFocus={onContainerFocus}
        onBlur={onContainerBlur}
      >
        {/* Time Labels Column */}
        <TimeLabels 
          businessHours={businessHours}
          className="time-labels-grid"
          ref={timeLabelsRef}
        />
        
        {/* Day Column Headers (invisible, for screen readers) */}
        <div className="sr-only">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => (
            <div 
              key={day}
              style={{ gridColumn: index + 2, gridRow: 1 }}
              role="columnheader"
              aria-label={day}
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Empty Grid Cells for Structure */}
        {Array.from({ length: 7 }, (_, dayIndex) => 
          Array.from({ length: 14 }, (_, hourIndex) => {
            const cellAriaLabel = generateGridCellAriaLabel(dayIndex, hourIndex, weekStart, businessHours)
            
            return (
              <div
                key={`empty-${dayIndex}-${hourIndex}`}
                className="grid-cell bg-white border-r border-b border-slate-100 hover:bg-slate-50 transition-colors"
                style={{
                  gridColumn: dayIndex + 2, // +2 for time column
                  gridRow: hourIndex + 2,   // +2 for header row
                  minHeight: `${responsiveConfig.timeSlotHeight}px`
                }}
                role="gridcell"
                aria-label={cellAriaLabel}
              />
            )
          })
        )}
        
        {/* Schedule Blocks */}
        {groupedSchedules.map((scheduleGroup, groupIndex) => 
          scheduleGroup.map((schedule, scheduleIndex) => {
            const staffColorAssignment = staffAssignments.find(a => a.staffId === schedule.staffId)
            
            // Safety check - if no color assignment found, skip this schedule
            if (!staffColorAssignment) {
              console.warn(`No color assignment found for staff ID ${schedule.staffId}`)
              return null
            }
            const blockStyles = calculateBlockStyles(
              schedule, 
              scheduleIndex, 
              scheduleGroup.length
            )
            
            return (
              <div
                key={schedule.id}
                className="schedule-block-container absolute"
                style={{
                  ...blockStyles,
                  zIndex: 10 + scheduleIndex // Ensure blocks are above grid cells
                }}
                onMouseEnter={() => handleBlockHover(schedule)}
                onMouseLeave={() => handleBlockHover(null)}
              >
                <StaffScheduleBlock
                  schedule={schedule}
                  staffColor={staffColorAssignment}
                  gridPosition={schedule.gridPosition}
                  duration={schedule.duration}
                  className={`
                    ${hoveredBlock?.id === schedule.id ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
                    ${scheduleGroup.length > 1 ? 'shadow-lg' : ''}
                  `}
                  isFocused={focusedBlockId === schedule.id}
                  tabIndex={isNavigationMode ? (focusedBlockId === schedule.id ? 0 : -1) : 0}
                  registerRef={(element) => registerBlockRef(schedule.id, element)}
                  onFocus={(event) => {
                    if (!isNavigationMode) {
                      onContainerFocus()
                    }
                  }}
                />
              </div>
            )
          })
        )}
        
        {/* Hover Overlay for Better Visual Feedback */}
        {hoveredBlock && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              gridColumn: hoveredBlock.gridPosition.dayIndex + 2,
              gridRow: `${hoveredBlock.gridPosition.startRow + 2} / span ${hoveredBlock.gridPosition.rowSpan}`,
              backgroundColor: 'rgba(59, 130, 246, 0.1)', // Blue-500 with opacity
              borderRadius: '0.75rem',
              zIndex: 5
            }}
          />
        )}
      </div>
      
      {/* Grid Legend */}
      <div className="grid-legend mt-4 text-xs text-slate-600 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded"></div>
            <span>Available time slot</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-50 border-l-4 border-l-blue-500 rounded"></div>
            <span>Scheduled shift</span>
          </div>
        </div>
        
        <div className="text-slate-500">
          Business hours: {businessHours.start === 10 ? '10am' : `${businessHours.start}am`} - {businessHours.end === 23 ? '11pm' : `${businessHours.end}pm`}
        </div>
      </div>
    </div>
  )
}



export default TimelineGrid