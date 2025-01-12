import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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

        const { data: customerPackages, error: supabaseError } = await supabase
          .rpc('get_packages_by_customer_name', { 
            p_customer_name: searchName.trim()
          })

        if (supabaseError) throw supabaseError

        const formatted = customerPackages?.map((pkg: any) => ({
          id: pkg.id,
          label: `${pkg.package_type_name}`,
          details: {
            customerName: pkg.customer_name,
            packageTypeName: pkg.package_type_name,
            firstUseDate: pkg.first_use_date,
            expirationDate: pkg.expiration_date,
            remainingHours: pkg.remaining_hours
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