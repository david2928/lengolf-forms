"use client"

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Customer, PackageType, PackageFormData, EMPLOYEES } from '../../types/package-form'
import { CustomerSearch } from './package-form/customer-search'
import { DatePicker } from './package-form/date-picker'
import { ConfirmationDialog } from './package-form/confirmation-dialog'

export default function PackageForm() {
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([])
  const [rawCustomers, setRawCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingTypes, setIsLoadingTypes] = useState(true)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [selectedPurchaseDate, setSelectedPurchaseDate] = useState<Date | null>(null)
  const [selectedFirstUseDate, setSelectedFirstUseDate] = useState<Date | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [formData, setFormData] = useState<PackageFormData | null>(null)
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')

  const defaultValues: PackageFormData = {
    employeeName: '',
    customerName: '',
    packageTypeId: 0,
    purchaseDate: null,
    firstUseDate: null
  }

  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch,
    reset,
    formState: { errors },
    trigger,
    clearErrors
  } = useForm<PackageFormData>({
    defaultValues,
    mode: 'onBlur'
  })

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch package types
        const { data: packageData, error: packageError } = await supabase
          .from('package_types')
          .select('id, name, display_order')
          .order('display_order', { ascending: true })

        if (packageError) throw packageError
        setPackageTypes(packageData || [])

        // Fetch customers
        const customersResponse = await fetch('/api/customers')
        const customersData = await customersResponse.json()
        
        if (!customersResponse.ok) throw new Error(customersData.error)
        
        // Transform the customers data to match the Customer interface
        const transformedCustomers: Customer[] = customersData.customers.map((customer: any) => ({
          name: customer.name,
          contactNumber: customer.contactNumber,
          dateJoined: customer.dateJoined || new Date().toISOString(),
          id: `${customer.name}-${customer.contactNumber}`,
          displayName: `${customer.name} (${customer.contactNumber})`
        }))
        
        setRawCustomers(transformedCustomers)

      } catch (error) {
        console.error('Failed to fetch data:', error)
        setError('Failed to load data. Please refresh the page.')
      } finally {
        setIsLoadingTypes(false)
        setIsLoadingCustomers(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (selectedPurchaseDate && selectedFirstUseDate) {
      if (selectedFirstUseDate < selectedPurchaseDate) {
        setError('First use date must be after purchase date')
      } else {
        setError(null)
        clearErrors(['purchaseDate', 'firstUseDate'])
      }
    }
  }, [selectedPurchaseDate, selectedFirstUseDate, clearErrors])

  const customers = useMemo(() => {
    return rawCustomers.map(customer => ({
      ...customer,
      id: customer.id || `${customer.name}-${customer.contactNumber}`,
      displayName: customer.displayName || `${customer.name} (${customer.contactNumber})`,
      dateJoined: customer.dateJoined
    }))
  }, [rawCustomers])

  const validateForm = async () => {
    const isValid = await trigger()
    if (!isValid) return false
    
    if (!selectedPurchaseDate) {
      setError('Purchase date is required')
      return false
    }
    
    if (!selectedFirstUseDate) {
      setError('First use date is required')
      return false
    }
    
    if (selectedFirstUseDate < selectedPurchaseDate) {
      setError('First use date must be after purchase date')
      return false
    }
    
    return true
  }

  const resetForm = () => {
    reset(defaultValues)
    setSelectedPurchaseDate(null)
    setSelectedFirstUseDate(null)
    setSelectedCustomerId('')
    setFormData(null)
    setError(null)
  }

  const onSubmit = async (data: PackageFormData) => {
    const isValid = await validateForm()
    if (!isValid) return

    setFormData({
      ...data,
      purchaseDate: selectedPurchaseDate,
      firstUseDate: selectedFirstUseDate
    })
    setShowConfirmation(true)
  }

  const handleConfirm = async () => {
    if (!formData || !formData.purchaseDate || !formData.firstUseDate) return

    setIsLoading(true)
    setShowConfirmation(false)

    try {
      const { error } = await supabase
        .from('packages')
        .insert([{
          employee_name: formData.employeeName,
          customer_name: formData.customerName,
          package_type_id: formData.packageTypeId,
          purchase_date: format(formData.purchaseDate, 'yyyy-MM-dd'),
          first_use_date: format(formData.firstUseDate, 'yyyy-MM-dd')
        }])

      if (error) throw error
      alert('Package created successfully!')
      
      resetForm()
      
    } catch (error) {
      console.error('Error creating package:', error)
      alert('Error creating package. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getPackageTypeName = (id: number) => {
    return packageTypes.find(type => type.id === id)?.name || ''
  }

  const getSelectedCustomerDisplay = () => {
    const customer = customers.find(c => c.id === selectedCustomerId)
    return customer ? customer.displayName : 'Select customer'
  }

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomerId(customer.id || '')
    setValue('customerName', customer.name)
    setShowCustomerDialog(false)
    setSearchQuery('')
  }

  if (isLoadingTypes || isLoadingCustomers) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-4 animate-spin text-[#005a32]" />
        <span className="ml-2">Loading data...</span>
      </div>
    )
  }

  return (
    <div className="container max-w-lg mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-[#005a32] mb-8 text-center">
        LENGOLF Package Creation
      </h1>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-400 text-red-700 rounded-lg">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Employee Name
          </Label>
          <input
            type="hidden"
            {...register('employeeName', { 
              required: "Employee name is required" 
            })}
          />
          <RadioGroup
            onValueChange={(value) => {
              setValue('employeeName', value)
              trigger('employeeName')
            }}
            className="grid grid-cols-2 gap-4"
            value={watch('employeeName')}
          >
            {EMPLOYEES.map((employee) => (
              <div key={employee} className="flex items-center space-x-2">
                <RadioGroupItem value={employee} id={employee} />
                <Label htmlFor={employee} className="font-normal">
                  {employee}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {errors.employeeName && (
            <p className="text-red-500 text-sm mt-1">{errors.employeeName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Customer Name
          </Label>
          <input
            type="hidden"
            {...register('customerName', { 
              required: "Customer name is required" 
            })}
          />
          <CustomerSearch 
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            showCustomerDialog={showCustomerDialog}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onCustomerSelect={handleCustomerSelect}
            onDialogOpenChange={setShowCustomerDialog}
            getSelectedCustomerDisplay={getSelectedCustomerDisplay}
          />
          {errors.customerName && (
            <p className="text-red-500 text-sm mt-1">{errors.customerName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Package Type
          </Label>
          <input
            type="hidden"
            {...register('packageTypeId', { 
              required: "Package type is required" 
            })}
          />
          <Select 
            onValueChange={(value) => {
              setValue('packageTypeId', parseInt(value))
              trigger('packageTypeId')
            }}
          >
            <SelectTrigger className="w-full px-3 py-2 border border-gray-200 focus:border-[#005a32] focus:outline-none focus:ring-1 focus:ring-[#005a32] hover:border-gray-300 transition-colors bg-white data-[placeholder]:text-gray-500">
              <SelectValue placeholder="Select package type" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200">
              {packageTypes.map((type) => (
                <SelectItem 
                  key={type.id} 
                  value={type.id.toString()}
                  className="cursor-pointer hover:bg-gray-100 focus:bg-gray-100 outline-none"
                >
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.packageTypeId && (
            <p className="text-red-500 text-sm mt-1">{errors.packageTypeId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <DatePicker
            label="Purchase Date"
            selected={selectedPurchaseDate}
            onSelect={(date) => {
              setSelectedPurchaseDate(date)
              if (date) setValue('purchaseDate', date)
              trigger('purchaseDate')
            }}
          />
          {errors.purchaseDate && (
            <p className="text-red-500 text-sm mt-1">{errors.purchaseDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <DatePicker
            label="First Use Date"
            selected={selectedFirstUseDate}
            onSelect={(date) => {
              setSelectedFirstUseDate(date)
              if (date) setValue('firstUseDate', date)
              trigger('firstUseDate')
            }}
          />
          {errors.firstUseDate && (
            <p className="text-red-500 text-sm mt-1">{errors.firstUseDate.message}</p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full bg-[#005a32] text-white hover:bg-[#004a29] transition-colors"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Package'
          )}
        </Button>
      </form>

      <ConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        formData={formData}
        onConfirm={handleConfirm}
        getPackageTypeName={getPackageTypeName}
      />
    </div>
  )
}