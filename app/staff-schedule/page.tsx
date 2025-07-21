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
<<<<<<< HEAD
  const [viewAllStaff, setViewAllStaff] = useState(false)
=======
>>>>>>> a6e5a33 (fix problems)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize from sessionStorage after mount to avoid hydration issues
  useEffect(() => {
    if (!isInitialized) {
      const savedStaff = sessionStorage.getItem('selectedStaff')
<<<<<<< HEAD
      const savedViewAllStaff = sessionStorage.getItem('viewAllStaff')
      
=======
>>>>>>> a6e5a33 (fix problems)
      if (savedStaff) {
        try {
          const parsed = JSON.parse(savedStaff)
          setSelectedStaff(parsed)
        } catch (error) {
          console.error('Error parsing saved staff:', error)
          sessionStorage.removeItem('selectedStaff')
        }
      }
<<<<<<< HEAD
      
      if (savedViewAllStaff === 'true') {
        setViewAllStaff(true)
      }
      
=======
>>>>>>> a6e5a33 (fix problems)
      setIsInitialized(true)
    }
    
    // Register service worker
    registerServiceWorker()
  }, [isInitialized])

  const handleStaffSelect = (staff: Staff) => {
    setSelectedStaff(staff)
<<<<<<< HEAD
    setViewAllStaff(false)
=======
>>>>>>> a6e5a33 (fix problems)
    sessionStorage.setItem('selectedStaff', JSON.stringify(staff))
    sessionStorage.removeItem('viewAllStaff')
  }

<<<<<<< HEAD
  const handleViewAllStaff = () => {
    setViewAllStaff(true)
    setSelectedStaff(null)
    sessionStorage.setItem('viewAllStaff', 'true')
=======
  const handleBackToSelection = () => {
>>>>>>> a6e5a33 (fix problems)
    sessionStorage.removeItem('selectedStaff')
    setSelectedStaff(null)
  }

<<<<<<< HEAD
  const handleBackToSelection = () => {
    sessionStorage.removeItem('selectedStaff')
    sessionStorage.removeItem('viewAllStaff')
    setSelectedStaff(null)
    setViewAllStaff(false)
  }

=======
>>>>>>> a6e5a33 (fix problems)

  // Show loading state while initializing
  if (!isInitialized) {
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
          <div className="container mx-auto px-4 py-8">
<<<<<<< HEAD
            {!selectedStaff && !viewAllStaff ? (
              <StaffNameSelector 
                onStaffSelect={handleStaffSelect}
                onViewAllStaff={handleViewAllStaff}
              />
            ) : (
              <StaffScheduleView 
                selectedStaff={selectedStaff} 
                viewAllStaff={viewAllStaff}
=======
            {!selectedStaff ? (
              <StaffNameSelector onStaffSelect={handleStaffSelect} />
            ) : (
              <StaffScheduleView 
                selectedStaff={selectedStaff} 
>>>>>>> a6e5a33 (fix problems)
                onBackToSelection={handleBackToSelection}
              />
            )}
          </div>
        </div>
      </SessionManager>
    </RouteProtection>
  )
}