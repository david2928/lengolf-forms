'use client'

import React from 'react'

interface ScheduleVisualizationSkeletonProps {
  weekStart?: string
  businessHours?: { start: number; end: number }
  className?: string
}

/**
 * Loading skeleton that matches the final visualization layout
 * Provides visual feedback while data is loading
 */
export function ScheduleVisualizationSkeleton({
  weekStart,
  businessHours = { start: 10, end: 23 },
  className = ''
}: ScheduleVisualizationSkeletonProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const hours = Array.from(
    { length: businessHours.end - businessHours.start + 1 }, 
    (_, i) => businessHours.start + i
  )

  return (
    <div className={`schedule-visualization-skeleton ${className}`}>
      {/* Header skeleton */}
      <div className="mb-4">
        <div className="grid grid-cols-8 gap-1">
          {/* Time column header */}
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          
          {/* Day headers */}
          {days.map((day, index) => (
            <div key={index} className="space-y-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="space-y-1">
        {hours.map((hour, hourIndex) => (
          <div key={hour} className="grid grid-cols-8 gap-1 items-center">
            {/* Time label */}
            <div className="h-6 bg-gray-200 rounded animate-pulse" />
            
            {/* Day columns */}
            {days.map((day, dayIndex) => (
              <div key={`${hour}-${day}`} className="relative h-12 bg-gray-50 rounded border">
                {/* Random schedule blocks for visual variety */}
                {Math.random() > 0.7 && (
                  <div 
                    className="absolute inset-1 bg-gray-300 rounded animate-pulse"
                    style={{
                      height: Math.random() > 0.5 ? '100%' : '50%',
                      top: Math.random() > 0.5 ? '0' : '50%'
                    }}
                  />
                )}
                
                {/* Occasional multi-hour blocks */}
                {Math.random() > 0.85 && hourIndex < hours.length - 1 && (
                  <div className="absolute inset-1 bg-gray-400 rounded animate-pulse h-24" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Loading schedule visualization...
      </div>
    </div>
  )
}

/**
 * Compact skeleton for smaller spaces
 */
export function CompactScheduleVisualizationSkeleton({
  className = ''
}: {
  className?: string
}) {
  return (
    <div className={`compact-schedule-skeleton ${className}`}>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex space-x-2">
          <div className="w-16 h-6 bg-gray-200 rounded animate-pulse" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 h-6 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        
        {/* Rows */}
        {Array.from({ length: 6 }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex space-x-2">
            <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
            {Array.from({ length: 7 }).map((_, colIndex) => (
              <div key={colIndex} className="flex-1 h-8 bg-gray-100 rounded border">
                {Math.random() > 0.6 && (
                  <div className="h-full bg-gray-300 rounded animate-pulse" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-center mt-3">
        <div className="h-4 w-4 bg-gray-300 rounded-full animate-pulse mr-2" />
        <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  )
}

/**
 * Skeleton for individual timeline components
 */
export function TimelineGridSkeleton({
  weekStart,
  businessHours = { start: 10, end: 23 },
  className = ''
}: {
  weekStart?: string
  businessHours?: { start: number; end: number }
  className?: string
}) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const totalHours = businessHours.end - businessHours.start + 1

  return (
    <div className={`timeline-grid-skeleton ${className}`}>
      {/* Timeline header skeleton */}
      <div className="grid grid-cols-8 gap-2 mb-3">
        <div className="h-8" /> {/* Empty corner */}
        {days.map((day, index) => (
          <div key={index} className="text-center space-y-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse mx-auto w-8" />
            <div className="h-3 bg-gray-100 rounded animate-pulse mx-auto w-6" />
          </div>
        ))}
      </div>

      {/* Grid body skeleton */}
      <div className="relative">
        {Array.from({ length: totalHours }).map((_, hourIndex) => (
          <div key={hourIndex} className="grid grid-cols-8 gap-2 mb-1">
            {/* Time label */}
            <div className="flex items-center justify-end pr-2">
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
            </div>
            
            {/* Day cells */}
            {days.map((day, dayIndex) => (
              <div 
                key={`${hourIndex}-${dayIndex}`} 
                className="h-12 bg-gray-50 rounded border relative overflow-hidden"
              >
                {/* Simulate random schedule blocks */}
                {Math.random() > 0.75 && (
                  <div className="absolute inset-1">
                    <div 
                      className="bg-gray-300 rounded animate-pulse h-full"
                      style={{
                        width: Math.random() > 0.5 ? '100%' : '80%',
                        opacity: 0.6 + Math.random() * 0.4
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for staff schedule blocks
 */
export function StaffScheduleBlockSkeleton({
  className = ''
}: {
  className?: string
}) {
  return (
    <div className={`staff-schedule-block-skeleton ${className}`}>
      <div className="bg-gray-300 rounded-lg p-2 animate-pulse">
        <div className="h-4 bg-gray-400 rounded mb-1" />
        <div className="h-3 bg-gray-400 rounded w-3/4" />
      </div>
    </div>
  )
}

export default ScheduleVisualizationSkeleton