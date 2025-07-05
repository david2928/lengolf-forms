'use client'

import { CustomerSearch } from '@/components/package-form/customer-search'
import { Label } from '@/components/ui/label'
import type { CustomerSectionProps } from '@/types/package-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface SimpleCustomer {
  id: number;
  customer_name: string;
  contact_number: string | null;
}

export function CustomerSection({
  form,
  customers,
  selectedCustomerId,
  showCustomerDialog,
  searchQuery,
  onSearchQueryChange,
  onCustomerSelect,
  onDialogOpenChange
}: CustomerSectionProps) {
  const displayCustomer = customers.find(c => c.id === parseInt(selectedCustomerId))
  
  const getSelectedCustomerDisplay = () => {
    if (!displayCustomer) return 'Select customer'
    return displayCustomer.contact_number 
      ? `${displayCustomer.customer_name} (${displayCustomer.contact_number})`
      : displayCustomer.customer_name
  }

  const handleCustomerSelect = (simpleCustomer: SimpleCustomer) => {
    const originalCustomer = customers.find(c => c.id === simpleCustomer.id)
    if (originalCustomer) {
      onCustomerSelect(originalCustomer)
    }
  }

  const mappedCustomers = customers.map(customer => ({
    id: customer.id,
    customer_name: customer.customer_name,
    contact_number: customer.contact_number
  }))

  return (
    <div className="space-y-6">
      <div>
        <Label>Customer</Label>
        <CustomerSearch
          customers={mappedCustomers}
          selectedCustomerId={selectedCustomerId}
          showCustomerDialog={showCustomerDialog}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          onCustomerSelect={handleCustomerSelect}
          onDialogOpenChange={onDialogOpenChange}
          getSelectedCustomerDisplay={getSelectedCustomerDisplay}
        />
        {form.formState.errors.customerName && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Invalid Customer</AlertTitle>
            <AlertDescription>
              {form.formState.errors.customerName.message}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}