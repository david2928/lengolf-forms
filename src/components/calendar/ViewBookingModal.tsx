'use client';

import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, MapPin, Phone, Mail, FileText, Package, Hash, X, Edit } from 'lucide-react';
import type { Booking } from '@/types/booking';
import { format, parseISO, parse, isValid, subHours, isBefore } from 'date-fns';
import { CancelBookingModal } from '@/components/manage-bookings/CancelBookingModal';
import { EditBookingModal } from '@/components/manage-bookings/EditBookingModal';
import { useToast } from '@/components/ui/use-toast';

interface ViewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onBookingUpdated?: () => void; // Callback when booking is updated or cancelled
}

export function ViewBookingModal({ isOpen, onClose, booking, onBookingUpdated }: ViewBookingModalProps) {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

  if (!booking) return null;

  // Format date and time for display
  const formatDisplayDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Calculate end time
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

  // Check if booking is in the past (based on end time)
  const isInPast = () => {
    try {
      const [hours, minutes] = booking.start_time.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + (booking.duration * 60);
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      
      // Handle midnight crossover correctly
      let bookingEndDateTime;
      if (endHours >= 24) {
        // Booking crosses midnight - end time is next day
        const actualEndHours = endHours % 24;
        const endTime = `${actualEndHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        const bookingDate = new Date(booking.date);
        bookingDate.setDate(bookingDate.getDate() + 1);
        const endDateStr = bookingDate.toISOString().split('T')[0];
        bookingEndDateTime = new Date(`${endDateStr}T${endTime}`);
      } else {
        // Normal booking - same day
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        bookingEndDateTime = new Date(`${booking.date}T${endTime}`);
      }
      
      const now = new Date();
      // Allow editing within 2 hours after booking end time
      const twoHoursAfterEnd = new Date(bookingEndDateTime.getTime() + (2 * 60 * 60 * 1000));
      return now > twoHoursAfterEnd;
    } catch {
      return false;
    }
  };

  // Format phone number for tel: link and display
  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // If it starts with 0, replace with +66 for Thailand
    if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
      const thailandNumber = '+66' + digitsOnly.substring(1);
      return {
        display: phone, // Keep original format for display
        tel: thailandNumber // Use proper international format for tel: link
      };
    }
    
    // If it already has country code or is in different format, use as is
    return {
      display: phone,
      tel: digitsOnly.startsWith('66') ? '+' + digitsOnly : phone
    };
  };

  // Check if email should be hidden
  const shouldHideEmail = (email: string) => {
    return email?.toLowerCase() === 'info@len.golf';
  };

  const handleOpenCancelModal = () => {
    setIsCancelModalOpen(true);
  };

  const handleCloseCancelModal = () => {
    setIsCancelModalOpen(false);
  };

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleCancelSuccess = (bookingId: string) => {
    toast({
      title: "Booking Cancelled",
      description: `Booking for ${booking.name} has been cancelled.`,
      variant: "destructive"
    });
    setIsCancelModalOpen(false);
    onClose(); // Close the view modal
    if (onBookingUpdated) {
      onBookingUpdated(); // Notify parent to refresh data
    }
  };

  const handleEditSuccess = (updatedBooking: Booking) => {
    toast({
      title: "Booking Updated",
      description: `Booking for ${updatedBooking.name} has been updated.`,
    });
    setIsEditModalOpen(false);
    onClose(); // Close the view modal
    if (onBookingUpdated) {
      onBookingUpdated(); // Notify parent to refresh data
    }
  };

  const isPastBooking = isInPast();
  const endTime = calculateEndTime(booking.start_time, booking.duration);
  const isCancelled = booking.status === 'cancelled';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Booking Details
            {isPastBooking && (
              <Badge variant="secondary" className="ml-2">
                Past Booking
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-primary">
                {booking.customer?.customer_name || booking.name}
              </h3>
              {(booking.customer?.customer_code || booking.customer_code) && (
                <span className="text-sm text-muted-foreground">
                  ({booking.customer?.customer_code || booking.customer_code})
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Booking ID for past bookings */}
              {isPastBooking && booking.id && (
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-muted-foreground">{booking.id}</span>
                </div>
              )}
              
              {booking.phone_number && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`tel:${formatPhoneNumber(booking.phone_number).tel}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {formatPhoneNumber(booking.phone_number).display}
                  </a>
                </div>
              )}
              
              {booking.email && !shouldHideEmail(booking.email) && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`mailto:${booking.email}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {booking.email}
                  </a>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{booking.number_of_people} {booking.number_of_people === 1 ? 'person' : 'people'}</span>
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDisplayDate(booking.date)}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{booking.start_time} - {endTime} ({booking.duration}h)</span>
            </div>
            
            {booking.bay && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{booking.bay}</span>
              </div>
            )}
          </div>

          {/* Booking Type & Package */}
          {(booking.booking_type || booking.package_name) && (
            <div className="space-y-2">
              {booking.booking_type && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{booking.booking_type}</Badge>
                </div>
              )}
              
              {booking.package_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.package_name}</span>
                </div>
              )}
            </div>
          )}

          {/* Customer Notes */}
          {booking.customer_notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>Notes</span>
              </div>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {booking.customer_notes}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          {!isCancelled && (
            <>
              <Button onClick={handleOpenEditModal} variant="default" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              {!isPastBooking && (
                <Button onClick={handleOpenCancelModal} variant="destructive" size="sm">
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </>
          )}
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>

      <CancelBookingModal
        isOpen={isCancelModalOpen}
        onClose={handleCloseCancelModal}
        booking={booking}
        onSuccess={handleCancelSuccess}
      />

      <EditBookingModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        booking={booking}
        onSuccess={handleEditSuccess}
      />
    </Dialog>
  );
} 