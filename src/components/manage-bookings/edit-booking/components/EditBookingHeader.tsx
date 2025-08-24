/**
 * Edit Booking Header Component
 * Header section with booking information and close button
 */

import React from 'react';
import { DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Calendar, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Booking } from '@/types/booking';

interface EditBookingHeaderProps {
  booking: Booking | null;
  onClose: () => void;
}

export function EditBookingHeader({ booking, onClose }: EditBookingHeaderProps) {
  if (!booking) return null;

  return (
    <DialogHeader className="space-y-4 pb-4 border-b">
      <div className="flex items-center justify-between">
        <DialogTitle className="text-xl font-semibold">
          Edit Booking
        </DialogTitle>
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogClose>
      </div>
      
      {/* Booking Summary */}
      <div className="space-y-3">
        {/* Customer Information */}
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">
            {booking.name}
          </h3>
          <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
            {booking.status}
          </Badge>
        </div>
        
        {/* Current Booking Details */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {booking.date ? format(new Date(booking.date), 'MMM dd, yyyy') : 'No date'}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {booking.start_time || 'No time'}
            {booking.duration && ` (${booking.duration}h)`}
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {booking.bay || 'No bay assigned'}
          </div>
        </div>
        
        {/* Additional Info */}
        {(booking.package_name || booking.booking_type) && (
          <div className="flex flex-wrap gap-2">
            {booking.package_name && (
              <Badge variant="outline" className="text-xs">
                {booking.package_name}
              </Badge>
            )}
            {booking.booking_type && (
              <Badge variant="outline" className="text-xs">
                {booking.booking_type}
              </Badge>
            )}
          </div>
        )}
      </div>
    </DialogHeader>
  );
}