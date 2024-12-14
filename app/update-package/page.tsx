import { Metadata } from 'next'
import { UsageForm } from '@/components/package-usage/usage-form'

export const metadata: Metadata = {
  title: 'Update Package Usage | LENGOLF',
  description: 'Update package usage information',
}

export default function UpdatePackagePage() {
  return (
    <div className="container py-6 md:py-10">
      <div className="flex flex-col gap-4 items-center mb-8">
        <h1 className="text-2xl font-bold">Update Package Usage</h1>
        <p className="text-muted-foreground">
          Record package usage for customers
        </p>
      </div>
      <UsageForm />
    </div>
  )
}