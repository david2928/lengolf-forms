'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Package } from 'lucide-react'

interface EditPackageSelectorProps {
  value: string | null
  customerName: string
  customerPhone?: string
  currentPackageName?: string | null
  onChange: (packageId: string | null) => void
  disabled?: boolean
}

interface CustomerPackage {
  id: string
  name: string
  status: string
  sessions_used: number
  sessions_total: number
  expiry_date?: string
  is_active: boolean
}

export function EditPackageSelector({ 
  value,
  customerName,
  customerPhone,
  currentPackageName,
  onChange,
  disabled = false
}: EditPackageSelectorProps) {
  const [packages, setPackages] = useState<CustomerPackage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPackages = async () => {
      if (!customerName) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        const params = new URLSearchParams({
          customerName: customerName,
          includeInactive: 'true' // Include unactivated packages
        })
        
        if (customerPhone) {
          params.append('customerPhone', customerPhone)
        }
        
        const response = await fetch(`/api/packages/customer?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch packages')
        }
        
        const data = await response.json()
        setPackages(data.packages || [])
      } catch (err) {
        console.error('Error fetching customer packages:', err)
        setError('Failed to load packages')
        setPackages([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPackages()
  }, [customerName, customerPhone])

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading packages...</div>
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>
  }

  const activePackages = packages.filter(pkg => pkg.is_active || pkg.status === 'not_activated')

  return (
    <div className="space-y-3">
      {/* Current Package Display */}
      {currentPackageName && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <Package className="w-4 h-4 text-blue-600" />
          <div className="flex-1">
            <Label className="text-sm font-medium text-blue-900">Current Package</Label>
            <p className="text-sm text-blue-700">{currentPackageName}</p>
          </div>
          {value === null && (
            <Badge variant="outline" className="text-blue-700 border-blue-300">
              Selected
            </Badge>
          )}
        </div>
      )}

      {/* Package Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {currentPackageName ? 'Change to Different Package' : 'Select Package'}
        </Label>
        
        <Select
          value={value || 'current'}
          onValueChange={(selectedValue) => {
            if (selectedValue === 'current') {
              onChange(null) // Keep current package
            } else if (selectedValue === 'none') {
              onChange('') // No package
            } else {
              onChange(selectedValue) // New package ID
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select package" />
          </SelectTrigger>
          <SelectContent>
            {currentPackageName && (
              <SelectItem value="current">
                Keep Current: {currentPackageName}
              </SelectItem>
            )}
            
            <SelectItem value="none">No Package</SelectItem>
            
            {activePackages.length > 0 && (
              <>
                {activePackages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{pkg.name}</span>
                      <div className="flex items-center gap-2 ml-2">
                        {pkg.status === 'not_activated' && (
                          <Badge variant="secondary" className="text-xs">
                            Not Activated
                          </Badge>
                        )}
                        {pkg.status === 'active' && (
                          <Badge variant="outline" className="text-xs">
                            {pkg.sessions_total === null ? 'Unlimited' : `${pkg.sessions_used}/${pkg.sessions_total} used`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
            
            {activePackages.length === 0 && !currentPackageName && (
              <SelectItem value="none" disabled>
                No active packages available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}