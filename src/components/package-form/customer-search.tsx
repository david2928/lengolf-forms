'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Search, X, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from "@/lib/utils"

interface SimpleCustomer {
  id: number;
  customer_name: string;
  contact_number: string | null;
}

interface CustomerSearchProps {
  customers: SimpleCustomer[];
  selectedCustomerId?: string;
  showCustomerDialog: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onCustomerSelect: (customer: SimpleCustomer) => void;
  onDialogOpenChange: (open: boolean) => void;
  getSelectedCustomerDisplay: () => string;
}

export function CustomerSearch({
  customers,
  selectedCustomerId,
  showCustomerDialog,
  searchQuery,
  onSearchQueryChange,
  onCustomerSelect,
  onDialogOpenChange,
  getSelectedCustomerDisplay,
}: CustomerSearchProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isMobile && showCustomerDialog) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [showCustomerDialog, isMobile])

  const filteredCustomers = customers.filter(customer => 
    customer.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.contact_number?.includes(searchQuery) ?? false)
  );

  const formatCustomerDisplay = (customer: SimpleCustomer, isList: boolean = false) => {
    if (isList) {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{customer.customer_name}</span>
          <span className="text-sm text-muted-foreground">
            {customer.contact_number || 'No contact number'}
          </span>
        </div>
      )
    }
    return customer.contact_number 
      ? `${customer.customer_name} (${customer.contact_number})`
      : customer.customer_name
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        className="w-full justify-between text-left h-auto min-h-[2.5rem] py-2 whitespace-normal bg-white"
        onClick={() => onDialogOpenChange(true)}
      >
        <span className="truncate">{getSelectedCustomerDisplay()}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {showCustomerDialog && isMobile && (
        <div 
          className="fixed inset-0 bg-background z-50 flex flex-col"
          style={{ height: '100dvh' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background shadow-sm">
            <h2 className="text-lg font-semibold">Select Customer</h2>
            <Button 
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => onDialogOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-2 border-b bg-background">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-0">
            <div className="h-full">
              {filteredCustomers.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No customers found.
                </div>
              )}
              <div className="space-y-0">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => {
                      onCustomerSelect(customer)
                      onDialogOpenChange(false)
                      onSearchQueryChange("")
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-3 border-b hover:bg-accent cursor-pointer text-left",
                      selectedCustomerId === customer.id.toString() && "bg-accent"
                    )}
                  >
                    {formatCustomerDisplay(customer, true)}
                    {selectedCustomerId === customer.id.toString() && (
                      <Check className="h-5 w-5 shrink-0 text-primary ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCustomerDialog && !isMobile && (
        <div className="fixed inset-0 z-50 flex items-start justify-center">
          <div className="fixed inset-0 bg-background/80" onClick={() => onDialogOpenChange(false)} />
          <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md mt-[10vh]">
            <div className="flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h2 className="text-lg font-semibold">Select Customer</h2>
                <Button 
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => onDialogOpenChange(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-y-auto max-h-[calc(80vh-8.5rem)]">
                {filteredCustomers.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No customers found.
                  </div>
                )}
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => {
                      onCustomerSelect(customer)
                      onDialogOpenChange(false)
                      onSearchQueryChange("")
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-3 border-b hover:bg-accent cursor-pointer text-left",
                      selectedCustomerId === customer.id.toString() && "bg-accent"
                    )}
                  >
                    {formatCustomerDisplay(customer, true)}
                    {selectedCustomerId === customer.id.toString() && (
                      <Check className="h-5 w-5 shrink-0 text-primary ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}