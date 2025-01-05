'use client'

import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useCustomerPackages } from "@/hooks/useCustomerPackages"
import { cn } from "@/lib/utils"

interface PackageSelectorProps {
  value: string
  customerName: string
  customerPhone?: string
  onChange: (value: string, packageName: string) => void
  error?: string
}

export function PackageSelector({ 
  value,
  customerName,
  customerPhone,
  onChange,
  error
}: PackageSelectorProps) {
  const { packages, isLoading, error: packagesError } = useCustomerPackages(customerName, customerPhone)

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

  if (!packages || packages.length === 0) {
    const displayName = customerPhone 
      ? `${customerName} (${customerPhone})`
      : customerName
    return (
      <div className="p-4 bg-yellow-50 rounded">
        No active packages available for {displayName}
      </div>
    )
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleValueChange = (selectedId: string) => {
    const selectedPackage = packages.find(pkg => pkg.id === selectedId)
    if (selectedPackage) {
      onChange(selectedId, selectedPackage.details.packageTypeName)
    }
  }

  return (
    <div className="space-y-4">
      <RadioGroup
        value={value}
        onValueChange={handleValueChange}
        className="grid grid-cols-1 gap-3"
      >
        {packages.map((pkg) => (
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
                  value === pkg.id && "border-primary"
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
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Remaining: {pkg.details.remainingHours ?? 'Unlimited'} hours
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Expires: {formatDate(pkg.details.expirationDate)}
                    </div>
                  </div>
                </div>
              </Card>
            </label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}