'use client'

import { useState } from 'react'
import { Users, MapPin, Clock } from 'lucide-react'
import { formatTime, getDayAbbreviation, getShiftColor, calculateDuration } from '@/types/staff-schedule'

interface ScheduleCardProps {
  schedule: {
    schedule_id: string
    schedule_date: string
    start_time: string
    end_time: string
    location: string | null
    notes: string | null
    staff_name?: string
    staff_names?: string[]
    staff_photos?: string[]
    shift_color?: string
  }
  viewMode: 'personal' | 'team'
  onCardTap?: (scheduleId: string) => void
  className?: string
}

export function ScheduleCard({ 
  schedule, 
  viewMode, 
  onCardTap,
  className = '' 
}: ScheduleCardProps) {
  const {
    schedule_id,
    schedule_date,
    start_time,
    end_time,
    location,
    staff_name,
    staff_names,
    staff_photos,
    shift_color
  } = schedule

  // Get color based on start time if not provided
  const cardColor = shift_color || getShiftColor(start_time)
  
  // Format date info
  const dayAbbr = getDayAbbreviation(schedule_date)
  const dayNumber = new Date(schedule_date + 'T00:00:00').getDate()
  
  // Format time range
  const timeRange = `${formatTime(start_time)} - ${formatTime(end_time)}`
  
  // Calculate shift duration
  const duration = calculateDuration(start_time, end_time)
  const durationText = duration === 1 ? '1 hour' : `${duration} hours`
  
  // Handle card click
  const handleClick = () => {
    if (onCardTap) {
      onCardTap(schedule_id)
    }
  }

  // Determine staff display
  const staffDisplay = viewMode === 'team' 
    ? (staff_names?.length ? staff_names : [staff_name]).filter(Boolean)
    : null

  // Get staff photos if available
  const staffPhotos = staff_photos || []

  // Create staff avatar component with better error handling
  const StaffAvatar = ({ name, photo, index }: { name: string; photo?: string; index: number }) => {
    const [imageError, setImageError] = useState(false)
    const initials = name?.split(' ').map(n => n.charAt(0)).join('').toUpperCase() || '?'
    
    const handleImageError = () => {
      setImageError(true)
    }
    
    if (photo && !imageError) {
      return (
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm">
          <img 
            src={photo} 
            alt={name}
            className="w-full h-full object-cover"
            onError={handleImageError}
            loading="lazy"
          />
        </div>
      )
    }
    
    return (
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
        style={{
          background: `linear-gradient(to bottom right, hsl(${210 + index * 25}, 70%, 55%), hsl(${210 + index * 25}, 70%, 45%))`
        }}
        title={name}
      >
        <span className="text-white text-xs font-semibold">{initials}</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`
        w-full bg-white rounded-xl border border-slate-200 p-4 text-left transition-all duration-200
        hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 
        active:scale-[0.98] active:shadow-md
        touch-target tap-highlight no-select
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: cardColor
      }}
      aria-label={`View details for ${timeRange} shift${viewMode === 'team' && staffDisplay?.length ? ` with ${staffDisplay.join(', ')}` : ''}`}
    >
      <div className="flex items-start justify-between">
        {/* Left side - Date and time info */}
        <div className="flex items-start space-x-3 flex-1">
          {/* Date badge */}
          <div className="flex flex-col items-center justify-center min-w-[44px] bg-slate-50 rounded-lg p-2">
            <span className="text-lg font-bold text-slate-900 leading-none">
              {dayNumber}
            </span>
            <span className="text-xs font-medium text-slate-500 uppercase leading-none mt-0.5">
              {dayAbbr}
            </span>
          </div>

          {/* Schedule details */}
          <div className="flex-1 min-w-0">
            {/* Time and duration */}
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                <h3 className="font-semibold text-slate-900 text-responsive-sm">
                  {timeRange}
                </h3>
                <span className="text-xs text-slate-500 sm:text-sm">
                  ({durationText})
                </span>
              </div>
            </div>
            
            {/* Location */}
            {location && (
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <p className="text-sm text-slate-600 truncate">
                  {location}
                </p>
              </div>
            )}

            {/* Staff names for team view */}
            {viewMode === 'team' && staffDisplay && staffDisplay.length > 0 && (
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-600 truncate">
                  {staffDisplay.length === 1 
                    ? staffDisplay[0]
                    : `${staffDisplay.length} staff members`
                  }
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Staff avatars for team view */}
        {viewMode === 'team' && staffDisplay && staffDisplay.length > 0 && (
          <div className="flex items-center ml-3">
            <div className="flex -space-x-2">
              {staffDisplay.slice(0, 3).map((name, index) => name ? (
                <StaffAvatar
                  key={`${name}-${index}`}
                  name={name}
                  photo={staffPhotos[index]}
                  index={index}
                />
              ) : null)}
              {staffDisplay.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center">
                  <span className="text-slate-600 text-xs font-semibold">
                    +{staffDisplay.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right side - Duration indicator for personal view */}
        {viewMode === 'personal' && (
          <div className="flex items-center ml-3">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: cardColor }}
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    </button>
  )
}