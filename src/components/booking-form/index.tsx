'use client'

import { useState, useEffect } from 'react';
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

export function BookingForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canProgress, setCanProgress] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Debug log for initial render
  console.log('BookingForm initial render - isNewCustomer:', formData.isNewCustomer);

  useEffect(() => {
    const fetchCustomers = async () => {
      console.log('Fetching customers...');
      try {
        const response = await fetch('/api/customers');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch customers: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received customer data:', {
          length: data?.length,
          firstCustomer: data?.[0],
          lastCustomer: data?.[data.length - 1]
        });
        
        if (Array.isArray(data)) {
          setCustomers(data);
          console.log('Customers state set with', data.length, 'customers');
        } else {
          console.error('Received non-array data:', data);
        }
      } catch (error) {
        console.error('Failed to fetch customers:', error);
      }
    };

    fetchCustomers();
  }, []);

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
    console.log('Setting form value:', { field, value });
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('New form data:', newData);
      return newData;
    });
  };

  const handleCustomerSelect = (customer: Customer) => {
    console.log('Selected customer:', customer);
    setFormData(prev => ({
      ...prev,
      customerId: customer.id.toString(),
      customerName: customer.customer_name,
      customerPhone: customer.contact_number || undefined
    }));
  };

  const handlePackageSelection = (id: string, name: string) => {
    console.log('Selected package:', { id, name });
    setFormData(prev => ({
      ...prev,
      packageId: id,
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

  // Debug logs before context creation
  console.log('About to create context value:', {
    currentStep,
    isNewCustomer: formData.isNewCustomer,
    customersLength: customers.length,
    sampleCustomers: customers.slice(0, 2)
  });

  const contextValue = {
    formData,
    errors,
    setFormValue,
    handleCustomerSelect,
    handlePackageSelection,
    isSubmitting,
    customers,
  };

  // Debug log after context creation
  console.log('Created context value:', {
    formDataIsNewCustomer: contextValue.formData.isNewCustomer,
    customersLength: contextValue.customers.length,
    sampleCustomer: contextValue.customers[0]
  });

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