'use client'

import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useCustomerPackages } from "@/hooks/useCustomerPackages"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { useState } from "react"

interface PackageSelectorProps {
  value: string
  customerName: string
  customerPhone?: string
  bookingType?: string | null
  onChange: (value: string | null, packageName: string) => void
  error?: string
}

export function PackageSelector({ 
  value,
  customerName,
  customerPhone,
  bookingType,
  onChange,
  error
}: PackageSelectorProps) {
  // Determine if this is a coaching or package booking
  const isCoachingBooking = bookingType?.toLowerCase().includes('coaching') || false
  const isPackageBooking = bookingType === 'Package'
  
  // Include inactive packages for coaching and package bookings 
  // The database function now properly filters out only expired/used packages
  // but includes unactivated packages which can be activated on first use
  const shouldIncludeInactive = isCoachingBooking || isPackageBooking
  
  const { packages, isLoading, error: packagesError } = useCustomerPackages(
    customerName, 
    customerPhone,
    shouldIncludeInactive
  )
  const [newPackageName, setNewPackageName] = useState("")

  if (!customerName) {
    return <div className="text-muted-foreground">Select a customer first</div>
  }

  if (isLoading) {
    return null;
  }

  if (packagesError) {
    return (
      <div className="p-4 bg-red-50 rounded">
        <div className="text-red-600">Failed to load packages:</div>
        <div className="text-sm text-red-500">{packagesError}</div>
      </div>
    )
  }

  const formatDate = (date: string) => {
    if (!date || date === 'No expiry') {
      return 'No expiry'
    }
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'No expiry'
    }
  }

  const handleValueChange = (selectedId: string) => {
    if (selectedId === 'will-buy') {
      onChange(null, newPackageName ? `Will buy ${newPackageName}` : '')
    } else {
      const selectedPackage = packages?.find(pkg => pkg.id === selectedId)
      if (selectedPackage) {
        onChange(selectedId, selectedPackage.details.packageTypeName)
      }
    }
  }

  const handleNewPackageNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setNewPackageName(name)
    // Only update if "will-buy" is already selected
    if (value === 'will-buy' || (!packages || packages.length === 0)) {
      onChange(null, name ? `Will buy ${name}` : '')
    }
  }

  // Filter packages based on booking type and availability
  const filteredPackages = packages?.filter(pkg => {
    // Check if package is usable for booking
    const hasRemainingHours = pkg.details.remainingHours === null || pkg.details.remainingHours > 0
    const isUnactivated = pkg.details.firstUseDate === 'Not activated' // Can be activated on first use
    const isActivatedAndNotExpired = pkg.details.firstUseDate !== 'Not activated' && 
                                    (pkg.details.expirationDate === 'No expiry' || 
                                     new Date(pkg.details.expirationDate) > new Date())
    
    // Package is available if it's either unactivated OR (activated + not expired + has hours)
    const isUsableForBooking = hasRemainingHours && (isUnactivated || isActivatedAndNotExpired)
    
    if (!isUsableForBooking) {
      return false
    }
    
    // Then filter by booking type
    if (isCoachingBooking) {
      // For coaching bookings, show coaching packages
      return pkg.details.packageTypeName.toLowerCase().includes('coaching')
    } else if (isPackageBooking) {
      // For package bookings, show non-coaching packages (Monthly, Unlimited)
      return !pkg.details.packageTypeName.toLowerCase().includes('coaching')
    }
    // For other booking types, show all usable packages
    return true
  }) || []

  // If no packages available, show only "will-buy" option
  if (!filteredPackages || filteredPackages.length === 0) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Card className="relative p-4">
            <div className="flex items-start">
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-primary ring-offset-background">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div className="ml-4 flex-1">
                <div className="font-medium">
                  Will buy Package
                </div>
                <div className="mt-2">
                  <Input
                    placeholder="Enter package name"
                    value={newPackageName}
                    onChange={handleNewPackageNameChange}
                    className="max-w-md"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        {error && (
          <div className="text-sm text-red-500 mt-1">
            {error}
          </div>
        )}
      </div>
    )
  }

  // If packages available, show regular radio group
  return (
    <div className="space-y-4">
      <RadioGroup
        value={value}
        onValueChange={handleValueChange}
        className="grid grid-cols-1 gap-3"
      >
        {filteredPackages.map((pkg) => (
          <div key={pkg.id} className="relative">
            <RadioGroupItem
              value={pkg.id}
              id={pkg.id}
              className="sr-only"
            />
            <label
              htmlFor={pkg.id}
              className="cursor-pointer block"
            >
              <Card 
                className={cn(
                  "relative p-4 hover:bg-accent transition-colors",
                  value === pkg.id && "border-primary",
                  // Add visual indicator for unactivated packages
                  pkg.details.firstUseDate === 'Not activated' && "border-orange-300 bg-orange-50/50"
                )}
              >
                <div className="flex items-start">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-primary ring-offset-background">
                    <div className={cn(
                      "h-2 w-2 rounded-full bg-transparent transition-colors",
                      value === pkg.id && "bg-primary"
                    )} />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="font-medium">
                      {pkg.details.packageTypeName}
                      {pkg.details.firstUseDate === 'Not activated' && (
                        <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                          Not Activated
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Remaining: {pkg.details.remainingHours ?? 'Unlimited'} hours
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Expires: {formatDate(pkg.details.expirationDate)}
                    </div>
                    {pkg.details.firstUseDate === 'Not activated' && (
                      <div className="text-sm text-orange-600 font-medium">
                        Will be activated when used
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </label>
          </div>
        ))}
      </RadioGroup>
      
      {error && (
        <div className="text-sm text-red-500 mt-1">
          {error}
        </div>
      )}
    </div>
  )
}