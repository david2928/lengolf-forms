import { useState, useEffect } from 'react'
import { refacSupabase } from '@/lib/refac-supabase'

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

export function useCustomerPackages(customerName: string | null, contactNumber?: string | null) {
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

        // Query packages from the migrated backoffice schema
        const { data: customerPackages, error: supabaseError } = await refacSupabase
          .schema('backoffice')
          .from('packages')
          .select(`
            id,
            customer_name,
            first_use_date,
            expiration_date,
            purchase_date,
            employee_name,
            package_types!inner(name, type, hours)
          `)
          .eq('customer_name', searchName)
          .order('purchase_date', { ascending: false })

        if (supabaseError) throw supabaseError

        const formatted = customerPackages?.map((pkg: any) => ({
          id: pkg.id,
          label: `${pkg.package_types.name}`,
          details: {
            customerName: pkg.customer_name,
            packageTypeName: pkg.package_types.name,
            firstUseDate: pkg.first_use_date || 'Not activated',
            expirationDate: pkg.expiration_date || 'No expiry',
            remainingHours: pkg.package_types.type === 'Unlimited' ? null : pkg.package_types.hours // Simplified - would need usage calculation for accurate remaining hours
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
  }, [customerName, contactNumber])

  return { packages, isLoading, error }
}