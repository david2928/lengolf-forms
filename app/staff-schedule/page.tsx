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
<<<<<<< HEAD
  const [viewAllStaff, setViewAllStaff] = useState(false)
=======
>>>>>>> a6e5a33 (fix problems)
=======
  const [viewAllStaff, setViewAllStaff] = useState(false)
>>>>>>> e1aca89 (scheduling feature)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize from sessionStorage after mount to avoid hydration issues
  useEffect(() => {
    if (!isInitialized) {
      const savedStaff = sessionStorage.getItem('selectedStaff')
<<<<<<< HEAD
<<<<<<< HEAD
      const savedViewAllStaff = sessionStorage.getItem('viewAllStaff')
      
=======
>>>>>>> a6e5a33 (fix problems)
=======
      const savedViewAllStaff = sessionStorage.getItem('viewAllStaff')
      
>>>>>>> e1aca89 (scheduling feature)
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
<<<<<<< HEAD
=======
>>>>>>> e1aca89 (scheduling feature)
      
      if (savedViewAllStaff === 'true') {
        setViewAllStaff(true)
      }
      
<<<<<<< HEAD
=======
>>>>>>> a6e5a33 (fix problems)
=======
>>>>>>> e1aca89 (scheduling feature)
      setIsInitialized(true)
    }
    
    // Register service worker
    registerServiceWorker()
  }, [isInitialized])

  const handleStaffSelect = (staff: Staff) => {
    setSelectedStaff(staff)
<<<<<<< HEAD
<<<<<<< HEAD
    setViewAllStaff(false)
=======
>>>>>>> a6e5a33 (fix problems)
    sessionStorage.setItem('selectedStaff', JSON.stringify(staff))
    sessionStorage.removeItem('viewAllStaff')
=======
    setViewAllStaff(false)
    sessionStorage.setItem('selectedStaff', JSON.stringify(staff))
    sessionStorage.removeItem('viewAllStaff')
  }

  const handleViewAllStaff = () => {
    setViewAllStaff(true)
    setSelectedStaff(null)
    sessionStorage.setItem('viewAllStaff', 'true')
    sessionStorage.removeItem('selectedStaff')
>>>>>>> e1aca89 (scheduling feature)
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
    sessionStorage.removeItem('viewAllStaff')
    setSelectedStaff(null)
    setViewAllStaff(false)
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
<<<<<<< HEAD
=======
>>>>>>> e1aca89 (scheduling feature)
            {!selectedStaff && !viewAllStaff ? (
              <StaffNameSelector 
                onStaffSelect={handleStaffSelect}
                onViewAllStaff={handleViewAllStaff}
              />
<<<<<<< HEAD
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
=======
            ) : (
              <StaffScheduleView 
                selectedStaff={selectedStaff} 
                viewAllStaff={viewAllStaff}
>>>>>>> e1aca89 (scheduling feature)
                onBackToSelection={handleBackToSelection}
              />
            )}
          </div>
        </div>
      </SessionManager>
    </RouteProtection>
  )
}