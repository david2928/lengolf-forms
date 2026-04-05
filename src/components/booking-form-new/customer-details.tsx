'use client'

import { useState, useEffect, useCallback } from 'react'
import { CustomerSearch } from '@/components/package-form/customer-search'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomerSelfServiceOverlay, type CustomerSelfServiceData } from './customer-self-service'
import { toast } from 'sonner'
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
  active_packages?: number;
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
  // Customer self-service callbacks
  customerEmail?: string
  onCustomerEmailChange?: (value: string) => void
  referralSource?: string | null
  onReferralSourceChange?: (value: string | null) => void
  // Callback when customer is created via self-service
  onSelfServiceCustomerCreated?: (customer: NewCustomer, referralSource: string) => void
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
  onPhoneError,
  customerEmail,
  onCustomerEmailChange,
  referralSource,
  onReferralSourceChange,
  onSelfServiceCustomerCreated
}: CustomerDetailsProps) {
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  const [phoneError, setPhoneError] = useState<string>('')
  const [showSelfService, setShowSelfService] = useState(false)
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)

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
    if (!phoneNumber || phoneNumber.length < 6) {
      setPhoneError('');
      onPhoneError?.('');
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
          const customer = exactPhoneMatch.customer;
          const errorMsg = `This phone number is already registered to ${customer.customer_name} (${customer.customer_code})`;
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
  }, [phoneNumber, customerName, onPhoneError]);

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
    customer_code: customer.customer_code, // Keep code separate for badge display
    has_active_package: (customer.active_packages ?? 0) > 0,
    customer_status: customer.customer_status
  }));

  const handleCustomerSelection = (simpleCustomer: { id: string; customer_name: string; contact_number: string | null }) => {
    const originalCustomer = customers.find(c => c.id === simpleCustomer.id)
    if (originalCustomer) {
      onCustomerSelect(originalCustomer)
    }
  }

  // Handle self-service completion - create customer and switch to existing customer view
  const handleSelfServiceComplete = async (data: CustomerSelfServiceData) => {
    setIsCreatingCustomer(true)

    try {
      // Create the customer via API
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: data.name,
          primaryPhone: data.phone,
          email: data.email || undefined,
          preferredContactMethod: 'Phone'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create customer')
      }

      const result = await response.json()
      const newCustomer: NewCustomer = {
        id: result.customer.id,
        customer_code: result.customer.customer_code,
        customer_name: result.customer.customer_name,
        contact_number: result.customer.contact_number,
        email: result.customer.email,
        preferred_contact_method: result.customer.preferred_contact_method,
        customer_status: result.customer.customer_status || 'Active',
        lifetime_spending: '0',
        total_bookings: 0,
        last_visit_date: undefined,
        stable_hash_id: result.customer.stable_hash_id
      }

      // Close overlay and call the callback to switch mode and select customer
      setShowSelfService(false)

      // Show success toast
      toast.success('Customer created successfully', {
        description: `${newCustomer.customer_name} (${newCustomer.customer_code})`,
        duration: 4000
      })

      // Set the referral source before switching
      onReferralSourceChange?.(data.referralSource)

      // If callback is provided, use it to handle the mode switch
      if (onSelfServiceCustomerCreated) {
        onSelfServiceCustomerCreated(newCustomer, data.referralSource)
      } else {
        // Fallback to just populating fields
        onCustomerNameChange(data.name)
        onPhoneNumberChange(data.phone)
        onCustomerEmailChange?.(data.email)
      }
    } catch (err) {
      console.error('Error creating customer:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create customer'

      // Show error toast
      toast.error('Could not create customer', {
        description: errorMessage,
        duration: 5000
      })

      // Fallback to just populating the manual fields
      setShowSelfService(false)
      onCustomerNameChange(data.name)
      onPhoneNumberChange(data.phone)
      onCustomerEmailChange?.(data.email)
      onReferralSourceChange?.(data.referralSource)
    } finally {
      setIsCreatingCustomer(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Customer Self-Service Overlay */}
      <CustomerSelfServiceOverlay
        isOpen={showSelfService}
        onComplete={handleSelfServiceComplete}
        onCancel={() => setShowSelfService(false)}
      />

      {isNewCustomer ? (
        <>
          {/* Self-Service Button - Prominent CTA for staff */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSelfService(true)}
            className="w-full h-auto py-3 px-4 border-2 border-dashed border-[#005a32]/40 bg-green-50 hover:bg-green-100 hover:border-[#005a32]/60 transition-all"
          >
            <div className="flex items-center gap-3 text-left w-full">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#005a32]/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-[#005a32]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[#005a32] text-sm">Let Customer Enter Their Info</div>
                <div className="text-xs text-[#005a32]/70">Hand the device to your customer</div>
              </div>
            </div>
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">or enter manually</span>
            </div>
          </div>

          {/* Manual Entry Fields */}
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
        <div className="space-y-4">
          <Label>Select Customer</Label>
          
          {/* Selected Customer Display Card */}
          {selectedCustomerCache && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              {/* Header: Name + badges */}
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-base font-semibold text-gray-900 truncate">
                  {selectedCustomerCache.customer_name}
                </h3>
                <span className="text-[10px] font-mono bg-white text-gray-500 px-1.5 py-0.5 rounded border shrink-0">
                  {selectedCustomerCache.customer_code}
                </span>
                <span className={cn(
                  "shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded-full leading-none",
                  selectedCustomerCache.customer_status === 'Active' && "bg-emerald-100 text-emerald-700",
                  selectedCustomerCache.customer_status === 'Inactive' && "bg-amber-100 text-amber-700",
                  selectedCustomerCache.customer_status === 'Dormant' && "bg-red-100 text-red-600",
                  selectedCustomerCache.customer_status === 'New' && "bg-blue-100 text-blue-700",
                )}>
                  {selectedCustomerCache.customer_status}
                </span>
                {(selectedCustomerCache.active_packages ?? 0) > 0 && (
                  <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded-full leading-none bg-purple-100 text-purple-700">
                    {selectedCustomerCache.active_packages} active pkg
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-400">Phone</div>
                  <div className="font-medium text-gray-700">{selectedCustomerCache.contact_number || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Visits</div>
                  <div className="font-medium text-gray-700">{selectedCustomerCache.total_bookings}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Total Spent</div>
                  <div className="font-medium text-gray-700">{Math.round(parseFloat(selectedCustomerCache.lifetime_spending) || 0).toLocaleString()} THB</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Last Visit</div>
                  <div className="font-medium text-gray-700">
                    {selectedCustomerCache.last_visit_date && selectedCustomerCache.last_visit_date !== 'Never'
                      ? new Date(selectedCustomerCache.last_visit_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '-'}
                  </div>
                </div>
              </div>
            </div>
          )}
          
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