'use client'

import React, { useEffect } from 'react'
import { BookingStep } from './booking-step'
import { CustomerStep } from './customer-step'
import { TimeSlotStep } from './time-slot-step'
import { SubmitStep } from '../submit/submit-step'
import type { BookingFormData } from '@/types/booking-form'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'

const STEPS = {
  1: BookingStep,
  2: CustomerStep,
  3: TimeSlotStep,
} as const;

interface StepContentProps {
  currentStep: number
  formData: BookingFormData
  setFormData: (data: BookingFormData) => void
  isSubmitting: boolean
  setIsSubmitting: (value: boolean) => void
  onSuccess: () => void
  onNext: () => void
  onPrev: () => void
}

const initialFormData: BookingFormData = {
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

const StepContent = ({ 
  currentStep, 
  formData,
  setFormData,
  isSubmitting,
  setIsSubmitting,
  onSuccess,
  onNext,
  onPrev
}: StepContentProps) => {
  const [showConfirmation, setShowConfirmation] = React.useState(false);

  useEffect(() => {
    if (currentStep === 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  const validateStep1 = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.employeeName) {
      errors.employeeName = 'Please select an employee';
    }
    if (!formData.customerContactedVia) {
      errors.customerContactedVia = 'Please select how customer was contacted';
    }
    if (!formData.bookingType) {
      errors.bookingType = 'Please select booking type';
    }
    if (formData.isNewCustomer === null || formData.isNewCustomer === undefined) {
      errors.isNewCustomer = 'Please select customer type';
    }

    return errors;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      const errors = validateStep1();
      if (Object.keys(errors).length > 0) {
        setFormData({
          ...formData,
          errors
        });
        return;
      }
    }
    onNext();
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setShowConfirmation(false);
    onNext();
  };

  const handleSubmitSuccess = () => {
    setShowConfirmation(true);
    onSuccess();
  };

  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    handleReset();
  };

  if (currentStep === 4) {
    return (
      <SubmitStep 
        formData={formData}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
        onSuccess={handleSubmitSuccess}
        onReset={handleReset}
      />
    );
  }
  
  const StepComponent = STEPS[currentStep as keyof typeof STEPS];
  if (!StepComponent) return null;

  return (
    <>
      <StepComponent />
      
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Confirmed!</DialogTitle>
            <DialogDescription>
              Your booking has been successfully created. All notifications have been sent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleConfirmationClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StepContent;