'use client';

import React, { useState } from 'react';
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
  prefillData?: Partial<CreateCustomerData>;
}

export const QuickCustomerForm: React.FC<QuickCustomerFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
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

  // Check for duplicates
  const checkDuplicates = async (): Promise<boolean> => {
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
        if (data.potentialDuplicates.length > 0) {
          setDuplicates(data.potentialDuplicates);
          setShowDuplicates(true);
          return false; // Block creation
        }
      }
      return true; // No duplicates, proceed
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return true; // Proceed despite error
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check for duplicates first
      const canProceed = await checkDuplicates();
      if (!canProceed) {
        setLoading(false);
        return;
      }

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
        // Handle duplicates returned from server
        setDuplicates(data.duplicates || []);
        setShowDuplicates(true);
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
    // Use existing customer
    onSuccess(duplicate.customer);
    handleClose();
  };

  // Force create despite duplicates
  const handleForceCreate = async () => {
    setShowDuplicates(false);
    
    // Proceed with creation by adding a timestamp to make it unique
    const modifiedData = {
      ...formData,
      notes: formData.notes 
        ? `${formData.notes}\n\nCreated despite duplicates on ${new Date().toLocaleString()}`
        : `Created despite duplicates on ${new Date().toLocaleString()}`
    };

    setLoading(true);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modifiedData)
      });

      const data = await response.json();
      if (response.ok) {
        onSuccess(data.customer);
        handleClose();
      } else {
        setError(data.error || 'Failed to create customer');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
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

        {/* Duplicate Warning */}
        {showDuplicates && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-medium text-yellow-800">
                  Potential duplicate customers found:
                </p>
                
                <div className="space-y-2">
                  {duplicates.map((duplicate, index) => (
                    <Card key={index} className="p-3 border-yellow-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{duplicate.customer.customer_name}</p>
                          <p className="text-xs text-gray-600">{duplicate.customer.contact_number}</p>
                          <p className="text-xs text-gray-500">
                            Code: {duplicate.customer.customer_code}
                          </p>
                          <div className="flex gap-1 mt-1">
                            {duplicate.matchReasons.map((reason, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSelectDuplicate(duplicate)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Use This
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDuplicates(false)}
                  >
                    Go Back
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleForceCreate}
                    disabled={loading}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Create Anyway
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
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