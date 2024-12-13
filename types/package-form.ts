// types/package-form.ts

export const EMPLOYEES = ['Dolly', 'May', 'Net', 'Winnie'] as const

export interface Customer {
  id?: string
  name: string
  contactNumber: string
  displayName?: string
  dateJoined: string  // Changed to required to match API response
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