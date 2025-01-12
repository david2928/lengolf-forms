'use client'

import { useCallback, useState } from 'react'
import { Card } from '@/components/ui/card'
import StepContent from './steps/step-content'
import StepHeader from './steps/step-header'
import { StepProvider } from './navigation/step-context'
import type { BookingFormData } from '@/types/booking-form'

const initialFormData: BookingFormData = {
  employeeName: null,
  customerContactedVia: null,
  bookingType: null,
  isNewCustomer: false,
  bookingDate: null,
  startTime: null,
  endTime: null,
  numberOfPax: 1,
  isManualMode: false,
  duration: 60,
  bayNumber: undefined,
  notes: undefined
}

export default function BookingForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [canProgress, setCanProgress] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<BookingFormData>(initialFormData)

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 4))
  }

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSuccess = () => {
    // Reset form after successful submission
    setFormData(initialFormData)
    setCurrentStep(1)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <StepProvider
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        canProgress={canProgress}
        setCanProgress={setCanProgress}
        isSubmitting={isSubmitting}
      >
        <StepHeader />
        <StepContent 
          currentStep={currentStep}
          formData={formData}
          setFormData={setFormData}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          onSuccess={handleSuccess}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      </StepProvider>
    </Card>
  )
}