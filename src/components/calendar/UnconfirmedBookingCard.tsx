'use client';

import React, { useState } from 'react';
import { Phone, Clock, Users, MapPin, FileText, X, Check, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Booking } from '@/types/booking';
import { format } from 'date-fns';
// Staff list for phone confirmations - alphabetical order, matching booking creation colors
const CONFIRMATION_STAFF = [
  { value: 'Ashley', label: 'Ashley', gradient: 'from-amber-500 to-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-300' },
  { value: 'Dolly', label: 'Dolly', gradient: 'from-pink-500 to-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-300' },
  { value: 'May', label: 'May', gradient: 'from-green-500 to-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-300' },
  { value: 'Net', label: 'Net', gradient: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
];

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

  // Check if phone number is international (not Thai)
  const isInternationalNumber = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    // Thai numbers: start with 0, or start with 66
    const isThai = digits.startsWith('0') || digits.startsWith('66');
    return !isThai && digits.length > 0;
  };

  // Format phone number for calling/WhatsApp (ensure proper format)
  const formatPhoneForContact = (phone: string): string => {
    // Remove any non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with 0, replace with +66 (Thai)
    if (cleaned.startsWith('0')) {
      return `+66${cleaned.substring(1)}`;
    }
    // If starts with 66 without +, add +
    if (cleaned.startsWith('66') && !cleaned.startsWith('+')) {
      return `+${cleaned}`;
    }
    // If doesn't start with +, add it
    if (!cleaned.startsWith('+')) {
      return `+${cleaned}`;
    }
    return cleaned;
  };

  // Format phone for display
  const formatPhoneForDisplay = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('0')) {
      // Format as 0XX-XXX-XXXX (Thai)
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  // Get WhatsApp URL
  const getWhatsAppUrl = (phone: string): string => {
    const formatted = formatPhoneForContact(phone).replace('+', '');
    return `https://wa.me/${formatted}`;
  };

  const handleConfirmClick = async () => {
    if (!selectedEmployee) return;

    setIsSubmitting(true);
    try {
      const success = await onConfirm(booking.id, selectedEmployee);

      // Send LINE notification on successful confirmation
      if (success) {
        try {
          const bookingDate = format(new Date(booking.date), 'EEE, MMM dd');
          const endTime = calculateEndTime(booking.start_time, booking.duration);
          const newCustomerBadge = booking.is_new_customer ? ' ⭐ NEW' : '';

          const lineMessage = `✅ BOOKING CONFIRMED (ID: ${booking.id})${newCustomerBadge}\n----------------------------------\n👤 Customer: ${booking.name}\n📞 Phone: ${booking.phone_number}\n🗓️ Date: ${bookingDate}\n⏰ Time: ${booking.start_time} - ${endTime} (${booking.duration}h)\n⛳ Bay: ${booking.bay || 'N/A'}\n🧑‍🤝‍🧑 Pax: ${booking.number_of_people}${booking.booking_type ? `\n📋 Type: ${booking.booking_type}` : ''}\n----------------------------------\n✅ Confirmed by: ${selectedEmployee}${booking.customer_notes ? `\n📝 Notes: ${booking.customer_notes}` : ''}`;

          const notifyResponse = await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: lineMessage,
              bookingType: booking.booking_type,
              customer_notes: booking.customer_notes
            })
          });

          if (!notifyResponse.ok) {
            console.error('Failed to send LINE notification for confirmation');
          }
        } catch (notifyError) {
          console.error('Error sending LINE notification:', notifyError);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const endTime = calculateEndTime(booking.start_time, booking.duration);
  const isInternational = isInternationalNumber(booking.phone_number);
  const phoneForContact = formatPhoneForContact(booking.phone_number);
  const phoneForDisplay = formatPhoneForDisplay(booking.phone_number);
  const whatsAppUrl = getWhatsAppUrl(booking.phone_number);

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Header row - Date, Time and Bay */}
      <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-b">
        <div className="flex items-center gap-2 text-gray-700">
          <Clock className="h-4 w-4" />
          <span className="font-medium">
            <span className="text-gray-500 mr-1">{format(new Date(booking.date), 'MMM dd')}</span>
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

      {/* Badges row - New Customer, Coaching, ResOS & Booking Type */}
      <div className="px-4 pt-3 flex flex-wrap gap-2">
        {booking.is_new_customer && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-yellow-400 text-yellow-900 shadow-sm">
            ⭐ NEW CUSTOMER
          </span>
        )}
        {(booking as any).customer_contacted_via === 'ResOS' && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-orange-500 text-white shadow-sm">
            📱 ResOS
          </span>
        )}
        {booking.booking_type?.toLowerCase().includes('coaching') && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-purple-500 text-white shadow-sm">
            🎯 COACHING
          </span>
        )}
        {booking.booking_type && !booking.booking_type.toLowerCase().includes('coaching') && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {booking.booking_type}
          </span>
        )}
      </div>

      {/* Customer info and call button */}
      <div className="px-4 py-3">
        <h3 className="font-semibold text-lg text-gray-900 mb-2">
          {booking.name}
        </h3>

        {/* Contact button - WhatsApp for international, Phone for Thai */}
        {isInternational ? (
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-lg font-medium">WhatsApp {phoneForDisplay}</span>
          </a>
        ) : (
          <a
            href={`tel:${phoneForContact}`}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Phone className="h-5 w-5" />
            <span className="text-lg font-medium">{phoneForDisplay}</span>
          </a>
        )}
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

      {/* Staff selector and action buttons */}
      <div className="px-4 py-3 bg-gray-50 border-t space-y-3">
        {/* Staff buttons - tap to select and confirm */}
        <div className="grid grid-cols-4 gap-2">
          {CONFIRMATION_STAFF.map((staff) => {
            const isSelected = selectedEmployee === staff.value;
            return (
              <button
                key={staff.value}
                type="button"
                onClick={() => setSelectedEmployee(staff.value)}
                disabled={isSubmitting || isConfirming}
                className={`
                  py-3 px-2 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${isSelected
                    ? `bg-gradient-to-br ${staff.gradient} text-white border-transparent shadow-md scale-105`
                    : `${staff.bgColor} ${staff.borderColor} text-gray-700 hover:scale-102 hover:shadow-sm`
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {staff.label}
              </button>
            );
          })}
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
