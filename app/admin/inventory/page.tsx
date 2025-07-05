import { Metadata } from 'next'
import { Suspense } from 'react'
import { InventoryDashboard } from '@/components/admin/inventory/inventory-dashboard'
import { InventoryErrorBoundary } from '@/components/admin/inventory/inventory-error-boundary'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Inventory Dashboard | Admin - LenGolf',
  description: 'Manage inventory, view stock levels, and track reorder needs',
}

export default function AdminInventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor stock levels, manage reorders, and track inventory value
          </p>
        </div>
      </div>

      <InventoryErrorBoundary>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-muted-foreground">Loading inventory dashboard...</p>
              </div>
            </div>
          }
        >
          <InventoryDashboard />
        </Suspense>
      </InventoryErrorBoundary>
    </div>
  )
} 