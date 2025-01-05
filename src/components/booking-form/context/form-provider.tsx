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

export function validateStep2(formData: FormData) {
  const errors: Record<string, string> = {}

  if (!formData.isNewCustomer) {
    if (!formData.customerId) {
      errors.customerId = 'Please select a customer'
    }
    if (formData.bookingType === 'Package' && !formData.packageId) {
      errors.packageId = 'Please select a package'
    }
  } else {
    if (!formData.customerName) {
      errors.customerName = 'Please enter customer name'
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