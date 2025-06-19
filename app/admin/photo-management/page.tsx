import { Metadata } from 'next'
import { Suspense } from 'react'
import { PhotoManagementDashboard } from '@/components/admin/photo-management/photo-management-dashboard'
import { PhotoManagementErrorBoundary } from '@/components/admin/photo-management/photo-management-error-boundary'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Photo Management | Admin - LenGolf',
  description: 'Manage time clock photos, storage optimization, and automated cleanup',
}

export default function AdminPhotoManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Photo Management</h1>
          <p className="text-muted-foreground">
            Manage time clock photos, view storage statistics, and configure cleanup settings
          </p>
        </div>
      </div>

      <PhotoManagementErrorBoundary>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-muted-foreground">Loading photo management...</p>
              </div>
            </div>
          }
        >
          <PhotoManagementDashboard />
        </Suspense>
      </PhotoManagementErrorBoundary>
    </div>
  )
} 