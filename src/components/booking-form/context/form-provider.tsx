'use client'

import type { FormData } from '../types'
import { FormContext, type FormContextType } from './form-context'

interface FormProviderProps {
  value: FormContextType;
  children: React.ReactNode;
}

export const FormProvider = ({ value, children }: FormProviderProps) => (
  <FormContext.Provider value={value}>
    {children}
  </FormContext.Provider>
);

export function validateStep1(formData: FormData) {
  const errors: Record<string, string> = {}

  if (!formData.employeeName) {
    errors.employeeName = 'Please select an employee'
  }

  if (!formData.customerContactedVia) {
    errors.customerContactedVia = 'Please select how customer was contacted'
  }

  if (!formData.bookingType) {
    errors.bookingType = 'Please select booking type'
  }

  return errors
}

export function validateStep2(formData: FormData, phoneError?: string) {
  const errors: Record<string, string> = {}

  if (!formData.isNewCustomer) {
    if (!formData.customerId) {
      errors.customerId = 'Please select a customer'
    }
    if (formData.bookingType === 'Package') {
      // For "Will buy Package", we need packageId to be null and packageName to be filled
      if (formData.packageId === '') {
        errors.packageId = 'Please select a package'
      } else if (formData.packageId === null && !formData.packageName) {
        errors.packageId = 'Please enter package name'
      }
    }
  } else {
    if (!formData.customerName) {
      errors.customerName = 'Please enter customer name'
    }
    if (!formData.customerPhone) {
      errors.customerPhone = 'Please enter customer phone number'
    }
    // Block progression if there's a phone validation error
    if (phoneError) {
      errors.customerPhone = phoneError
    }
  }

  return errors
}

export function validateStep3(formData: FormData) {
  const errors: Record<string, string> = {}

  if (!formData.bookingDate) {
    errors.bookingDate = 'Please select a date'
  }

  if (!formData.startTime) {
    errors.startTime = 'Please select a start time'
  }

  if (!formData.bayNumber) {
    errors.bay = 'Please select a bay'
  }

  return errors
}