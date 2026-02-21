import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { UsedClubsManager } from '@/components/admin/used-clubs/UsedClubsManager'

export const metadata: Metadata = {
  title: 'Used Clubs | Admin - LenGolf',
}

export default function AdminUsedClubsPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Used Clubs Inventory</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage second-hand club listings, set costs, and organise sets.
        </p>
      </div>
      <Suspense fallback={<div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading…</div>}>
        <UsedClubsManager />
      </Suspense>
    </div>
  )
}
