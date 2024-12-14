// Database types
export interface PackageType {
  id: number
  name: string
  hours: number | null
  priority: number
}

export interface Package {
  id: string
  customer_name: string
  package_type_id: number
  purchase_date: string
  first_use_date: string
  expiration_date: string
  employee_name: string
  package_types?: PackageType
}

export interface PackageUsage {
  id: string
  package_id: string
  employee_name: string
  used_hours: number
  used_date: string
  created_at: string
  updated_at: string
  package_type_id: number
}

// API response types
export interface AvailablePackage {
  id: string
  label: string
  details: {
    customerName: string
    packageTypeName: string
    firstUseDate: string
    expirationDate: string
    remainingHours: number | null
  }
}

export interface PackageDetails extends Package {
  remainingHours: number | null
  daysRemaining: number
  usageHistory: PackageUsage[]
  isExpired: boolean
  totalUsedHours: number
}

// Form types
export interface PackageUsageFormData {
  employeeName: string | null
  packageId: string | null
  usedHours: number | null
  usedDate: Date | null
}

export interface UsageFormState {
  isLoading: boolean
  error: string | null
  success: boolean
}

// Component prop types
export interface EmployeeSectionProps {
  value: string | null
  onChange: (value: string) => void
}

export interface PackageSelectorProps {
  value: string | null
  onChange: (value: string) => void
  isLoading?: boolean
  error?: string
}

export interface PackageInfoCardProps {
  packageId: string
  isLoading?: boolean
  error?: string
}

export interface HoursInputProps {
  value: number | null
  onChange: (value: number) => void
  maxHours?: number
  isDisabled?: boolean
}

export interface DatePickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  minDate?: Date
  maxDate?: Date
  isDisabled?: boolean
}