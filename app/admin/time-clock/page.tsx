import { Metadata } from 'next'
import { Suspense } from 'react'
import { TimeClockAdminDashboard } from '@/components/admin/time-clock/time-clock-admin-dashboard'
import { TimeClockErrorBoundary } from '@/components/admin/time-clock/time-clock-error-boundary'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Time Clock Administration | Admin - LenGolf',
  description: 'Comprehensive time clock management: reports, staff administration, and photo management',
}

export default function AdminTimeClockPage() {
  return (
    <div className="space-y-6">
      <TimeClockErrorBoundary>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-muted-foreground">Loading time clock administration...</p>
              </div>
            </div>
          }
        >
          <TimeClockAdminDashboard />
        </Suspense>
      </TimeClockErrorBoundary>
    </div>
  )
} 