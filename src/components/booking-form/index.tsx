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
  numberOfPax: 1
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch customers: ${response.status}`);
  }
  return response.json();
};

export function BookingForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canProgress, setCanProgress] = useState(false);

  const { data: customers = [], mutate: mutateCustomers } = useSWR<Customer[]>(
    '/api/customers',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnMount: true,
      dedupingInterval: 0
    }
  );

  useEffect(() => {
    let stepErrors = {};
    
    if (currentStep === 1) {
      stepErrors = validateStep1(formData);
    } else if (currentStep === 2) {
      stepErrors = validateStep2(formData);
    } else if (currentStep === 3) {
      stepErrors = validateStep3(formData);
    }
    
    setErrors(stepErrors);
    setCanProgress(Object.keys(stepErrors).length === 0);
  }, [formData, currentStep]);

  const setFormValue = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      packageId: id || undefined,  // Convert null to undefined
      packageName: name,
    }));
  };

  const handleNext = async () => {
    let stepErrors = {};
    
    if (currentStep === 1) {
      stepErrors = validateStep1(formData);
    } else if (currentStep === 2) {
      stepErrors = validateStep2(formData);
    } else if (currentStep === 3) {
      stepErrors = validateStep3(formData);
    }

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    if (currentStep === TOTAL_STEPS) {
      setIsSubmitting(true);
      try {
        const result = await handleFormSubmit(formData);
        if (result.success) {
          setFormData(initialFormData);
          setCurrentStep(1);
          // Refresh customers list after successful submission
          await mutateCustomers();
        }
      } catch (error) {
        console.error('Submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    } else if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSuccess = () => {
    setFormData(initialFormData);
    setCurrentStep(1);
  };

  const contextValue = {
    formData,
    errors,
    setFormValue,
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
          <StepHeader currentStep={currentStep} />
          <div className="p-6">
            <StepContent 
              currentStep={currentStep} 
              formData={formData}
              setFormData={setFormData}
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
              onSuccess={handleSuccess}
              onNext={handleNext}
              onPrev={handleBack}
            />
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              onNext={handleNext}
              onPrevious={handleBack}
              canProgress={canProgress}
              isSubmitting={isSubmitting}
              className="mt-6"
            />
          </div>
        </div>
      </FormProvider>
    </StepProvider>
  );
}