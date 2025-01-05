'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Calendar, MessageCircle } from 'lucide-react';
import { handleFormSubmit } from './submit-handler';
import type { BookingFormData } from '@/types/booking-form';

interface SubmitStepProps {
  formData: BookingFormData;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  onSuccess: () => void;
  onReset: () => void;
}

export function SubmitStep({ 
  formData, 
  isSubmitting, 
  setIsSubmitting,
  onSuccess,
  onReset
}: SubmitStepProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = React.useState(false);
  const [submissionStatus, setSubmissionStatus] = React.useState({
    booking: false,
    calendar: false,
    notification: false
  });

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      const result = await handleFormSubmit(formData);
      
      if (result.success) {
        setSubmissionStatus({
          booking: true,
          calendar: !!result.calendarEvents?.length,
          notification: true
        });
        setShowSuccessDialog(true);
      } else {
        setError(result.error || 'Failed to submit booking');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmBooking = () => {
    setShowConfirmDialog(false);
    handleSubmit();
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    onSuccess();
    onReset();
  };

  return (
    <>
      <div className="space-y-6">
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Booking Summary</h3>
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
                {formData.startTime && new Date(formData.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                - 
                {formData.endTime && new Date(formData.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            {isSubmitting ? 'Submitting...' : 'Confirm Booking'}
          </Button>
        </div>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Booking Success
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`h-5 w-5 ${submissionStatus.booking ? 'text-green-500' : 'text-gray-300'}`} />
              <span>Booking Created</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className={`h-5 w-5 ${submissionStatus.calendar ? 'text-green-500' : 'text-gray-300'}`} />
              <span>Calendar Entry Added</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className={`h-5 w-5 ${submissionStatus.notification ? 'text-green-500' : 'text-gray-300'}`} />
              <span>LINE Notification Sent</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSuccessClose}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}