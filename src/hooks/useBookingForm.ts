import { useState } from 'react'
import { BookingFormData, BookingSource, BookingType } from '@/types/booking-form'
import type { Customer } from '@/types/package-form'

interface FormErrors {
  employeeName?: string
  customerContactedVia?: string
  bookingType?: string
  customerPhone?: string
  customerId?: string
  packageId?: string
  numberOfPax?: string
  bookingDate?: string
  bay?: string
  time?: string
}

interface UseBookingFormReturn {
  formData: Partial<BookingFormData>
  errors: FormErrors
  setFormValue: <K extends keyof BookingFormData>(
    key: K,
    value: BookingFormData[K]
  ) => void
  handleCustomerSelect: (customer: Customer) => void
  handlePackageSelect: (packageId: string, name: string) => void
  validateStep: (step: number) => boolean
  resetForm: () => void
  isStepValid: (step: number) => boolean
}

const initialFormData: Partial<BookingFormData> = {
  numberOfPax: 1,
}

export function useBookingForm(): UseBookingFormReturn {
  const [formData, setFormData] = useState<Partial<BookingFormData>>(initialFormData)
  const [errors, setErrors] = useState<FormErrors>({})

  const setFormValue = <K extends keyof BookingFormData>(
    key: K,
    value: BookingFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    // Clear error when field is updated
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const handleCustomerSelect = (customer: Customer) => {
    // Format the customer name with phone number if available, ensuring no extra spaces
    const formattedName = customer.contact_number 
      ? `${customer.customer_name.trim()} (${customer.contact_number.trim()})`
      : customer.customer_name.trim();

    setFormData((prev) => ({
      ...prev,
      customerId: customer.id.toString(),
      customerName: formattedName,
      customerPhone: customer.contact_number?.trim() || '',
      customerStableHashId: customer.stable_hash_id,
      // Clear package-related data when switching customers
      packageId: undefined,
      packageName: undefined
    }))
    setErrors((prev) => ({ 
      ...prev, 
      customerId: undefined,
      packageId: undefined 
    }))
  }

  const handlePackageSelect = (packageId: string, name: string) => {
    setFormData((prev) => ({
      ...prev,
      packageId,
      packageName: name,
    }))
    setErrors((prev) => ({ ...prev, packageId: undefined }))
  }

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {}

    switch (step) {
      case 1:
        if (!formData.employeeName) {
          newErrors.employeeName = 'Employee name is required'
        }
        if (!formData.customerContactedVia) {
          newErrors.customerContactedVia = 'Please select how customer contacted'
        }
        if (!formData.bookingType) {
          newErrors.bookingType = 'Booking type is required'
        }
        break

      case 2:
        if (formData.isNewCustomer) {
          if (!formData.customerPhone) {
            newErrors.customerPhone = 'Phone number is required'
          }
        } else {
          if (!formData.customerId) {
            newErrors.customerId = 'Please select a customer'
          }
        }
        if (formData.bookingType === 'Package' && !formData.packageId) {
          newErrors.packageId = 'Please select a package'
        }
        break

      case 3:
        if (!formData.numberOfPax) {
          newErrors.numberOfPax = 'Number of pax is required'
        }
        if (!formData.bookingDate) {
          newErrors.bookingDate = 'Date is required'
        }
        if (!formData.bayNumber) {
          newErrors.bay = 'Please select a bay'
        }
        if (!formData.startTime || !formData.endTime) {
          newErrors.time = 'Please select a time slot'
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.employeeName &&
          formData.customerContactedVia &&
          formData.bookingType
        )
      case 2:
        if (formData.isNewCustomer) {
          return !!formData.customerPhone
        }
        return !!(
          formData.customerId &&
          (formData.bookingType !== 'Package' || formData.packageId)
        )
      case 3:
        return !!(
          formData.numberOfPax &&
          formData.bookingDate &&
          formData.bayNumber &&
          formData.startTime &&
          formData.endTime
        )
      default:
        return false
    }
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setErrors({})
  }

  return {
    formData,
    errors,
    setFormValue,
    handleCustomerSelect,
    handlePackageSelect,
    validateStep,
    resetForm,
    isStepValid,
  }
}