'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { PenSquare, Phone, Mail, Users, Package, FileText, X } from "lucide-react";
import { Booking, CustomerInfo } from '@/types/booking';
import { format, parseISO, isValid, parse, addMinutes, isWithinInterval, isEqual, startOfDay, endOfDay, subHours, isBefore } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import { Badge } from '@/components/ui/badge';
import { PackageSelector } from '@/components/booking-form/package-selector';
import { EditPackageSelector } from '@/components/booking-form/selectors/edit-package-selector';
import { SimpleBookingTypeSelector } from '@/components/booking-form/selectors/simple-booking-type-selector';
import { SimpleReferralSourceSelector } from '@/components/booking-form/selectors/simple-referral-source-selector';

// Bay mapping to match API expectations
const BAY_NAME_TO_API_BAY_NAME: { [key: string]: string } = {
  'Bay 1': 'Bay 1 (Bar)',
  'Bay 2': 'Bay 2',
  'Bay 3': 'Bay 3 (Entrance)',
};

const BAY_OPTIONS = Object.keys(BAY_NAME_TO_API_BAY_NAME);

// Define employees list (same as in booking form, with new additions)
const EMPLOYEES_LIST = [
  { value: 'Eak', label: 'Eak' },
  { value: 'Dolly', label: 'Dolly' },
  { value: 'Net', label: 'Net' },
  { value: 'May', label: 'May' },
  { value: 'Winnie', label: 'Winnie' },
  { value: 'Bank', label: 'Bank' },
  { value: 'David', label: 'David' },
  { value: 'Mind', label: 'Mind' }
  // Consider adding an "Other" option if free-text is still needed,
  // which would then likely reveal a separate text input.
];

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSuccess: (updatedBooking: Booking) => void;
}

// Define a type for the form data
interface EditBookingFormData {
  bay: string;
  date: Date; // Store date as Date object for DatePicker
  start_time: string; // HH:mm
  duration: number; // in minutes
  number_of_people: number;
  customer_notes: string;
  employee_name: string;
  // New fields for Phase 3 enhancements
  package_id: string | null;
  package_name: string | null; // Track package name for notifications
  booking_type: string;
  referral_source: string | null;
}

// Helper to convert HH:mm time and date string to a Date object
const getDateTime = (dateString: string, timeString: string): Date | null => {
  if (!dateString || !timeString) return null;
  try {
    // Assuming dateString is already a Date object from the form, or a YYYY-MM-DD string from booking
    const baseDate = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    const newDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes);
    return isValid(newDate) ? newDate : null;
  } catch (e) {
    console.error('Error in getDateTime:', e)
    return null;
  }
};

// Simple debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => ReturnType<F>;
}

