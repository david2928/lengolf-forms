'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, MapPin, Phone, Mail, FileText, Package, Hash, X, Edit, MessageCircle } from 'lucide-react';
import type { Booking } from '@/types/booking';
import { format, parseISO, parse, isValid, subHours, isBefore } from 'date-fns';
import { CancelBookingModal } from '@/components/manage-bookings/CancelBookingModal';
import { EditBookingModal } from '@/components/manage-bookings/EditBookingModal';
import { BookingConfirmationDialog } from '@/components/booking/BookingConfirmationDialog';
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
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(booking);
  const [isLoadingBooking, setIsLoadingBooking] = useState(false);
  const { toast } = useToast();

  // Fetch fresh booking data when modal opens
  useEffect(() => {
    const fetchFreshBookingData = async () => {
      if (!booking?.id || !isOpen) {
        setCurrentBooking(booking);
        return;
      }

      setIsLoadingBooking(true);
      try {
        // Add timestamp to bypass browser cache
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/bookings/${booking.id}?t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setCurrentBooking(data.booking);
        } else {
          console.error('Failed to fetch fresh booking data:', response.statusText);
          setCurrentBooking(booking); // Fallback to original booking
        }
      } catch (error) {
        console.error('Error fetching fresh booking data:', error);
        setCurrentBooking(booking); // Fallback to original booking
      } finally {
        setIsLoadingBooking(false);
      }
    };

    fetchFreshBookingData();
  }, [booking, isOpen]);

  if (!currentBooking) return null;

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

  // Check if currentBooking is in the past (based on end time)
  const isInPast = () => {
    try {
      const [hours, minutes] = currentBooking.start_time.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + (currentBooking.duration * 60);
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      
      // Handle midnight crossover correctly
      let currentBookingEndDateTime;
      if (endHours >= 24) {
        // Booking crosses midnight - end time is next day
        const actualEndHours = endHours % 24;
        const endTime = `${actualEndHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        const currentBookingDate = new Date(currentBooking.date);
        currentBookingDate.setDate(currentBookingDate.getDate() + 1);
        const endDateStr = currentBookingDate.toISOString().split('T')[0];
        currentBookingEndDateTime = new Date(`${endDateStr}T${endTime}`);
      } else {
        // Normal currentBooking - same day
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        currentBookingEndDateTime = new Date(`${currentBooking.date}T${endTime}`);
      }
      
      const now = new Date();
      // Allow editing within 2 hours after currentBooking end time
      const twoHoursAfterEnd = new Date(currentBookingEndDateTime.getTime() + (2 * 60 * 60 * 1000));
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

  const handleOpenConfirmationDialog = () => {
    setIsConfirmationDialogOpen(true);
  };

  const handleCloseConfirmationDialog = () => {
    setIsConfirmationDialogOpen(false);
  };

  const handleCancelSuccess = (currentBookingId: string) => {
    toast({
      title: "Booking Cancelled",
      description: `Booking for ${currentBooking.name} has been cancelled.`,
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
    setCurrentBooking(updatedBooking); // Update local state with new currentBooking data
    setIsEditModalOpen(false);
    // Don't close the modal - keep it open with fresh data
    if (onBookingUpdated) {
      onBookingUpdated(); // Notify parent to refresh data
    }
  };

  const isPastBooking = isInPast();
  const endTime = calculateEndTime(currentBooking.start_time, currentBooking.duration);
  const isCancelled = currentBooking.status === 'cancelled';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`focus:outline-none flex flex-col ${
        'max-w-full max-h-full h-screen w-screen m-0 p-0 rounded-none md:max-w-lg md:max-h-[80vh] md:h-auto md:w-auto md:m-auto md:p-0 md:rounded-lg'
      } [&>button]:hidden`}>
        {/* Accessibility Components - visually hidden */}
        <DialogTitle className="sr-only">
          Booking Details - {currentBooking?.id}
        </DialogTitle>

        {/* Mobile Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-5 md:hidden relative">
          <div className="flex items-center justify-between">
            {/* Booking Info */}
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">
                Booking Details
              </h2>
              {currentBooking && (
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <span>{currentBooking.customer?.customer_name || currentBooking.name}</span>
                  {isPastBooking && (
                    <Badge variant="secondary" className="text-xs">
                      Past
                    </Badge>
                  )}
                  {isCancelled && (
                    <Badge variant="destructive" className="text-xs">
                      Cancelled
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-gray-700 bg-white/80 hover:bg-white rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-5">
            <div className="flex items-center justify-between">
              {/* Booking Info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Booking Details
                  </h2>
                  {isPastBooking && (
                    <Badge variant="secondary">
                      Past Booking
                    </Badge>
                  )}
                  {isCancelled && (
                    <Badge variant="destructive">
                      Cancelled
                    </Badge>
                  )}
                </div>
                {currentBooking && (
                  <div className="text-sm text-gray-600">
                    {currentBooking.customer?.customer_name || currentBooking.name}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center text-gray-700 bg-white/80 hover:bg-white rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 md:px-6 md:space-y-6">
          {isLoadingBooking ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-500">Loading...</span>
            </div>
          ) : (
            currentBooking && (
              <>
                {/* Booking ID - Always show */}
                {currentBooking.id && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Booking ID:</span>
                      <span className="font-mono text-gray-900 font-medium">{currentBooking.id}</span>
                    </div>
                  </div>
                )}

                {/* Customer Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
                  
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-gray-900">
                        {currentBooking.customer?.customer_name || currentBooking.name}
                      </span>
                      {(currentBooking.customer?.customer_code || currentBooking.customer_code) && (
                        <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                          {currentBooking.customer?.customer_code || currentBooking.customer_code}
                        </span>
                      )}
                    </div>
                    
                    {currentBooking.phone_number && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <a 
                          href={`tel:${formatPhoneNumber(currentBooking.phone_number).tel}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          {formatPhoneNumber(currentBooking.phone_number).display}
                        </a>
                      </div>
                    )}
                    
                    {currentBooking.email && !shouldHideEmail(currentBooking.email) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <a 
                          href={`mailto:${currentBooking.email}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {currentBooking.email}
                        </a>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900">{currentBooking.number_of_people} {currentBooking.number_of_people === 1 ? 'person' : 'people'}</span>
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Booking Details</h3>
                  
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Date:</span>
                      <span className="text-gray-900 font-medium">{formatDisplayDate(currentBooking.date)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Time:</span>
                      <span className="text-gray-900 font-medium">{currentBooking.start_time} - {endTime} ({currentBooking.duration}h)</span>
                    </div>
                    
                    {currentBooking.bay && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">Bay:</span>
                        <span className="text-gray-900 font-medium">{currentBooking.bay}</span>
                      </div>
                    )}

                    {currentBooking.booking_type && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">Type:</span>
                        <Badge variant="outline">{currentBooking.booking_type}</Badge>
                      </div>
                    )}
                    
                    {currentBooking.package_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">Package:</span>
                        <span className="text-gray-900 font-medium">{currentBooking.package_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Notes */}
                {currentBooking.customer_notes && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {currentBooking.customer_notes}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )
          )}
        </div>

        {/* Fixed Bottom Action Bar */}
        {!isLoadingBooking && currentBooking && (
          <div className="bg-white border-t px-4 py-4 space-y-3 flex-shrink-0 md:px-6">
            <div className="flex flex-col gap-3 md:flex-row">
              <Button 
                onClick={handleOpenConfirmationDialog} 
                variant="outline" 
                size="lg"
                className="w-full h-12 font-semibold text-sm md:flex-1"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Show Confirmation</span>
                <span className="sm:hidden">Confirmation</span>
              </Button>
              {!isCancelled && (
                <>
                  <Button 
                    onClick={handleOpenEditModal} 
                    variant="default" 
                    size="lg"
                    className="w-full h-12 font-semibold text-sm md:flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  {!isPastBooking && (
                    <Button 
                      onClick={handleOpenCancelModal} 
                      variant="outline" 
                      size="lg"
                      className="w-full h-12 font-semibold text-sm text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 md:flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      <CancelBookingModal
        isOpen={isCancelModalOpen}
        onClose={handleCloseCancelModal}
        booking={currentBooking}
        onSuccess={handleCancelSuccess}
      />

      <EditBookingModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        booking={currentBooking}
        onSuccess={handleEditSuccess}
      />

      <BookingConfirmationDialog
        isOpen={isConfirmationDialogOpen}
        onClose={handleCloseConfirmationDialog}
        booking={currentBooking}
      />
    </Dialog>
  );
} 