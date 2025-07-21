'use client'

import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
<<<<<<< HEAD
import { useStaff } from '@/hooks/useStaffScheduleSWR'
=======
import { useStaffSchedule } from '@/hooks/useStaffSchedule'
>>>>>>> a6e5a33 (fix problems)
import { Staff } from '@/types/staff-schedule'
import { StaffProfileImage } from '@/components/common/OptimizedImage'
import { performanceMonitor } from '@/lib/performance-monitor'

interface StaffNameSelectorProps {
  onStaffSelect: (staff: Staff) => void
  onViewAllStaff: () => void
}

export function StaffNameSelector({ onStaffSelect, onViewAllStaff }: StaffNameSelectorProps) {
  const { staff, staffLoading: isLoading, staffError: error, refreshStaff } = useStaff()

  // Clean up any old session data on mount
  useEffect(() => {
    // Use the correct key and don't auto-select
    const savedStaff = sessionStorage.getItem('selectedStaff')
    if (savedStaff) {
      console.log('Found old staff selection, clearing it')
      sessionStorage.removeItem('selectedStaff')
    }
  }, [])

  const handleStaffClick = (selectedStaff: Staff) => {
<<<<<<< HEAD
    // Measure staff selection performance
    performanceMonitor.measure('staff.selection', () => {
      // Store selected staff in session storage for persistence
      try {
        sessionStorage.setItem('selectedStaff', JSON.stringify(selectedStaff))
      } catch (error) {
        console.warn('Error saving staff selection:', error)
      }
      onStaffSelect(selectedStaff)
    }, { staffId: selectedStaff.id, staffName: selectedStaff.name })
=======
    // Store selected staff in session storage for persistence
    try {
      sessionStorage.setItem('selectedStaff', JSON.stringify(selectedStaff))
    } catch (error) {
      console.warn('Error saving staff selection:', error)
    }
    onStaffSelect(selectedStaff)
  }

  const handleImageError = (staffId: number) => {
    setImageErrors(prev => new Set(prev).add(staffId))
>>>>>>> a6e5a33 (fix problems)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-900">Staff Schedule</h1>
          </div>
        </div>

        {/* Loading Content */}
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Loading staff...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-900">Staff Schedule</h1>
          </div>
        </div>

        {/* Error Content */}
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 max-w-md">
            <p className="text-red-800 text-sm">
              {typeof error === 'string' ? error : error?.message || 'An error occurred'}
            </p>
          </div>
          <button
<<<<<<< HEAD
            onClick={() => refreshStaff()}
=======
            onClick={fetchStaff}
>>>>>>> a6e5a33 (fix problems)
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Staff Schedule</h1>
        </div>
      </div>

      {/* Staff Selection Content */}
      <div className="flex flex-col items-center px-6 py-8">
          {/* Icon */}
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-lg md:text-xl font-semibold text-slate-900 mb-2 text-center">Select Your Name</h2>
          <p className="text-sm md:text-base text-slate-600 text-center mb-8">Choose your name to view your schedule</p>

<<<<<<< HEAD
          {/* View All Staff Button */}
          <div className="w-full max-w-md mb-6">
            <button
              onClick={onViewAllStaff}
              className="w-full bg-blue-600 text-white rounded-lg p-4 flex items-center justify-center gap-3 hover:bg-blue-700 transition-all duration-200 active:scale-[0.98] shadow-sm"
              aria-label="View all staff schedules"
            >
              <Users className="h-5 w-5" />
              <span className="font-semibold">View All Staff Schedules</span>
            </button>
          </div>

          {/* Divider */}
          <div className="w-full max-w-md mb-6 flex items-center">
            <div className="flex-1 border-t border-slate-200"></div>
            <span className="px-4 text-sm text-slate-500">or select individual staff</span>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>

          {/* Staff List */}
          <div className="w-full max-w-md space-y-3">
            {staff.map((member) => (
              <button
                key={member.id}
                onClick={() => handleStaffClick(member)}
                className="w-full bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 active:scale-[0.98]"
                aria-label={`Select ${member.name}`}
              >
                {/* Avatar */}
                <StaffProfileImage
                  src={member.profile_photo}
                  staffName={member.name}
                  size="md"
                  className="flex-shrink-0"
                  priority={true}
                />

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

=======
          {/* Staff List */}
          <div className="w-full max-w-md space-y-3">
            {staff.map((member) => (
              <button
                key={member.id}
                onClick={() => handleStaffClick(member)}
                className="w-full bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 active:scale-[0.98]"
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

>>>>>>> a6e5a33 (fix problems)
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