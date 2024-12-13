import { format, isAfter, isBefore, isEqual } from 'date-fns'
import { Customer, PackageType, PackageFormData } from '@/types/package-form'

export const validateDates = (purchaseDate: Date | null, firstUseDate: Date | null): string | null => {
  if (!purchaseDate || !firstUseDate) return null
  
  if (isBefore(firstUseDate, purchaseDate)) {
    return 'First use date must be after purchase date'
  }
  
  if (isEqual(firstUseDate, purchaseDate)) {
    return 'First use date must be different from purchase date'
  }
  
  return null
}

export const formatFormDataForSubmission = (formData: PackageFormData) => {
  return {
    employee_name: formData.employeeName,
    customer_name: formData.customerName,
    package_type_id: formData.packageTypeId,
    purchase_date: formData.purchaseDate ? format(formData.purchaseDate, 'yyyy-MM-dd') : null,
    first_use_date: formData.firstUseDate ? format(formData.firstUseDate, 'yyyy-MM-dd') : null
  }
}

export const transformCustomerData = (rawCustomer: any): Customer => {
  return {
    name: rawCustomer.name,
    contactNumber: rawCustomer.contactNumber,
    dateJoined: rawCustomer.dateJoined || new Date().toISOString(),
    id: `${rawCustomer.name}-${rawCustomer.contactNumber}`,
    displayName: `${rawCustomer.name} (${rawCustomer.contactNumber})`
  }
}

export const filterCustomers = (customers: Customer[], searchQuery: string): Customer[] => {
  const query = searchQuery.toLowerCase().trim()
  if (!query) return customers

  return customers.filter(customer => 
    customer.name.toLowerCase().includes(query) ||
    customer.contactNumber.includes(query)
  )
}

export const getDisplayNameForCustomer = (
  customerId: string, 
  customers: Customer[]
): string => {
  const customer = customers.find(c => c.id === customerId)
  return customer ? customer.displayName : 'Select customer'
}

export const getPackageTypeName = (
  packageTypeId: number,
  packageTypes: PackageType[]
): string => {
  const packageType = packageTypes.find(type => type.id === packageTypeId)
  return packageType ? packageType.name : ''
}

export const resetFormState = (defaultValues: PackageFormData) => {
  return {
    formData: defaultValues,
    selectedDates: { purchase: null, firstUse: null },
    selectedCustomerId: '',
    searchQuery: '',
    showCustomerDialog: false,
    showConfirmation: false,
    error: null
  }
}

export const validateForm = (formData: PackageFormData): string[] => {
  const errors: string[] = []

  if (!formData.employeeName) {
    errors.push('Employee name is required')
  }

  if (!formData.customerName) {
    errors.push('Customer name is required')
  }

  if (!formData.packageTypeId) {
    errors.push('Package type is required')
  }

  if (!formData.purchaseDate) {
    errors.push('Purchase date is required')
  }

  if (!formData.firstUseDate) {
    errors.push('First use date is required')
  }

  const dateError = validateDates(formData.purchaseDate, formData.firstUseDate)
  if (dateError) {
    errors.push(dateError)
  }

  return errors
}

export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}