'use client'

import { useState, useEffect } from 'react'
import { StaffNameSelector } from '@/components/staff-schedule/StaffNameSelector'
import { StaffScheduleView } from '@/components/staff-schedule/StaffScheduleView'
import { Staff } from '@/types/staff-schedule'
import { registerServiceWorker } from '@/lib/service-worker'
import { RouteProtection } from '@/components/auth/RouteProtection'
import { SessionManager } from '@/components/auth/SessionManager'

export default function StaffSchedulePage() {
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load selected staff from session storage on mount and register service worker
  useEffect(() => {
    const savedStaff = sessionStorage.getItem('selectedStaff')
    if (savedStaff) {
      try {
        setSelectedStaff(JSON.parse(savedStaff))
      } catch (error) {
        console.error('Error parsing saved staff:', error)
        sessionStorage.removeItem('selectedStaff')
      }
    }
    setIsLoading(false)
    
    // Register service worker for offline functionality
    registerServiceWorker()
  }, [])

  const handleStaffSelect = (staff: Staff) => {
    setSelectedStaff(staff)
    // Save to session storage for persistence
    sessionStorage.setItem('selectedStaff', JSON.stringify(staff))
  }

  const handleBackToSelection = () => {
    setSelectedStaff(null)
    sessionStorage.removeItem('selectedStaff')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <RouteProtection requireAdmin={false}>
      <SessionManager>
        <div className="min-h-screen bg-slate-50">
          {!selectedStaff ? (
            <StaffNameSelector onStaffSelect={handleStaffSelect} />
          ) : (
            <StaffScheduleView 
              selectedStaff={selectedStaff} 
              onBackToSelection={handleBackToSelection}
            />
          )}
        </div>
      </SessionManager>
    </RouteProtection>
  )
}