'use client'

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { FormProvider, validateStep1, validateStep2, validateStep3 } from './context/form-provider';
import { StepProvider } from './navigation/step-context';
import StepContent from './steps/step-content';
import { StepHeader } from './step-header';
import { StepNavigation } from './navigation/step-navigation';
import { handleFormSubmit } from './submit/submit-handler';
import type { FormData, FormErrors } from './types';
import type { Customer } from '@/types/package-form';

const TOTAL_STEPS = 3;

const initialFormData: FormData = {
  employeeName: null,
  customerContactedVia: null,
  bookingType: null,
  isNewCustomer: false,
  bookingDate: null,
  startTime: null,
  endTime: null,
  duration: 60,
  isManualMode: false,
  bayNumber: undefined,
  notes: '',
  numberOfPax: 1,
  isSubmitted: false,
  submissionStatus: {
    booking: false,
    calendar: false,
    notification: false
  }
};

export function BookingForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canProgress, setCanProgress] = useState(false);

  const { data: customers = [], mutate: mutateCustomers } = useSWR<Customer[]>(
    '/api/customers?forceRefresh=true',
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    }
  );

  useEffect(() => {
    mutateCustomers();
  }, [mutateCustomers]);

  useEffect(() => {
    let stepErrors = {};
    if (currentStep === 1) stepErrors = validateStep1(formData);
    else if (currentStep === 2) stepErrors = validateStep2(formData);
    else if (currentStep === 3) stepErrors = validateStep3(formData);
    
    setErrors(stepErrors);
    setCanProgress(Object.keys(stepErrors).length === 0);
  }, [formData, currentStep]);

  const handleReset = () => {
    setFormData({
      ...initialFormData,
      isSubmitted: false,
      submissionStatus: {
        booking: false,
        calendar: false,
        notification: false
      }
    });
    setCurrentStep(1);
    setErrors({});
    setCanProgress(false);
    setIsSubmitting(false);
    mutateCustomers();
  };

  const handleNavigateToStep = (step: number) => {
    // Only allow navigation between valid steps
    if (step >= 1 && step <= TOTAL_STEPS) {
      setCurrentStep(step);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer.id.toString(),
      customerName: customer.customer_name,
      customerPhone: customer.contact_number || undefined
    }));
  };

  const handlePackageSelection = (id: string | null, name: string) => {
    setFormData(prev => ({
      ...prev,
      packageId: id || undefined,
      packageName: name,
    }));
  };

  const handleNext = async () => {
    let stepErrors = {};
    if (currentStep === 1) stepErrors = validateStep1(formData);
    else if (currentStep === 2) stepErrors = validateStep2(formData);
    else if (currentStep === 3) stepErrors = validateStep3(formData);

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    if (currentStep === TOTAL_STEPS) {
      setIsSubmitting(true);
      try {
        const result = await handleFormSubmit(formData);
        if (result.success) {
          setFormData(prev => ({
            ...prev,
            isSubmitted: true,
            submissionStatus: {
              booking: true,
              calendar: !!result.calendarEvents?.length,
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
    } else {
      handleNavigateToStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      handleNavigateToStep(currentStep - 1);
    }
  };

  const contextValue = {
    formData,
    errors,
    setFormValue: (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value })),
    handleCustomerSelect,
    handlePackageSelection,
    isSubmitting,
    customers,
    mutateCustomers
  };

  return (
    <StepProvider 
      currentStep={currentStep}
      setCurrentStep={setCurrentStep}
      canProgress={canProgress}
      setCanProgress={setCanProgress}
      isSubmitting={isSubmitting}
    >
      <FormProvider value={contextValue}>
        <div className="w-full max-w-4xl mx-auto">
          {!formData.isSubmitted && <StepHeader currentStep={currentStep} />}
          <div className="p-6">
            <StepContent 
              currentStep={currentStep} 
              formData={formData}
              setFormData={setFormData}
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
              onSuccess={handleReset}
              onReset={handleReset}
              onNavigateToStep={handleNavigateToStep}
              onNext={handleNext}
              onPrev={handleBack}
            />
            {!formData.isSubmitted && (
              <StepNavigation
                currentStep={currentStep}
                totalSteps={TOTAL_STEPS}
                onNext={handleNext}
                onPrevious={handleBack}
                canProgress={canProgress}
                isSubmitting={isSubmitting}
                className="mt-6"
              />
            )}
          </div>
        </div>
      </FormProvider>
    </StepProvider>
  );
}