'use client'

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Booking } from '@/types/booking'; // Assuming Booking type includes necessary details
import { format, parse, isValid, subHours, isBefore } from 'date-fns';

interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSuccess: (bookingId: string) => void;
}

// Define employees list (can be shared or imported if used in multiple places)
const EMPLOYEES_LIST = [
  { value: 'Dolly', label: 'Dolly' },
  { value: 'Net', label: 'Net' },
  { value: 'May', label: 'May' },
  { value: 'Winnie', label: 'Winnie' },
  { value: 'Bank', label: 'Bank' },
  { value: 'David', label: 'David' },
  { value: 'Mind', label: 'Mind' }
];

export function CancelBookingModal({ isOpen, onClose, booking, onSuccess }: CancelBookingModalProps) {
  const [cancellationReason, setCancellationReason] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset form when modal opens or booking changes
    if (isOpen) {
      setCancellationReason('');
      setEmployeeName('');
      setError(null);
      // Check if booking is in the past and set error if so
      if (booking && booking.date && booking.start_time) {
        try {
          const bookingDateTime = parse(`${booking.date} ${booking.start_time}`, 'yyyy-MM-dd HH:mm', new Date());
          if (isValid(bookingDateTime)) {
            const twoHoursAgo = subHours(new Date(), 2);
            if (isBefore(bookingDateTime, twoHoursAgo)) {
              setError("This booking is in the past and can no longer be cancelled.");
            }
          }
        } catch (e) {
          console.error("Error parsing booking date/time for past check (cancel modal):", e);
        }
      }
    }
  }, [isOpen, booking]);

  if (!booking) return null;

  let isBookingCancellable = true;
  if (booking && booking.date && booking.start_time) {
    try {
      const bookingDateTime = parse(`${booking.date} ${booking.start_time}`, 'yyyy-MM-dd HH:mm', new Date());
      if (isValid(bookingDateTime)) {
        const twoHoursAgo = subHours(new Date(), 2);
        isBookingCancellable = !isBefore(bookingDateTime, twoHoursAgo);
      }
    } catch (e) {
      console.error("Error parsing booking date/time for cancellability check:", e);
      isBookingCancellable = false; // Default to not cancellable on error
    }
  }

  const handleSubmit = async () => {
    if (!employeeName.trim()) {
      setError('Employee name is required.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancellation_reason: cancellationReason.trim(),
          employee_name: employeeName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel booking');
      }
      
      const responseData = await response.json(); // Get the full response
      const cancelledBookingData = responseData.booking as Booking; // Extract booking data

      onSuccess(booking.id);

      // Send LINE notification from client-side
      if (cancelledBookingData) {
        try {
          const bookingDate = format(new Date(cancelledBookingData.date), 'EEE, MMM dd');
          const lineMessage = `🚫 BOOKING CANCELLED (ID: ${cancelledBookingData.id}) 🚫\n----------------------------------\n👤 Customer: ${cancelledBookingData.name}\n📞 Phone: ${cancelledBookingData.phone_number}\n🗓️ Date: ${bookingDate}\n⏰ Time: ${cancelledBookingData.start_time} (Duration: ${cancelledBookingData.duration}h)\n⛳ Bay: ${cancelledBookingData.bay || 'N/A'}\n🧑‍🤝‍🧑 Pax: ${cancelledBookingData.number_of_people}\n----------------------------------\n🗑️ Cancelled By: ${employeeName.trim()}${cancellationReason.trim() ? `\n💬 Reason: ${cancellationReason.trim()}` : ''}`;

          const notifyResponse = await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: lineMessage,
              bookingType: cancelledBookingData.booking_type,
              customer_notes: cancelledBookingData.customer_notes
            })
          });
          if (!notifyResponse.ok) {
            const notifyErrorText = await notifyResponse.text();
            console.error('CancelBookingModal: Failed to send LINE notification:', notifyErrorText);
          } else {
            console.log('CancelBookingModal: LINE notification for cancellation sent successfully.');
          }
        } catch (notifyError) {
          console.error('CancelBookingModal: Error sending LINE notification:', notifyError);
        }
      } else {
        console.warn('CancelBookingModal: Cancelled booking data not available for LINE notification.');
      }

      onClose(); // Close modal on success
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this booking? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="customerName" className="text-right col-span-1">
              Customer
            </Label>
            <Input id="customerName" value={booking.name} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bookingDate" className="text-right col-span-1">
              Date
            </Label>
            <Input id="bookingDate" value={format(new Date(booking.date), 'PPP')} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bookingTime" className="text-right col-span-1">
              Time
            </Label>
            <Input id="bookingTime" value={booking.start_time} readOnly className="col-span-3" /> 
            {/* Consider displaying end_time as well if available/calculated */}
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bookingBay" className="text-right col-span-1">
              Bay
            </Label>
            <Input id="bookingBay" value={booking.bay || 'N/A'} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cancellationReason" className="text-right col-span-1">
              Reason
            </Label>
            <Textarea
              id="cancellationReason"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="col-span-3"
              placeholder="Reason for cancellation (optional)"
              disabled={!isBookingCancellable}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="employeeName" className="text-right col-span-1">
              Employee
            </Label>
            <div className="col-span-3">
              <Select
                value={employeeName}
                onValueChange={(value) => setEmployeeName(value)}
                disabled={!isBookingCancellable}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your name (mandatory)" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEES_LIST.map((employee) => (
                    <SelectItem key={employee.value} value={employee.value}>
                      {employee.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-red-500 col-span-4 text-center">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Back</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSubmitting || !employeeName.trim() || !isBookingCancellable}>
            {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 