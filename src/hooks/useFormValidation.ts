'use client'

import { useState, useCallback } from 'react'
import { ValidationError, ScheduleError } from '@/types/errors'
import { 
  validateScheduleCreate, 
  validateScheduleUpdate, 
  ScheduleCreateData, 
  ScheduleUpdateData,
  groupValidationErrorsByField 
} from '@/lib/validation'

interface UseFormValidationOptions {
  validateOnChange?: boolean
  validateOnBlur?: boolean
  showUserFriendlyMessages?: boolean
}

interface UseFormValidationReturn<T> {
  errors: Record<string, ValidationError[]>
  hasErrors: boolean
  isValid: boolean
  validate: (data: T) => boolean
  validateField: (field: string, value: any, data: T) => boolean
  clearErrors: () => void
  clearFieldError: (field: string) => void
  setFieldError: (field: string, error: ValidationError) => void
  getFieldError: (field: string) => string | null
  getAllErrors: () => string[]
}

export function useFormValidation<T extends ScheduleCreateData | ScheduleUpdateData>(
  validationType: 'create' | 'update',
  options: UseFormValidationOptions = {}
): UseFormValidationReturn<T> {
  const [errors, setErrors] = useState<Record<string, ValidationError[]>>({})

  const validate = useCallback((data: T): boolean => {
    let validationErrors: ValidationError[] = []
    
    if (validationType === 'create') {
      validationErrors = validateScheduleCreate(data as ScheduleCreateData)
    } else {
      validationErrors = validateScheduleUpdate(data as ScheduleUpdateData)
    }
    
    const groupedErrors = groupValidationErrorsByField(validationErrors)
    setErrors(groupedErrors)
    
    return validationErrors.length === 0
  }, [validationType])

  const validateField = useCallback((field: string, value: any, data: T): boolean => {
    // Create a copy of data with the updated field
    const updatedData = { ...data, [field]: value }
    
    let validationErrors: ValidationError[] = []
    if (validationType === 'create') {
      validationErrors = validateScheduleCreate(updatedData as ScheduleCreateData)
    } else {
      validationErrors = validateScheduleUpdate(updatedData as ScheduleUpdateData)
    }
    
    // Filter errors for this specific field
    const fieldErrors = validationErrors.filter(error => error.field === field)
    
    setErrors(prev => ({
      ...prev,
      [field]: fieldErrors
    }))
    
    return fieldErrors.length === 0
  }, [validationType])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  const setFieldError = useCallback((field: string, error: ValidationError) => {
    setErrors(prev => ({
      ...prev,
      [field]: [error]
    }))
  }, [])

  const getFieldError = useCallback((field: string): string | null => {
    const fieldErrors = errors[field]
    return fieldErrors && fieldErrors.length > 0 ? fieldErrors[0].message : null
  }, [errors])

  const getAllErrors = useCallback((): string[] => {
    return Object.values(errors)
      .flat()
      .map(error => error.message)
  }, [errors])

  const hasErrors = Object.keys(errors).length > 0
  const isValid = !hasErrors

  return {
    errors,
    hasErrors,
    isValid,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    setFieldError,
    getFieldError,
    getAllErrors
  }
}

// Specialized hooks for different form types
export function useScheduleCreateValidation(options?: UseFormValidationOptions) {
  return useFormValidation<ScheduleCreateData>('create', options)
}

export function useScheduleUpdateValidation(options?: UseFormValidationOptions) {
  return useFormValidation<ScheduleUpdateData>('update', options)
}

// Hook for handling API errors in forms
export function useApiErrorHandler() {
  const [apiError, setApiError] = useState<ScheduleError | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: ScheduleError) => void
  ): Promise<T | null> => {
    try {
      setIsSubmitting(true)
      setApiError(null)
      
      const result = await apiCall()
      
      if (onSuccess) {
        onSuccess(result)
      }
      
      return result
    } catch (error: any) {
      const scheduleError = error as ScheduleError
      setApiError(scheduleError)
      
      if (onError) {
        onError(scheduleError)
      }
      
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const clearApiError = useCallback(() => {
    setApiError(null)
  }, [])

  return {
    apiError,
    isSubmitting,
    handleApiCall,
    clearApiError
  }
}