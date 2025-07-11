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
  includeInactive: boolean = false,
  customerId?: string | null
) {
  const [packages, setPackages] = useState<Package[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPackages() {
      if (!customerName && !customerId) {
        setPackages([])
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        let url: string;
        
        if (customerId) {
          // Use customer ID for new system
          url = `/api/packages/by-customer/${customerId}${includeInactive ? '?include_inactive=true' : ''}`
        } else {
          // Fallback to customer name for legacy support
          const searchName = contactNumber 
            ? `${customerName} (${contactNumber})`
            : customerName || ''
          url = `/api/packages/by-customer/${encodeURIComponent(searchName)}${includeInactive ? '?include_inactive=true' : ''}`
        }
        
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
  }, [customerName, contactNumber, includeInactive, customerId])

  return { packages, isLoading, error }
}