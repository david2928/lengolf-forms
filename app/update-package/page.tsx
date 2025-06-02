import { Metadata } from 'next'
import { UsageForm } from '@/components/package-usage/usage-form'

export const metadata: Metadata = {
  title: 'Record Package Usage | LENGOLF',
  description: 'Record usage for activated packages',
}

export default function UpdatePackagePage() {
  return (
    <div className="container py-6 md:py-10">
      <div className="flex flex-col gap-4 items-center mb-8">
        <h1 className="text-2xl font-bold">Record Package Usage</h1>
        <p className="text-muted-foreground">
          Record usage for activated packages (packages must be activated first)
        </p>
      </div>
      <UsageForm />
    </div>
  )
}