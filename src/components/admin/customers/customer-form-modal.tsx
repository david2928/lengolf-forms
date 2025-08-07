/**
 * Customer Form Modal Component
 * CMS-012: Customer Create/Edit Form - Complete implementation
 * 
 * Features:
 * - Create new customers
 * - Edit existing customers
 * - Form validation with react-hook-form and yup
 * - Duplicate detection warnings
 * - Phone number formatting
 * - Date validation
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { format } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle, User, Phone, Mail, Calendar, MapPin, MessageSquare, Trash2 } from 'lucide-react';
import { useCustomer } from '@/hooks/useCustomerManagement';
import { toast } from 'sonner';

interface CustomerFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: () => void;
  customerId?: string | null;
  prePopulateData?: {
    fullName: string;
    primaryPhone: string;
    email?: string;
  } | null;
}

interface CustomerFormData {
  fullName: string;
  primaryPhone: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  notes?: string;
  preferredContactMethod?: 'Phone' | 'LINE' | 'Email';
  updateReason?: string;
}

interface DuplicateCustomer {
  customer: {
    id: string;
    customer_code: string;
    customer_name: string;
    contact_number: string;
    email?: string;
  };
  matchScore: number;
  matchReasons?: string[];
}

// Form validation schema
const customerSchema = yup.object({
  fullName: yup
    .string()
    .required('Full name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must be less than 255 characters'),
  primaryPhone: yup
    .string()
    .required('Phone number is required')
    .matches(/^[+]?[0-9\s\-()]{8,20}$/, 'Please enter a valid phone number'),
  email: yup
    .string()
    .email('Please enter a valid email address')
    .optional(),
  dateOfBirth: yup
    .string()
    .optional()
    .test('valid-date', 'Date cannot be in the future', function(value) {
      if (!value) return true;
      return new Date(value) <= new Date();
    }),
  address: yup
    .string()
    .max(500, 'Address must be less than 500 characters')
    .optional(),
  notes: yup
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
  preferredContactMethod: yup
    .string()
    .oneOf(['Phone', 'LINE', 'Email'])
    .optional(),
  updateReason: yup
    .string()
    .max(255, 'Update reason must be less than 255 characters')
    .optional()
});

export function CustomerFormModal({ 
  open, 
  onOpenChange, 
  onCustomerCreated,
  customerId,
  prePopulateData 
}: CustomerFormModalProps) {
  const { customer, loading: customerLoading, refetch } = useCustomer(customerId || null);
  const [loading, setLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCustomer[]>([]);
  const [submitError, setSubmitError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  
  const isEditing = !!customerId;
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    clearErrors
  } = useForm<CustomerFormData>({
    resolver: yupResolver(customerSchema),
    defaultValues: {
      fullName: '',
      primaryPhone: '',
      email: '',
      dateOfBirth: '',
      address: '',
      notes: '',
      preferredContactMethod: 'Phone',
      updateReason: ''
    }
  });

  // Watch form values for duplicate detection
  const watchedPhone = watch('primaryPhone');
  const watchedName = watch('fullName');
  const watchedEmail = watch('email');

  // Reset form when modal opens/closes or customer changes
  useEffect(() => {
    if (open && customer && isEditing) {
      reset({
        fullName: customer.customer.customer_name || '',
        primaryPhone: customer.customer.contact_number || '',
        email: customer.customer.email || '',
        dateOfBirth: customer.customer.date_of_birth || '',
        address: customer.customer.address || '',
        notes: customer.customer.notes || '',
        preferredContactMethod: customer.customer.preferred_contact_method as 'Phone' | 'LINE' | 'Email' || 'Phone',
        updateReason: ''
      });
    } else if (open && !isEditing) {
      reset({
        fullName: prePopulateData?.fullName || '',
        primaryPhone: prePopulateData?.primaryPhone || '',
        email: prePopulateData?.email || '',
        dateOfBirth: '',
        address: '',
        notes: '',
        preferredContactMethod: 'Phone',
        updateReason: ''
      });
    }
  }, [open, customer, isEditing, prePopulateData, reset]);

  // Check for duplicates when phone/name/email changes
  useEffect(() => {
    const checkDuplicates = async () => {
      if (!open || isEditing) return; // Only check for new customers
      if (!watchedPhone || watchedPhone.length < 8 || !watchedName || watchedName.length < 2) return;

      try {
        const response = await fetch('/api/customers/search-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: watchedName,
            primaryPhone: watchedPhone,
            email: watchedEmail
          })
        });

        if (response.ok) {
          const data = await response.json();
          // Only show warnings if we have high confidence matches with proper data
          const validDuplicates = (data.potentialDuplicates || []).filter((dup: any) => 
            dup.customer && 
            dup.customer.customer_name && 
            dup.customer.customer_code &&
            dup.matchScore > 0.85 // Only very high confidence matches
          );
          setDuplicateWarning(validDuplicates);
        }
      } catch (error) {
        console.error('Error checking duplicates:', error);
      }
    };

    const timeoutId = setTimeout(checkDuplicates, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [watchedPhone, watchedName, watchedEmail, open, isEditing]);

  const onSubmit = async (data: CustomerFormData) => {
    setLoading(true);
    setSubmitError('');
    clearErrors();

    try {
      const url = isEditing ? `/api/customers/${customerId}` : '/api/customers';
      const method = isEditing ? 'PUT' : 'POST';

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
        
        if (response.status === 409) {
          // Handle duplicate phone number error
          if (result.error_code === 'DUPLICATE_PHONE' || result.duplicate_customer) {
            setSubmitError(`${result.error || 'Duplicate phone number detected'} - Customer: ${result.duplicate_customer?.customer_name || 'Unknown'} (${result.duplicate_customer?.customer_code || 'N/A'})`);
          } else if (result.duplicates) {
            // Handle other duplicate warnings
            setDuplicateWarning(result.duplicates);
            setSubmitError(result.error || 'Potential duplicates found');
          } else {
            setSubmitError(result.error || 'Duplicate customer detected');
          }
        } else {
          setSubmitError(result.error || `Failed to ${isEditing ? 'update' : 'create'} customer`);
        }
        return;
      }

      const result = await response.json();

      // Success - Show success state
      setShowSuccess(true);
      
      const successMessage = isEditing 
        ? `Customer "${data.fullName}" updated successfully!`
        : `Customer "${data.fullName}" created successfully!`;
      
      let description = isEditing 
        ? 'Customer information has been updated in the system.'
        : 'New customer has been added to the system.';

      // Add warning about similar customers if present
      if (result.warnings?.similar_customers?.length > 0) {
        description += ` Warning: ${result.warnings.similar_customers.length} similar customer(s) found - please verify this is not a duplicate.`;
      }
      
      toast.success(successMessage, {
        description: description,
        duration: result.warnings ? 8000 : 5000, // Longer duration if there are warnings
      });

      // Refresh customer data if editing
      if (isEditing && refetch) {
        await refetch();
      }
      
      // Only close modal for new customer creation, let user close for edits
      if (!isEditing) {
        setTimeout(() => {
          onCustomerCreated();
          onOpenChange(false);
          reset();
          setDuplicateWarning([]);
          setShowSuccess(false);
        }, 1500);
      } else {
        // For edits, just call onCustomerCreated to refresh parent data
        onCustomerCreated();
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      }
      
    } catch (error: any) {
      console.error('Error saving customer:', error);
      
      if (error.name === 'AbortError') {
        setSubmitError('Request timed out. Please check your connection and try again.');
      } else {
        setSubmitError('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
    setDuplicateWarning([]);
    setSubmitError('');
    setShowSuccess(false);
    setShowRemoveConfirm(false);
    setLoading(false);
    setRemoveLoading(false);
  };

  const handleRemoveCustomer = async () => {
    if (!customerId) return;
    
    const reason = prompt('Please provide a reason for deactivating this customer:');
    if (!reason) return;
    
    setRemoveLoading(true);
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to deactivate customer');
      }
      
      toast.success('Customer deactivated successfully', {
        description: 'The customer has been deactivated and will no longer appear in active lists.',
        duration: 5000,
      });
      
      onCustomerCreated(); // Refresh parent data
      onOpenChange(false); // Close modal
      reset();
      setDuplicateWarning([]);
      setSubmitError('');
      setShowSuccess(false);
      setShowRemoveConfirm(false);
      
    } catch (error: any) {
      console.error('Error deactivating customer:', error);
      setSubmitError(error.message || 'Failed to deactivate customer');
    } finally {
      setRemoveLoading(false);
    }
  };

  if (open && isEditing && customerLoading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading customer...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-lg md:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
{isEditing ? 'Edit Customer' : (prePopulateData ? 'Create Customer from Unmapped Record' : 'Create New Customer')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Duplicate Warning */}
          {duplicateWarning.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <div className="font-semibold mb-2">Similar customers found:</div>
                <div className="space-y-2">
                  {duplicateWarning.map((dup, index) => (
                    <div key={dup.customer?.id || index} className="bg-white/50 p-3 rounded border">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{dup.customer?.customer_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-600">{dup.customer?.contact_number || 'No phone'}</p>
                          {dup.customer?.email && (
                            <p className="text-xs text-gray-600">{dup.customer.email}</p>
                          )}
                          <p className="text-xs text-gray-500">Code: {dup.customer?.customer_code || 'N/A'}</p>
                        </div>
                        {dup.matchScore && (
                          <div className="text-xs bg-orange-200 px-2 py-1 rounded">
                            {Math.round(dup.matchScore * 100)}% match
                          </div>
                        )}
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

          {/* Success Alert */}
          {showSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="font-semibold">
                  {isEditing ? 'Customer Updated!' : 'Customer Created!'}
                </div>
                <div className="text-sm mt-1">
                  {isEditing ? 'Changes have been saved successfully.' : 'New customer has been added to the system.'}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {submitError && !showSuccess && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {submitError}
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
              <User className="h-5 w-5" />
              Basic Information
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  {...register('fullName')}
                  placeholder="Enter full name"
                  className={errors.fullName ? 'border-red-500' : ''}
                />
                {errors.fullName && (
                  <p className="text-sm text-red-600">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryPhone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="primaryPhone"
                    {...register('primaryPhone')}
                    placeholder="e.g. +66812345678 or 0812345678"
                    className={`pl-10 ${errors.primaryPhone ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.primaryPhone && (
                  <p className="text-sm text-red-600">{errors.primaryPhone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="customer@example.com"
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="dateOfBirth"
                    type="date"
                    {...register('dateOfBirth')}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className={`pl-10 ${errors.dateOfBirth ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.dateOfBirth && (
                  <p className="text-sm text-red-600">{errors.dateOfBirth.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
              <MapPin className="h-5 w-5" />
              Contact Information
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  {...register('address')}
                  placeholder="Enter full address"
                  rows={2}
                  className={errors.address ? 'border-red-500' : ''}
                />
                {errors.address && (
                  <p className="text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
                <Select 
                  value={watch('preferredContactMethod')} 
                  onValueChange={(value) => setValue('preferredContactMethod', value as 'Phone' | 'LINE' | 'Email')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Phone">Phone</SelectItem>
                    <SelectItem value="LINE">LINE</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
              <MessageSquare className="h-5 w-5" />
              Additional Information
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Customer Notes</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="Add any additional notes about the customer"
                  rows={3}
                  className={errors.notes ? 'border-red-500' : ''}
                />
                {errors.notes && (
                  <p className="text-sm text-red-600">{errors.notes.message}</p>
                )}
              </div>

              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="updateReason">Reason for Update</Label>
                  <Input
                    id="updateReason"
                    {...register('updateReason')}
                    placeholder="Brief reason for this update"
                    className={errors.updateReason ? 'border-red-500' : ''}
                  />
                  {errors.updateReason && (
                    <p className="text-sm text-red-600">{errors.updateReason.message}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRemoveCustomer}
                  disabled={loading || removeLoading || showSuccess}
                  className="flex items-center gap-2"
                >
                  {removeLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deactivating...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Deactivate Customer
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading || removeLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || removeLoading || showSuccess}
                className="min-w-[120px]"
              >
                {showSuccess ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    {isEditing ? 'Updated!' : 'Created!'}
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditing ? 'Update Customer' : 'Create Customer'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}