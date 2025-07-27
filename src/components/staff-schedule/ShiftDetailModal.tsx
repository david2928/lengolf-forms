'use client'

import { useState } from 'react'
import { X, Clock, Users, FileText } from 'lucide-react'
import { formatTime, formatDate, calculateDuration } from '@/types/staff-schedule'

interface ShiftDetailModalProps {
  isOpen: boolean
  onClose: () => void
  schedule: {
    schedule_id: string
    schedule_date: string
    start_time: string
    end_time: string
    location: string | null
    notes: string | null
    staff_name?: string
    staff_names?: string[]
    shift_color?: string
  } | null
  className?: string
}

export function ShiftDetailModal({ 
  isOpen, 
  onClose, 
  schedule, 
  className = '' 
}: ShiftDetailModalProps) {
  const [isClosing, setIsClosing] = useState(false)

  if (!isOpen || !schedule) return null

  const {
    schedule_date,
    start_time,
    end_time,
    notes,
    staff_name,
    staff_names,
    shift_color
  } = schedule

  // Calculate shift duration
  const duration = calculateDuration(start_time, end_time)
  
  // Format date for display
  const formattedDate = formatDate(schedule_date)
  
  // Format time range
  const timeRange = `${formatTime(start_time)} - ${formatTime(end_time)}`
  
  // Get team members list
  const teamMembers = staff_names?.length ? staff_names : staff_name ? [staff_name] : []

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 200)
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }



  return (
    <div 
      className={`
        fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50 p-4
        ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}
        ${className}
      `}
      onClick={handleBackdropClick}
    >
      <div 
        className={`
          w-full max-w-md bg-white rounded-t-2xl shadow-xl transform transition-transform duration-200
          ${isClosing ? 'translate-y-full' : 'translate-y-0'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Shift Details
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Date and Time */}
          <div className="space-y-2">
            <h3 className="font-medium text-slate-900">{formattedDate}</h3>
            <div className="flex items-center space-x-2 text-slate-600">
              <Clock className="h-4 w-4" />
              <span>{timeRange}</span>
              <span className="text-slate-400">•</span>
              <span>{duration} hour{duration !== 1 ? 's' : ''}</span>
            </div>
          </div>


          {/* Team Members */}
          {teamMembers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-slate-600">
                <Users className="h-4 w-4" />
                <span className="font-medium">Team Members:</span>
              </div>
              <div className="space-y-2 ml-6">
                {teamMembers.map((memberName, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">
                        {memberName?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <span className="text-slate-700">{memberName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {notes && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-slate-600">
                <FileText className="h-4 w-4" />
                <span className="font-medium">Notes:</span>
              </div>
              <div className="ml-6 p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-700 text-sm leading-relaxed">
                  {notes}
                </p>
              </div>
            </div>
          )}

          {/* Shift Color Indicator */}
          {shift_color && (
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded-full border border-slate-200"
                style={{ backgroundColor: shift_color }}
              />
              <span className="text-sm text-slate-500">
                {shift_color === '#06B6D4' ? 'Morning Shift' :
                 shift_color === '#F59E0B' ? 'Afternoon Shift' :
                 shift_color === '#EC4899' ? 'Evening Shift' : 'Shift'}
              </span>
            </div>
          )}
        </div>


      </div>


    </div>
  )
}

