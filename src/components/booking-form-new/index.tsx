'use client'

import { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Loader2, Clock, Users, Calendar, MapPin, Shield } from 'lucide-react';

import { EnhancedEmployeeSelector } from './selectors/enhanced-employee-selector';
import { EnhancedCustomerTypeSelector } from './selectors/enhanced-customer-type-selector';
import { EnhancedContactMethodSelector } from './selectors/enhanced-contact-method-selector';
import { EnhancedBookingTypeSelector } from './selectors/enhanced-booking-type-selector';
import { EnhancedCoachSelector } from './selectors/enhanced-coach-selector';
import { EnhancedPromotionSelector } from './selectors/enhanced-promotion-selector';
import { CustomerDetails } from './customer-details';
import { PackageSelector } from './package-selector';
import { TimeSlotStep } from './steps/time-slot-step';
import { SubmitStep } from '../booking-form/submit/submit-step';
import { BayBlockingModal } from './bay-blocking-modal';

import { FormProvider, validateStep1, validateStep2, validateStep3 } from '../booking-form/context/form-provider';
import { StepProvider } from '../booking-form/navigation/step-context';
import { handleFormSubmit } from '../booking-form/submit/submit-handler';
import type { FormData, FormErrors } from '../booking-form/types';
// Customer type for the new customer management system
interface NewCustomer {
  id: string;
  customer_code: string;
  customer_name: string;
  contact_number?: string;
  email?: string;
  preferred_contact_method?: 'Phone' | 'LINE' | 'Email';
  customer_status: string;
  lifetime_spending: string;
  total_bookings: number;
  last_visit_date?: string;
  // Legacy compatibility
  stable_hash_id?: string;
}

const initialFormData: FormData = {
  employeeName: null,
  customerContactedVia: null,
  bookingType: null,
  isNewCustomer: null, // Changed from false to null to require selection
  bookingDate: null,
  startTime: null,
  endTime: null,
  duration: 60,
  isManualMode: false,
  bayNumber: undefined,
  notes: '',
  numberOfPax: 1,
  promotion: null,
  isSubmitted: false,
  submissionStatus: {
    booking: false,
    calendar: false,
    notification: false
  }
};

// Interface for packages
interface Package {
  id: string;
  name: string;
  type: string;
  hours_remaining: number;
  expires_at: string;
  is_unlimited?: boolean;
  coach?: string;
}

