/**
 * Customer Search and Select Component
 * Used in the customer mapping UI for selecting customers to link
 */

import { useState, useCallback, useEffect } from 'react';
import { Search, Check, User, Phone, Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import debounce from 'lodash/debounce';

interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  contact_number?: string;
  email?: string;
}

interface CustomerSearchSelectProps {
  value?: string;
  onSelect: (customerId: string, customer: Customer) => void;
  placeholder?: string;
  disabled?: boolean;
  suggestedCustomers?: Array<{
    id: string;
    customerCode: string;
    customerName: string;
    contactNumber: string;
    matchScore: number;
    matchReason: string;
  }>;
}

export function CustomerSearchSelect({
  value,
  onSelect,
  placeholder = "Search customers...",
  disabled = false,
  suggestedCustomers = []
}: CustomerSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Fetch selected customer details if value is provided
  useEffect(() => {
    if (value && !selectedCustomer) {
      fetchCustomerById(value);
    }
  }, [value]);

  const fetchCustomerById = async (customerId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedCustomer({
          id: data.customer.id,
          customer_code: data.customer.customer_code,
          customer_name: data.customer.customer_name,
          contact_number: data.customer.contact_number,
          email: data.customer.email
        });
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
    }
  };

  // Debounced search function
  const searchCustomers = useCallback(
    debounce(async (search: string) => {
      if (!search || search.length < 2) {
        setCustomers([]);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({
          search: search,
          limit: '10',
          sortBy: 'customerCode',
          sortOrder: 'asc'
        });

        const response = await fetch(`/api/customers?${params}`);
        if (response.ok) {
          const data = await response.json();
          setCustomers(data.customers || []);
        }
      } catch (error) {
        console.error('Error searching customers:', error);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    searchCustomers(searchTerm);
  }, [searchTerm, searchCustomers]);

  const handleSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    onSelect(customer.id, customer);
    setOpen(false);
    setSearchTerm("");
  };

  // Combine suggested customers with search results
  const displayCustomers = searchTerm.length >= 2 ? customers : [];
  const allCustomers = [
    ...suggestedCustomers.map(s => ({
      id: s.id,
      customer_code: s.customerCode,
      customer_name: s.customerName,
      contact_number: s.contactNumber,
      matchScore: s.matchScore,
      matchReason: s.matchReason,
      isSuggested: true
    })),
    ...displayCustomers.map(c => ({
      ...c,
      isSuggested: false
    }))
  ];

  // Remove duplicates
  const uniqueCustomers = allCustomers.filter((customer, index, self) =>
    index === self.findIndex((c) => c.id === customer.id)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedCustomer ? (
            <div className="flex items-center gap-2 truncate">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">{selectedCustomer.customer_name}</span>
              <span className="text-muted-foreground">({selectedCustomer.customer_code})</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name, code, or phone..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {loading && searchTerm.length >= 2 && (
              <CommandEmpty>Searching...</CommandEmpty>
            )}
            {!loading && searchTerm.length >= 2 && uniqueCustomers.length === 0 && (
              <CommandEmpty>No customers found.</CommandEmpty>
            )}
            {searchTerm.length < 2 && suggestedCustomers.length === 0 && (
              <CommandEmpty>Type at least 2 characters to search...</CommandEmpty>
            )}
            
            {/* Suggested customers */}
            {suggestedCustomers.length > 0 && (
              <CommandGroup heading="Suggested Customers">
                {suggestedCustomers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.id}
                    onSelect={() => handleSelect({
                      id: customer.id,
                      customer_code: customer.customerCode,
                      customer_name: customer.customerName,
                      contact_number: customer.contactNumber
                    })}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{customer.customerName}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Hash className="h-3 w-3" />
                          {customer.customerCode}
                          {customer.contactNumber && (
                            <>
                              <Phone className="h-3 w-3 ml-2" />
                              {customer.contactNumber}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-right">
                      <div className="font-medium text-green-600">
                        {customer.matchScore}% match
                      </div>
                      <div className="text-muted-foreground">
                        {customer.matchReason}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Search results */}
            {searchTerm.length >= 2 && displayCustomers.length > 0 && (
              <CommandGroup heading="Search Results">
                {displayCustomers
                  .filter(c => !suggestedCustomers.some(s => s.id === c.id))
                  .map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={() => handleSelect(customer)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{customer.customer_name}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Hash className="h-3 w-3" />
                            {customer.customer_code}
                            {customer.contact_number && (
                              <>
                                <Phone className="h-3 w-3 ml-2" />
                                {customer.contact_number}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {value === customer.id && (
                        <Check className="h-4 w-4" />
                      )}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}