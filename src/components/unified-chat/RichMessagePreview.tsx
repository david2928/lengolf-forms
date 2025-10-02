/**
 * Rich Message Preview Component
 *
 * Displays visual previews of rich messages (LINE Flex Messages, booking confirmations, etc.)
 * for the staff interface. Shows what the customer sees in a read-only preview format.
 */

import React from 'react';
import { Calendar, Clock, Users, MapPin, User } from 'lucide-react';

export interface BookingDetails {
  bookingId: string;
  customerName: string;
  date: string;
  time: string;
  bay: string;
  duration: string;
  packageName?: string;
  totalAmount?: number;
  isCoaching?: boolean;
  coachName?: string;
  bookingType?: string;
  hoursUntil?: number; // For reminder messages
}

export interface RichMessagePreviewProps {
  messageType: 'booking_confirmation' | 'booking_reminder' | 'flex';
  bookingDetails?: BookingDetails;
  className?: string;
}

/**
 * Booking Confirmation Card Preview
 * Mirrors LINE Flex Message design but as a read-only preview for staff
 */
const BookingConfirmationPreview: React.FC<{ booking: BookingDetails }> = ({ booking }) => {
  const headerText = booking.isCoaching ? 'COACHING SESSION CONFIRMED' : 'BOOKING CONFIRMED';
  const headerColor = booking.isCoaching ? 'bg-purple-600' : 'bg-green-600';

  return (
    <div className="max-w-sm rounded-lg overflow-hidden shadow-md border border-gray-200 bg-white">
      {/* Header */}
      <div className={`${headerColor} text-white px-4 py-3 text-center`}>
        <p className="text-sm font-bold tracking-wide">{headerText}</p>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Customer Name & ID */}
        <div>
          <h3 className="text-lg font-bold text-gray-800">{booking.customerName}</h3>
          <p className="text-xs text-gray-400">ID: {booking.bookingId}</p>
        </div>

        {/* Coach Info (if coaching) */}
        {booking.isCoaching && booking.coachName && (
          <div className="flex items-center space-x-2 bg-purple-50 p-2 rounded">
            <span className="text-lg">🏌️</span>
            <p className="text-sm font-semibold text-purple-700">
              Coach: {booking.coachName}
            </p>
          </div>
        )}

        {/* Separator */}
        <div className="border-t border-gray-200"></div>

        {/* Date & Time */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-gray-700">
            <Calendar className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-semibold">{booking.date}</p>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Clock className="h-4 w-4 text-gray-500" />
            <p className="text-sm">{booking.time}</p>
          </div>
        </div>

        {/* Bay & Duration */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500">Bay</p>
            <div className="flex items-center space-x-1">
              <MapPin className="h-3 w-3 text-gray-600" />
              <p className="text-sm font-semibold text-gray-800">{booking.bay}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500">Duration</p>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3 text-gray-600" />
              <p className="text-sm font-semibold text-gray-800">{booking.duration}</p>
            </div>
          </div>
        </div>

        {/* Total Amount */}
        {booking.totalAmount && (
          <>
            <div className="border-t border-gray-200"></div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-lg font-bold text-green-600">
                ฿{booking.totalAmount.toLocaleString()}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer - Button Placeholders (non-interactive preview) */}
      <div className="p-4 pt-0 space-y-2">
        <div className="bg-green-600 text-white text-center py-2 rounded font-medium text-sm">
          Confirm
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-200 text-gray-700 text-center py-2 rounded text-sm">
            Changes
          </div>
          <div className="bg-gray-200 text-gray-700 text-center py-2 rounded text-sm">
            Cancel
          </div>
        </div>
      </div>

      {/* Preview Label */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
        <p className="text-xs text-gray-500 text-center italic">
          Customer preview - Interactive in LINE app
        </p>
      </div>
    </div>
  );
};

/**
 * Booking Reminder Card Preview
 * Shows reminder message with countdown
 */
const BookingReminderPreview: React.FC<{ booking: BookingDetails }> = ({ booking }) => {
  return (
    <div className="max-w-sm rounded-lg overflow-hidden shadow-md border border-gray-200 bg-white">
      {/* Header */}
      <div className="bg-orange-500 text-white px-4 py-3 text-center">
        <p className="text-sm font-bold tracking-wide">BOOKING REMINDER</p>
        {booking.hoursUntil && (
          <p className="text-xs mt-1">{booking.hoursUntil} hours until booking</p>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Greeting */}
        <div>
          <h3 className="text-lg font-bold text-gray-800">Hi {booking.customerName}!</h3>
          <p className="text-sm text-gray-600 mt-1">Your booking is coming up soon</p>
        </div>

        {/* Separator */}
        <div className="border-t border-gray-200"></div>

        {/* Booking Details */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-gray-700">
            <Calendar className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-semibold">{booking.date}</p>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Clock className="h-4 w-4 text-gray-500" />
            <p className="text-sm">{booking.time} • Bay {booking.bay}</p>
          </div>
        </div>
      </div>

      {/* Footer - Button Placeholders */}
      <div className="p-4 pt-0 space-y-2">
        <div className="bg-green-600 text-white text-center py-2 rounded font-medium text-sm">
          I&apos;ll be there
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-200 text-gray-700 text-center py-2 rounded text-sm">
            Reschedule
          </div>
          <div className="bg-gray-200 text-gray-700 text-center py-2 rounded text-sm">
            Cancel
          </div>
        </div>
      </div>

      {/* Preview Label */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
        <p className="text-xs text-gray-500 text-center italic">
          Customer preview - Interactive in LINE app
        </p>
      </div>
    </div>
  );
};

/**
 * Main Rich Message Preview Component
 * Routes to appropriate preview based on message type
 */
export const RichMessagePreview: React.FC<RichMessagePreviewProps> = ({
  messageType,
  bookingDetails,
  className = ''
}) => {
  // If no booking details provided, show a generic message
  if (!bookingDetails) {
    return (
      <div className={`max-w-sm bg-gray-100 border border-gray-300 rounded-lg p-4 ${className}`}>
        <p className="text-sm text-gray-600 italic">
          Rich message preview not available
        </p>
      </div>
    );
  }

  // Render appropriate preview based on message type
  switch (messageType) {
    case 'booking_confirmation':
    case 'flex':
      return (
        <div className={className}>
          <BookingConfirmationPreview booking={bookingDetails} />
        </div>
      );

    case 'booking_reminder':
      return (
        <div className={className}>
          <BookingReminderPreview booking={bookingDetails} />
        </div>
      );

    default:
      return (
        <div className={`max-w-sm bg-gray-100 border border-gray-300 rounded-lg p-4 ${className}`}>
          <p className="text-sm text-gray-600 italic">
            Unknown message type: {messageType}
          </p>
        </div>
      );
  }
};

export default RichMessagePreview;