export function BookingFormNew() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string>('');
  
  // Cache the selected customer so it persists even when SWR data changes
  const [selectedCustomerCache, setSelectedCustomerCache] = useState<NewCustomer | null>(null);
  
  // Package state for existing customers
  const [availablePackages, setAvailablePackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  
  // Auto-detection states
  const [autoSelectedCoach, setAutoSelectedCoach] = useState<string | null>(null);
  const [autoSelectedBookingType, setAutoSelectedBookingType] = useState<string | null>(null);
  
  // Bay blocking state
  const [showBayBlockingModal, setShowBayBlockingModal] = useState(false);

  // Dynamic customer search - will fetch based on search query or show recent customers
  const [searchQuery, setSearchQuery] = useState('');
  const searchUrl = searchQuery.length >= 2 
    ? `/api/customers?search=${encodeURIComponent(searchQuery)}&limit=100` 
    : '/api/customers?limit=100&sortBy=lastVisit&sortOrder=desc';

  const { data: customersResponse, mutate: mutateCustomers } = useSWR<{customers: NewCustomer[], pagination: any, kpis: any}>(
    searchUrl,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    }
  );

  const customers = customersResponse?.customers || [];

  useEffect(() => {
    mutateCustomers();
  }, [mutateCustomers]);

  // Progressive section display logic
  const showCustomerInfo = formData.employeeName; // Show customer type selection after employee selection
  const showCustomerDetails = showCustomerInfo && formData.isNewCustomer !== null;
  const showPackageSelection = showCustomerDetails && !formData.isNewCustomer && selectedCustomerCache && availablePackages.length > 0;
  const showBookingType = showCustomerDetails && (
    (formData.isNewCustomer && formData.customerName && formData.customerPhone && !errors.customerPhone) ||
    (!formData.isNewCustomer && formData.customerId)
  ); // Show booking type after customer details are complete and no validation errors
  const showContactMethod = showBookingType && formData.bookingType; // Show contact method AFTER booking type is selected
  const showCoachSelection = showBookingType && (formData.bookingType === 'Coaching' || formData.bookingType?.startsWith('Coaching (') || autoSelectedBookingType === 'Coaching');
  const showTimeSlot = showContactMethod && formData.customerContactedVia && formData.bookingType;
  const showBookingDetails = showTimeSlot && formData.bookingDate && formData.startTime;

  // Auto-scroll function
  const scrollToNextSection = (selector: string) => {
    setTimeout(() => {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300); // Delay to allow UI to update
  };

  // Form validation - only validate visible sections
  useEffect(() => {
    let allErrors: FormErrors = {};
    
    // Always validate employee selection
    if (!formData.employeeName) {
      allErrors.employeeName = 'Please select who is creating this booking';
    }
    
    // Only validate contact method if employee is selected
    if (showContactMethod && !formData.customerContactedVia) {
      allErrors.customerContactedVia = 'Please select how customer was contacted';
    }
    
    // Only validate customer info if that section is visible
    if (showCustomerInfo && formData.isNewCustomer === null) {
      allErrors.isNewCustomer = 'Please select customer type';
    }
    
    // Only validate customer details if that section is visible
    if (showCustomerDetails) {
      if (formData.isNewCustomer) {
        if (!formData.customerName?.trim()) {
          allErrors.customerName = 'Customer name is required';
        }
        if (!formData.customerPhone?.trim()) {
          allErrors.customerPhone = 'Phone number is required';
        } else if (phoneError) {
          // Block form submission if there's a phone duplicate error
          allErrors.customerPhone = phoneError;
        }
      } else {
        if (!formData.customerId) {
          allErrors.customerId = 'Please select a customer';
        }
      }
    }
    
    // Only validate other sections if they're visible
    if (showBookingType && !formData.bookingType) {
      allErrors.bookingType = 'Please select booking type';
    }
    
    if (showCoachSelection && !formData.coach) {
      allErrors.coach = 'Please select a coach';
    }
    
    if (showTimeSlot) {
      if (!formData.bookingDate) {
        allErrors.bookingDate = 'Please select a date';
      }
      if (!formData.startTime) {
        allErrors.startTime = 'Please select a time';
      }
    }
    
    setErrors(allErrors);
  }, [formData, phoneError, showContactMethod, showCustomerInfo, showCustomerDetails, showBookingType, showCoachSelection, showTimeSlot]);

  // Smart package analysis for auto-detection
  const analyzePackageForAutoDetection = (pkg: Package): {bookingType: string, coach: string | null} => {
    // Add null checks for package properties
    const packageName = pkg.name?.toLowerCase() || '';
    const packageType = pkg.type?.toLowerCase() || '';
    
    // Auto-detect booking type
    let detectedBookingType = 'Package';
    if (packageType === 'coaching' || packageName.includes('coaching')) {
      detectedBookingType = 'Coaching';
    }
    
    // Auto-detect coach from package name
    let detectedCoach = null;
    if (packageName.includes('boss') && !packageName.includes('ratchavin')) {
      detectedCoach = 'Boss';
    } else if (packageName.includes('ratchavin') || packageName.includes('boss - ratchavin')) {
      detectedCoach = 'Boss - Ratchavin';
    } else if (packageName.includes('noon')) {
      detectedCoach = 'Noon';
    }
    
    // Update state with detected values
    setAutoSelectedBookingType(detectedBookingType);
    setAutoSelectedCoach(detectedCoach);
    
    return { bookingType: detectedBookingType, coach: detectedCoach };
  };

  // Fetch packages for existing customers
  const fetchCustomerPackages = async (customerId: string) => {
    try {
      const response = await fetch(`/api/packages/by-customer/${customerId}?include_inactive=true`);
      if (!response.ok) throw new Error('Failed to fetch packages');
      const data = await response.json();
      setAvailablePackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      setAvailablePackages([]);
    }
  };

  const handleReset = () => {
    setFormData({
      ...initialFormData,
      promotion: null,
      isSubmitted: false,
      submissionStatus: {
        booking: false,
        calendar: false,
        notification: false
      }
    });
    setErrors({});
    setIsSubmitting(false);
    setSelectedCustomerCache(null);
    setAvailablePackages([]);
    setSelectedPackage(null);
    setAutoSelectedCoach(null);
    setAutoSelectedBookingType(null);
    setSearchQuery('');
    mutateCustomers();
  };

  const handleBayBlockingSuccess = (blockedBays: string[], reason: string, timeRange: string) => {
    console.log('Bays blocked successfully:', { blockedBays, reason, timeRange });
    // You could add a toast notification here if needed
  };

  const handleCustomerSelect = (customer: NewCustomer) => {
    setSelectedCustomerCache(customer);
    
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.customer_name,
      customerPhone: customer.contact_number || undefined,
      customerStableHashId: customer.stable_hash_id
    }));
    
    // Fetch packages for existing customer
    fetchCustomerPackages(customer.id);
    
    // Auto-scroll to next section after customer is selected
    setTimeout(() => {
      scrollToNextSection('[data-scroll-target="booking-type"]');
    }, 500); // Give time for packages to load
  };

  const handlePackageSelection = (pkg: Package | null) => {
    if (pkg) {
      setSelectedPackage(pkg);
      
      // Analyze package for auto-detection and get immediate results
      const autoDetected = analyzePackageForAutoDetection(pkg);
      
      setFormData(prev => {
        const newBookingType = prev.bookingType || autoDetected.bookingType;
        const newCoach = prev.coach || autoDetected.coach;
        
        // For coaching bookings, include coach name in booking type
        let finalBookingType = newBookingType;
        if ((newBookingType === 'Coaching' || newBookingType?.startsWith('Coaching (')) && newCoach) {
          finalBookingType = `Coaching (${newCoach})`;
        }
        
        return {
          ...prev,
          packageId: pkg.id,
          packageName: pkg.name,
          bookingType: finalBookingType,
          coach: newCoach
        };
      });

      // Auto-scroll to coach selection if coaching package is selected
      if (autoDetected.bookingType === 'Coaching') {
        setTimeout(() => {
          const coachSection = document.querySelector('[data-scroll-target="coach-selection"]');
          if (coachSection) {
            coachSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 500);
      }
    } else {
      // Package deselected - clear everything completely using flushSync for immediate updates
      flushSync(() => {
        setSelectedPackage(null);
        setAutoSelectedCoach(null);
        setAutoSelectedBookingType(null);
      });
      
      // Then clear form data
      flushSync(() => {
        setFormData(prev => ({
          ...prev,
          packageId: undefined,
          packageName: '',
          bookingType: null, // Clear auto-selected booking type
          coach: null // Clear auto-selected coach
        }));
      });
    }
  };

  const handleSubmit = async () => {
    // Final validation - all visible sections should be complete
    if (!isFormComplete || Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await handleFormSubmit(formData);
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          isSubmitted: true,
          submissionStatus: {
            booking: true,
            calendar: true,
            notification: true
          }
        }));
        await mutateCustomers();
      }
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form is ready for submission - only check visible sections
  const isFormComplete = Boolean(
    Object.keys(errors).length === 0 && 
    formData.employeeName && 
    formData.isNewCustomer !== null &&
    (formData.isNewCustomer ? (formData.customerName && formData.customerPhone) : formData.customerId) &&
    formData.customerContactedVia &&
    formData.bookingType &&
    formData.bookingDate &&
    formData.startTime &&
    formData.endTime &&
    formData.bayNumber &&
    formData.numberOfPax
  );

  // Show success state if submitted
  if (formData.isSubmitted) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <SubmitStep
          formData={formData} 
          isSubmitting={false}
          setIsSubmitting={setIsSubmitting}
          onSuccess={handleReset}
          onReset={handleReset}
          onNavigateToStep={() => {}}
        />
      </div>
    );
  }

  // Context values for providers
  const contextValue = {
    formData,
    errors,
    setFormValue: (field: string, value: any) => {
      setFormData(prev => {
        const updated = { ...prev, [field]: value };
        
        // Clear package selection when booking type changes
        if (field === 'bookingType' && prev.bookingType !== value) {
          updated.packageId = '';
          updated.packageName = '';
        }
        
        return updated;
      });
    },
    handleCustomerSelect,
    handlePackageSelection: (id: string | null, name: string) => {
      setFormData(prev => ({
        ...prev,
        packageId: id || undefined,
        packageName: name,
      }));
    },
    isSubmitting,
    customers,
    mutateCustomers,
    searchQuery,
    onSearchQueryChange: setSearchQuery,
    selectedCustomerCache,
    onPhoneError: setPhoneError
  };

  return (
    <StepProvider 
      currentStep={1} // Single page form, always step 1
      setCurrentStep={() => {}} // Not used in single page
      canProgress={isFormComplete}
      setCanProgress={() => {}} // Not used in single page
      isSubmitting={isSubmitting}
    >
      <FormProvider value={contextValue}>
        <div className="w-full max-w-4xl mx-auto p-6 space-y-8">

          {/* Action buttons at top */}
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={() => setShowBayBlockingModal(true)}
              disabled={isSubmitting}
              className="text-muted-foreground hover:text-foreground"
            >
              <Shield className="h-4 w-4 mr-2" />
              Block Bays
            </Button>
            
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSubmitting}
              className="text-gray-600 hover:text-gray-800"
            >
              Reset Form
            </Button>
          </div>

      {/* Section 1: Employee Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Staff</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedEmployeeSelector
            value={formData.employeeName}
            onChange={(value) => {
              setFormData(prev => ({ ...prev, employeeName: value }));
              // Auto-scroll to customer type selection
              if (value) {
                scrollToNextSection('[data-scroll-target="customer-info"]');
              }
            }}
            error={errors.employeeName}
          />
        </CardContent>
      </Card>

      {/* Section 2: Customer Information */}
      {showCustomerInfo && (
        <Card data-scroll-target="customer-info">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Customer</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <EnhancedCustomerTypeSelector
              value={formData.isNewCustomer}
              onChange={(value) => {
                setFormData(prev => ({ ...prev, isNewCustomer: value }));
                // Reset customer data when switching types
                setSelectedCustomerCache(null);
                setAvailablePackages([]);
                setSelectedPackage(null);
                setAutoSelectedCoach(null);
                setAutoSelectedBookingType(null);
                // Auto-scroll to next section
                if (value !== null) {
                  scrollToNextSection('[data-scroll-target="customer-info"]');
                }
              }}
              error={errors.isNewCustomer}
            />
            
            {showCustomerDetails && (
              <div data-scroll-target="customer-details">
                <CustomerDetails
                  isNewCustomer={formData.isNewCustomer!}
                  customers={customers}
                  selectedCustomerId={formData.customerId || ''}
                  onCustomerSelect={handleCustomerSelect}
                  customerName={formData.customerName || ''}
                  onCustomerNameChange={(value) => setFormData(prev => ({ ...prev, customerName: value }))}
                  phoneNumber={formData.customerPhone || ''}
                  onPhoneNumberChange={(value) => setFormData(prev => ({ ...prev, customerPhone: value }))}
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  selectedCustomerCache={selectedCustomerCache}
                  error={{
                    customer: errors.customerId,
                    customerName: errors.customerName,
                    phoneNumber: errors.customerPhone
                  }}
                  onPhoneError={setPhoneError}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 3: Package Selection (Existing Customers Only) */}
      {showPackageSelection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Select Package</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PackageSelector
              value={formData.packageId || ''}
              customerName={formData.customerName || ''}
              customerPhone={formData.customerPhone}
              customerId={formData.customerId}
              bookingType={formData.bookingType}
              isBookingTypeAutoSelected={!!autoSelectedBookingType}
              onChange={(id: string | null, name: string) => {
                // Handle package selection for auto-detection
                const selectedPkg = availablePackages.find(p => p.id === id);
                if (selectedPkg) {
                  // Convert to the Package format expected by auto-detection
                  const customerPackage = selectedPkg as any; // Type assertion to access nested properties
                  const packageForAutoDetection: Package = {
                    id: customerPackage.id,
                    name: name || customerPackage.details?.packageTypeName || customerPackage.label || '',
                    type: name || customerPackage.details?.packageTypeName || customerPackage.label || '',
                    hours_remaining: customerPackage.details?.remainingHours || 0,
                    expires_at: customerPackage.details?.expirationDate || '',
                    is_unlimited: customerPackage.details?.remainingHours === null
                  };
                  
                  handlePackageSelection(packageForAutoDetection);
                } else {
                  // Package deselected - call handlePackageSelection with null
                  handlePackageSelection(null);
                }
              }}
              error={errors.packageId}
            />
          </CardContent>
        </Card>
      )}

      {/* Section 4: Booking Type */}
      {showBookingType && (
        <Card data-scroll-target="booking-type">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Type of Booking</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedBookingTypeSelector
              key={`booking-type-${!!autoSelectedBookingType}-${formData.bookingType || 'none'}`}
              value={formData.bookingType}
              onChange={(value) => {
                setFormData(prev => ({ ...prev, bookingType: value }));
                // Auto-scroll to next section if a value is selected
                if (value) {
                  scrollToNextSection('[data-scroll-target="contact-method"]');
                }
              }}
              error={errors.bookingType}
              autoSelected={!!autoSelectedBookingType}
              packageName={selectedPackage?.name}
              hasSelectedPackage={!!selectedPackage}
            />
          </CardContent>
        </Card>
      )}

      {/* Section 5: Coach Selection */}
      {showCoachSelection && (
        <Card data-scroll-target="coach-selection">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Coach Selection</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedCoachSelector
              value={formData.coach || autoSelectedCoach}
              onChange={(value) => setFormData(prev => {
                let updatedBookingType = prev.bookingType;
                
                // For coaching bookings, include coach name in booking type
                if (prev.bookingType === 'Coaching' || prev.bookingType?.startsWith('Coaching (')) {
                  updatedBookingType = value ? `Coaching (${value})` : 'Coaching';
                }
                
                return { 
                  ...prev, 
                  coach: value,
                  bookingType: updatedBookingType
                };
              })}
              error={errors.coach}
              autoSelected={!!autoSelectedCoach}
              packageName={selectedPackage?.name}
            />
          </CardContent>
        </Card>
      )}

      {/* Section 6: Contact Method */}
      {showContactMethod && (
        <Card data-scroll-target="contact-method">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Contact Method</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedContactMethodSelector
              value={formData.customerContactedVia}
              onChange={(value) => {
                setFormData(prev => ({ ...prev, customerContactedVia: value }));
                // Auto-scroll to time slot selection after contact method is selected
                if (value) {
                  scrollToNextSection('[data-scroll-target="time-slot"]');
                }
              }}
              error={errors.customerContactedVia}
            />
          </CardContent>
        </Card>
      )}

      {/* Section 7: Time Slot Selection */}
      {showTimeSlot && (
        <Card data-scroll-target="time-slot">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Select Date & Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSlotStep />
          </CardContent>
        </Card>
      )}

      {/* Section 8: Additional Details */}
      {showBookingDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Additional Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div>
              <Label htmlFor="promotions">Promotions & Extras (Optional)</Label>
              <EnhancedPromotionSelector
                value={formData.promotion ?? null}
                onChange={(value) => {
                  setFormData(prev => {
                    let newNotes = prev.notes || ''
                    
                    // Auto-populate notes based on selection
                    if (value) {
                      const promotionNote = value
                      // Only add if not already in notes
                      if (!newNotes.includes(promotionNote)) {
                        newNotes = newNotes ? `${newNotes}; ${promotionNote}` : promotionNote
                      }
                    }
                    
                    return { ...prev, promotion: value, notes: newNotes }
                  })
                }}
                isNewCustomer={formData.isNewCustomer || false}
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes or special requests..."
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      {isFormComplete && (
        <div className="flex justify-end space-x-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSubmitting}
          >
            Reset Form
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Create Booking
              </>
            )}
          </Button>
          </div>
        )}

        {/* Bay Blocking Modal */}
        <BayBlockingModal
          open={showBayBlockingModal}
          onOpenChange={setShowBayBlockingModal}
          employeeName={formData.employeeName}
          onSuccess={handleBayBlockingSuccess}
        />
        </div>
      </FormProvider>
    </StepProvider>
  );
}