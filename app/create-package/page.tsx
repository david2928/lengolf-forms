import { Metadata } from 'next'
import dynamic from 'next/dynamic'

const PackageForm = dynamic(() => import('@/components/package-form'), {
  ssr: false,
})

export const metadata: Metadata = {
  title: 'Create Package | LENGOLF',
  description: 'Create new package for customers',
}

// Using a client component to force re-fetching of data on each visit
export default function CreatePackagePage() {
  return (
    <div className="container py-6 md:py-10">
      <div className="flex flex-col gap-4 items-center mb-8">
        <h1 className="text-2xl font-bold">Create Package</h1>
        <p className="text-muted-foreground">
          Create new package for customers
        </p>
      </div>
      <PackageForm key={new Date().getTime()} />
    </div>
  )
}