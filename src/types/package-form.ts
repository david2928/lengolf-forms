import { UseFormReturn } from 'react-hook-form'

export interface Customer {
  name: string
  contactNumber: string
  dateJoined: string
  id: string
  displayName: string
}

export interface PackageType {
  id: number
  name: string
  display_order: number
}

export interface PackageFormData {
  employeeName: string
  customerName: string
  packageTypeId: number
  purchaseDate: Date | null
  firstUseDate: Date | null
}

export const EMPLOYEES = ['Dolly', 'May', 'Net', 'Winnie'] as const
export type Employee = typeof EMPLOYEES[number]

export interface FormState {
  packageTypes: PackageType[]
  customers: Customer[]
  isLoading: boolean
  error: string | null
  selectedCustomerId: string
  showCustomerDialog: boolean
  searchQuery: string
  showConfirmation: boolean
  formData: PackageFormData | null
  selectedDates: {
    purchase: Date | null
    firstUse: Date | null
  }
}

// Section Props Types
export interface BaseSectionProps {
  form: UseFormReturn<PackageFormData>
}

export interface EmployeeSectionProps extends BaseSectionProps {}

export interface CustomerSectionProps extends BaseSectionProps {
  customers: Customer[]
  selectedCustomerId: string
  showCustomerDialog: boolean
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  onCustomerSelect: (customer: Customer) => void
  onDialogOpenChange: (open: boolean) => void
}

export interface PackageTypeSectionProps extends BaseSectionProps {
  packageTypes: PackageType[]
}

export interface DatesSectionProps extends BaseSectionProps {
  selectedDates: FormState['selectedDates']
  onDatesChange: (dates: { purchase?: Date | null; firstUse?: Date | null }) => void
}

// Dialog Props
export interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: PackageFormData | null
  onConfirm: () => void
  getPackageTypeName: (id: number) => string
}

// Customer Search Props
export interface CustomerSearchProps {
  customers: Customer[]
  selectedCustomerId: string
  showCustomerDialog: boolean
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  onCustomerSelect: (customer: Customer) => void
  onDialogOpenChange: (open: boolean) => void
  getSelectedCustomerDisplay: () => string
}