'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { PenSquare } from "lucide-react";
import { Booking } from '@/types/booking';
import { format, parseISO, isValid, parse, addMinutes, isWithinInterval, isEqual, startOfDay, endOfDay, subHours, isBefore } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";

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

      // Convert duration to minutes if needed (assume booking.duration is in hours if <= 12, else already in minutes)
      let durationInMinutes = 60;
      if (typeof booking.duration === 'number') {
        durationInMinutes = booking.duration <= 12 ? booking.duration * 60 : booking.duration;
      }
      const initialFormData: Partial<EditBookingFormData> = {
        bay: booking.bay || '',
        date: initialDate,
        start_time: booking.start_time || '',
        duration: durationInMinutes, // always minutes
        number_of_people: booking.number_of_people || 1,
        customer_notes: booking.customer_notes || '',
        employee_name: booking?.updated_by_identifier || '',
      };
      setFormData(initialFormData);
      setOriginalSlot({
        date: booking.date,
        start_time: booking.start_time,
        duration: booking.duration,
        bay: booking.bay
      });
      setError(null);
      setAvailabilityStatus('idle');
      setIsSlotAvailable(false);
      setBayAvailabilityData([]);
      setIsCheckingAllBays(false);
      setAllowOverwrite(false);

      // Check if booking is in the past (older than 2 hours from its start_time)
      let isPastBooking = false;
      if (booking.date && booking.start_time) {
        try {
          const bookingDateTime = parse(`${booking.date} ${booking.start_time}`, 'yyyy-MM-dd HH:mm', new Date());
          if (isValid(bookingDateTime)) {
            const twoHoursAgo = subHours(new Date(), 2);
            isPastBooking = isBefore(bookingDateTime, twoHoursAgo);
          }
        } catch (e) {
          console.error("Error parsing booking date/time for past check:", e);
        }
      }
      if (isPastBooking) {
        setFormData({}); // Clear form data or set to read-only values if preferred
        setError("This booking is in the past and can no longer be edited.");
        // Further disable all inputs and save button if isPastBooking is true (handled by disabled prop on elements)
      }

      if (initialFormData.date && initialFormData.start_time && initialFormData.duration && initialFormData.duration > 0 && !isPastBooking) {
        fetchAllBaysAvailability(initialFormData.date, initialFormData.start_time, initialFormData.duration);
      }

    } else if (!isOpen) {
      setFormData({});
      setOriginalSlot(null);
      setAvailabilityStatus('idle');
      setBayAvailabilityData([]);
      setIsCheckingAllBays(false);
      setIsSlotAvailable(false);
      setAllowOverwrite(false);
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
  };

  const fetchAllBaysAvailability = useCallback(async (date: Date | undefined, startTime: string | undefined, duration: number | undefined) => {
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

      const currentSelectedBayInfo = results.find(b => b.name === formData.bay);
      if (formData.bay && currentSelectedBayInfo && currentSelectedBayInfo.isAvailable) {
        setIsSlotAvailable(true);
        setAvailabilityStatus('available');
      } else if (formData.bay) {
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

  useEffect(() => {
    if (isOpen && formData.date && formData.start_time && typeof formData.duration === 'number' && formData.duration > 0) {
      debouncedFetchAllBays(formData.date, formData.start_time, formData.duration);
    } else if (isOpen) {
      setBayAvailabilityData([]);
      setAvailabilityStatus('not_applicable');
      setIsSlotAvailable(false);
    }
  }, [isOpen, formData.date, formData.start_time, formData.duration, debouncedFetchAllBays]);

  const handleSubmit = async () => {
    setError(null);
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
    if (!formData.employee_name?.trim()) {
      setError('Employee name is required for making changes.');
      toast({ title: "Validation Error", description: "Employee name is required.", variant: "destructive" });
      return;
    }

    if (!isSlotAvailable && !allowOverwrite) {
      setError('Selected bay and time slot is not available. Please choose a different slot or bay, or enable overwrite.');
      toast({ title: "Availability Error", description: "The selected bay/time is not available without overwrite.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);

    const payload: any = {
      employee_name: formData.employee_name.trim(),
      availability_overridden: allowOverwrite && availabilityStatus === 'overridden',
    };

    if (formData.bay) payload.bay = formData.bay;
    if (formData.date) payload.date = format(formData.date, 'yyyy-MM-dd');
    if (formData.start_time) payload.start_time = formData.start_time;
    payload.duration = durationMinutes;
    if (formData.number_of_people) payload.number_of_people = numberOfPeople;
    if (formData.customer_notes !== undefined && formData.customer_notes !== null) {
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
            if (payload.duration && (originalSlot.duration * 60) !== payload.duration) changesSummary.push(`Duration: ${originalSlot.duration}h -> ${payload.duration/60}h`);
          }
          if (payload.number_of_people && booking.number_of_people !== payload.number_of_people) changesSummary.push(`Pax: ${booking.number_of_people} -> ${payload.number_of_people}`);
          if (payload.customer_notes !== undefined && (booking.customer_notes || '') !== (payload.customer_notes || '')) changesSummary.push('Notes updated');

          const summaryText = changesSummary.length > 0 ? changesSummary.join(', ') : 'Details updated';
          const overriddenText = (payload.availability_overridden) ? "\n⚠️ AVAILABILITY OVERRIDDEN ⚠️" : "";

          const lineMessage = `ℹ️ BOOKING MODIFIED (ID: ${updatedBookingData.id}) 🔄\n----------------------------------\n👤 Customer: ${updatedBookingData.name}\n📞 Phone: ${updatedBookingData.phone_number || 'N/A'}\n👥 Pax: ${updatedBookingData.number_of_people || 1}\n🗓️ Date: ${format(new Date(updatedBookingData.date), 'EEE, MMM dd')}\n⏰ Time: ${updatedBookingData.start_time} (Duration: ${updatedBookingData.duration}H)\n⛳ Bay: ${updatedBookingData.bay || 'N/A'}\n💡 Type: ${updatedBookingData.booking_type || 'N/A'}${(updatedBookingData.package_name) ? ` (${updatedBookingData.package_name})` : ''}${overriddenText}\n----------------------------------\n🛠️ Changes: ${summaryText}\n🧑‍💼 By: ${formData.employee_name?.trim() || 'Staff'}`;

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
            console.log('EditBookingModal: LINE notification for modification sent successfully.');
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
  if (booking && booking.date && booking.start_time) {
    try {
      const bookingDateTime = parse(`${booking.date} ${booking.start_time}`, 'yyyy-MM-dd HH:mm', new Date());
      if (isValid(bookingDateTime)) {
        const twoHoursAgo = subHours(new Date(), 2);
        isBookingEditable = !isBefore(bookingDateTime, twoHoursAgo);
      }
    } catch (e) {
      console.error("Error parsing booking date/time for editability check:", e);
      isBookingEditable = false; // Default to not editable on error
    }
  }

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Booking (ID: {booking.id})</DialogTitle>
          <DialogDescription>
            Modify the details for this booking. Availability will be checked as you edit time/date/bay.
          </DialogDescription>
        </DialogHeader>
        <div className="w-full grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Date */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Date</Label>
            <div className="col-span-3">
              <DatePicker value={formData.date} onChange={handleDateChange} label="" disabled={!isBookingEditable} />
            </div>
          </div>

          {/* Start Time */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start_time" className="text-right">Start Time</Label>
            <Input id="start_time" name="start_time" type="time" value={formData.start_time || ''} onChange={handleInputChange} className="col-span-3" placeholder="HH:mm" disabled={!isBookingEditable} />
          </div>

          {/* Duration */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">Duration (minutes)</Label>
            <Input id="duration" name="duration" type="number" value={formData.duration === undefined ? '' : formData.duration} onChange={handleInputChange} className="col-span-3" min="1" step="1" disabled={!isBookingEditable} />
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
                disabled={!isBookingEditable}
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
                    disabled={(!bayInfo.isAvailable && !allowOverwrite) || !isBookingEditable}
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
            <Input id="number_of_people" name="number_of_people" type="number" value={formData.number_of_people === undefined ? '' : formData.number_of_people} onChange={handleInputChange} className="col-span-3" min="1" disabled={!isBookingEditable}/>
          </div>

          {/* Customer Notes (Internal) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="customer_notes" className="text-right">Internal Notes</Label>
            <Textarea id="customer_notes" name="customer_notes" value={formData.customer_notes || ''} onChange={handleInputChange} className="col-span-3" placeholder="Internal notes for staff" disabled={!isBookingEditable}/>
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
                <SelectTrigger className="w-full" disabled={!isBookingEditable}>
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

          {error && <p className="text-sm text-red-500 col-span-4 text-center py-2">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={
              isSubmitting || 
              (!isSlotAvailable && !allowOverwrite) ||
              !formData.bay || 
              !formData.employee_name?.trim() ||
              isCheckingAllBays || 
              !isBookingEditable
            }
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}