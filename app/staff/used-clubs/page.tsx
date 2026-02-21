import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { ClubUploadForm } from '@/components/staff/used-clubs/ClubUploadForm'

export const metadata: Metadata = {
  title: 'Add Used Club | Staff - LenGolf',
}

export default function StaffUsedClubsPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add Used Club</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Log a second-hand club to the inventory. It will appear on the website once marked as available for sale.
        </p>
      </div>
      <Suspense fallback={<Loader2 className="animate-spin" />}>
        <ClubUploadForm />
      </Suspense>
    </div>
  )
}
