/**
 * EditBooking Data Hook
 * Centralized state management for the edit booking modal
 * Extracted from the original 1,134-line component
 */

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import { Booking } from '@/types/booking';
import { getDisplayPackageName } from '@/lib/client-package-utils';
import { 
  EditBookingFormData, 
  BayAvailability, 
  OriginalSlot, 
  AvailabilityStatus 
} from '../utils/types';
import { 
  parseDurationToMinutes, 
  convertMinutesToHours, 
  isPastBooking,
  debounce 
} from '../utils/formatters';

export function useEditBookingData(booking: Booking | null, isOpen: boolean) {
  // Form data state
  const [formData, setFormData] = useState<Partial<EditBookingFormData>>({});
  
  // Loading and error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPackage, setIsLoadingPackage] = useState(false);
  
  // Availability states
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>('idle');
  const [isSlotAvailable, setIsSlotAvailable] = useState<boolean>(false);
  const [allowOverwrite, setAllowOverwrite] = useState(false);
  
  // Bay availability states
  const [bayAvailabilityData, setBayAvailabilityData] = useState<BayAvailability[]>([]);
  const [isCheckingAllBays, setIsCheckingAllBays] = useState<boolean>(false);
  
  // Package states
  const [displayPackageName, setDisplayPackageName] = useState<string | null>(null);
  
  // Original booking slot tracking
  const [originalSlot, setOriginalSlot] = useState<OriginalSlot | null>(null);
  
  const { toast } = useToast();

  // Initialize form data when booking changes
  useEffect(() => {
    if (booking && isOpen) {
      let initialDate = new Date();
      try {
        if (booking.date) {
          const parsedDate = parseISO(booking.date);
          if (isValid(parsedDate)) initialDate = parsedDate;
          else console.warn('Invalid date string from booking:', booking.date);
        } else console.warn('Booking date is undefined or null');
      } catch (e) { 
        console.error("Error parsing booking date:", booking.date, e); 
      }

      const durationInMinutes = parseDurationToMinutes(booking.duration);
      
      const initialFormData: Partial<EditBookingFormData> = {
        bay: booking.bay || '',
        date: initialDate,
        start_time: booking.start_time || '',
        duration: durationInMinutes,
        number_of_people: booking.number_of_people || 1,
        customer_notes: booking.customer_notes || '',
        employee_name: booking?.updated_by_identifier || '',
        package_id: booking.package_id || null,
        package_name: booking.package_name || null,
        booking_type: booking.booking_type || '',
        referral_source: booking.referral_source || null,
      };
      
      setFormData(initialFormData);
      setOriginalSlot({
        date: format(initialDate, 'yyyy-MM-dd'),
        start_time: booking.start_time || '',
        duration: durationInMinutes,
        bay: booking.bay || null
      });
      
      setError(null);
      setAvailabilityStatus('available');
      setIsSlotAvailable(true);
      setBayAvailabilityData([]);
      setIsCheckingAllBays(false);
      setAllowOverwrite(false);
    }
  }, [booking, isOpen]);

  // Load package display name when package_id changes
  useEffect(() => {
    if (formData.package_id && formData.package_id !== 'none') {
      setIsLoadingPackage(true);
      getDisplayPackageName(formData.package_id, formData.package_name || null)
        .then(name => setDisplayPackageName(name))
        .catch(err => {
          console.error('Error loading package name:', err);
          setDisplayPackageName(null);
        })
        .finally(() => setIsLoadingPackage(false));
    } else {
      setDisplayPackageName(null);
      setIsLoadingPackage(false);
    }
  }, [formData.package_id, formData.package_name]);

  // Availability checking logic
  const checkAvailability = useCallback(async (
    date: Date,
    startTime: string,
    duration: number,
    bay: string,
    excludeBookingId?: string
  ) => {
    if (!date || !startTime || !duration || !bay) return false;

    try {
      const response = await fetch('/api/bookings/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: format(date, 'yyyy-MM-dd'),
          startTime,
          duration: convertMinutesToHours(duration),
          bay,
          excludeBookingId
        })
      });

      const data = await response.json();
      return data.available || false;
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    }
  }, []);

  // Debounced availability check
  const debouncedAvailabilityCheck = useCallback(() => {
    return debounce(async () => {
      if (!formData.date || !formData.start_time || !formData.duration || !formData.bay) {
        setAvailabilityStatus('not_applicable');
        return;
      }

      setAvailabilityStatus('checking');
      
      const isAvailable = await checkAvailability(
        formData.date,
        formData.start_time,
        formData.duration,
        formData.bay,
        booking?.id
      );
      
      setIsSlotAvailable(isAvailable);
      setAvailabilityStatus(isAvailable ? 'available' : 'unavailable');
    }, 500);
  }, [formData.date, formData.start_time, formData.duration, formData.bay, booking?.id, checkAvailability]);

  // Trigger availability check when relevant fields change
  useEffect(() => {
    if (isOpen && formData.date && formData.start_time && formData.duration && formData.bay) {
      // Check if this is the original slot
      if (originalSlot &&
          (formData.date ? format(formData.date, 'yyyy-MM-dd') : '') === originalSlot.date &&
          formData.start_time === originalSlot.start_time &&
          formData.duration === originalSlot.duration &&
          formData.bay === originalSlot.bay) {
        // This is the original slot, mark as available
        setAvailabilityStatus('available');
        setIsSlotAvailable(true);
      } else {
        // This is a different slot, check availability
        debouncedAvailabilityCheck()();
      }
    }
  }, [formData.date, formData.start_time, formData.duration, formData.bay, originalSlot, isOpen, debouncedAvailabilityCheck]);

  // Check all bay availability
  const checkAllBayAvailability = useCallback(async () => {
    if (!formData.date || !formData.start_time || !formData.duration) return;

    setIsCheckingAllBays(true);
    
    try {
      const { BAY_OPTIONS } = await import('../utils/constants');
      const bayPromises = BAY_OPTIONS.map(async (bayName) => {
        const isAvailable = await checkAvailability(
          formData.date!,
          formData.start_time!,
          formData.duration!,
          bayName,
          booking?.id
        );
        
        return {
          name: bayName,
          apiName: bayName, // You might need to map this based on BAY_NAME_TO_API_BAY_NAME
          isAvailable
        };
      });

      const results = await Promise.all(bayPromises);
      setBayAvailabilityData(results);
    } catch (error) {
      console.error('Error checking all bay availability:', error);
      setBayAvailabilityData([]);
    } finally {
      setIsCheckingAllBays(false);
    }
  }, [formData.date, formData.start_time, formData.duration, booking?.id, checkAvailability]);

  // Form field update handlers
  const updateFormField = useCallback(<K extends keyof EditBookingFormData>(
    field: K,
    value: EditBookingFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Submit booking update
  const submitBookingUpdate = useCallback(async (onSuccess: (updatedBooking: Booking) => void) => {
    if (!booking || !formData.date || !formData.start_time) return;

    // Check if booking is in the past
    if (isPastBooking(booking.date, booking.start_time, booking.duration || 1)) {
      setError("Cannot edit bookings that ended more than 2 hours ago");
      return;
    }

    // Check availability if slot changed and not allowing overwrite
    if (!allowOverwrite && availabilityStatus === 'unavailable') {
      setError("Selected time slot is not available");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updateData = {
        bay: formData.bay,
        date: formData.date ? format(formData.date, 'yyyy-MM-dd') : '',
        start_time: formData.start_time,
        duration: convertMinutesToHours(formData.duration || 60),
        number_of_people: formData.number_of_people,
        customer_notes: formData.customer_notes,
        employee_name: formData.employee_name,
        package_id: formData.package_id === 'none' ? null : formData.package_id,
        package_name: formData.package_name,
        booking_type: formData.booking_type,
        referral_source: formData.referral_source,
        allow_overwrite: allowOverwrite
      };

      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update booking');
      }

      toast({
        title: "Success",
        description: "Booking updated successfully",
      });

      onSuccess(result.booking);
    } catch (error) {
      console.error('Error updating booking:', error);
      setError(error instanceof Error ? error.message : 'Failed to update booking');
    } finally {
      setIsSubmitting(false);
    }
  }, [booking, formData, allowOverwrite, availabilityStatus, toast]);

  return {
    // Form data
    formData,
    updateFormField,
    
    // Loading states
    isSubmitting,
    isLoadingPackage,
    
    // Error handling
    error,
    setError,
    
    // Availability
    availabilityStatus,
    isSlotAvailable,
    allowOverwrite,
    setAllowOverwrite,
    
    // Bay availability
    bayAvailabilityData,
    isCheckingAllBays,
    checkAllBayAvailability,
    
    // Package
    displayPackageName,
    
    // Original slot
    originalSlot,
    
    // Actions
    submitBookingUpdate
  };
}