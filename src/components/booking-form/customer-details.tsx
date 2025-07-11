'use client'

import { useState } from 'react'
import { CustomerSearch } from '@/components/package-form/customer-search'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// Customer type for the new customer management system
interface NewCustomer {
  id: string;
  customer_code: string;
  customer_name: string;
  contact_number?: string;
  email?: string;
  preferred_contact_method?: 'Phone' | 'LINE' | 'Email';
  customer_status: string;
  lifetime_spending: string;
  total_bookings: number;
  last_visit_date?: string;
  // Legacy compatibility
  stable_hash_id?: string;
}

interface CustomerDetailsProps {
  isNewCustomer: boolean
  customers: NewCustomer[]
  selectedCustomerId: string
  onCustomerSelect: (customer: NewCustomer) => void
  customerName: string
  onCustomerNameChange: (value: string) => void
  phoneNumber: string
  onPhoneNumberChange: (value: string) => void
  // New search props
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  error?: {
    customer?: string
    customerName?: string
    phoneNumber?: string
  }
}

export function CustomerDetails({ 
  isNewCustomer,
  customers,
  selectedCustomerId,
  onCustomerSelect,
  customerName,
  onCustomerNameChange,
  phoneNumber,
  onPhoneNumberChange,
  searchQuery,
  onSearchQueryChange,
  error
}: CustomerDetailsProps) {
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)

  const getSelectedCustomerDisplay = () => {
    if (!selectedCustomerId) return 'Select customer'
    const customer = customers.find(c => c.id === selectedCustomerId)
    if (!customer) return 'Select customer'
    return customer.contact_number 
      ? `${customer.customer_name} (${customer.contact_number})`
      : customer.customer_name
  }

  const mappedCustomers = customers.map(customer => ({
    id: customer.id, // Keep as string UUID
    customer_name: customer.customer_name, // Just the name, no code prefix
    contact_number: customer.contact_number || null,
    customer_code: customer.customer_code // Keep code separate for badge display
  }));

  const handleCustomerSelection = (simpleCustomer: { id: string; customer_name: string; contact_number: string | null }) => {
    const originalCustomer = customers.find(c => c.id === simpleCustomer.id)
    if (originalCustomer) {
      onCustomerSelect(originalCustomer)
    }
  }

  return (
    <div className="space-y-4">
      {isNewCustomer ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              type="text"
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
            />
            {error?.customerName && (
              <p className="text-sm text-red-500">{error.customerName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="Enter phone number"
              value={phoneNumber}
              onChange={(e) => onPhoneNumberChange(e.target.value)}
            />
            {error?.phoneNumber && (
              <p className="text-sm text-red-500">{error.phoneNumber}</p>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label>Select Customer</Label>
          <CustomerSearch
            customers={mappedCustomers}
            selectedCustomerId={selectedCustomerId}
            showCustomerDialog={showCustomerDialog}
            searchQuery={searchQuery}
            onSearchQueryChange={onSearchQueryChange}
            onCustomerSelect={handleCustomerSelection}
            onDialogOpenChange={setShowCustomerDialog}
            getSelectedCustomerDisplay={() => {
              if (!selectedCustomerId) return 'Select customer'
              const customer = customers.find(c => c.id === selectedCustomerId)
              if (!customer) return 'Select customer'
              
              // Return an object for complex display with badge
              return {
                text: customer.contact_number 
                  ? `${customer.customer_name} (${customer.contact_number})`
                  : customer.customer_name,
                badge: customer.customer_code
              }
            }}
          />
          {error?.customer && (
            <p className="text-sm text-red-500">{error.customer}</p>
          )}
        </div>
      )}
    </div>
  )
}