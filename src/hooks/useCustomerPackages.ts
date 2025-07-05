import { useState, useEffect } from 'react'

interface PackageDetails {
  customerName: string
  packageTypeName: string
  firstUseDate: string
  expirationDate: string
  remainingHours: number | null
}

interface Package {
  id: string
  label: string
  details: PackageDetails
}

export function useCustomerPackages(
  customerName: string | null, 
  contactNumber?: string | null,
  includeInactive: boolean = false
) {
  const [packages, setPackages] = useState<Package[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPackages() {
      if (!customerName) {
        setPackages([])
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const searchName = contactNumber 
          ? `${customerName} (${contactNumber})`
          : customerName

        // Use the API endpoint with include_inactive parameter
        const url = `/api/packages/by-customer/${encodeURIComponent(searchName)}${includeInactive ? '?include_inactive=true' : ''}`
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const customerPackages = await response.json()

        const formatted = customerPackages?.map((pkg: any) => ({
          id: pkg.id,
          label: `${pkg.package_type_name}`,
          details: {
            customerName: pkg.customer_name,
            packageTypeName: pkg.package_type_name,
            firstUseDate: pkg.first_use_date || 'Not activated',
            expirationDate: pkg.expiration_date || 'No expiry',
            remainingHours: pkg.package_type === 'Unlimited' ? null : pkg.remaining_hours
          }
        })) || []

        setPackages(formatted)
      } catch (err) {
        console.error('Error fetching packages:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch packages')
        setPackages([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPackages()
  }, [customerName, contactNumber, includeInactive])

  return { packages, isLoading, error }
}