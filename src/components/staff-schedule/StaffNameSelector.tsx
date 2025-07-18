'use client'

import { useState, useEffect } from 'react'
import { Search, Settings, Users } from 'lucide-react'
import { useStaffSchedule } from '@/hooks/useStaffSchedule'
import { Staff } from '@/types/staff-schedule'

interface StaffNameSelectorProps {
  onStaffSelect: (staff: Staff) => void
}

export function StaffNameSelector({ onStaffSelect }: StaffNameSelectorProps) {
  const { staff, staffLoading: isLoading, staffError: error, fetchStaff } = useStaffSchedule()
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())

  // Load previously selected staff from session storage
  useEffect(() => {
    const savedStaff = sessionStorage.getItem('selected-staff')
    if (savedStaff) {
      try {
        const parsedStaff = JSON.parse(savedStaff)
        // Auto-select if staff still exists in current list
        const existingStaff = staff.find(s => s.id === parsedStaff.id)
        if (existingStaff) {
          setTimeout(() => onStaffSelect(existingStaff), 100)
        }
      } catch (error) {
        console.warn('Error parsing saved staff:', error)
        sessionStorage.removeItem('selected-staff')
      }
    }
  }, [staff, onStaffSelect])

  const handleStaffClick = (selectedStaff: Staff) => {
    // Store selected staff in session storage for persistence
    try {
      sessionStorage.setItem('selected-staff', JSON.stringify(selectedStaff))
    } catch (error) {
      console.warn('Error saving staff selection:', error)
    }
    onStaffSelect(selectedStaff)
  }

  const handleImageError = (staffId: number) => {
    setImageErrors(prev => new Set(prev).add(staffId))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 safe-area-top safe-area-bottom">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 safe-area-left safe-area-right">
          <div className="flex items-center justify-between">
            <h1 className="text-responsive-lg font-semibold text-slate-900">Staff Schedule</h1>
            <div className="flex items-center space-x-1 sm:space-x-3">
              <button 
                className="touch-target p-2 hover:bg-slate-100 rounded-lg transition-colors tap-highlight no-select"
                aria-label="Search staff"
              >
                <Search className="h-5 w-5 text-slate-400" />
              </button>
              <button 
                className="touch-target p-2 hover:bg-slate-100 rounded-lg transition-colors tap-highlight no-select"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="flex flex-col items-center justify-center px-6 py-16 mobile-padding">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Loading staff...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 safe-area-top safe-area-bottom">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 safe-area-left safe-area-right">
          <div className="flex items-center justify-between">
            <h1 className="text-responsive-lg font-semibold text-slate-900">Staff Schedule</h1>
            <div className="flex items-center space-x-1 sm:space-x-3">
              <button 
                className="touch-target p-2 hover:bg-slate-100 rounded-lg transition-colors tap-highlight no-select"
                aria-label="Search staff"
              >
                <Search className="h-5 w-5 text-slate-400" />
              </button>
              <button 
                className="touch-target p-2 hover:bg-slate-100 rounded-lg transition-colors tap-highlight no-select"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="flex flex-col items-center justify-center px-6 py-16 mobile-padding">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">
              {typeof error === 'string' ? error : error?.message || 'An error occurred'}
            </p>
          </div>
          <button
            onClick={fetchStaff}
            className="btn-mobile bg-blue-600 text-white hover:bg-blue-700 transition-colors touch-target"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 safe-area-left safe-area-right">
        <div className="flex items-center justify-between">
          <h1 className="text-responsive-lg font-semibold text-slate-900">Staff Schedule</h1>
          <div className="flex items-center space-x-1 sm:space-x-3">
            <button 
              className="touch-target p-2 hover:bg-slate-100 rounded-lg transition-colors tap-highlight no-select"
              aria-label="Search staff"
            >
              <Search className="h-5 w-5 text-slate-400" />
            </button>
            <button 
              className="touch-target p-2 hover:bg-slate-100 rounded-lg transition-colors tap-highlight no-select"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Staff Selection Content */}
      <div className="flex flex-col items-center px-6 py-8 mobile-padding safe-area-left safe-area-right">
        {/* Icon */}
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-responsive-lg font-semibold text-slate-900 mb-2 text-center">Select Your Name</h2>
        <p className="text-responsive-sm text-slate-600 text-center mb-8">Choose your name to view your schedule</p>

        {/* Staff List */}
        <div className="w-full max-w-sm mobile-card-spacing">
          {staff.map((member) => (
            <button
              key={member.id}
              onClick={() => handleStaffClick(member)}
              className="w-full bg-white border border-slate-200 rounded-lg p-4 flex items-center space-x-4 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 active:scale-95 touch-target tap-highlight no-select"
              aria-label={`Select ${member.name}`}
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                {member.profile_photo && !imageErrors.has(member.id) ? (
                  <img
                    src={member.profile_photo}
                    alt={`${member.name} profile`}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(member.id)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {member.initials}
                    </span>
                  </div>
                )}
              </div>

              {/* Staff Info */}
              <div className="flex-1 text-left min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{member.name}</h3>
                <p className="text-sm text-slate-500 truncate">
                  {member.position} • {member.department}
                </p>
              </div>

              {/* Arrow */}
              <div className="text-slate-400 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            {staff.length} staff member{staff.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>
    </div>
  )
}