'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pause, Users } from 'lucide-react'
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
            <Pause className="h-5 w-5 text-orange-500" />
            Inactive Packages
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
            <Pause className="h-5 w-5 text-orange-500" />
            Inactive Packages
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
        <CardHeader className="border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Pause className="h-5 w-5 mt-1 text-orange-500" />
              <div>
                <CardTitle className="leading-none mb-1">Inactive Packages</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {packages.length} {packages.length === 1 ? 'package' : 'packages'}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No inactive packages</p>
              <p className="text-sm">All packages are currently activated</p>
            </div>
          ) : (
            <div className="space-y-3">
              {packages.map((pkg) => (
                <Card 
                  key={pkg.id}
                  className="border-l-4 border-orange-500"
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        {/* Extract phone number for consistent display */}
                        {(() => {
                          const phoneMatch = pkg.customer_name.match(/\((\d+)\)$/);
                          const phone = phoneMatch ? phoneMatch[1] : '';
                          const nameWithoutPhone = phoneMatch 
                            ? pkg.customer_name.slice(0, pkg.customer_name.lastIndexOf('(')).trim() 
                            : pkg.customer_name;
                          
                          return (
                            <>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium leading-none truncate">{nameWithoutPhone}</h3>
                                <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-0.5 rounded-full shrink-0">
                                  INACTIVE
                                </span>
                              </div>
                              {phone && <div className="text-sm text-muted-foreground">{phone}</div>}
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <div>{pkg.package_type_name}</div>
                                <div>Created: {format(new Date(pkg.purchase_date), 'PP')}</div>
                                <div>Sold by: {pkg.employee_name}</div>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                      <Button
                        onClick={() => handleActivateClick(pkg)}
                        className="bg-orange-600 hover:bg-orange-700 shrink-0"
                        size="sm"
                      >
                        Activate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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