# Booking Form Confirmation Screen Implementation Guide

## Overview
The booking form needs to show a clear confirmation screen after successfully creating a booking. This guide explains how to implement this feature across all relevant files.

## Understanding the Current Structure

The booking form currently follows a 3-step process:
1. Basic Info: Employee selection and contact method
2. Customer Details: Customer information and package selection
3. Schedule: Time slots, bay selection, and booking creation

When a booking is created, three API operations happen successfully:
1. Database entry creation (/api/bookings/create)
2. Calendar event creation (/api/bookings/calendar)
3. LINE notification sending (/api/notify)

However, the user interface doesn't reflect these operations' success, leading to user uncertainty.

## Required Source Files

### 1. Form Types (`src/components/booking-form/types.ts`)
This file defines the form's data structure and needs updating to include submission state:

```typescript
export interface FormData {
  employeeName: string | null;
  customerContactedVia: string | null;
  bookingType: string | null;
  isNewCustomer: boolean;
  bookingDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  duration: number;
  isManualMode: boolean;
  bayNumber?: string;
  notes: string;
  numberOfPax: number;
  // Add new field for submission state
  isSubmitted?: boolean;
}

export interface FormErrors {
  [key: string]: string;
}

export interface SubmitStepProps {
  formData: FormData;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  onSuccess: () => void;
  onReset: () => void;
  onSubmit: () => Promise<boolean>;
}
```

### 2. Submit Handler (`src/components/booking-form/submit/submit-handler.ts`)
This file handles the API calls and remains largely unchanged as it's working correctly:

```typescript
export async function handleFormSubmit(formData: FormData): Promise<SubmitResponse> {
  try {
    console.log('Starting form submission with data:', formData);
    const booking = formatBookingData(formData);
    
    // Create booking record
    const bookingResponse = await fetch('/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking)
    });

    if (!bookingResponse.ok) {
      throw new Error('Failed to create booking record');
    }

    const { bookingId } = await bookingResponse.json();

    // Calendar and notification calls remain the same
    // ... existing calendar and notification code

    return {
      success: true,
      calendarEvents: calendarEvents.data,
      bookingId
    };
  } catch (error) {
    console.error('Form submission error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}
```

### 3. Submit Step Component (`src/components/booking-form/submit/submit-step.tsx`)
This component handles the success view after booking creation:

```typescript
import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Clipboard, Check } from 'lucide-react';
import type { SubmitStepProps } from '../types';

export function SubmitStep({ 
  formData, 
  isSubmitting, 
  setIsSubmitting,
  onSuccess,
  onReset,
  onSubmit
}: SubmitStepProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const customerMessage = React.useMemo(() => {
    if (!formData.bookingDate) return '';
    
    const dateStr = format(formData.bookingDate, 'EEEE, MMMM d');
    const timeStr = `${format(new Date(formData.startTime!), 'h:mm a')} - ${format(new Date(formData.endTime!), 'h:mm a')}`;
    
    return `Your booking is confirmed for ${dateStr} at ${timeStr}, ${formData.bayNumber}.`;
  }, [formData]);

  const handleSubmit = async () => {
    try {
      const success = await onSubmit();
      if (success) {
        setIsSubmitted(true);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(customerMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-6">
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <AlertTitle className="text-green-800">Booking Created Successfully</AlertTitle>
        </Alert>

        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Booking Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Employee:</span>
              <span>{formData.employeeName}</span>
              
              <span className="text-muted-foreground">Customer:</span>
              <span>{formData.customerName}</span>
              
              <span className="text-muted-foreground">Contact:</span>
              <span>{formData.customerPhone}</span>
              
              <span className="text-muted-foreground">Booking Type:</span>
              <span>{formData.bookingType}</span>
              
              <span className="text-muted-foreground">Number of Pax:</span>
              <span>{formData.numberOfPax}</span>
              
              <span className="text-muted-foreground">Date:</span>
              <span>{formData.bookingDate?.toLocaleDateString()}</span>
              
              <span className="text-muted-foreground">Time:</span>
              <span>
                {formData.startTime && format(new Date(formData.startTime), 'h:mm a')} 
                - 
                {formData.endTime && format(new Date(formData.endTime), 'h:mm a')}
              </span>
              
              <span className="text-muted-foreground">Bay:</span>
              <span>{formData.bayNumber}</span>

              {formData.notes && (
                <>
                  <span className="text-muted-foreground">Notes:</span>
                  <span>{formData.notes}</span>
                </>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Customer Confirmation Message</h4>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Clipboard className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{customerMessage}</p>
          </div>
        </Card>

        <div className="flex justify-center">
          <Button onClick={onReset} variant="outline">
            Create Another Booking
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Booking Summary</h3>
          {/* Pre-submission summary content */}
        </div>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="default"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating Booking...' : 'Create Booking'}
        </Button>
      </div>
    </div>
  );
}
```

### 4. Main Form Component (`src/components/booking-form/index.tsx`)
The main form component manages the overall state and transitions:

```typescript
export function BookingForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await handleFormSubmit(formData);
      if (result.success) {
        await refreshCustomers();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Submission error:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setCurrentStep(1);
  };

  if (formData.isSubmitted) {
    return (
      <FormProvider value={contextValue}>
        <SubmitStep
          formData={formData}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          onSuccess={() => {}}
          onReset={handleReset}
          onSubmit={handleSubmit}
        />
      </FormProvider>
    );
  }

  return (
    <StepProvider currentStep={currentStep} /* ... other props */>
      <FormProvider value={contextValue}>
        {/* Regular form steps */}
      </FormProvider>
    </StepProvider>
  );
}
```

## Implementation Steps

1. **Update Types**
   - Add isSubmitted to FormData interface
   - Define SubmitStepProps interface

2. **Create Submit Step Component**
   - Implement pre-submission view with summary
   - Implement post-submission view with success message
   - Add copy-to-clipboard functionality

3. **Update Main Form**
   - Add isSubmitted state handling
   - Implement view switching based on submission state
   - Add reset functionality

4. **Testing**
   - Verify booking creation works
   - Test copy-to-clipboard functionality
   - Confirm reset works correctly
   - Check all API calls complete successfully

## UI/UX Considerations

1. **Success Screen Layout**
   - Clear success message at top
   - Complete booking summary for reference
   - Easy-to-copy customer message
   - Prominent but neutral "Create Another Booking" button

2. **State Management**
   - Clear separation between creation and confirmation states
   - Clean form reset when starting new booking

3. **User Feedback**
   - Loading states during submission
   - Clear error messages if something fails
   - Visual confirmation when message is copied

## Common Issues and Solutions

1. **Copy Button Not Working**
   - Ensure clipboard API is available
   - Add fallback for browsers without clipboard support

2. **Form Reset Issues**
   - Clear all form fields, not just visible ones
   - Reset to step 1 of the form

3. **Date Formatting**
   - Use date-fns consistently
   - Handle timezone differences properly

4. **State Management**
   - Keep form context and local state in sync
   - Handle edge cases like page refresh