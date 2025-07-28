'use client'

import React from 'react'
import { TimelineHeaderProps } from '@/types/schedule-visualization'
import { generateTimeSlots, generateDayLabels } from '@/lib/schedule-visualization-utils'
import { generateTimeSlotAriaLabel } from '@/lib/schedule-accessibility'
import { useResponsiveConfig } from '@/lib/responsive-design'

/**
 * TimelineHeader Component
 * Displays day names and time labels for the schedule visualization grid
 */
export function TimelineHeader({ 
  weekStart, 
  businessHours, 
  className = '' 
}: TimelineHeaderProps) {
  const timeSlots = generateTimeSlots()
  const dayLabels = generateDayLabels(weekStart)
  const responsiveConfig = useResponsiveConfig()

  return (
    <div className={`schedule-timeline-header ${className}`}>
      {/* Day Headers Row */}
      <div 
        className={`
          grid grid-cols-8 gap-1 mb-2 sticky top-0 bg-white z-10 border-b border-slate-200 pb-2
          ${responsiveConfig.compactMode ? 'text-xs' : 'text-sm'}
        `}
        style={{ minHeight: `${responsiveConfig.headerHeight}px` }}
      >
        {/* Empty cell for time column */}
        <div className={`p-2 font-medium text-slate-600 text-center ${responsiveConfig.compactMode ? 'text-xs' : 'text-sm'}`}>
          {responsiveConfig.compactMode ? '' : 'Time'}
        </div>
        
        {/* Day columns */}
        {dayLabels.map((dayLabel, index) => (
          <div 
            key={dayLabel.fullDate} 
            className="p-2 text-center border-r border-slate-100 last:border-r-0"
            role="columnheader"
            aria-label={`${dayLabel.day}, ${dayLabel.fullDate}`}
            id={`day-header-${index}`}
          >
            <div className={`font-medium text-slate-600 mb-1 ${responsiveConfig.compactMode ? 'text-xs' : 'text-sm'}`}>
              <abbr title={dayLabel.day} aria-label={dayLabel.day}>
                {responsiveConfig.compactMode ? dayLabel.day.slice(0, 3) : dayLabel.day}
              </abbr>
            </div>
            <div className={`font-bold text-slate-900 ${responsiveConfig.compactMode ? 'text-sm' : 'text-lg'}`}>
              {dayLabel.date}
            </div>
          </div>
        ))}
      </div>

      {/* Time Labels Column (will be positioned absolutely in the grid) */}
      <div className="hidden" aria-hidden="true">
        {timeSlots.map((timeSlot, index) => (
          <div 
            key={timeSlot}
            className="time-label"
            data-time={timeSlot}
            role="rowheader"
            aria-label={`${timeSlot} time slot`}
          >
            {timeSlot}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * TimeLabels Component
 * Separate component for time labels that will be positioned in the grid
 */
export const TimeLabels = React.forwardRef<HTMLDivElement, { 
  businessHours: { start: number; end: number };
  className?: string;
}>(function TimeLabels({ 
  businessHours, 
  className = '' 
}, ref) {
  const timeSlots = generateTimeSlots()
  const responsiveConfig = useResponsiveConfig()

  return (
    <div ref={ref} className={`time-labels-column ${className}`}>
      {timeSlots.map((timeSlot, index) => {
        const hour = businessHours.start + index
        const ariaLabel = generateTimeSlotAriaLabel(hour)
        
        return (
          <div 
            key={timeSlot}
            className="time-label-cell h-[60px] flex items-center justify-end pr-3 text-sm text-slate-600 border-r border-slate-200 bg-slate-50"
            style={{ 
              gridRow: index + 2, // +2 to account for header row
              gridColumn: 1 
            }}
            role="rowheader"
            aria-label={ariaLabel}
            id={`time-header-${index}`}
          >
            <span className="font-medium">
              <time dateTime={`${hour.toString().padStart(2, '0')}:00`}>
                {timeSlot}
              </time>
            </span>
          </div>
        )
      })}
    </div>
  )
})

// Export default
export default TimelineHeader