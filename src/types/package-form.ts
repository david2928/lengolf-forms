import { UseFormReturn } from 'react-hook-form'

export interface Customer {
  id: number
  store: string
  customer_name: string
  contact_number: string | null
  address: string | null
  email: string | null
  date_of_birth: string | null
  date_joined: string | null
  available_credit: number | null
  available_point: number | null
  source: string | null
  sms_pdpa: boolean | null
  email_pdpa: boolean | null
  batch_id: string
  update_time: string
  created_at: string | null
  stable_hash_id: string | null
  displayName?: string // Added for UI purposes
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