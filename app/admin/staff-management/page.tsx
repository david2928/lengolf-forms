import { Metadata } from 'next'
import { Suspense } from 'react'
import { StaffManagementDashboard } from '@/components/admin/staff-management/staff-management-dashboard'
import { StaffManagementErrorBoundary } from '@/components/admin/staff-management/staff-management-error-boundary'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Staff Management | Admin - LenGolf',
  description: 'Manage staff members, PINs, and time clock access',
}

export default function AdminStaffManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">
            Manage staff members, PINs, and time clock access
          </p>
        </div>
      </div>

      <StaffManagementErrorBoundary>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-muted-foreground">Loading staff management...</p>
              </div>
            </div>
          }
        >
          <StaffManagementDashboard />
        </Suspense>
      </StaffManagementErrorBoundary>
    </div>
  )
} 