'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface PackageDetails {
  id: string
  customer_name: string
  package_types: {
    name: string
  }
  purchase_date: string
  first_use_date: string
  expiration_date: string
  totalUsedHours: number
  remainingHours: number | null
  daysRemaining: number
}

interface PackageInfoCardProps {
  packageId: string
  isLoading?: boolean
  onDataLoaded?: (data: { remainingHours: number | null; expiration_date: string | null }) => void;
}

export function PackageInfoCard({ packageId, isLoading = false, onDataLoaded }: PackageInfoCardProps) {
  const [packageDetails, setPackageDetails] = useState<PackageDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(true)

  useEffect(() => {
    const fetchPackageDetails = async () => {
      try {
        setLoadingDetails(true)
        const response = await fetch(`/api/packages/${packageId}`)
        if (!response.ok) throw new Error('Failed to fetch package details')
        
        const data = await response.json()
        setPackageDetails(data)
        setError(null)
        if (onDataLoaded && data) {
          onDataLoaded({ 
            remainingHours: data.remainingHours,
            expiration_date: data.expiration_date 
          });
        }
      } catch (err) {
        console.error('Error fetching package details:', err)
        setError('Failed to load package details')
      } finally {
        setLoadingDetails(false)
      }
    }

    if (packageId) {
      fetchPackageDetails()
    }
  }, [packageId, onDataLoaded])

  if (isLoading || loadingDetails) {
    return (
      <Card>
        <CardContent className="pt-6 min-h-[240px]">
          <div className="space-y-3">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 min-h-[240px] flex items-center justify-center">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!packageDetails) {
    return (
      <Card>
        <CardContent className="pt-6 min-h-[240px] flex items-center justify-center">
          <p className="text-muted-foreground">Select a package to view details</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6 min-h-[240px]">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <p className="text-sm font-medium text-gray-500">Customer</p>
            <p className="text-sm font-semibold">{packageDetails.customer_name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Package Type</p>
            <p className="text-sm font-semibold">{packageDetails.package_types.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Purchase Date</p>
            <p className="text-sm font-semibold">{format(new Date(packageDetails.purchase_date), 'PP')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">First Used</p>
            <p className="text-sm font-semibold">{format(new Date(packageDetails.first_use_date), 'PP')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Hours Used</p>
            <p className="text-sm font-semibold">{packageDetails.totalUsedHours}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Remaining Hours</p>
            <p className="text-sm font-semibold">
              {packageDetails.remainingHours !== null
                ? packageDetails.remainingHours
                : 'Unlimited'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Expiration Date</p>
            <p className="text-sm font-semibold">{format(new Date(packageDetails.expiration_date), 'PP')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Days Remaining</p>
            <p className={`text-sm font-semibold ${packageDetails.daysRemaining < 7 ? 'text-red-500' : ''}`}>
              {packageDetails.daysRemaining} days
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}