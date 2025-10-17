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

interface ChatContext {
  from?: string | null
  conversationId?: string | null
  customerId?: string | null
  channelType?: string | null
  staffName?: string | null
}

interface BookingPreFill {
  date?: string | null
  time?: string | null
  duration?: number
}

interface BookingFormNewProps {
  chatContext?: ChatContext
  bookingPreFill?: BookingPreFill
}

export function BookingFormNew(props: BookingFormNewProps = {}) {
  const { chatContext, bookingPreFill } = props;
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string>('');
  const [submissionError, setSubmissionError] = useState<string>('');
  
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

  // Check if this is from chat context
  const isFromChat = chatContext && chatContext.from === 'chat'

  // Progressive section display logic
  const showCustomerInfo = !isFromChat && formData.employeeName; // Hide for chat since pre-filled
  const showCustomerDetails = !isFromChat && showCustomerInfo && formData.isNewCustomer !== null;
  const showPackageSelection = (isFromChat ? selectedCustomerCache && availablePackages.length > 0 :
    showCustomerDetails && !formData.isNewCustomer && selectedCustomerCache && availablePackages.length > 0);
  const showBookingType = isFromChat ? (formData.employeeName && formData.customerId) :
    (showCustomerDetails && (
      (formData.isNewCustomer && formData.customerName && formData.customerPhone && !errors.customerPhone) ||
      (!formData.isNewCustomer && formData.customerId)
    )); // Show booking type after customer details are complete and no validation errors
  const showContactMethod = !isFromChat && showBookingType && formData.bookingType; // Hide for chat since pre-filled
  const showCoachSelection = showBookingType && (formData.bookingType === 'Coaching' || formData.bookingType?.startsWith('Coaching (') || autoSelectedBookingType === 'Coaching');
  const showTimeSlot = isFromChat ? (showBookingType && formData.bookingType) :
    (showContactMethod && formData.customerContactedVia && formData.bookingType);
  const showBookingDetails = showTimeSlot && formData.bookingDate && formData.startTime;

  // Pre-populate form from chat context
  useEffect(() => {
    if (chatContext && chatContext.from === 'chat') {
      const getContactMethod = (channel: string | null) => {
        switch (channel) {
          case 'line': return 'LINE'
          case 'website': return 'Walk-in'
          case 'facebook': return 'Facebook'
          case 'instagram': return 'Instagram'
          case 'whatsapp': return 'WhatsApp'
          default: return 'LINE'
        }
      }

      setFormData(prev => ({
        ...prev,
        employeeName: chatContext.staffName || 'David',
        isNewCustomer: false, // Since we have a customer ID, it's an existing customer
        customerId: chatContext.customerId || undefined,
        customerContactedVia: getContactMethod(chatContext.channelType || null)
      }))

      // If we have a customer ID, fetch the customer details and packages
      if (chatContext.customerId) {
        fetchCustomerPackages(chatContext.customerId)
        // Fetch customer details and set in cache
        fetchCustomerDetails(chatContext.customerId)
      }

      // Auto-scroll to booking type section since earlier sections are pre-filled
      setTimeout(() => {
        scrollToNextSection('[data-scroll-target="booking-type"]')
      }, 1000)
    }
  }, [chatContext])

  // Pre-fill booking date, time, and duration from URL parameters
  useEffect(() => {
    if (bookingPreFill && (bookingPreFill.date || bookingPreFill.time || bookingPreFill.duration)) {
      setFormData(prev => {
        const updates: Partial<FormData> = {};

        // Convert date string to Date object (avoid timezone issues by parsing manually)
        let dateObj: Date;
        if (bookingPreFill.date) {
          const [year, month, day] = bookingPreFill.date.split('-').map(Number);
          dateObj = new Date(year, month - 1, day); // month is 0-indexed
          updates.bookingDate = dateObj;
        } else {
          dateObj = new Date();
        }

        if (bookingPreFill.time) {
          // Convert time string to Date object for the form components
          const [hours, minutes] = bookingPreFill.time.split(':').map(Number);
          const startTimeDate = new Date(dateObj);
          startTimeDate.setHours(hours, minutes, 0, 0);
          updates.startTime = startTimeDate;
        }

        if (bookingPreFill.duration && bookingPreFill.time) {
          // Convert hours to minutes
          updates.duration = bookingPreFill.duration * 60;

          // Calculate end time as Date object
          const [hours, minutes] = bookingPreFill.time.split(':').map(Number);
          const startTimeDate = new Date(dateObj);
          startTimeDate.setHours(hours, minutes, 0, 0);

          const endTimeDate = new Date(startTimeDate);
          endTimeDate.setMinutes(endTimeDate.getMinutes() + (bookingPreFill.duration * 60));
          updates.endTime = endTimeDate;
        }

        return { ...prev, ...updates };
      });
    }
  }, [bookingPreFill])

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

    // Only validate employee selection if not from chat
    if (!isFromChat && !formData.employeeName) {
      allErrors.employeeName = 'Please select who is creating this booking';
    }

    // Only validate contact method if employee is selected and section is visible
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

    // Validate booking type if section is visible
    if (showBookingType && !formData.bookingType) {
      allErrors.bookingType = 'Please select booking type';
    }

    // Validate coach selection if section is visible
    if (showCoachSelection && !formData.coach) {
      allErrors.coach = 'Please select a coach';
    }

    // Validate time slot if section is visible
    if (showTimeSlot) {
      if (!formData.bookingDate) {
        allErrors.bookingDate = 'Please select a date';
      }
      if (!formData.startTime) {
        allErrors.startTime = 'Please select a time';
      }
    }

    setErrors(allErrors);
  }, [formData, phoneError, showContactMethod, showCustomerInfo, showCustomerDetails, showBookingType, showCoachSelection, showTimeSlot, isFromChat]);

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

  // Fetch customer details for chat context
  const fetchCustomerDetails = async (customerId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      if (!response.ok) throw new Error('Failed to fetch customer details');
      const data = await response.json();

      if (data.customer) {
        // Map the customer data to match NewCustomer interface
        const customer: NewCustomer = {
          id: data.customer.id,
          customer_code: data.customer.customer_code,
          customer_name: data.customer.customer_name,
          contact_number: data.customer.contact_number,
          email: data.customer.email,
          preferred_contact_method: data.customer.preferred_contact_method,
          customer_status: data.customer.customer_status,
          lifetime_spending: data.customer.lifetime_spending || '0',
          total_bookings: data.customer.total_bookings || 0,
          last_visit_date: data.customer.last_visit_date,
          stable_hash_id: data.customer.stable_hash_id
        };

        setSelectedCustomerCache(customer);
        setFormData(prev => ({
          ...prev,
          customerName: customer.customer_name,
          customerPhone: customer.contact_number || undefined,
          customerStableHashId: customer.stable_hash_id
        }));
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
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

  const handleSuccessAction = () => {
    if (isFromChat) {
      // Close the tab to return to chat
      window.close();
    } else {
      // Regular reset for normal booking flow
      handleReset();
    }
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
    setSubmissionError(''); // Clear any previous errors
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
      } else if (result.error) {
        // Display error from the API
        setSubmissionError(result.error);
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmissionError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form is ready for submission - only check visible sections
  const isFormComplete = Boolean(
    Object.keys(errors).length === 0 &&
    formData.employeeName &&
    (isFromChat || formData.isNewCustomer !== null) &&
    (isFromChat || (formData.isNewCustomer ? (formData.customerName && formData.customerPhone) : formData.customerId)) &&
    (isFromChat || formData.customerContactedVia) &&
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
          onSuccess={handleSuccessAction}
          onReset={handleReset}
          onNavigateToStep={() => {}}
          isFromChat={isFromChat}
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

        // Clear submission error when time is changed
        if (field === 'startTime' || field === 'endTime') {
          setSubmissionError('');
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
        <div className="w-full max-w-4xl mx-auto p-3 sm:p-6 space-y-6 sm:space-y-8">

          {/* Chat Context Customer Summary - Show at top as pre-selected */}
          {isFromChat && selectedCustomerCache && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedCustomerCache.customer_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedCustomerCache.contact_number || 'No phone'} • {selectedCustomerCache.customer_code}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons at top - Hide for chat context */}
          {!isFromChat && (
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center space-y-2 sm:space-y-0">
              <Button
                variant="ghost"
                onClick={() => setShowBayBlockingModal(true)}
                disabled={isSubmitting}
                className="text-muted-foreground hover:text-foreground text-sm sm:text-base"
              >
                <Shield className="h-4 w-4 mr-2" />
                Block Bays
              </Button>

              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
                className="text-gray-600 hover:text-gray-800 text-sm sm:text-base"
              >
                Reset Form
              </Button>
            </div>
          )}

      {/* Section 1: Employee Selection - Hidden for chat context */}
      {!isFromChat && (
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
      )}

      {/* Section 2: Customer Information - Hidden for chat context */}
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

      {/* Section 6: Contact Method - Hidden for chat context */}
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
        <div className="space-y-4">
          {/* Error Message Display */}
          {submissionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">Booking Error</h3>
                  <p className="mt-1 text-sm text-red-700">{submissionError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSubmitting}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Reset Form
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="min-w-[120px] w-full sm:w-auto order-1 sm:order-2"
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