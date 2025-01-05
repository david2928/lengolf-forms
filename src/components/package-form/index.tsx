'use client'

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
import { Customer, PackageType, PackageFormData, EMPLOYEES, FormState } from '@/types/package-form'
import { CustomerSearch } from './customer-search'
import { DatePicker } from '../ui/date-picker'
import { ConfirmationDialog } from './confirmation-dialog'

interface SimpleCustomer {
  id: number;
  customer_name: string;
  contact_number: string | null;
}

export default function PackageForm() {
  const [formState, setFormState] = useState<FormState>({
    packageTypes: [],
    customers: [],
    isLoading: false,
    error: null,
    selectedCustomerId: '',
    showCustomerDialog: false,
    searchQuery: '',
    showConfirmation: false,
    formData: null,
    selectedDates: {
      purchase: null,
      firstUse: null
    }
  })

  const [isLoadingInitial, setIsLoadingInitial] = useState({
    types: true,
    customers: true
  })

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

        // Fetch customers
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .order('customer_name', { ascending: true })

        if (customersError) throw customersError
        
        // Transform and enrich customer data for UI
        const transformedCustomers = customersData.map(customer => ({
          ...customer,
          displayName: customer.contact_number 
            ? `${customer.customer_name} (${customer.contact_number})`
            : customer.customer_name
        }))
        
        setFormState(prev => ({
          ...prev,
          packageTypes: packageData || [],
          customers: transformedCustomers
        }))

      } catch (error) {
        setFormState(prev => ({
          ...prev,
          error: 'Failed to load data. Please refresh the page.'
        }))
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoadingInitial({
          types: false,
          customers: false
        })
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (formState.selectedDates.purchase && formState.selectedDates.firstUse) {
      if (formState.selectedDates.firstUse < formState.selectedDates.purchase) {
        setFormState(prev => ({ ...prev, error: 'First use date must be after purchase date' }))
      } else {
        setFormState(prev => ({ ...prev, error: null }))
        clearErrors(['purchaseDate', 'firstUseDate'])
      }
    }
  }, [formState.selectedDates.purchase, formState.selectedDates.firstUse, clearErrors])

  const validateForm = async () => {
    const isValid = await trigger()
    if (!isValid) return false
    
    if (!formState.selectedDates.purchase) {
      setFormState(prev => ({ ...prev, error: 'Purchase date is required' }))
      return false
    }
    
    if (!formState.selectedDates.firstUse) {
      setFormState(prev => ({ ...prev, error: 'First use date is required' }))
      return false
    }
    
    if (formState.selectedDates.firstUse < formState.selectedDates.purchase) {
      setFormState(prev => ({ ...prev, error: 'First use date must be after purchase date' }))
      return false
    }
    
    return true
  }

  const resetForm = () => {
    reset(defaultValues)
    setFormState(prev => ({
      ...prev,
      selectedCustomerId: '',
      showCustomerDialog: false,
      searchQuery: '',
      showConfirmation: false,
      formData: null,
      error: null,
      selectedDates: {
        purchase: null,
        firstUse: null
      }
    }))
  }

  const onSubmit = async (data: PackageFormData) => {
    const isValid = await validateForm()
    if (!isValid) return

    const selectedCustomer = formState.customers.find(c => c.id.toString() === formState.selectedCustomerId)
    if (!selectedCustomer) return

    const customerDisplay = selectedCustomer.contact_number 
      ? `${selectedCustomer.customer_name} (${selectedCustomer.contact_number})`
      : selectedCustomer.customer_name

    setFormState(prev => ({
      ...prev,
      formData: {
        ...data,
        customerName: customerDisplay,
        purchaseDate: prev.selectedDates.purchase,
        firstUseDate: prev.selectedDates.firstUse
      },
      showConfirmation: true
    }))
  }

  const handleConfirm = async () => {
    if (!formState.formData || !formState.selectedDates.purchase || !formState.selectedDates.firstUse) return

    setFormState(prev => ({ ...prev, isLoading: true, showConfirmation: false }))

    try {
      const { error } = await supabase
        .from('packages')
        .insert([{
          employee_name: formState.formData.employeeName,
          customer_name: formState.formData.customerName,
          package_type_id: formState.formData.packageTypeId,
          purchase_date: format(formState.selectedDates.purchase!, 'yyyy-MM-dd'),
          first_use_date: format(formState.selectedDates.firstUse!, 'yyyy-MM-dd')
        }])

      if (error) throw error
      alert('Package created successfully!')
      
      resetForm()
      
    } catch (error) {
      console.error('Error creating package:', error)
      setFormState(prev => ({
        ...prev,
        error: 'Error creating package. Please try again.'
      }))
    } finally {
      setFormState(prev => ({ ...prev, isLoading: false }))
    }
  }

  const getPackageTypeName = (id: number) => {
    return formState.packageTypes.find(type => type.id === id)?.name || ''
  }

  const getSelectedCustomerDisplay = () => {
    const customer = formState.customers.find(c => c.id.toString() === formState.selectedCustomerId)
    return customer?.displayName || 'Select customer'
  }

  const mappedCustomers = useMemo(() => formState.customers.map(customer => ({
    id: customer.id,
    customer_name: customer.customer_name,
    contact_number: customer.contact_number
  })), [formState.customers])

  const handleCustomerSelect = (customer: SimpleCustomer) => {
    setFormState(prev => ({
      ...prev,
      selectedCustomerId: customer.id.toString(),
      showCustomerDialog: false,
      searchQuery: ''
    }))
    setValue('customerName', customer.customer_name)
  }

  if (isLoadingInitial.types || isLoadingInitial.customers) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-4 animate-spin text-[#005a32]" />
        <span className="ml-2">Loading data...</span>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {formState.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-400 text-red-700 rounded-lg">
          <p>{formState.error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label>
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
          <Label>
            Customer Name
          </Label>
          <input
            type="hidden"
            {...register('customerName', { 
              required: "Customer name is required" 
            })}
          />
          <CustomerSearch 
            customers={mappedCustomers}
            selectedCustomerId={formState.selectedCustomerId}
            showCustomerDialog={formState.showCustomerDialog}
            searchQuery={formState.searchQuery}
            onSearchQueryChange={(query) => setFormState(prev => ({ ...prev, searchQuery: query }))}
            onCustomerSelect={handleCustomerSelect}
            onDialogOpenChange={(open) => setFormState(prev => ({ ...prev, showCustomerDialog: open }))}
            getSelectedCustomerDisplay={getSelectedCustomerDisplay}
          />
          {errors.customerName && (
            <p className="text-red-500 text-sm mt-1">{errors.customerName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>
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
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select package type" />
            </SelectTrigger>
            <SelectContent>
              {formState.packageTypes.map((type) => (
                <SelectItem 
                  key={type.id} 
                  value={type.id.toString()}
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
            value={formState.selectedDates.purchase}
            onChange={(date) => {
              setFormState(prev => ({
                ...prev,
                selectedDates: { ...prev.selectedDates, purchase: date }
              }))
              if (date) setValue('purchaseDate', date)
              trigger('purchaseDate')
            }}
            label="Purchase Date"
          />
          {errors.purchaseDate && (
            <p className="text-red-500 text-sm mt-1">{errors.purchaseDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <DatePicker
            value={formState.selectedDates.firstUse}
            onChange={(date) => {
              setFormState(prev => ({
                ...prev,
                selectedDates: { ...prev.selectedDates, firstUse: date }
              }))
              if (date) setValue('firstUseDate', date)
              trigger('firstUseDate')
            }}
            label="First Use Date"
          />
          {errors.firstUseDate && (
            <p className="text-red-500 text-sm mt-1">{errors.firstUseDate.message}</p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full"
          variant="default"
          disabled={formState.isLoading}
        >
          {formState.isLoading ? (
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
        open={formState.showConfirmation}
        onOpenChange={(open) => setFormState(prev => ({ ...prev, showConfirmation: open }))}
        formData={formState.formData}
        onConfirm={handleConfirm}
        getPackageTypeName={getPackageTypeName}
      />
    </div>
  )
}