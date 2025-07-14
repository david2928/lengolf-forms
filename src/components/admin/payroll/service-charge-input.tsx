'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, DollarSign, Users, Calculator, Save } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface ServiceChargeInfo {
  month: string
  total_amount: number
  eligible_staff_count: number
  per_staff_amount: number
  eligible_staff: Array<{
    staff_id: number
    staff_name: string
    is_eligible: boolean
  }>
}

interface ServiceChargeInputProps {
  selectedMonth: string
  onServiceChargeUpdated: () => void
}

export function ServiceChargeInput({ selectedMonth, onServiceChargeUpdated }: ServiceChargeInputProps) {
  const [serviceChargeInfo, setServiceChargeInfo] = useState<ServiceChargeInfo | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (selectedMonth) {
      fetchServiceChargeInfo()
    }
  }, [selectedMonth])

  const fetchServiceChargeInfo = async () => {
    try {
      setLoading(true)
      // Get current service charge info from calculations endpoint
      const response = await fetch(`/api/admin/payroll/${selectedMonth}/calculations`)
      const data = await response.json()
      
      if (response.ok) {
        const serviceChargeData: ServiceChargeInfo = {
          month: selectedMonth,
          total_amount: data.service_charge_summary?.total_amount || 0,
          eligible_staff_count: data.service_charge_summary?.eligible_staff_count || 0,
          per_staff_amount: data.service_charge_summary?.per_staff_amount || 0,
          eligible_staff: data.staff_payroll?.map((staff: any) => ({
            staff_id: staff.staff_id,
            staff_name: staff.staff_name,
            is_eligible: staff.service_charge > 0
          })) || []
        }
        
        setServiceChargeInfo(serviceChargeData)
        setAmount(serviceChargeData.total_amount.toString())
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch service charge info',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching service charge info:', error)
      toast({
        title: 'Error',
        description: 'Failed to connect to payroll service',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveServiceCharge = async () => {
    // Enhanced validation using the error handling utility
    const { validateServiceCharge } = await import('@/lib/payroll-error-handling')
    
    const validation = validateServiceCharge({
      total_amount: amount,
      eligible_staff_count: serviceChargeInfo?.eligible_staff_count
    })
    
    if (!validation.isValid) {
      toast({
        title: 'Validation Error',
        description: validation.errors.join(', '),
        variant: 'destructive'
      })
      return
    }
    
    // Show warnings if any
    if (validation.warnings.length > 0) {
      toast({
        title: 'Warning',
        description: validation.warnings.join(', '),
        variant: 'destructive'
      })
    }
    
    const numericAmount = parseFloat(amount)

    try {
      setSaving(true)
      
      // Update service charge via API
      const response = await fetch(`/api/admin/payroll/${selectedMonth}/service-charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          total_amount: numericAmount
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Success',
          description: data.message || `Service charge updated to ฿${numericAmount.toLocaleString()}`
        })
        
        // Update local state with fresh data
        if (serviceChargeInfo) {
          const updatedInfo = {
            ...serviceChargeInfo,
            total_amount: numericAmount,
            per_staff_amount: serviceChargeInfo.eligible_staff_count > 0 
              ? numericAmount / serviceChargeInfo.eligible_staff_count 
              : 0
          }
          setServiceChargeInfo(updatedInfo)
        }
        
        onServiceChargeUpdated()
      } else {
        // Provide more specific error messages
        const errorMessage = data.userMessage || data.error || 'Failed to update service charge'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        })
      }
      
    } catch (error) {
      console.error('Error saving service charge:', error)
      toast({
        title: 'Error',
        description: 'Failed to update service charge',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const calculatePerStaffAmount = () => {
    const numericAmount = parseFloat(amount) || 0
    if (!serviceChargeInfo || serviceChargeInfo.eligible_staff_count === 0) return 0
    return numericAmount / serviceChargeInfo.eligible_staff_count
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Charge Management</CardTitle>
          <CardDescription>Loading service charge information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!serviceChargeInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Charge Management</CardTitle>
          <CardDescription>
            Unable to load service charge information for {selectedMonth}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Service Charge Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Service Charge Management
          </CardTitle>
          <CardDescription>
            Set the total service charge amount for {selectedMonth} to be distributed among eligible staff
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service-charge-amount">Total Service Charge (THB)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="service-charge-amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="max-w-xs"
              />
              <Button
                onClick={handleSaveServiceCharge}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </Button>
            </div>
          </div>

          {/* Live calculation preview */}
          {amount && !isNaN(parseFloat(amount)) && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Distribution Preview
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium ml-2">฿{parseFloat(amount).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Per Staff:</span>
                  <span className="font-medium ml-2">฿{calculatePerStaffAmount().toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Charge Distribution Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Distribution Summary
          </CardTitle>
          <CardDescription>
            Staff eligible for service charge distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm text-green-600">Eligible Staff</div>
                <div className="text-2xl font-bold text-green-800">
                  {serviceChargeInfo.eligible_staff_count}
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-600">Total Amount</div>
                <div className="text-2xl font-bold text-blue-800">
                  ฿{serviceChargeInfo.total_amount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Staff List */}
            <div className="space-y-3">
              <h4 className="font-medium">Staff Eligibility ({serviceChargeInfo.eligible_staff.length} total)</h4>
              
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-2">
                {serviceChargeInfo.eligible_staff.map((staff) => (
                  <div key={staff.staff_id} className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          staff.is_eligible ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <span className={`text-sm font-semibold ${
                            staff.is_eligible ? 'text-green-700' : 'text-gray-600'
                          }`}>
                            {staff.staff_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{staff.staff_name}</p>
                        <div className="mt-1">
                          <Badge variant={staff.is_eligible ? "default" : "secondary"} className="text-xs">
                            {staff.is_eligible ? 'Eligible' : 'Not Eligible'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop Grid View */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {serviceChargeInfo.eligible_staff.map((staff) => (
                  <div key={staff.staff_id} className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          staff.is_eligible ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <span className={`text-sm font-semibold ${
                            staff.is_eligible ? 'text-green-700' : 'text-gray-600'
                          }`}>
                            {staff.staff_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{staff.staff_name}</p>
                        <div className="mt-1">
                          <Badge variant={staff.is_eligible ? "default" : "secondary"} className="text-xs">
                            {staff.is_eligible ? 'Eligible' : 'Not Eligible'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {serviceChargeInfo.eligible_staff_count > 0 && serviceChargeInfo.total_amount > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800">
                  <strong>Per Staff Amount:</strong> ฿{serviceChargeInfo.per_staff_amount.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 