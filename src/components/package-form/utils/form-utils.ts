import { Customer } from "@/types/package-form"

/**
 * Validates if the provided date exists and is valid
 */
export function isValidDate(date: any) {
  return date && !isNaN(date)
}

/**
 * Checks if the first use date is after purchase date
 */
export function isFirstUseDateValid(purchaseDate: Date | null, firstUseDate: Date | null) {
  if (!purchaseDate || !firstUseDate) return false
  return firstUseDate >= purchaseDate
}

/**
 * Formats API error message for display
 */
export function formatErrorMessage(error: any): string {
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  return 'An unexpected error occurred'
}

/**
 * Maps raw customer data from API to Customer type
 */
export function transformCustomer(rawCustomer: any): Customer {
  return {
    id: rawCustomer.id,
    customer_code: rawCustomer.customer_code,
    customer_name: rawCustomer.customer_name,
    contact_number: rawCustomer.contact_number,
    email: rawCustomer.email,
    preferred_contact_method: rawCustomer.preferred_contact_method,
    customer_status: rawCustomer.customer_status,
    lifetime_spending: rawCustomer.lifetime_spending,
    total_bookings: rawCustomer.total_bookings,
    last_visit_date: rawCustomer.last_visit_date,
    created_at: rawCustomer.created_at,
    is_active: rawCustomer.is_active,
    stable_hash_id: rawCustomer.stable_hash_id,
    displayName: rawCustomer.contact_number 
      ? `${rawCustomer.customer_name} (${rawCustomer.contact_number})`
      : rawCustomer.customer_name
  }
}