export function EditBookingModal({ isOpen, onClose, booking, onSuccess }: EditBookingModalProps) {
  const [formData, setFormData] = useState<Partial<EditBookingFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [allowOverwrite, setAllowOverwrite] = useState(false);

  // State for individual slot availability (currently selected bay)
  const [availabilityStatus, setAvailabilityStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable' | 'error' | 'not_applicable' | 'overridden'>('idle');
  const [isSlotAvailable, setIsSlotAvailable] = useState<boolean>(false);

  // New state for dynamic bay loading
  const [bayAvailabilityData, setBayAvailabilityData] = useState<Array<{ name: string; apiName: string; isAvailable: boolean }>>([]);
  const [isCheckingAllBays, setIsCheckingAllBays] = useState<boolean>(false);

  const [originalSlot, setOriginalSlot] = useState<{ date: string; start_time: string; duration: number; bay: string | null } | null>(null);

  useEffect(() => {
    if (booking && isOpen) {
      let initialDate = new Date();
      try {
        if (booking.date) {
          const parsedDate = parseISO(booking.date);
          if (isValid(parsedDate)) initialDate = parsedDate;
          else console.warn('Invalid date string from booking:', booking.date);
        } else console.warn('Booking date is undefined or null');
      } catch (e) { console.error("Error parsing booking date:", booking.date, e); }

      // Duration is stored in hours in the database, convert to minutes for form
      let durationInMinutes = 60;
      if (typeof booking.duration === 'number') {
        durationInMinutes = booking.duration * 60;
      }
      const initialFormData: Partial<EditBookingFormData> = {
        bay: booking.bay || '',
        date: initialDate,
        start_time: booking.start_time || '',
        duration: durationInMinutes, // always minutes
        number_of_people: booking.number_of_people || 1,
        customer_notes: booking.customer_notes || '',
        employee_name: booking?.updated_by_identifier || '',
        // New fields for Phase 3 enhancements
        package_id: booking.package_id || null,
        package_name: booking.package_name || null,
        booking_type: booking.booking_type || '',
        referral_source: booking.referral_source || null,
      };
      setFormData(initialFormData);
      setOriginalSlot({
        date: format(initialDate, 'yyyy-MM-dd'), // Convert to same format as formData will use
        start_time: booking.start_time,
        duration: durationInMinutes, // Use the same converted duration as formData
        bay: booking.bay
      });
      setError(null);
      setAvailabilityStatus('available'); // Original booking slot is available by default
      // For the original booking, the slot should be available initially since it's already booked
      setIsSlotAvailable(true); // This will be updated by the availability check if user changes time/bay
      setBayAvailabilityData([]);
      setIsCheckingAllBays(false);
      setAllowOverwrite(false);

      // Check if booking is in the past (based on end time)
      let isPastBooking = false;
      if (booking.date && booking.start_time && booking.duration) {
        try {
          const [hours, minutes] = booking.start_time.split(':').map(Number);
          const startMinutes = hours * 60 + minutes;
          const durationMinutes = booking.duration <= 12 ? booking.duration * 60 : booking.duration;
          const endMinutes = startMinutes + durationMinutes;
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
          isPastBooking = now > twoHoursAfterEnd;
        } catch (e) {
          console.error("Error parsing booking date/time for past check:", e);
        }
      }
      // Don't clear form data for past bookings - we allow editing secondary info
      // The UI will handle disabling main info fields

      // For the original booking, ensure the bay selection state is properly initialized
      if (initialFormData.bay) {
        setAvailabilityStatus('available');
        setIsSlotAvailable(true);
      }

      setIsInitialSetupComplete(true);

    } else if (!isOpen) {
      setFormData({});
      setOriginalSlot(null);
      setAvailabilityStatus('idle');
      setBayAvailabilityData([]);
      setIsCheckingAllBays(false);
      setIsSlotAvailable(false);
      setAllowOverwrite(false);
      setIsInitialLoad(true);
      setIsInitialSetupComplete(false);
      setIsBaySelectionInProgress(false);
      setLastAvailabilityCheck(null);
    }
  }, [booking, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number = value;
    if (name === 'duration' || name === 'number_of_people') {
      processedValue = parseInt(value);
      if (isNaN(processedValue)) processedValue = name === 'duration' ? '' : 1;
    }
    setFormData(prev => ({ 
      ...prev, 
      [name]: processedValue as any,
      ...(name === 'start_time' || name === 'duration' ? { bay: '' } : {}) // Deselect bay on time or duration change
    }));
  };

  const handleDateChange = (date: Date | null) => {
    setFormData(prev => ({ 
      ...prev, 
      date: date || new Date(),
      bay: '' // Deselect bay on date change
    }));
  };

  const handleBayButtonClick = (bayName: string) => {
    const selectedBayInfo = bayAvailabilityData.find(b => b.name === bayName);

    // Set flag to prevent availability check when user is just selecting a bay
    setIsBaySelectionInProgress(true);
    
    if (allowOverwrite || (selectedBayInfo && selectedBayInfo.isAvailable)) {
      setFormData(prev => ({ ...prev, bay: bayName }));
      // If overwriting an unavailable slot, mark as overridden
      if (allowOverwrite && !(selectedBayInfo && selectedBayInfo.isAvailable)) {
        setAvailabilityStatus('overridden');
        setIsSlotAvailable(true); // Allow saving
        toast({ title: "Availability Overridden", description: `${bayName} selected by overriding standard availability checks.`, variant: "default", className: "bg-orange-100 border-orange-300 text-orange-700" });
      } else {
        setAvailabilityStatus('available');
        setIsSlotAvailable(true);
      }
    } else {
      toast({ title: "Bay Not Available", description: `${bayName} is not available for the selected time/duration.`, variant: "destructive" });
      if (formData.bay === bayName) { // If this unavailable bay was already selected and we are NOT overwriting
        setAvailabilityStatus('unavailable');
        setIsSlotAvailable(false);
      }
    }
    
    // Reset flag after bay selection is complete
    setTimeout(() => {
      setIsBaySelectionInProgress(false);
    }, 50);
  };

  const fetchAllBaysAvailability = useCallback(async (date: Date | undefined, startTime: string | undefined, duration: number | undefined, bayToCheck?: string, originalSlotToCheck?: any) => {
    if (!date || !startTime || typeof duration !== 'number' || duration <= 0) {
      setBayAvailabilityData([]);
      setIsCheckingAllBays(false);
      setAvailabilityStatus('not_applicable');
      setIsSlotAvailable(false);
      return;
    }
    setIsCheckingAllBays(true);
    setAvailabilityStatus('checking');

    try {
      const response = await fetch('/api/bookings/check-slot-for-all-bays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: format(date, 'yyyy-MM-dd'), 
          start_time: startTime, 
          duration: duration, 
          bookingIdToExclude: booking?.id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch bay availabilities');
      }
      const results: Array<{ name: string; apiName: string; isAvailable: boolean }> = await response.json();
      setBayAvailabilityData(results);

      // Use passed parameters if available, otherwise fall back to current state
      const currentBay = bayToCheck || formData.bay;
      const currentOriginalSlot = originalSlotToCheck || originalSlot;
      
      const currentSelectedBayInfo = results.find(b => b.name === currentBay);
      
      // If this is the original bay and slot, it should always be available (since this booking already owns it)
      const isOriginalBayAndSlot = currentBay === currentOriginalSlot?.bay && 
                                   format(date || new Date(), 'yyyy-MM-dd') === currentOriginalSlot?.date &&
                                   startTime === currentOriginalSlot?.start_time &&
                                   duration === currentOriginalSlot?.duration;
      
      if (currentBay && (isOriginalBayAndSlot || (currentSelectedBayInfo && currentSelectedBayInfo.isAvailable))) {
        setIsSlotAvailable(true);
        setAvailabilityStatus('available');
      } else if (currentBay) {
        setIsSlotAvailable(false);
        setAvailabilityStatus('unavailable');
      } else {
        setIsSlotAvailable(false);
        setAvailabilityStatus(results.length > 0 && results.some(b => b.isAvailable) ? 'not_applicable' : 'unavailable');
      }

    } catch (error: any) {
      console.error("Error fetching all bays availability:", error);
      setBayAvailabilityData([]); 
      setError(`Failed to load bay availability: ${error.message}`);
      setAvailabilityStatus('error');
      setIsSlotAvailable(false);
    } finally {
      setIsCheckingAllBays(false);
    }
  }, [booking?.id]);

  const debouncedFetchAllBays = useCallback(debounce(fetchAllBaysAvailability, 750), [fetchAllBaysAvailability]);

  // Track if this is the initial load vs user changes
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // Track if the initial setup is complete
  const [isInitialSetupComplete, setIsInitialSetupComplete] = useState(false);
  // Track when user is selecting a bay to prevent unnecessary availability checks
  const [isBaySelectionInProgress, setIsBaySelectionInProgress] = useState(false);
  // Track the last availability check parameters to avoid redundant checks
  const [lastAvailabilityCheck, setLastAvailabilityCheck] = useState<string | null>(null);

  // Separate useEffect to check bay availability on modal open (after fetchAllBaysAvailability is defined)
  useEffect(() => {
    if (isOpen && booking && isInitialSetupComplete && formData.bay && formData.date && formData.start_time && typeof formData.duration === 'number') {
      // Check real availability for all bays to enable bay switching
      fetchAllBaysAvailability(
        formData.date, 
        formData.start_time, 
        formData.duration,
        formData.bay,
        originalSlot
      );
    }
  }, [isOpen, booking, isInitialSetupComplete, formData.bay, formData.date, formData.start_time, formData.duration, fetchAllBaysAvailability, originalSlot]);
  
  useEffect(() => {
    
    if (!isOpen) {
      return;
    }
    
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    
    if (!isInitialSetupComplete) {
      return;
    }
    
    if (isBaySelectionInProgress) {
      return;
    }
    
    
    // Only trigger availability check if the user has made changes from the original data
    // This prevents unnecessary checks when the form is initially populated
    if (formData.date && formData.start_time && typeof formData.duration === 'number' && formData.duration > 0) {
      // Create a unique key for the current availability check parameters
      const currentCheckKey = `${format(formData.date, 'yyyy-MM-dd')}-${formData.start_time}-${formData.duration}`;
      
      // Convert booking duration to minutes for comparison (same as formData)
      const bookingDurationInMinutes = booking && typeof booking.duration === 'number' 
        ? (booking.duration <= 12 ? booking.duration * 60 : booking.duration)
        : 0;
      
      // Check if this is different from the original booking data
      const dateChanged = booking && format(formData.date, 'yyyy-MM-dd') !== booking.date;
      const timeChanged = booking && formData.start_time !== booking.start_time;
      const durationChanged = booking && formData.duration !== bookingDurationInMinutes;
      const bayChanged = booking && formData.bay !== booking.bay;
      
      const hasChanges = dateChanged || timeChanged || durationChanged;
      const hasAvailabilityRelevantChanges = dateChanged || timeChanged || durationChanged;
      const needsNewAvailabilityCheck = hasAvailabilityRelevantChanges && currentCheckKey !== lastAvailabilityCheck;
      
      if (needsNewAvailabilityCheck) {
        setLastAvailabilityCheck(currentCheckKey);
        debouncedFetchAllBays(formData.date, formData.start_time, formData.duration, formData.bay, originalSlot);
      }
    } else if (isInitialSetupComplete) {
      setBayAvailabilityData([]);
      setAvailabilityStatus('not_applicable');
      setIsSlotAvailable(false);
    }
  }, [isOpen, formData.date, formData.start_time, formData.duration, formData.bay, originalSlot, debouncedFetchAllBays, isInitialLoad, isInitialSetupComplete, isBaySelectionInProgress, lastAvailabilityCheck, booking]);

  const handleSubmit = async () => {
    setError(null);
    
    // Validate main info fields only if they are editable
    if (isMainInfoEditable) {
      if (!formData.bay) {
        setError("Bay selection is required.");
        toast({ title: "Validation Error", description: "Please select a bay.", variant: "destructive" });
        return;
      }
      if (!formData.date) {
        setError("Date is required.");
        toast({ title: "Validation Error", description: "Date is required.", variant: "destructive" });
        return;
      }
      if (!formData.start_time?.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
        setError("Valid start time (HH:mm) is required.");
        toast({ title: "Validation Error", description: "Valid start time (HH:mm) is required.", variant: "destructive" });
        return;
      }
      const durationMinutes = parseInt(formData.duration?.toString() || '0');
      if (isNaN(durationMinutes) || durationMinutes <= 0) {
        setError("Valid duration (must be greater than 0 minutes) is required.");
        toast({ title: "Validation Error", description: "Valid duration (must be greater than 0 minutes) is required.", variant: "destructive" });
        return;
      }
      const numberOfPeople = parseInt(formData.number_of_people?.toString() || '0', 10);
      if (isNaN(numberOfPeople) || numberOfPeople <= 0) {
        setError("Valid number of people (must be > 0) is required.");
        toast({ title: "Validation Error", description: "Valid number of people (must be > 0) is required.", variant: "destructive" });
        return;
      }
      
      if (!isSlotAvailable && !allowOverwrite) {
        setError('Selected bay and time slot is not available. Please choose a different slot or bay, or enable overwrite.');
        toast({ title: "Availability Error", description: "The selected bay/time is not available without overwrite.", variant: "destructive" });
        return;
      }
    }
    
    // Always validate employee name
    if (!formData.employee_name?.trim()) {
      setError('Employee name is required for making changes.');
      toast({ title: "Validation Error", description: "Employee name is required.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);

    const payload: any = {
      employee_name: formData.employee_name.trim(),
      availability_overridden: allowOverwrite, // Simplified: if overwrite is enabled, set the flag
    };

    // Only include main info fields if they are editable
    if (isMainInfoEditable) {
      if (formData.bay) payload.bay = formData.bay;
      if (formData.date) payload.date = format(formData.date, 'yyyy-MM-dd');
      if (formData.start_time) payload.start_time = formData.start_time;
      const durationMinutes = parseInt(formData.duration?.toString() || '0');
      payload.duration = durationMinutes;
      const numberOfPeople = parseInt(formData.number_of_people?.toString() || '0', 10);
      if (formData.number_of_people) payload.number_of_people = numberOfPeople;
      if (formData.customer_notes !== undefined && formData.customer_notes !== null) {
        payload.customer_notes = formData.customer_notes;
      }
    }
    
    // Always include secondary info fields (these can be edited even for past bookings)
    if (formData.package_id !== undefined) payload.package_id = formData.package_id;
    if (formData.booking_type !== undefined) payload.booking_type = formData.booking_type;
    if (formData.referral_source !== undefined) payload.referral_source = formData.referral_source;
    
    // Customer notes can be edited for past bookings too (moved outside the main info check)
    if (!isMainInfoEditable && formData.customer_notes !== undefined && formData.customer_notes !== null) {
      payload.customer_notes = formData.customer_notes;
    }
    
    try {
      if (!booking?.id) {
        throw new Error("Booking ID is missing.");
      }
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `API Error: ${response.status}`);
      }
      
      const updatedBookingData = responseData.booking as Booking;

      toast({
        title: "Booking Updated",
        description: "The booking has been successfully updated.",
      });
      onSuccess(updatedBookingData || responseData);
      
      if (updatedBookingData && booking) {
        try {
          const changesSummary: string[] = [];
          if (originalSlot) {
            if (payload.date && originalSlot.date !== payload.date) changesSummary.push(`Date: ${originalSlot.date} -> ${payload.date}`);
            if (payload.start_time && originalSlot.start_time !== payload.start_time) changesSummary.push(`Time: ${originalSlot.start_time} -> ${payload.start_time}`);
            if (payload.bay && originalSlot.bay !== payload.bay) changesSummary.push(`Bay: ${originalSlot.bay} -> ${payload.bay}`);
            if (payload.duration && originalSlot.duration !== payload.duration) changesSummary.push(`Duration: ${originalSlot.duration/60}h -> ${payload.duration/60}h`);
          }
          if (payload.number_of_people && booking.number_of_people !== payload.number_of_people) changesSummary.push(`Pax: ${booking.number_of_people} -> ${payload.number_of_people}`);
          if (payload.customer_notes !== undefined && (booking.customer_notes || '') !== (payload.customer_notes || '')) changesSummary.push('Notes updated');
          
          // Track new editable fields
          if (payload.booking_type && booking.booking_type !== payload.booking_type) changesSummary.push(`Type: ${booking.booking_type || 'None'} -> ${payload.booking_type}`);
          if (payload.package_id !== undefined && booking.package_id !== payload.package_id) {
            const oldPackage = booking.package_name || 'None';
            let newPackage = 'None';
            if (payload.package_id === null) {
              newPackage = 'Keep Current';
            } else if (payload.package_id === '') {
              newPackage = 'None';
            } else {
              // Use the updated package name, or try to get it from the current formData if available
              newPackage = updatedBookingData.package_name || 
                          (formData.package_name && formData.package_name !== '' ? formData.package_name : 'Package Selected');
            }
            changesSummary.push(`Package: ${oldPackage} -> ${newPackage}`);
          }
          if (payload.referral_source && booking.referral_source !== payload.referral_source) changesSummary.push(`Referral: ${booking.referral_source || 'None'} -> ${payload.referral_source}`);

          const summaryText = changesSummary.length > 0 ? changesSummary.join(', ') : 'Details updated';
          const overriddenText = (payload.availability_overridden) ? "\n⚠️ AVAILABILITY OVERRIDDEN ⚠️" : "";

          const referralInfo = updatedBookingData.referral_source ? `\n📍 Referral: ${updatedBookingData.referral_source}` : '';
          const newCustomerBadge = updatedBookingData.is_new_customer ? ' ⭐ NEW' : '';
          
          const lineMessage = `ℹ️ BOOKING MODIFIED (ID: ${updatedBookingData.id}) 🔄\n----------------------------------\n👤 Customer: ${updatedBookingData.name}${newCustomerBadge}\n📞 Phone: ${updatedBookingData.phone_number || 'N/A'}\n👥 Pax: ${updatedBookingData.number_of_people || 1}\n🗓️ Date: ${format(new Date(updatedBookingData.date), 'EEE, MMM dd')}\n⏰ Time: ${updatedBookingData.start_time} (Duration: ${updatedBookingData.duration}H)\n⛳ Bay: ${updatedBookingData.bay || 'N/A'}\n💡 Type: ${updatedBookingData.booking_type || 'N/A'}${(updatedBookingData.package_name) ? ` (${updatedBookingData.package_name})` : ''}${referralInfo}${overriddenText}\n----------------------------------\n🛠️ Changes: ${summaryText}\n🧑‍💼 By: ${formData.employee_name?.trim() || 'Staff'}`;

          const notifyResponse = await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: lineMessage, 
              bookingType: updatedBookingData.booking_type || undefined,
              customer_notes: updatedBookingData.customer_notes
            })
          });

          if (!notifyResponse.ok) {
            const notifyErrorText = await notifyResponse.text();
            console.error('EditBookingModal: Failed to send LINE notification:', notifyErrorText);
          } else {
          }
        } catch (notifyError) {
          console.error('EditBookingModal: Error sending LINE notification:', notifyError);
        }
      } else {
        console.warn('EditBookingModal: Updated or original booking data not available for LINE notification.');
      }

      onClose();

    } catch (e: any) {
      console.error('Failed to update booking:', e);
      const errorMessage = e.message || 'Could not update booking. Please try again.';
      setError(errorMessage);
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  let generalAvailabilityMessage = '';
  if (isCheckingAllBays) generalAvailabilityMessage = 'Checking all bays...';
  else if (availabilityStatus === 'error') generalAvailabilityMessage = 'Error checking availability.';
  else if (bayAvailabilityData.length > 0 && !bayAvailabilityData.some(b => b.isAvailable) && !isCheckingAllBays) {
    generalAvailabilityMessage = 'No bays available for the selected date/time/duration.';
  }

  let isBookingEditable = true;
  let isMainInfoEditable = true;
  let isSecondaryInfoEditable = true; // Secondary info is always editable
  let isPastBooking = false;
  
  if (booking && booking.date && booking.start_time && booking.duration) {
    try {
      const [hours, minutes] = booking.start_time.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const durationMinutes = booking.duration <= 12 ? booking.duration * 60 : booking.duration;
      const endMinutes = startMinutes + durationMinutes;
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
      isPastBooking = now > twoHoursAfterEnd;
      isBookingEditable = !isPastBooking;
      isMainInfoEditable = !isPastBooking; // Main info (time/date/bay) can only be edited if booking is not past the 2-hour window
      isSecondaryInfoEditable = true; // Secondary info (phone, booking type, package, referral) can ALWAYS be edited
    } catch (e) {
      console.error("Error parsing booking date/time for editability check:", e);
      isBookingEditable = false; // Default to not editable on error
      isMainInfoEditable = false;
      isSecondaryInfoEditable = true; // But still allow secondary info editing
      isPastBooking = true;
    }
  }

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent className={`focus:outline-none flex flex-col ${
        'max-w-full max-h-full h-screen w-screen m-0 p-0 rounded-none md:max-w-2xl md:max-h-[90vh] md:h-auto md:w-auto md:m-auto md:p-0 md:rounded-lg'
      } [&>button]:hidden`}>
        {/* Accessibility Components - visually hidden */}
        <DialogTitle className="sr-only">
          Edit Booking - {booking.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Modify the details for this booking. Availability will be checked as you edit time/date/bay.
        </DialogDescription>

        {/* Mobile Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-5 md:hidden relative">
          <div className="flex items-center justify-between">
            {/* Booking Info */}
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">
                Edit Booking
              </h2>
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <span>ID: {booking.id}</span>
                {isPastBooking && (
                  <Badge variant="secondary" className="text-xs">
                    Past
                  </Badge>
                )}
              </div>
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
                  <PenSquare className="h-5 w-5" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Edit Booking (ID: {booking.id})
                  </h2>
                  {isPastBooking && (
                    <Badge variant="secondary">
                      Past Booking
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  Modify the details for this booking. Availability will be checked as you edit time/date/bay.
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center text-gray-700 bg-white/80 hover:bg-white rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                <PenSquare className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 md:px-6 md:space-y-6">
          {/* Customer Information Section */}
          <div className="border-b pb-4 space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-primary">
              {booking.customer?.customer_name || booking.name}
            </h3>
            {booking.customer?.customer_code && (
              <Badge variant="secondary" className="text-xs">
                {booking.customer.customer_code}
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            {(booking.customer?.contact_number || booking.phone_number) && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <a 
                  href={`tel:${(() => {
                    const phoneNumber = booking.customer?.contact_number || booking.phone_number;
                    const digitsOnly = phoneNumber.replace(/\D/g, '');
                    if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
                      return '+66' + digitsOnly.substring(1);
                    }
                    return digitsOnly.startsWith('66') ? '+' + digitsOnly : phoneNumber;
                  })()}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline truncate"
                >
                  {booking.customer?.contact_number || booking.phone_number}
                </a>
              </div>
            )}
            
            {(booking.customer?.email || booking.email) && 
             (booking.customer?.email || booking.email)?.toLowerCase() !== 'info@len.golf' && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <a 
                  href={`mailto:${booking.customer?.email || booking.email}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline truncate"
                >
                  {booking.customer?.email || booking.email}
                </a>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{booking.number_of_people} {booking.number_of_people === 1 ? 'person' : 'people'}</span>
            </div>

            {booking.booking_type && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{booking.booking_type}</Badge>
              </div>
            )}
          </div>

          {booking.package_name && (
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{booking.package_name}</span>
            </div>
          )}

          {booking.customer_notes && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>Existing Notes</span>
              </div>
              <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md">
                {booking.customer_notes}
              </p>
            </div>
          )}
        </div>

        <Tabs defaultValue={isPastBooking ? "secondary" : "main"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="main" disabled={isPastBooking} className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Main Information</span>
              <span className="sm:hidden">Main</span>
              {isPastBooking && <span className="ml-1 text-xs">(Past Booking)</span>}
            </TabsTrigger>
            <TabsTrigger value="secondary" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Additional Details</span>
              <span className="sm:hidden">Other</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="main" className="max-h-[50vh] overflow-y-auto pr-2">
            <div className="w-full grid gap-4 py-4">
          {/* Past booking warning */}
          {!isMainInfoEditable && (
            <div className="col-span-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-yellow-700 text-sm">This booking is in the past. Time, date, and bay cannot be changed.</p>
            </div>
          )}
          
          {/* Date */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Date</Label>
            <div className="col-span-3">
              <DatePicker value={formData.date} onChange={handleDateChange} label="" disabled={!isMainInfoEditable} />
            </div>
          </div>

          {/* Start Time */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start_time" className="text-right">Start Time</Label>
            <Input id="start_time" name="start_time" type="time" value={formData.start_time || ''} onChange={handleInputChange} className="col-span-3" placeholder="HH:mm" disabled={!isMainInfoEditable} />
          </div>

          {/* Duration */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">Duration (minutes)</Label>
            <Input id="duration" name="duration" type="number" value={formData.duration === undefined ? '' : formData.duration} onChange={handleInputChange} className="col-span-3" min="1" step="1" disabled={!isMainInfoEditable} />
          </div>
          
          {/* Availability Status Display (for selected bay/time) */}
          {generalAvailabilityMessage &&
            <div className="text-center">
              <p className={`text-sm ${availabilityStatus === 'error' ? 'text-red-500' : availabilityStatus === 'overridden' ? 'text-orange-500' : 'text-yellow-600'}`}>{generalAvailabilityMessage}</p>
            </div>
          }

          {/* Overwrite Switch */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="allow-overwrite" className="text-right">Overwrite Availability</Label>
            <div className="col-span-3 flex items-center">
              <Switch
                id="allow-overwrite"
                checked={allowOverwrite}
                onCheckedChange={setAllowOverwrite}
                disabled={!isMainInfoEditable}
              />
              {allowOverwrite && <span className="ml-2 text-sm text-orange-600">Warning: Availability checks bypassed!</span>}
            </div>
          </div>

          {/* Bay Selection Buttons */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Bay</Label>
            <div className="col-span-3 grid grid-cols-3 gap-2">
              {isCheckingAllBays ? (
                <p className="col-span-3 text-sm text-gray-500">Loading bay availability...</p>
              ) : bayAvailabilityData.length > 0 ? (
                bayAvailabilityData.map((bayInfo) => (
                  <Button
                    key={bayInfo.name}
                    type="button"
                    variant={formData.bay === bayInfo.name ? 'default' : 'outline'}
                    onClick={() => handleBayButtonClick(bayInfo.name)}
                    disabled={(!bayInfo.isAvailable && !allowOverwrite) || !isMainInfoEditable}
                    className={`w-full ${(!bayInfo.isAvailable && !allowOverwrite) ? 'opacity-50 cursor-not-allowed' : ''} ${
                      formData.bay === bayInfo.name && availabilityStatus === 'overridden' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''
                    }`}
                  >
                    {bayInfo.name}
                    {formData.bay === bayInfo.name && availabilityStatus === 'overridden' && " (Overridden)"}
                  </Button>
                ))
              ) : (
                <p className="col-span-3 text-sm text-gray-500">No bay data. Select date/time/duration.</p>
              )}
            </div>
          </div>
          {/* Show a message if no bay is selected */}
          {(!formData.bay || formData.bay === '') && (
            <div className="text-sm text-yellow-700 text-center mb-2">
              Please select a bay for the new time/date.
            </div>
          )}

          {/* Number of People */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="number_of_people" className="text-right">People</Label>
            <Input id="number_of_people" name="number_of_people" type="number" value={formData.number_of_people === undefined ? '' : formData.number_of_people} onChange={handleInputChange} className="col-span-3" min="1" disabled={!isMainInfoEditable}/>
          </div>

          {/* Employee Name (Mandatory) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="employee_name" className="text-right pt-2">
              Your Name <span className="text-red-500">*</span>
            </Label>
            <div className="col-span-3">
              <Select
                value={formData.employee_name || ''}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, employee_name: value }));
                }}
              >
                <SelectTrigger className="w-full">
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
          </div>

          {error && (
            <div className="col-span-4 bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          )}
            </div>
          </TabsContent>
          
          <TabsContent value="secondary" className="max-h-[50vh] overflow-y-auto pr-2">
            <div className="w-full grid gap-4 py-4">
          {/* Booking Type */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Booking Type</Label>
            <div className="col-span-3">
              <SimpleBookingTypeSelector
                value={formData.booking_type || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, booking_type: value }))}
              />
            </div>
          </div>

          {/* Package Selection - Show for package bookings and coaching bookings */}
          {formData.booking_type && (
            formData.booking_type.toLowerCase().includes('package') || 
            formData.booking_type.toLowerCase().includes('coaching')
          ) && (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Package</Label>
              <div className="col-span-3">
                <EditPackageSelector
                  value={formData.package_id || null}
                  customerName={booking?.name || ''}
                  customerPhone={booking?.phone_number || ''}
                  customerId={booking?.customer_id || null}
                  currentPackageName={booking?.package_name}
                  bookingDate={formData.date ? format(formData.date, 'yyyy-MM-dd') : booking?.date}
                  onChange={(packageId, packageName) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      package_id: packageId,
                      package_name: packageName,
                    }));
                  }}
                />
              </div>
            </div>
          )}

          {/* Referral Source - Only editable for new customers */}
          {booking?.is_new_customer && (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Referral Source</Label>
              <div className="col-span-3">
                <div className="space-y-2">
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded-md border border-blue-200">
                    💡 This customer is new - please add their referral source for tracking
                  </div>
                  <SimpleReferralSourceSelector
                    value={formData.referral_source || ''}
                    onChange={(source) => setFormData(prev => ({ ...prev, referral_source: source }))}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Show referral source for existing customers (read-only) */}
          {!booking?.is_new_customer && booking?.referral_source && (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Referral Source</Label>
              <div className="col-span-3">
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md border">
                  {booking.referral_source}
                  <div className="text-xs text-gray-500 mt-1">
                    (Referral source can only be set for new customers)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customer Notes (Internal) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="customer_notes" className="text-right">
              {booking.customer_notes ? 'Update Notes' : 'Internal Notes'}
            </Label>
            <Textarea 
              id="customer_notes" 
              name="customer_notes" 
              value={formData.customer_notes || ''} 
              onChange={handleInputChange} 
              className="col-span-3" 
              placeholder={booking.customer_notes ? "Update or add to existing notes" : "Internal notes for staff"} 
            />
          </div>

          {/* Employee Name - Required field */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="employee_name_secondary" className="text-right pt-2">
              Your Name <span className="text-red-500">*</span>
            </Label>
            <div className="col-span-3">
              <Select
                value={formData.employee_name || ''}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, employee_name: value }));
                }}
              >
                <SelectTrigger className="w-full">
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
          </div>
            </div>
          </TabsContent>
        </Tabs>
        </div>

        {/* Fixed Bottom Action Bar */}
        <div className="bg-white border-t px-6 py-4 space-y-3 flex-shrink-0">
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="lg"
              className="flex-1 h-12 font-semibold text-sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              size="lg"
              className="flex-1 h-12 font-semibold text-sm"
              onClick={handleSubmit} 
              disabled={
                isSubmitting || 
                (!isSlotAvailable && !allowOverwrite && isMainInfoEditable) ||
                (!formData.bay && isMainInfoEditable) || 
                !formData.employee_name?.trim() ||
                (isCheckingAllBays && isMainInfoEditable)
              }
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}