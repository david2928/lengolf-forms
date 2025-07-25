'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ArrowLeft, Users, Camera, Calculator } from 'lucide-react'

// Import existing dashboard components
import { TimeClockDashboard } from '@/components/time-clock/time-clock-dashboard'
import { StaffManagementDashboard } from '@/components/admin/staff-management/staff-management-dashboard'
import { PhotoManagementDashboard } from '@/components/admin/photo-management/photo-management-dashboard'
import { PayrollDashboard } from '@/components/admin/payroll/payroll-dashboard'

export function TimeClockAdminDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = searchParams?.get('view')

  const [staffModalOpen, setStaffModalOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Handle URL-based view switching
  useEffect(() => {
    if (view === 'photos') {
      // Photo management is handled by URL routing
    } else if (view === 'payroll') {
      // Payroll management is handled by URL routing
    } else if (view === 'staff') {
      setStaffModalOpen(true)
    }
  }, [view])

  // Handle modal close and URL cleanup
  const handleStaffModalClose = () => {
    setStaffModalOpen(false)
    if (view === 'staff') {
      router.push('/admin/time-clock')
    }
  }

  // Navigate to photo management full page
  const handlePhotoManagement = () => {
    router.push('/admin/time-clock?view=photos')
  }

  // Navigate to payroll management full page
  const handlePayrollManagement = () => {
    router.push('/admin/time-clock?view=payroll')
  }

  // Navigate back from photo management or payroll
  const handleBackToReports = () => {
    router.push('/admin/time-clock')
  }

  // Trigger refresh of time reports when staff changes are made
  const handleStaffChange = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  // Render photo management full page
  if (view === 'photos') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToReports}
            className="flex items-center gap-2 w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Photo Management</h1>
            <p className="text-muted-foreground">
              Manage time clock photos, view storage statistics, and configure cleanup settings
            </p>
          </div>
        </div>
        <PhotoManagementDashboard />
      </div>
    )
  }

  // Render payroll management full page
  if (view === 'payroll') {
    return (
      <div className="space-y-4 md:space-y-6">
        {/* Mobile-optimized header */}
        <div className="flex flex-col gap-3 md:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToReports}
            className="flex items-center gap-2 w-fit text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Reports</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="px-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Run Payroll</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Review time entries, calculate compensation, and process monthly payroll
            </p>
          </div>
        </div>
        {/* Mobile-optimized payroll dashboard */}
        <div className="-mx-1 md:mx-0">
          <PayrollDashboard />
        </div>
      </div>
    )
  }

  // Main dashboard with time reports and action buttons
  return (
    <ErrorBoundary showTechnicalDetails={process.env.NODE_ENV === 'development'}>
      <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Clock Administration</h1>
          <p className="text-muted-foreground">
            Comprehensive staff time tracking reports, analytics, and management tools
          </p>
        </div>
        
        {/* Action buttons - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStaffModalOpen(true)}
            className="flex items-center justify-center gap-2 text-xs sm:text-sm px-3 py-2"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Staff Management</span>
            <span className="sm:hidden">Staff</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePhotoManagement}
            className="flex items-center justify-center gap-2 text-xs sm:text-sm px-3 py-2"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Photo Management</span>
            <span className="sm:hidden">Photos</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handlePayrollManagement}
            className="flex items-center justify-center gap-2 text-xs sm:text-sm px-3 py-2"
          >
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Run Payroll</span>
            <span className="sm:hidden">Payroll</span>
          </Button>
        </div>
      </div>

      {/* Main content - Time Clock Dashboard */}
      <TimeClockDashboard key={refreshTrigger} />

      {/* Staff Management Modal */}
      <Dialog open={staffModalOpen} onOpenChange={handleStaffModalClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Management
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <StaffManagementDashboard />
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </ErrorBoundary>
  )
} 