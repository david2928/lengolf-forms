"use client"

import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Customer } from '@/types/package-form'

interface CustomerSearchProps {
  customers: Customer[];
  selectedCustomerId: string;
  showCustomerDialog: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onCustomerSelect: (customer: Customer) => void;
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
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.contactNumber.includes(searchQuery)
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        className="w-full justify-between text-left font-normal bg-white border border-gray-200 focus:border-[#005a32] focus:outline-none focus:ring-1 focus:ring-[#005a32] hover:border-gray-300 transition-colors"
        onClick={() => onDialogOpenChange(true)}
      >
        <span className="truncate">{getSelectedCustomerDisplay()}</span>
        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <CommandDialog open={showCustomerDialog} onOpenChange={onDialogOpenChange}>
        <CommandInput 
          placeholder="Search by name or number..."
          value={searchQuery}
          onValueChange={onSearchQueryChange}
          className="border-0"
          autoFocus
        />
        <CommandList>
          <CommandEmpty>No customers found.</CommandEmpty>
          <CommandGroup>
            {filteredCustomers.map((customer) => (
              <CommandItem
                key={customer.id}
                onSelect={() => onCustomerSelect(customer)}
                className="hover:bg-gray-100 cursor-pointer py-3"
              >
                <div className="flex flex-col w-full">
                  <span className="text-base font-medium">
                    {customer.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {customer.contactNumber}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}