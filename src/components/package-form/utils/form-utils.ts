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
    store: rawCustomer.store,
    customer_name: rawCustomer.customer_name,
    contact_number: rawCustomer.contact_number,
    address: rawCustomer.address,
    email: rawCustomer.email,
    date_of_birth: rawCustomer.date_of_birth,
    date_joined: rawCustomer.date_joined,
    available_credit: rawCustomer.available_credit,
    available_point: rawCustomer.available_point,
    source: rawCustomer.source,
    sms_pdpa: rawCustomer.sms_pdpa,
    email_pdpa: rawCustomer.email_pdpa,
    batch_id: rawCustomer.batch_id,
    update_time: rawCustomer.update_time,
    created_at: rawCustomer.created_at,
    displayName: rawCustomer.contact_number 
      ? `${rawCustomer.customer_name} (${rawCustomer.contact_number})`
      : rawCustomer.customer_name
  }
}