'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Copy, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { Booking } from '@/types/booking';
import { generateConfirmationMessages } from '@/lib/booking-confirmation-utils';

interface BookingConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
}

export function BookingConfirmationDialog({ isOpen, onClose, booking }: BookingConfirmationDialogProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const messages = generateConfirmationMessages(booking);

  if (!messages) {
    return null;
  }

  const messageVariants = [
    { label: 'Thai (Short)', content: messages.thShort },
    { label: 'English (Short)', content: messages.enShort },
    { label: 'Thai (Long)', content: messages.thLong },
    { label: 'English (Long)', content: messages.enLong },
  ];

  const handleCopy = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
      });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy message to clipboard",
        variant: "destructive",
      });
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + (duration * 60);
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    } catch {
      return 'Unknown';
    }
  };

  const endTime = calculateEndTime(booking.start_time, booking.duration);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Booking Confirmation Messages
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Customer:</span>
                  <span className="ml-2">{booking.customer?.customer_name || booking.name}</span>
                </div>
                <div>
                  <span className="font-medium">Contact:</span>
                  <span className="ml-2">{booking.customer?.contact_number || booking.phone_number}</span>
                </div>
                <div>
                  <span className="font-medium">Date:</span>
                  <span className="ml-2">{formatDisplayDate(booking.date)}</span>
                </div>
                <div>
                  <span className="font-medium">Time:</span>
                  <span className="ml-2">{booking.start_time} - {endTime}</span>
                </div>
                <div>
                  <span className="font-medium">Bay:</span>
                  <span className="ml-2">{booking.bay || 'TBD'}</span>
                </div>
                <div>
                  <span className="font-medium">Players:</span>
                  <span className="ml-2">{booking.number_of_people}</span>
                </div>
                {booking.booking_type && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Type:</span>
                    <span className="ml-2">{booking.booking_type}</span>
                  </div>
                )}
                {booking.customer_notes && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Notes:</span>
                    <span className="ml-2">{booking.customer_notes}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Message Variants */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Customer Confirmation Messages</h3>
            <div className="grid grid-cols-1 gap-4">
              {messageVariants.map((variant, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{variant.label}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(variant.content, index)}
                      className="h-8 px-2"
                    >
                      {copiedIndex === index ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <pre className="text-sm whitespace-pre-wrap font-sans">
                      {variant.content}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline">
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}