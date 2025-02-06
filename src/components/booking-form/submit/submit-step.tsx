'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Calendar, MessageCircle, Clipboard } from 'lucide-react';
import { handleFormSubmit } from './submit-handler';
import { generateMessages } from './booking-messages';
import type { BookingFormData } from '@/types/booking-form';

interface SubmitStepProps {
  formData: BookingFormData;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  onSuccess: () => void;
  onReset: () => void;
  onNavigateToStep: (step: number) => void;
}

const MessageBox = ({ title, message, onCopy }: { 
  title: string;
  message: string;
  onCopy: (message: string) => void;
}) => (
  <Card className="p-4">
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-medium">{title}</h4>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={() => onCopy(message)}
      >
        <Clipboard className="h-4 w-4" />
      </Button>
    </div>
    <p className="text-sm text-muted-foreground whitespace-pre-line">
      {message}
    </p>
  </Card>
);

const getFormattedDate = (date: Date | null): string => {
  if (!date) return '';
  const options = { weekday: 'long' as const };
  const weekday = date.toLocaleDateString('en-US', options);
  return `${weekday}, ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};

function getOrdinalNum(n: number) {
  return n + (["st","nd","rd"][((n+90)%100-10)%10-1] || "th");
}

const thaiWeekdays: { [key: string]: string } = {
  'Monday': 'จันทร์',
  'Tuesday': 'อังคาร',
  'Wednesday': 'พุธ',
  'Thursday': 'พฤหัสบดี',
  'Friday': 'ศุกร์',
  'Saturday': 'เสาร์',
  'Sunday': 'อาทิตย์'
};

const thaiMonths: { [key: string]: string } = {
  'January': 'มกราคม',
  'February': 'กุมภาพันธ์',
  'March': 'มีนาคม',
  'April': 'เมษายน',
  'May': 'พฤษภาคม',
  'June': 'มิถุนายน',
  'July': 'กรกฎาคม',
  'August': 'สิงหาคม',
  'September': 'กันยายน',
  'October': 'ตุลาคม',
  'November': 'พฤศจิกายน',
  'December': 'ธันวาคม'
};

export function SubmitStep({ 
  formData, 
  isSubmitting, 
  setIsSubmitting,
  onSuccess,
  onReset,
  onNavigateToStep
}: SubmitStepProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const messages = React.useMemo(() => generateMessages(formData), [formData]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      const result = await handleFormSubmit(formData);
      
      if (result.success) {
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

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    onSuccess();
    onReset();
    onNavigateToStep(1);
  };

  const handleCreateAnother = () => {
    onReset();
    onNavigateToStep(1);
  };

  const copyToClipboard = async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (formData.isSubmitted && messages) {
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
              <span>{formData.bookingDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              
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

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Customer Confirmation Messages</h4>
          <div className="grid grid-cols-2 gap-4">
            <MessageBox 
              title="Thai (Short)" 
              message={messages.thShort}
              onCopy={copyToClipboard}
            />
            <MessageBox 
              title="English (Short)" 
              message={messages.enShort}
              onCopy={copyToClipboard}
            />
            <MessageBox 
              title="Thai (Long)" 
              message={messages.thLong}
              onCopy={copyToClipboard}
            />
            <MessageBox 
              title="English (Long)" 
              message={messages.enLong}
              onCopy={copyToClipboard}
            />
          </div>
        </div>

        <div className="flex justify-center">
          <Button onClick={handleCreateAnother} variant="outline">
            Create Another Booking
          </Button>
        </div>
      </div>
    );
  }

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
              <span>{formData.bookingDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              
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
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span>Booking Created</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <span>Calendar Entry Added</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
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