'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getWeekStart, getWeekDateRange, getDayAbbreviation } from '@/types/staff-schedule'

interface DateIndicator {
  date: string
  hasShifts: boolean
  shiftCount: number
  indicatorType: 'single' | 'multiple'
}

interface HorizontalDatePickerProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  indicators?: DateIndicator[]
  className?: string
}

export function HorizontalDatePicker({
  selectedDate,
  onDateSelect,
  indicators = [],
  className = ''
}: HorizontalDatePickerProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getWeekStart(selectedDate))
  const [isAnimating, setIsAnimating] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  // Get the current week's dates
  const weekDates = getWeekDateRange(currentWeekStart)

  // Update week when selected date changes (from external source)
  useEffect(() => {
    const selectedWeekStart = getWeekStart(selectedDate)
    if (selectedWeekStart.getTime() !== currentWeekStart.getTime()) {
      setCurrentWeekStart(selectedWeekStart)
    }
  }, [selectedDate]) // Remove currentWeekStart from dependencies to avoid infinite loop

  // Navigate to previous week
  const goToPreviousWeek = () => {
    if (isAnimating) return
    setIsAnimating(true)
    const newWeekStart = new Date(currentWeekStart)
    newWeekStart.setDate(currentWeekStart.getDate() - 7)
    setCurrentWeekStart(newWeekStart)
    setTimeout(() => setIsAnimating(false), 300)
  }

  // Navigate to next week
  const goToNextWeek = () => {
    if (isAnimating) return
    setIsAnimating(true)
    const newWeekStart = new Date(currentWeekStart)
    newWeekStart.setDate(currentWeekStart.getDate() + 7)
    setCurrentWeekStart(newWeekStart)
    setTimeout(() => setIsAnimating(false), 300)
  }

  // Handle date selection
  const handleDateSelect = (dateString: string) => {
    // Parse date string as YYYY-MM-DD and create date in local timezone
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day) // month is 0-based
    onDateSelect(date)
  }

  // Touch event handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return

    const distance = touchStartX.current - touchEndX.current
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      goToNextWeek()
    } else if (isRightSwipe) {
      goToPreviousWeek()
    }

    touchStartX.current = 0
    touchEndX.current = 0
  }

  // Get indicator for a specific date
  const getIndicatorForDate = (dateString: string) => {
    return indicators.find(indicator => indicator.date === dateString)
  }

  // Check if date is today
  const isToday = (dateString: string) => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayString = `${year}-${month}-${day}`
    return dateString === todayString
  }

  // Check if date is selected
  const isSelected = (dateString: string) => {
    const year = selectedDate.getFullYear()
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const day = String(selectedDate.getDate()).padStart(2, '0')
    const selectedDateString = `${year}-${month}-${day}`
    return dateString === selectedDateString
  }

  return (
    <div className={`bg-white border-b border-slate-200 ${className}`}>
      {/* Week Navigation Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            goToPreviousWeek()
          }}
          disabled={isAnimating}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Previous week"
          type="button"
        >
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>

        <div className="text-sm font-medium text-slate-700 text-center px-2">
          {currentWeekStart.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })} - {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            goToNextWeek()
          }}
          disabled={isAnimating}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Next week"
          type="button"
        >
          <ChevronRight className="h-5 w-5 text-slate-600" />
        </button>
      </div>

      {/* Date Picker */}
      <div
        ref={scrollContainerRef}
        className="flex items-center justify-between px-4 py-3 overflow-x-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {weekDates.map((dateString, index) => {
          // Parse date string safely to avoid timezone issues
          const [year, month, day] = dateString.split('-').map(Number)
          const date = new Date(year, month - 1, day)
          const dayAbbr = getDayAbbreviation(dateString)
          const dayNumber = date.getDate()
          const indicator = getIndicatorForDate(dateString)
          const isTodayDate = isToday(dateString)
          const isSelectedDate = isSelected(dateString)

          return (
            <button
              key={dateString}
              onClick={() => handleDateSelect(dateString)}
              className={`
                flex flex-col items-center justify-center min-w-[44px] h-16 px-2 rounded-lg transition-all duration-200
                ${isSelectedDate
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : isTodayDate
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'hover:bg-slate-50 text-slate-700'
                }
                ${isAnimating ? 'pointer-events-none' : ''}
              `}
              aria-label={`Select ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
            >
              {/* Day abbreviation */}
              <span className={`
                text-xs font-medium uppercase tracking-wide mb-1
                ${isSelectedDate ? 'text-white' : 'text-slate-500'}
              `}>
                {dayAbbr}
              </span>

              {/* Day number */}
              <span className={`
                text-lg font-bold
                ${isSelectedDate ? 'text-white' : isTodayDate ? 'text-blue-600' : 'text-slate-900'}
              `}>
                {dayNumber}
              </span>

              {/* Shift indicator */}
              <div className="flex items-center justify-center h-2 mt-1">
                {indicator?.hasShifts && (
                  <div className={`
                    rounded-full
                    ${indicator.indicatorType === 'multiple'
                      ? 'w-2 h-2'
                      : 'w-1.5 h-1.5'
                    }
                    ${isSelectedDate
                      ? 'bg-white'
                      : isTodayDate
                        ? 'bg-blue-600'
                        : 'bg-slate-400'
                    }
                  `} />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}