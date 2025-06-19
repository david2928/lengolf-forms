import { Metadata } from 'next'
import { Suspense } from 'react'
import { TimeReportsDashboard } from '@/components/admin/time-reports/time-reports-dashboard'
import { TimeReportsErrorBoundary } from '@/components/admin/time-reports/time-reports-error-boundary'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Time Reports | Admin - LenGolf',
  description: 'Comprehensive time tracking reports and analytics for staff management',
}

export default function AdminTimeReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive staff time tracking reports, analytics, and export tools
          </p>
        </div>
      </div>

      <TimeReportsErrorBoundary>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-muted-foreground">Loading time reports...</p>
              </div>
            </div>
          }
        >
          <TimeReportsDashboard />
        </Suspense>
      </TimeReportsErrorBoundary>
    </div>
  )
} 