'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import useSWR from 'swr'
// Removed direct Supabase import - using API endpoints instead
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Customer, PackageType, PackageFormData, EMPLOYEES, FormState } from '@/types/package-form'
import { CustomerSearch } from './customer-search'
import { DatePicker } from '../ui/date-picker'
import { ConfirmationDialog } from './confirmation-dialog'
import { PackageTypeSection } from './form-sections/package-type-section'

interface SimpleCustomer {
  id: string;
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
    }
  })

  // Cache the selected customer so it persists even when SWR data changes
  const [selectedCustomerCache, setSelectedCustomerCache] = useState<any>(null)

  const [isLoadingInitial, setIsLoadingInitial] = useState({
    types: true,
    customers: false // Changed to false since we'll use SWR
  })

  const defaultValues: PackageFormData = {
    employeeName: '',
    customerName: '',
    packageTypeId: 0,
    purchaseDate: null,
  }

  const form = useForm<PackageFormData>({
    defaultValues,
    mode: 'onBlur'
  })

  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch,
    reset,
    formState: { errors },
    trigger,
    clearErrors
  } = form

  // Dynamic customer search - will fetch based on search query or show recent customers
  const searchUrl = formState.searchQuery.length >= 2 
    ? `/api/customers?search=${encodeURIComponent(formState.searchQuery)}&limit=100` 
    : '/api/customers?limit=100&sortBy=lastVisit&sortOrder=desc'; // Show recent customers when no search

  const { data: customersResponse, mutate: mutateCustomers } = useSWR<{customers: any[], pagination: any, kpis: any}>(
    searchUrl,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    }
  );

  const customers = customersResponse?.customers || [];

  useEffect(() => {
    mutateCustomers();
  }, [mutateCustomers]);

  // No longer need to sync customers to formState since we use SWR directly

  useEffect(() => {
    async function fetchPackageTypes() {
      try {
        // Fetch package types via API
        const packageResponse = await fetch('/api/package-types');
        if (!packageResponse.ok) throw new Error('Failed to fetch package types');
        const packageResult = await packageResponse.json();
        
        setFormState(prev => ({
          ...prev,
          packageTypes: packageResult.data || []
        }))

      } catch (error) {
        setFormState(prev => ({
          ...prev,
          error: 'Failed to load package types. Please refresh the page.'
        }))
        console.error('Failed to fetch package types:', error)
      } finally {
        setIsLoadingInitial(prev => ({
          ...prev,
          types: false
        }))
      }
    }

    fetchPackageTypes()
  }, [])

  useEffect(() => {
    if (formState.selectedDates.purchase) {
      setFormState(prev => ({ ...prev, error: null }))
      clearErrors(['purchaseDate'])
    }
  }, [formState.selectedDates.purchase, clearErrors])

  const validateForm = async () => {
    console.log('Starting form validation...')
    
    // Check if employee name is selected
    const employeeName = watch('employeeName')
    console.log('Employee name:', employeeName)
    if (!employeeName) {
      setFormState(prev => ({ ...prev, error: 'Please select an employee' }))
      return false
    }
    
    // Check if customer is selected
    if (!formState.selectedCustomerId) {
      setFormState(prev => ({ ...prev, error: 'Please select a customer' }))
      return false
    }
    
    // Check if package type is selected
    const packageTypeId = watch('packageTypeId')
    console.log('Package type ID:', packageTypeId)
    if (!packageTypeId || packageTypeId === 0) {
      setFormState(prev => ({ ...prev, error: 'Please select a package type' }))
      return false
    }
    
    // Check if purchase date is selected
    if (!formState.selectedDates.purchase) {
      setFormState(prev => ({ ...prev, error: 'Purchase date is required' }))
      return false
    }
    
    console.log('All validations passed')
    return true
  }

  const resetForm = () => {
    reset(defaultValues)
    setSelectedCustomerCache(null) // Clear the cache
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
      }
    }))
  }

  const onSubmit = async (data: PackageFormData) => {
    console.log('Form submitted with data:', data)
    console.log('Form state:', formState)
    console.log('Selected customer ID:', formState.selectedCustomerId)
    console.log('Selected dates:', formState.selectedDates)
    
    const isValid = await validateForm()
    console.log('Form validation result:', isValid)
    
    if (!isValid) {
      console.log('Form validation failed')
      return
    }

    // Try cache first, then SWR customers
    let selectedCustomer = selectedCustomerCache && selectedCustomerCache.id === formState.selectedCustomerId 
      ? selectedCustomerCache 
      : customers.find(c => c.id === formState.selectedCustomerId)
    
    console.log('Selected customer:', selectedCustomer)
    
    if (!selectedCustomer) {
      console.log('No customer selected')
      setFormState(prev => ({ ...prev, error: 'Please select a customer' }))
      return
    }

    const customerDisplay = selectedCustomer.contact_number 
      ? `${selectedCustomer.customer_name} (${selectedCustomer.contact_number})`
      : selectedCustomer.customer_name

    console.log('Setting confirmation dialog to true')
    setFormState(prev => ({
      ...prev,
      formData: {
        ...data,
        customerName: customerDisplay,
        purchaseDate: prev.selectedDates.purchase,
      },
      showConfirmation: true
    }))
  }

  const handleConfirm = async () => {
    if (!formState.formData || !formState.selectedDates.purchase) return

    setFormState(prev => ({ ...prev, isLoading: true, showConfirmation: false }))

    try {
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_name: formState.formData.employeeName,
          customer_name: formState.formData.customerName,
          customer_id: formState.selectedCustomerId,
          package_type_id: formState.formData.packageTypeId,
          purchase_date: format(formState.selectedDates.purchase!, 'yyyy-MM-dd'),
          first_use_date: null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create package');
      }

      alert('Package created successfully! The package has been created as inactive and will need to be activated manually when the customer is ready to use it.')
      
      resetForm()
      
    } catch (error) {
      console.error('Error creating package:', error)
      setFormState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error creating package. Please try again.'
      }))
    } finally {
      setFormState(prev => ({ ...prev, isLoading: false }))
    }
  }

  const getPackageTypeName = (id: number) => {
    return formState.packageTypes.find(type => type.id === id)?.name || ''
  }

  const getSelectedCustomerDisplay = () => {
    if (!formState.selectedCustomerId) {
      return 'Select customer'
    }
    
    // First check the cached selected customer
    if (selectedCustomerCache && selectedCustomerCache.id === formState.selectedCustomerId) {
      return selectedCustomerCache.contact_number 
        ? `${selectedCustomerCache.customer_name} (${selectedCustomerCache.contact_number})`
        : selectedCustomerCache.customer_name
    }
    
    // Then check SWR customers
    const swrCustomer = customers.find(c => c.id === formState.selectedCustomerId)
    if (swrCustomer) {
      return swrCustomer.contact_number 
        ? `${swrCustomer.customer_name} (${swrCustomer.contact_number})`
        : swrCustomer.customer_name
    }
    
    // Fallback
    return 'Customer selected'
  }

  const mappedCustomers = useMemo(() => customers.map(customer => ({
    id: customer.id,
    customer_name: customer.customer_name,
    contact_number: customer.contact_number,
    customer_code: customer.customer_code
  })), [customers])

  const handleCustomerSelect = (customer: SimpleCustomer) => {
    console.log('Customer selected:', customer)
    
    // Cache the selected customer
    setSelectedCustomerCache(customer)
    
    setFormState(prev => ({
      ...prev,
      selectedCustomerId: customer.id, // Already a string UUID
      showCustomerDialog: false,
      searchQuery: ''
    }))
    setValue('customerName', customer.customer_name)
    trigger('customerName')
    // Clear any existing customer selection error
    setFormState(prev => ({ ...prev, error: null }))
  }

  if (isLoadingInitial.types) {
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
              console.log('Employee selected:', value)
              setValue('employeeName', value)
              trigger('employeeName')
              // Clear any existing employee selection error
              setFormState(prev => ({ ...prev, error: null }))
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

        <PackageTypeSection
          form={form}
          packageTypes={formState.packageTypes}
        />

        <div className="space-y-2">
          <DatePicker
            value={formState.selectedDates.purchase}
            onChange={(date) => {
              console.log('Purchase date selected:', date)
              setFormState(prev => ({
                ...prev,
                selectedDates: { ...prev.selectedDates, purchase: date }
              }))
              if (date) {
                setValue('purchaseDate', date)
                trigger('purchaseDate')
              }
              // Clear any existing date selection error
              setFormState(prev => ({ ...prev, error: null }))
            }}
            label="Purchase Date"
          />
          {errors.purchaseDate && (
            <p className="text-red-500 text-sm mt-1">{errors.purchaseDate.message}</p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full"
          variant="default"
          disabled={formState.isLoading}
          onClick={() => {
            console.log('Submit button clicked')
            console.log('Current form values:', {
              employeeName: watch('employeeName'),
              customerName: watch('customerName'),
              packageTypeId: watch('packageTypeId'),
              purchaseDate: watch('purchaseDate')
            })
            console.log('Current form state:', formState)
          }}
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