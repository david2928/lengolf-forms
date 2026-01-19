'use client';

import React, { useState } from 'react';
import { Phone, Clock, Users, MapPin, FileText, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Booking } from '@/types/booking';
import { EMPLOYEES_LIST } from '@/components/manage-bookings/edit-booking/utils/constants';

interface UnconfirmedBookingCardProps {
  booking: Booking;
  onConfirm: (bookingId: string, employeeName: string) => Promise<boolean>;
  onCancel: (booking: Booking) => void;
  isConfirming: boolean;
}

export function UnconfirmedBookingCard({
  booking,
  onConfirm,
  onCancel,
  isConfirming
}: UnconfirmedBookingCardProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate end time from start_time and duration
  const calculateEndTime = (startTime: string, durationHours: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationHours * 60;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  // Format phone number for Thai numbers (add +66 prefix)
  const formatPhoneForCall = (phone: string): string => {
    // Remove any non-digit characters
    const digits = phone.replace(/\D/g, '');

    // If starts with 0, replace with +66
    if (digits.startsWith('0')) {
      return `+66${digits.substring(1)}`;
    }
    // If starts with 66, add +
    if (digits.startsWith('66')) {
      return `+${digits}`;
    }
    // Otherwise, assume it needs +66 prefix
    return `+66${digits}`;
  };

  // Format phone for display
  const formatPhoneForDisplay = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('0')) {
      // Format as 0XX-XXX-XXXX
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const handleConfirmClick = async () => {
    if (!selectedEmployee) return;

    setIsSubmitting(true);
    try {
      await onConfirm(booking.id, selectedEmployee);
    } finally {
      setIsSubmitting(false);
    }
  };

  const endTime = calculateEndTime(booking.start_time, booking.duration);
  const phoneForCall = formatPhoneForCall(booking.phone_number);
  const phoneForDisplay = formatPhoneForDisplay(booking.phone_number);

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Header row - Time and Bay */}
      <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-b">
        <div className="flex items-center gap-2 text-gray-700">
          <Clock className="h-4 w-4" />
          <span className="font-medium">
            {booking.start_time} - {endTime}
          </span>
          <span className="text-gray-500">({booking.duration}h)</span>
        </div>
        <div className="flex items-center gap-4 text-gray-600">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{booking.bay || 'No bay'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{booking.number_of_people} pax</span>
          </div>
        </div>
      </div>

      {/* Booking type badge */}
      {booking.booking_type && (
        <div className="px-4 pt-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {booking.booking_type}
          </span>
        </div>
      )}

      {/* Customer info and call button */}
      <div className="px-4 py-3">
        <h3 className="font-semibold text-lg text-gray-900 mb-2">
          {booking.name}
        </h3>

        {/* Large call button */}
        <a
          href={`tel:${phoneForCall}`}
          className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <Phone className="h-5 w-5" />
          <span className="text-lg font-medium">{phoneForDisplay}</span>
        </a>
      </div>

      {/* Notes section (if any) */}
      {booking.customer_notes && (
        <div className="px-4 pb-3">
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <FileText className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-800">{booking.customer_notes}</p>
          </div>
        </div>
      )}

      {/* Employee selector and action buttons */}
      <div className="px-4 py-3 bg-gray-50 border-t space-y-3">
        {/* Employee dropdown */}
        <div className="w-full">
          <Select
            value={selectedEmployee}
            onValueChange={setSelectedEmployee}
            disabled={isSubmitting || isConfirming}
          >
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="Select your name" />
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

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
            onClick={() => onCancel(booking)}
            disabled={isSubmitting || isConfirming}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleConfirmClick}
            disabled={!selectedEmployee || isSubmitting || isConfirming}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                Confirming...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Confirm Called
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
