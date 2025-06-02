'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Users } from 'lucide-react'
import { format } from 'date-fns'
import { ActivationDialog } from './activation-dialog'

interface InactivePackage {
  id: string
  customer_name: string
  package_type_name: string
  package_type: string
  purchase_date: string
  employee_name: string
}

export function InactivePackages() {
  const [packages, setPackages] = useState<InactivePackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activationDialog, setActivationDialog] = useState<{
    open: boolean
    package: InactivePackage | null
  }>({
    open: false,
    package: null
  })

  const fetchInactivePackages = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/packages/inactive')
      
      if (!response.ok) {
        throw new Error('Failed to fetch inactive packages')
      }
      
      const data = await response.json()
      setPackages(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching inactive packages:', err)
      setError('Failed to load inactive packages')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInactivePackages()
  }, [])

  const handleActivateClick = (pkg: InactivePackage) => {
    setActivationDialog({
      open: true,
      package: pkg
    })
  }

  const handleActivationComplete = () => {
    // Refresh the list after activation
    fetchInactivePackages()
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Inactive Packages (Awaiting Activation)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading inactive packages...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Inactive Packages (Awaiting Activation)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Inactive Packages (Awaiting Activation)
            {packages.length > 0 && (
              <span className="ml-2 bg-orange-100 text-orange-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                {packages.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No inactive packages</p>
              <p className="text-sm">All packages are currently activated</p>
            </div>
          ) : (
            <div className="space-y-4">
              {packages.map((pkg) => (
                <div 
                  key={pkg.id}
                  className="border rounded-lg p-4 bg-orange-50 border-orange-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-lg">{pkg.customer_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {pkg.package_type_name} • Created: {format(new Date(pkg.purchase_date), 'PP')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Sold by: {pkg.employee_name}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleActivateClick(pkg)}
                      className="bg-orange-600 hover:bg-orange-700"
                      size="sm"
                    >
                      Activate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ActivationDialog
        open={activationDialog.open}
        onOpenChange={(open) => setActivationDialog(prev => ({ ...prev, open }))}
        package={activationDialog.package}
        onActivationComplete={handleActivationComplete}
      />
    </>
  )
} 