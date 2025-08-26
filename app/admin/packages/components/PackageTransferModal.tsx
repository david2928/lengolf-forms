'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Search, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Package {
  id: string;
  customer_name: string;
  customer_id?: string;
  package_type_name: string;
  remaining_hours?: number;
  is_unlimited: boolean;
  expiration_date: string;
}

interface Customer {
  id: string;
  customer_name: string;
  contact_number?: string;
  email?: string;
}

interface PackageTransferModalProps {
  isOpen: boolean;
  package?: Package;
  onClose: () => void;
}

export const PackageTransferModal: React.FC<PackageTransferModalProps> = ({
  isOpen,
  package: transferPackage,
  onClose
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [transferReason, setTransferReason] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedCustomer(null);
      setTransferReason('');
      setSearchResults([]);
      setShowResults(false);
    }
  }, [isOpen]);

  // Search for customers
  const searchCustomers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();
      
      if (response.ok && data.customers) {
        // Filter out the current customer
        const filteredResults = data.customers.filter(
          (c: any) => c.id !== transferPackage?.customer_id
        );
        setSearchResults(filteredResults);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      toast.error('Failed to search customers');
    } finally {
      setIsSearching(false);
    }
  }, [transferPackage?.customer_id]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchCustomers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchCustomers]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchQuery(customer.customer_name);
    setShowResults(false);
  };

  const handleTransfer = async () => {
    if (!transferPackage || !selectedCustomer || !transferReason.trim()) {
      toast.error('Please select a customer and provide a reason');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/packages/${transferPackage.id}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toCustomerId: selectedCustomer.id,
          toCustomerName: selectedCustomer.customer_name,
          reason: transferReason
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to transfer package');
      }

      toast.success('Package transferred successfully');
      onClose();
    } catch (error) {
      console.error('Error transferring package:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to transfer package');
    } finally {
      setIsLoading(false);
    }
  };

  if (!transferPackage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer Package</DialogTitle>
          <DialogDescription>
            Transfer this package from {transferPackage.customer_name} to another customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Package Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Package:</span>
                  <div className="font-medium">{transferPackage.package_type_name}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Current Customer:</span>
                  <div className="font-medium">{transferPackage.customer_name}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Remaining Hours:</span>
                  <div className="font-medium">
                    {transferPackage.is_unlimited 
                      ? 'Unlimited' 
                      : `${transferPackage.remaining_hours}h`
                    }
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Expires:</span>
                  <div className="font-medium">
                    {format(new Date(transferPackage.expiration_date), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Search */}
          <div className="space-y-2">
            <Label htmlFor="customer-search">Search Customer (by ID, name, or phone) *</Label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="customer-search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!e.target.value) {
                      setSelectedCustomer(null);
                      setShowResults(false);
                    }
                  }}
                  placeholder="Enter customer ID, name, or phone number..."
                  className="pl-10"
                  disabled={isLoading}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                  {searchResults.map((customer) => (
                    <div
                      key={customer.id}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{customer.customer_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {customer.contact_number && `Phone: ${customer.contact_number}`}
                          {customer.email && customer.contact_number && ' • '}
                          {customer.email && `Email: ${customer.email}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg p-4 text-center text-muted-foreground">
                  No customers found
                </div>
              )}
            </div>

            {/* Selected Customer Display */}
            {selectedCustomer && (
              <Card className="mt-2 bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-900">
                        {selectedCustomer.customer_name}
                      </div>
                      <div className="text-xs text-blue-700">
                        Customer ID: {selectedCustomer.id}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Transfer Reason */}
          <div>
            <Label htmlFor="transfer-reason">Reason for Transfer *</Label>
            <Textarea
              id="transfer-reason"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="Explain why this package is being transferred..."
              rows={3}
              required
              disabled={isLoading}
            />
          </div>

          {/* Warning */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Warning:</strong> This action will transfer the package and all its usage history to the new customer. This action is logged and cannot be automatically undone.
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedCustomer || !transferReason.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transferring...
              </>
            ) : (
              'Transfer Package'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};