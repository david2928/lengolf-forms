'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { refacSupabase } from '@/lib/refac-supabase'
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

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch package types
        const { data: packageData, error: packageError } = await refacSupabase
          .schema('backoffice')
          .from('package_types')
          .select('id, name, display_order, type')
          .order('display_order', { ascending: true })

        if (packageError) throw packageError

        // Fetch customers
        const { data: customersData, error: customersError } = await refacSupabase
          .schema('backoffice')
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

    const selectedCustomer = formState.customers.find(c => c.id.toString() === formState.selectedCustomerId)
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
      const { error } = await refacSupabase
        .schema('backoffice')
        .from('packages')
        .insert([{
          employee_name: formState.formData.employeeName,
          customer_name: formState.formData.customerName,
          package_type_id: formState.formData.packageTypeId,
          purchase_date: format(formState.selectedDates.purchase!, 'yyyy-MM-dd'),
          first_use_date: null
        }])

      if (error) throw error
      alert('Package created successfully! The package has been created as inactive and will need to be activated manually when the customer is ready to use it.')
      
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
    console.log('Customer selected:', customer)
    setFormState(prev => ({
      ...prev,
      selectedCustomerId: customer.id.toString(),
      showCustomerDialog: false,
      searchQuery: ''
    }))
    setValue('customerName', customer.customer_name)
    trigger('customerName')
    // Clear any existing customer selection error
    setFormState(prev => ({ ...prev, error: null }))
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