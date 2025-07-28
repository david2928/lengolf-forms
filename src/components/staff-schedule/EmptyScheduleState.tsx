'use client'

import { Calendar, Coffee } from 'lucide-react'

interface EmptyScheduleStateProps {
  selectedDate: Date
  staffName?: string
  viewMode: 'personal' | 'team'
  className?: string
  onRefresh?: () => void
  isLoading?: boolean
}

export function EmptyScheduleState({ 
  selectedDate, 
  staffName, 
  viewMode,
  className = '',
  onRefresh,
  isLoading = false
}: EmptyScheduleStateProps) {
  const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' })
  const isToday = selectedDate.toDateString() === new Date().toDateString()
  const isTomorrow = selectedDate.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString()

  const getDateDescription = () => {
    if (isToday) return 'today'
    if (isTomorrow) return 'tomorrow'
    return `on ${dayName}`
  }

  const getEmptyMessage = () => {
    if (viewMode === 'personal') {
      return {
        title: `No shifts scheduled`,
        subtitle: `for ${getDateDescription()}`,
        encouragement: staffName ? `Enjoy your day off, ${staffName.split(' ')[0]}! 😊` : 'Enjoy your day off! 😊'
      }
    } else {
      return {
        title: `No team shifts scheduled`,
        subtitle: `for ${getDateDescription()}`,
        encouragement: 'The team has a quiet day! 🌟'
      }
    }
  }

  const message = getEmptyMessage()

  return (
    <div className={`flex flex-col items-center justify-center py-12 sm:py-16 px-6 min-h-[300px] ${className}`}>
      {/* Icon */}
      <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-6 shadow-sm">
        {isToday ? (
          <Coffee className="h-8 w-8 text-slate-500" />
        ) : (
          <Calendar className="h-8 w-8 text-slate-500" />
        )}
      </div>

      {/* Message */}
      <div className="text-center max-w-sm">
        <h3 className="text-responsive-lg font-semibold text-slate-900 mb-2">
          {message.title}
        </h3>
        <p className="text-slate-600 mb-4 text-responsive-sm">
          {message.subtitle}
        </p>
        <p className="text-sm text-slate-500 leading-relaxed">
          {message.encouragement}
        </p>
      </div>

      {/* Refresh button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-target tap-highlight no-select"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      )}

      {/* Decorative element */}
      <div className="mt-8 flex space-x-2">
        <div className="w-2 h-2 bg-slate-200 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-slate-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-slate-200 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  )
}