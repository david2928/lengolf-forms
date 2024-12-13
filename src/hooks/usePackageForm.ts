import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { 
  PackageFormData, 
  FormState,
  Customer 
} from '@/types/package-form'
import {
  validateDates,
  formatFormDataForSubmission,
  transformCustomerData,
  resetFormState,
  validateForm,
  formatErrorMessage
} from '@/components/package-form/utils/form-utils'

const defaultValues: PackageFormData = {
  employeeName: '',
  customerName: '',
  packageTypeId: 0,
  purchaseDate: null,
  firstUseDate: null
}

export const usePackageForm = () => {
  const [state, setState] = useState<FormState>({
    packageTypes: [],
    customers: [],
    isLoading: true,
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

  const form = useForm<PackageFormData>({
    defaultValues,
    mode: 'onBlur'
  })

  const updateState = (updates: Partial<FormState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  const fetchData = useCallback(async () => {
    try {
      const [packageResult, customersResponse] = await Promise.all([
        supabase
          .from('package_types')
          .select('id, name, display_order')
          .order('display_order'),
        fetch('/api/customers')
      ])

      if (packageResult.error) throw packageResult.error
      
      const customersData = await customersResponse.json()
      if (!customersResponse.ok) throw new Error(customersData.error)

      updateState({
        packageTypes: packageResult.data || [],
        customers: customersData.customers.map(transformCustomerData),
        isLoading: false
      })
    } catch (error) {
      console.error('Failed to fetch data:', error)
      updateState({
        error: formatErrorMessage(error),
        isLoading: false
      })
    }
  }, []) // Empty dependency array as it doesn't depend on any props or state

  const handleCustomerSelect = (customer: Customer) => {
    updateState({
      selectedCustomerId: customer.id,
      showCustomerDialog: false,
      searchQuery: ''
    })
    form.setValue('customerName', customer.name)
    form.trigger('customerName')
  }

  const handleSubmit = async (data: PackageFormData) => {
    const { purchase: purchaseDate, firstUse: firstUseDate } = state.selectedDates
    const dateError = validateDates(purchaseDate, firstUseDate)
    
    if (dateError) {
      updateState({ error: dateError })
      return
    }

    const formErrors = validateForm({
      ...data,
      purchaseDate,
      firstUseDate
    })

    if (formErrors.length > 0) {
      updateState({ error: formErrors.join(', ') })
      return
    }
    
    const formDataWithDates: PackageFormData = {
      ...data,
      purchaseDate,
      firstUseDate
    }

    updateState({
      formData: formDataWithDates,
      showConfirmation: true,
      error: null
    })
  }

  const confirmSubmit = async () => {
    if (!state.formData) return

    updateState({ isLoading: true, showConfirmation: false })

    try {
      const formattedData = formatFormDataForSubmission(state.formData)
      const { error: submitError } = await supabase
        .from('packages')
        .insert([formattedData])

      if (submitError) throw submitError
      
      form.reset(defaultValues)
      updateState({
        ...resetFormState(defaultValues)
      })
      alert('Package created successfully!')
    } catch (error) {
      console.error('Error creating package:', error)
      updateState({ error: formatErrorMessage(error) })
    } finally {
      updateState({ isLoading: false })
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData]) // Added fetchData to dependency array

  return {
    form,
    state,
    updateState,
    handleCustomerSelect,
    handleSubmit: form.handleSubmit(handleSubmit),
    confirmSubmit
  }
}