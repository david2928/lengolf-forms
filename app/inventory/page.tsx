import { Metadata } from 'next'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Dynamic import for client component
const InventoryForm = dynamic(() => import('@/components/inventory'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  ),
  ssr: false
})

export const metadata: Metadata = {
  title: 'Inventory Management | LenGolf',
  description: 'Submit daily inventory reports for LenGolf',
}

export default function InventoryPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground mt-2">
            Submit your daily inventory report
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }
        >
          <InventoryForm />
        </Suspense>
      </div>
    </div>
  )
} 