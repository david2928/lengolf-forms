'use client'

import { useState, useEffect, useCallback } from 'react'
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
  // Customer cache
  selectedCustomerCache: NewCustomer | null
  error?: {
    customer?: string
    customerName?: string
    phoneNumber?: string
  }
  // Callback for phone validation error
  onPhoneError?: (error: string) => void
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
  selectedCustomerCache,
  error,
  onPhoneError
}: CustomerDetailsProps) {
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  const [phoneError, setPhoneError] = useState<string>('')

  const getSelectedCustomerDisplay = () => {
    if (!selectedCustomerId) return 'Select customer'
    
    // First check the cached selected customer
    if (selectedCustomerCache && selectedCustomerCache.id === selectedCustomerId) {
      return selectedCustomerCache.contact_number 
        ? `${selectedCustomerCache.customer_name} (${selectedCustomerCache.contact_number})`
        : selectedCustomerCache.customer_name
    }
    
    // Then check SWR customers
    const customer = customers.find(c => c.id === selectedCustomerId)
    if (customer) {
      return customer.contact_number 
        ? `${customer.customer_name} (${customer.contact_number})`
        : customer.customer_name
    }
    
    // Fallback
    return 'Customer selected'
  }

  // Check for phone number duplicates (simplified - just validation)
  const checkPhoneDuplicates = useCallback(async (): Promise<void> => {
    if (!phoneNumber || phoneNumber.length < 8) {
      setPhoneError('');
      return;
    }

    try {
      const response = await fetch('/api/customers/search-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: customerName || 'temp',
          primaryPhone: phoneNumber,
          email: undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Check for exact phone matches only
        const exactPhoneMatch = (data.potentialDuplicates || []).find((dup: any) => 
          dup.matchReasons && 
          dup.matchReasons.some((reason: string) => reason.includes('Phone number match'))
        );
        
        if (exactPhoneMatch) {
          const errorMsg = 'This phone number is already registered to another customer';
          setPhoneError(errorMsg);
          onPhoneError?.(errorMsg);
        } else {
          setPhoneError('');
          onPhoneError?.('');
        }
      }
    } catch (error) {
      console.error('Error checking phone duplicates:', error);
    }
  }, [phoneNumber, customerName, setPhoneError, onPhoneError]);

  // Auto-check for phone duplicates when phone number changes
  useEffect(() => {
    if (isNewCustomer) {
      const timeoutId = setTimeout(checkPhoneDuplicates, 500); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [phoneNumber, isNewCustomer, checkPhoneDuplicates]);

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
              className={phoneError || error?.phoneNumber ? 'border-red-500' : ''}
            />
            {(phoneError || error?.phoneNumber) && (
              <p className="text-sm text-red-500">{phoneError || error?.phoneNumber}</p>
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
              
              // First check the cached selected customer
              if (selectedCustomerCache && selectedCustomerCache.id === selectedCustomerId) {
                return {
                  text: selectedCustomerCache.contact_number 
                    ? `${selectedCustomerCache.customer_name} (${selectedCustomerCache.contact_number})`
                    : selectedCustomerCache.customer_name,
                  badge: selectedCustomerCache.customer_code
                }
              }
              
              // Then check SWR customers
              const customer = customers.find(c => c.id === selectedCustomerId)
              if (customer) {
                return {
                  text: customer.contact_number 
                    ? `${customer.customer_name} (${customer.contact_number})`
                    : customer.customer_name,
                  badge: customer.customer_code
                }
              }
              
              // Fallback
              return 'Customer selected'
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