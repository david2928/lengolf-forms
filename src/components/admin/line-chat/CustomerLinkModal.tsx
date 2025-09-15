'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, User, Phone, Hash, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  contact_number?: string;
  email?: string;
}

interface CustomerLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerSelect: (customerId: string, customer: Customer) => void;
  loading?: boolean;
}

export function CustomerLinkModal({
  isOpen,
  onClose,
  onCustomerSelect,
  loading = false
}: CustomerLinkModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search customers with debouncing
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        setSearching(true);
        try {
          const params = new URLSearchParams({
            search: searchTerm,
            limit: '10',
            sortBy: 'customer_name',
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
          setSearching(false);
        }
      }, 300);
    } else {
      setCustomers([]);
    }

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer.id, customer);
    handleClose();
  };

  const handleClose = () => {
    setSearchTerm('');
    setCustomers([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Link to Customer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, phone, or customer code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Search Results */}
          <div className="max-h-80 overflow-y-auto">
            {searchTerm.length < 2 && (
              <div className="text-center py-8 text-gray-500">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Type at least 2 characters to search customers</p>
              </div>
            )}

            {searching && searchTerm.length >= 2 && (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm">Searching customers...</p>
              </div>
            )}

            {!searching && searchTerm.length >= 2 && customers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No customers found for &ldquo;{searchTerm}&rdquo;</p>
              </div>
            )}

            {customers.length > 0 && (
              <div className="space-y-2">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleCustomerSelect(customer)}
                    disabled={loading}
                    className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900 truncate">
                            {customer.customer_name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {customer.customer_code}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {customer.contact_number && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{customer.contact_number}</span>
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              <span className="truncate">{customer.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}