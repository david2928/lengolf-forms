'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Phone, Mail, User, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useResponsive } from '@/hooks/use-responsive';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateCustomerData, DuplicateCustomer } from '@/types/pos';

export interface QuickCustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: any) => void;
  onSelectExisting?: (customer: any) => void;
  prefillData?: Partial<CreateCustomerData>;
}

export const QuickCustomerForm: React.FC<QuickCustomerFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSelectExisting,
  prefillData = {}
}) => {
  const { isTablet, isMobile } = useResponsive();
  // Form state
  const [formData, setFormData] = useState<CreateCustomerData>({
    fullName: prefillData.fullName || '',
    primaryPhone: prefillData.primaryPhone || '',
    email: prefillData.email || '',
    dateOfBirth: prefillData.dateOfBirth || '',
    address: prefillData.address || '',
    notes: prefillData.notes || '',
    preferredContactMethod: prefillData.preferredContactMethod || 'Phone'
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCustomer[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Handle form field changes
  const handleFieldChange = (field: keyof CreateCustomerData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear general error
    if (error) {
      setError(null);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    
    if (!formData.primaryPhone.trim()) {
      errors.primaryPhone = 'Phone number is required';
    } else if (!/^[0-9+\-\s()]+$/.test(formData.primaryPhone)) {
      errors.primaryPhone = 'Please enter a valid phone number';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check for duplicates - separate from form submission
  const checkDuplicates = useCallback(async (): Promise<void> => {
    if (!formData.fullName || formData.fullName.length < 2 || 
        !formData.primaryPhone || formData.primaryPhone.length < 8) {
      setDuplicates([]);
      setShowDuplicates(false);
      return;
    }

    try {
      const response = await fetch('/api/customers/search-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          primaryPhone: formData.primaryPhone,
          email: formData.email
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Only show duplicates if there are high-confidence matches
        const validDuplicates = (data.potentialDuplicates || []).filter((dup: any) => 
          dup.customer && 
          dup.customer.customer_name && 
          dup.customer.customer_code &&
          dup.matchScore > 0.85 // Only very high confidence matches
        );
        
        setDuplicates(validDuplicates);
        setShowDuplicates(validDuplicates.length > 0);
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
    }
  }, [formData.fullName, formData.primaryPhone, formData.email]);

  // Auto-check for duplicates when form data changes
  useEffect(() => {
    const timeoutId = setTimeout(checkDuplicates, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [checkDuplicates]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create customer
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess(data.customer);
        handleClose();
      } else if (response.status === 409) {
        // Handle duplicate phone number error from database constraint  
        if (data.error_code === 'DUPLICATE_PHONE' || data.duplicate_customer) {
          setError(`A customer with this phone number already exists - Customer: ${data.duplicate_customer?.customer_name || 'Unknown'} (${data.duplicate_customer?.customer_code || 'N/A'})`);
        } else {
          // Handle other duplicates
          setDuplicates(data.duplicates || []);
          setShowDuplicates(true);
        }
      } else {
        setError(data.error || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle duplicate selection
  const handleSelectDuplicate = (duplicate: DuplicateCustomer) => {
    // Transform the duplicate customer data to match expected format
    const customerData = {
      ...duplicate.customer,
      id: duplicate.customer.id,
      customer_code: duplicate.customer.customer_code,
      customer_name: duplicate.customer.customer_name,
      contact_number: duplicate.customer.contact_number,
      email: duplicate.customer.email
    };
    
    // Use onSelectExisting for selecting duplicates, fallback to onSuccess if not provided
    if (onSelectExisting) {
      onSelectExisting(customerData);
    } else {
      onSuccess(customerData);
    }
    handleClose();
  };


  // Handle modal close
  const handleClose = () => {
    setFormData({
      fullName: '',
      primaryPhone: '',
      email: '',
      dateOfBirth: '',
      address: '',
      notes: '',
      preferredContactMethod: 'Phone'
    });
    setError(null);
    setDuplicates([]);
    setShowDuplicates(false);
    setValidationErrors({});
    onClose();
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className={cn(
          "fixed z-50 bg-white",
          isTablet || isMobile
            ? "inset-0 w-screen h-screen m-0 p-0 rounded-none"
            : "left-[50%] top-[50%] w-[90vw] max-w-2xl max-h-[90vh] translate-x-[-50%] translate-y-[-50%] rounded-lg shadow-lg",
          "focus:outline-none flex flex-col overflow-y-auto"
        )}>
          <div className={cn(
            "px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0",
            isTablet && "px-8 py-5"
          )}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Add New Customer</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-9 w-9 p-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className={cn(
            "flex-1 flex flex-col overflow-y-auto",
            isTablet ? "px-8 py-6" : "px-6 py-4"
          )}>

        {/* Duplicate Warning - Exact same styling as admin form */}
        {showDuplicates && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="font-semibold mb-2">Similar customers found:</div>
              <div className="space-y-2">
                {duplicates.map((duplicate, index) => (
                  <div key={duplicate.customer?.id || index} className="bg-white/50 p-3 rounded border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{duplicate.customer?.customer_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-600">{duplicate.customer?.contact_number || 'No phone'}</p>
                        {duplicate.customer?.email && (
                          <p className="text-xs text-gray-600">{duplicate.customer.email}</p>
                        )}
                        <p className="text-xs text-gray-500">Code: {duplicate.customer?.customer_code || 'N/A'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {duplicate.matchScore && (
                          <div className="text-xs bg-orange-200 px-2 py-1 rounded">
                            {Math.round(duplicate.matchScore * 100)}% match
                          </div>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleSelectDuplicate(duplicate)}
                          variant="outline"
                          className="text-xs"
                        >
                          Click to select
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-sm">
                Please verify this is not a duplicate customer before proceeding.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert - Exact same styling as admin form */}
        {error && (
          <Alert className="border-red-200 bg-red-50 mt-4">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <Label htmlFor="fullName" className="text-sm font-medium">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => handleFieldChange('fullName', e.target.value)}
              className={validationErrors.fullName ? 'border-red-500' : ''}
              placeholder="Enter customer's full name"
              disabled={loading}
            />
            {validationErrors.fullName && (
              <p className="text-sm text-red-600 mt-1">{validationErrors.fullName}</p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <Label htmlFor="primaryPhone" className="text-sm font-medium">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="primaryPhone"
              type="tel"
              value={formData.primaryPhone}
              onChange={(e) => handleFieldChange('primaryPhone', e.target.value)}
              className={validationErrors.primaryPhone ? 'border-red-500' : ''}
              placeholder="08x-xxx-xxxx"
              disabled={loading}
            />
            {validationErrors.primaryPhone && (
              <p className="text-sm text-red-600 mt-1">{validationErrors.primaryPhone}</p>
            )}
          </div>

          {/* Email (Optional) */}
          <div>
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              className={validationErrors.email ? 'border-red-500' : ''}
              placeholder="customer@example.com"
              disabled={loading}
            />
            {validationErrors.email && (
              <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>
            )}
          </div>

          {/* Preferred Contact Method */}
          <div>
            <Label htmlFor="preferredContactMethod" className="text-sm font-medium">
              Preferred Contact
            </Label>
            <Select
              value={formData.preferredContactMethod}
              onValueChange={(value) => handleFieldChange('preferredContactMethod', value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Phone">Phone</SelectItem>
                <SelectItem value="LINE">LINE</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes (Optional) */}
          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Any additional notes about the customer..."
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.fullName || !formData.primaryPhone}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Create Customer
                </div>
              )}
            </Button>
          </div>
        </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};