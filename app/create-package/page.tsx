import { Metadata } from 'next'
import PackageForm from '@/components/package-form'

export const metadata: Metadata = {
  title: 'Create Package | LENGOLF',
  description: 'Create new package for customers',
}

export default function CreatePackagePage() {
  return (
    <div className="container py-6 md:py-10">
      <div className="flex flex-col gap-4 items-center mb-8">
        <h1 className="text-2xl font-bold">Create Package</h1>
        <p className="text-muted-foreground">
          Create new package for customers
        </p>
      </div>
      <PackageForm />
    </div>
  )
}