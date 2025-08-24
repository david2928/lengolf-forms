import { useState, useEffect } from 'react'

export interface Package {
  id: string
  label: string
  details: {
    customerName: string
    packageTypeName: string
    firstUseDate: string
    expirationDate: string
    remainingHours: number
    customerId: string
    customerCode: string
    contactNumber: string | null
    email: string | null
  }
}

export function usePackages() {
  const [packages, setPackages] = useState<Package[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchPackages() {
      try {
        // Add timestamp to prevent caching
        const timestamp = Date.now()
        const response = await fetch(`/api/packages/available?t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          }
        })
        if (!response.ok) throw new Error('Failed to fetch packages')
        const data = await response.json()
        setPackages(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch packages'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchPackages()
  }, [])

  return { packages, isLoading, error }
}