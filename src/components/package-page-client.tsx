"use client"

import dynamic from 'next/dynamic'

const PackageForm = dynamic(() => import('@/components/package-form'), {
  ssr: false
})

export function PackagePageClient() {
  return (
    <main className="container">
      <PackageForm />
    </main>
  )
}