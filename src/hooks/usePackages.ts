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
  }
}

export function usePackages() {
  const [packages, setPackages] = useState<Package[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchPackages() {
      try {
        const response = await fetch('/api/packages/available')
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