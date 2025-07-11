'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface PackageDetails {
  id: string
  customer: {
    id: string
    customer_name: string
    customer_code: string
    contact_number: string | null
    email: string | null
  } | null
  package_types: {
    name: string
  }
  purchase_date: string
  first_use_date: string | null
  expiration_date: string
  totalUsedHours: number
  remainingHours: number | null
  daysRemaining: number
}

interface PackageInfoCardProps {
  packageId: string
  isLoading?: boolean
  onDataLoaded?: (data: { 
    remainingHours: number | null; 
    expiration_date: string | null;
    isActivated: boolean;
  }) => void;
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
            expiration_date: data.expiration_date,
            isActivated: data.first_use_date !== null
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

  // Check if package is not activated
  const isActivated = packageDetails.first_use_date !== null

  return (
    <Card>
      <CardContent className="pt-6 min-h-[240px]">
        {!isActivated && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-800">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="font-medium text-sm">Package Not Activated</span>
            </div>
            <p className="text-sm text-orange-700 mt-1">
              This package must be activated before recording usage. Please activate it from the Package Monitor page first.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <p className="text-sm font-medium text-gray-500">Customer</p>
            <p className="text-sm font-semibold">
              {packageDetails.customer?.customer_name || 'Unknown Customer'}
            </p>
            {packageDetails.customer?.customer_code && (
              <p className="text-xs text-gray-400">{packageDetails.customer.customer_code}</p>
            )}
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
            <p className="text-sm font-semibold">
              {packageDetails.first_use_date 
                ? format(new Date(packageDetails.first_use_date), 'PP')
                : <span className="text-orange-600">Not activated yet</span>
              }
            </p>
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
            <p className="text-sm font-semibold">
              {packageDetails.expiration_date 
                ? format(new Date(packageDetails.expiration_date), 'PP')
                : <span className="text-orange-600">Will be set on activation</span>
              }
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Days Remaining</p>
            <p className={`text-sm font-semibold ${
              packageDetails.daysRemaining !== null && packageDetails.daysRemaining < 7 ? 'text-red-500' : ''
            }`}>
              {packageDetails.daysRemaining !== null 
                ? `${packageDetails.daysRemaining} days`
                : <span className="text-orange-600">Not activated yet</span>
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}