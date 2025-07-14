import { Metadata } from 'next'
import { Suspense } from 'react'
import { StaffManagementDashboard } from '@/components/admin/staff-management/staff-management-dashboard'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Staff Management | Admin - LenGolf',
  description: 'Comprehensive staff management: user accounts, permissions, and time tracking administration',
}

export default function AdminStaffManagementPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">
            Manage staff accounts, permissions, time tracking, and administrative settings
          </p>
        </div>
      </div>

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
    </div>
  )
}