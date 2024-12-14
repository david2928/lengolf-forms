'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { 
  FormState, 
  Customer, 
  PackageType,
  PackageFormData,
} from '@/types/package-form'
import { format } from 'date-fns'

const defaultValues: PackageFormData = {
  employeeName: '',
  customerName: '',
  packageTypeId: 0,
  purchaseDate: null,
  firstUseDate: null
}

export function usePackageForm() {
  const [state, setState] = useState<FormState>({
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
      firstUse: null,
    }
  })

  const form = useForm<PackageFormData>({
    defaultValues,
    mode: 'onBlur'
  })

  const { setValue, trigger, clearErrors } = form

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
        const customersResponse = await fetch('/api/customers')
        const customersData = await customersResponse.json()
        
        if (!customersResponse.ok) throw new Error(customersData.error)
        
        // Transform the customers data
        const transformedCustomers: Customer[] = customersData.customers.map((customer: any) => ({
          name: customer.name,
          contactNumber: customer.contactNumber,
          dateJoined: customer.dateJoined || new Date().toISOString(),
          id: `${customer.name}-${customer.contactNumber}`,
          displayName: `${customer.name} (${customer.contactNumber})`
        }))

        setState(prev => ({
          ...prev,
          packageTypes: packageData || [],
          customers: transformedCustomers,
          error: null
        }))

      } catch (error) {
        console.error('Failed to fetch data:', error)
        setState(prev => ({
          ...prev,
          error: 'Failed to load data. Please refresh the page.'
        }))
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (state.selectedDates.purchase && state.selectedDates.firstUse) {
      if (state.selectedDates.firstUse < state.selectedDates.purchase) {
        setState(prev => ({
          ...prev,
          error: 'First use date must be after purchase date'
        }))
      } else {
        setState(prev => ({ ...prev, error: null }))
        clearErrors(['purchaseDate', 'firstUseDate'])
      }
    }
  }, [state.selectedDates.purchase, state.selectedDates.firstUse, clearErrors])

  const resetForm = useCallback(() => {
    form.reset(defaultValues)
    setState(prev => ({
      ...prev,
      selectedCustomerId: '',
      selectedDates: {
        purchase: null,
        firstUse: null
      },
      formData: null,
      error: null
    }))
  }, [form])

  const handleSubmit = useCallback(async (data: PackageFormData) => {
    // Form validation
    const isValid = await trigger()
    if (!isValid) return false
    
    if (!state.selectedDates.purchase) {
      setState(prev => ({ ...prev, error: 'Purchase date is required' }))
      return false
    }
    
    if (!state.selectedDates.firstUse) {
      setState(prev => ({ ...prev, error: 'First use date is required' }))
      return false
    }
    
    if (state.selectedDates.firstUse < state.selectedDates.purchase) {
      setState(prev => ({ ...prev, error: 'First use date must be after purchase date' }))
      return false
    }

    setState(prev => ({
      ...prev,
      formData: {
        ...data,
        purchaseDate: state.selectedDates.purchase,
        firstUseDate: state.selectedDates.firstUse
      },
      showConfirmation: true
    }))

    return true
  }, [state.selectedDates, trigger])

  const handleConfirm = useCallback(async () => {
    if (!state.formData?.purchaseDate || !state.formData?.firstUseDate) return

    setState(prev => ({ ...prev, isLoading: true, showConfirmation: false }))

    try {
      const { error } = await supabase
        .from('packages')
        .insert([{
          employee_name: state.formData.employeeName,
          customer_name: state.formData.customerName,
          package_type_id: state.formData.packageTypeId,
          purchase_date: format(state.formData.purchaseDate, 'yyyy-MM-dd'),
          first_use_date: format(state.formData.firstUseDate, 'yyyy-MM-dd')
        }])

      if (error) throw error

      alert('Package created successfully!')
      resetForm()
      
    } catch (error) {
      console.error('Error creating package:', error)
      setState(prev => ({
        ...prev,
        error: 'Error creating package. Please try again.'
      }))
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [state.formData, resetForm])

  const handleCustomerSelect = useCallback((customer: Customer) => {
    setState(prev => ({
      ...prev,
      selectedCustomerId: customer.id || '',
      showCustomerDialog: false,
      searchQuery: ''
    }))
    setValue('customerName', customer.name)
  }, [setValue])

  const handleDateChange = useCallback((type: 'purchase' | 'firstUse', date: Date | null) => {
    setState(prev => ({
      ...prev,
      selectedDates: {
        ...prev.selectedDates,
        [type]: date
      }
    }))
    if (date) {
      setValue(type === 'purchase' ? 'purchaseDate' : 'firstUseDate', date)
    }
    trigger(type === 'purchase' ? 'purchaseDate' : 'firstUseDate')
  }, [setValue, trigger])

  return {
    state,
    form,
    handleSubmit,
    handleConfirm,
    handleCustomerSelect,
    handleDateChange,
    setState,
  }
}