'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SimpleCustomer {
  id: number;
  customer_name: string;
  contact_number: string | null;
}

interface CustomerSearchProps {
  customers: SimpleCustomer[];
  selectedCustomerId?: string;
  onCustomerSelect: (customer: SimpleCustomer) => void;
  showCustomerDialog: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onDialogOpenChange: (open: boolean) => void;
  getSelectedCustomerDisplay: () => string;
}

export function CustomerSearch({
  customers = [],
  selectedCustomerId,
  onCustomerSelect,
  showCustomerDialog,
  searchQuery,
  onSearchQueryChange,
  onDialogOpenChange,
  getSelectedCustomerDisplay
}: CustomerSearchProps) {
  const filteredCustomers = customers.filter(customer => {
    const displayName = customer.contact_number 
      ? `${customer.customer_name} (${customer.contact_number})`
      : customer.customer_name;
    return displayName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start text-left font-normal h-10"
        onClick={() => onDialogOpenChange(true)}
      >
        {getSelectedCustomerDisplay()}
      </Button>

      <Dialog open={showCustomerDialog} onOpenChange={onDialogOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
            />
          </div>
          {filteredCustomers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No customers found.
            </div>
          ) : (
            <div className="mt-4 space-y-2 max-h-[300px] overflow-auto">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => {
                    onCustomerSelect(customer)
                    onDialogOpenChange(false)
                  }}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer hover:bg-accent",
                    selectedCustomerId === customer.id.toString() ? "bg-accent" : ""
                  )}
                >
                  <div className="font-medium">{customer.customer_name}</div>
                  {customer.contact_number && (
                    <div className="text-sm text-muted-foreground">
                      {customer.contact_number}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}