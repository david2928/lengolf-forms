'use client'

import { useState } from 'react'
import { CustomerSearch } from '@/components/package-form/customer-search'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Customer } from '@/types/package-form'

interface CustomerDetailsProps {
  isNewCustomer: boolean
  customers: Customer[]
  selectedCustomerId: string
  onCustomerSelect: (customer: Customer) => void
  customerName: string
  onCustomerNameChange: (value: string) => void
  phoneNumber: string
  onPhoneNumberChange: (value: string) => void
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
  error
}: CustomerDetailsProps) {
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const getSelectedCustomerDisplay = () => {
    if (!selectedCustomerId) return 'Select customer'
    const customer = customers.find(c => c.id.toString() === selectedCustomerId)
    if (!customer) return 'Select customer'
    return customer.contact_number 
      ? `${customer.customer_name} (${customer.contact_number})`
      : customer.customer_name
  }

  const mappedCustomers = customers.map(customer => ({
    id: customer.id,
    customer_name: customer.customer_name,
    contact_number: customer.contact_number
  }));

  const handleCustomerSelection = (simpleCustomer: { id: number; customer_name: string; contact_number: string | null }) => {
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
            onSearchQueryChange={setSearchQuery}
            onCustomerSelect={handleCustomerSelection}
            onDialogOpenChange={setShowCustomerDialog}
            getSelectedCustomerDisplay={getSelectedCustomerDisplay}
          />
          {error?.customer && (
            <p className="text-sm text-red-500">{error.customer}</p>
          )}
        </div>
      )}
    </div>
  )
}