'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, User, Phone, Hash, X, ChevronLeft, UserPlus, Mail } from 'lucide-react';
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
  lineUserName?: string;
  prefillData?: {
    fullName?: string;
    primaryPhone?: string;
    email?: string;
  };
}

export function CustomerLinkModal({
  isOpen,
  onClose,
  onCustomerSelect,
  loading = false,
  lineUserName,
  prefillData
}: CustomerLinkModalProps) {
  // Mode state
  const [mode, setMode] = useState<'search' | 'create'>('search');

  // Search mode state
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create mode state
  const [createForm, setCreateForm] = useState({
    fullName: '',
    primaryPhone: '',
    email: ''
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Prevent background scrolling on mobile when modal is open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = '0';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isOpen, isMobile]);

  // Search customers with debouncing
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.length >= 1) {
      searchTimeoutRef.current = setTimeout(async () => {
        setSearching(true);
        try {
          const params = new URLSearchParams({
            search: searchTerm,
            limit: '200',
            sortBy: 'fullName',
            sortOrder: 'asc'
          });

          const response = await fetch(`/api/customers?${params}`);
          if (response.ok) {
            const data = await response.json();
            // Sort results to show exact matches first, then partial matches
            const sortedCustomers = (data.customers || []).sort((a: Customer, b: Customer) => {
              const searchLower = searchTerm.toLowerCase();

              // Exact matches for customer name or code
              const aNameExact = a.customer_name.toLowerCase() === searchLower;
              const bNameExact = b.customer_name.toLowerCase() === searchLower;
              const aCodeExact = a.customer_code.toLowerCase() === searchLower;
              const bCodeExact = b.customer_code.toLowerCase() === searchLower;

              // Name starts with search term
              const aNameStarts = a.customer_name.toLowerCase().startsWith(searchLower);
              const bNameStarts = b.customer_name.toLowerCase().startsWith(searchLower);
              const aCodeStarts = a.customer_code.toLowerCase().startsWith(searchLower);
              const bCodeStarts = b.customer_code.toLowerCase().startsWith(searchLower);

              // Priority order: exact name/code match, then starts with, then contains
              if (aNameExact || aCodeExact) return -1;
              if (bNameExact || bCodeExact) return 1;
              if (aNameStarts || aCodeStarts) return -1;
              if (bNameStarts || bCodeStarts) return 1;

              return a.customer_name.localeCompare(b.customer_name);
            });
            setCustomers(sortedCustomers);
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
    setMode('search');
    setCreateForm({ fullName: '', primaryPhone: '', email: '' });
    setCreateErrors({});
    setCreateSuccess(false);
    setHasPreFilled(false);
    onClose();
  };

  // Track if we've already pre-filled for the current modal session
  const [hasPreFilled, setHasPreFilled] = useState(false);

  // Pre-fill form when switching to create mode (only once per modal open)
  useEffect(() => {
    if (mode === 'create' && !hasPreFilled) {
      // Priority: prefillData > lineUserName for name
      const nameToUse = prefillData?.fullName || lineUserName || '';
      const phoneToUse = prefillData?.primaryPhone || '';
      const emailToUse = prefillData?.email || '';

      setCreateForm({
        fullName: nameToUse,
        primaryPhone: phoneToUse,
        email: emailToUse
      });
      setHasPreFilled(true);
    }
  }, [mode, lineUserName, prefillData, hasPreFilled]);

  // Reset hasPreFilled when modal opens with new prefill data
  useEffect(() => {
    if (isOpen) {
      setHasPreFilled(false);
    }
  }, [isOpen, prefillData]);

  // Validate create form
  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!createForm.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (createForm.fullName.trim().length < 2) {
      errors.fullName = 'Name must be at least 2 characters';
    }

    if (!createForm.primaryPhone.trim()) {
      errors.primaryPhone = 'Phone number is required';
    } else {
      // Support international phone numbers (e.g., +86 13651689124, +1 5551234567)
      // Extract only digits and validate length (9-15 digits for international support)
      const digitsOnly = createForm.primaryPhone.replace(/\D/g, '');
      if (digitsOnly.length < 9 || digitsOnly.length > 15) {
        errors.primaryPhone = 'Phone number must be 9-15 digits';
      }
    }

    if (createForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) {
      errors.email = 'Invalid email format';
    }

    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle customer creation
  const handleCreateCustomer = async () => {
    if (!validateCreateForm()) return;

    setIsCreating(true);
    setCreateErrors({});

    try {
      // Create customer
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: createForm.fullName.trim(),
          primaryPhone: createForm.primaryPhone.trim(),
          email: createForm.email?.trim() || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.duplicateFields?.includes('normalized_phone')) {
          setCreateErrors({ primaryPhone: 'This phone number is already registered' });
        } else {
          setCreateErrors({ general: data.error || 'Failed to create customer' });
        }
        return;
      }

      // Show success and auto-link
      setCreateSuccess(true);

      // Auto-link the newly created customer
      setTimeout(() => {
        onCustomerSelect(data.customer.id, {
          id: data.customer.id,
          customer_code: data.customer.customer_code,
          customer_name: data.customer.customer_name,
          contact_number: data.customer.contact_number,
          email: data.customer.email
        });
        handleClose();
      }, 500);

    } catch (error) {
      console.error('Error creating customer:', error);
      setCreateErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsCreating(false);
    }
  };

  // Mobile full-screen modal
  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div className="fixed inset-0 bg-white z-[60] flex flex-col">
            {/* Mobile Header */}
            <div className="bg-white border-b p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={handleClose}
                  disabled={loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">Link to Customer</h3>
                  {lineUserName && (
                    <p className="text-sm text-gray-500 truncate">
                      for &ldquo;{lineUserName}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
              {/* Mode Toggle - Sticky at top */}
              <div className="bg-white sticky top-0 z-10 pb-4">
                <div className="flex rounded-lg border bg-gray-50 p-1 gap-1">
                  <button
                    onClick={() => setMode('search')}
                    disabled={loading || isCreating}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      mode === 'search'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </button>
                  <button
                    onClick={() => setMode('create')}
                    disabled={loading || isCreating}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      mode === 'create'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <UserPlus className="h-4 w-4" />
                    Create New
                  </button>
                </div>
              </div>

              {/* Search Mode */}
              {mode === 'search' && (
                <>
                  {/* Search Input */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={lineUserName
                        ? `Search for ${lineUserName}'s customer profile...`
                        : "Search by name, phone, or customer code..."
                      }
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                      autoFocus
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
                  <div className="flex-1">
                    {searchTerm.length < 1 && (
                      <div className="text-center py-8 text-gray-500">
                        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Type to search customers</p>
                      </div>
                    )}

                    {searching && searchTerm.length >= 1 && (
                      <div className="text-center py-8 text-gray-500">
                        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-sm">Searching customers...</p>
                      </div>
                    )}

                    {!searching && searchTerm.length >= 1 && customers.length === 0 && (
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
                            className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="font-medium text-gray-900 truncate">
                                  {customer.customer_name}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {customer.customer_code}
                              </Badge>
                            </div>
                            {customer.contact_number && (
                              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 pl-6">
                                <Phone className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{customer.contact_number}</span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Create Mode */}
              {mode === 'create' && (
                <div className="flex-1 flex flex-col">
                  {/* Success Message */}
                  {createSuccess && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700 font-medium">Customer created successfully! Linking...</p>
                    </div>
                  )}

                  {/* Error Message */}
                  {createErrors.general && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">{createErrors.general}</p>
                    </div>
                  )}

                  {/* Create Form */}
                  <div className="space-y-4 flex-1">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Enter full name"
                          value={createForm.fullName}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, fullName: e.target.value }))}
                          className={`pl-10 ${createErrors.fullName ? 'border-red-500' : ''}`}
                          disabled={isCreating || createSuccess}
                          autoFocus
                        />
                      </div>
                      {createErrors.fullName && (
                        <p className="mt-1 text-sm text-red-600">{createErrors.fullName}</p>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="0812345678"
                          value={createForm.primaryPhone}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, primaryPhone: e.target.value }))}
                          className={`pl-10 ${createErrors.primaryPhone ? 'border-red-500' : ''}`}
                          disabled={isCreating || createSuccess}
                        />
                      </div>
                      {createErrors.primaryPhone && (
                        <p className="mt-1 text-sm text-red-600">{createErrors.primaryPhone}</p>
                      )}
                    </div>

                    {/* Email (Optional) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="email"
                          placeholder="customer@example.com"
                          value={createForm.email}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                          className={`pl-10 ${createErrors.email ? 'border-red-500' : ''}`}
                          disabled={isCreating || createSuccess}
                        />
                      </div>
                      {createErrors.email && (
                        <p className="mt-1 text-sm text-red-600">{createErrors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Create Button */}
                  <div className="pt-4 mt-auto">
                    <Button
                      onClick={handleCreateCustomer}
                      disabled={isCreating || createSuccess}
                      className="w-full"
                    >
                      {isCreating ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Creating...
                        </>
                      ) : createSuccess ? (
                        'Linking...'
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Create & Link Customer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop modal
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <div className="flex-1">
              <div>Link to Customer</div>
              {lineUserName && (
                <div className="text-sm font-normal text-gray-500 mt-1">
                  for &ldquo;{lineUserName}&rdquo;
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex rounded-lg border bg-gray-50 p-1 gap-1">
            <button
              onClick={() => setMode('search')}
              disabled={loading || isCreating}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === 'search'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Search className="h-4 w-4" />
              Search Existing
            </button>
            <button
              onClick={() => setMode('create')}
              disabled={loading || isCreating}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === 'create'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Create New
            </button>
          </div>

          {/* Search Mode */}
          {mode === 'search' && (
            <>
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={lineUserName
                    ? `Search for ${lineUserName}'s customer profile...`
                    : "Search by name, phone, or customer code..."
                  }
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
                {searchTerm.length < 1 && (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Type to search customers</p>
                  </div>
                )}

                {searching && searchTerm.length >= 1 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm">Searching customers...</p>
                  </div>
                )}

                {!searching && searchTerm.length >= 1 && customers.length === 0 && (
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
                        className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-900 truncate">
                              {customer.customer_name}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {customer.customer_code}
                          </Badge>
                        </div>
                        {customer.contact_number && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 pl-6">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{customer.contact_number}</span>
                          </div>
                        )}
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
            </>
          )}

          {/* Create Mode */}
          {mode === 'create' && (
            <>
              {/* Success Message */}
              {createSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">Customer created successfully! Linking...</p>
                </div>
              )}

              {/* Error Message */}
              {createErrors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{createErrors.general}</p>
                </div>
              )}

              {/* Create Form */}
              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Enter full name"
                      value={createForm.fullName}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, fullName: e.target.value }))}
                      className={`pl-10 ${createErrors.fullName ? 'border-red-500' : ''}`}
                      disabled={isCreating || createSuccess}
                      autoFocus
                    />
                  </div>
                  {createErrors.fullName && (
                    <p className="mt-1 text-sm text-red-600">{createErrors.fullName}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="0812345678"
                      value={createForm.primaryPhone}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, primaryPhone: e.target.value }))}
                      className={`pl-10 ${createErrors.primaryPhone ? 'border-red-500' : ''}`}
                      disabled={isCreating || createSuccess}
                    />
                  </div>
                  {createErrors.primaryPhone && (
                    <p className="mt-1 text-sm text-red-600">{createErrors.primaryPhone}</p>
                  )}
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="customer@example.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                      className={`pl-10 ${createErrors.email ? 'border-red-500' : ''}`}
                      disabled={isCreating || createSuccess}
                    />
                  </div>
                  {createErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{createErrors.email}</p>
                  )}
                </div>
              </div>

              {/* Create Button */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isCreating || createSuccess}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCustomer}
                  disabled={isCreating || createSuccess}
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Creating...
                    </>
                  ) : createSuccess ? (
                    'Linking...'
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create & Link
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}