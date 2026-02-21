import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { StaffUsedClubsContent } from '@/components/staff/used-clubs/StaffUsedClubsContent'

export const metadata: Metadata = {
  title: 'Used Clubs | Staff - LenGolf',
}

export default function StaffUsedClubsPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Used Club Inventory</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse inventory, add new clubs, or edit existing entries.
        </p>
      </div>
      <Suspense fallback={<Loader2 className="animate-spin" />}>
        <StaffUsedClubsContent />
      </Suspense>
    </div>
  )
}
