'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Package } from 'lucide-react'
import { format } from 'date-fns'

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

  useEffect(() => {
    async function fetchInactivePackages() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/packages/inactive')
        if (!response.ok) {
          throw new Error('Failed to fetch inactive packages')
        }
        const data = await response.json()
        setPackages(data)
      } catch (err) {
        setError('Failed to load inactive packages')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchInactivePackages()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Activation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Activation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-500">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 mt-1" />
            <div>
              <CardTitle className="leading-none mb-1">Pending Activation</CardTitle>
              <p className="text-sm text-muted-foreground">
                {packages.length} {packages.length === 1 ? 'package' : 'packages'} waiting for first use
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid gap-2">
          {packages.length > 0 ? (
            packages
              .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())
              .map((pkg) => (
                <Card key={pkg.id} className="border border-orange-200 bg-orange-50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4 text-orange-600" />
                          <span className="font-medium text-sm">
                            {pkg.customer_name.replace(/\s*\([^)]*\)$/, '')}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pkg.package_type_name} • Purchased {format(new Date(pkg.purchase_date), 'MMM d, yyyy')}
                        </div>
                        {pkg.employee_name && (
                          <div className="text-xs text-muted-foreground">
                            Created by {pkg.employee_name}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        Not Activated
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No packages waiting for activation
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 