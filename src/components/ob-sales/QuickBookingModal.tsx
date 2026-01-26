'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SimpleCalendar } from '@/components/ui/simple-calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Phone, User, Loader2, CheckCircle2 } from "lucide-react";
import { format, addMinutes } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import { generateBookingId } from '@/lib/booking-utils';

// Duration options in minutes
const DURATION_OPTIONS = [
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 150, label: '2.5 hours' },
  { value: 180, label: '3 hours' },
];

// Employee list
const EMPLOYEES_LIST = [
  { value: 'Dolly', label: 'Dolly' },
  { value: 'Net', label: 'Net' },
  { value: 'May', label: 'May' },
  { value: 'Ashley', label: 'Ashley' },
  { value: 'David', label: 'David' },
];

interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  staffName?: string;
  onSuccess?: (bookingId: string) => void;
}

interface FormData {
  date: Date;
  startTime: string;
  duration: number;
  numberOfPeople: number;
  bay: string;
  employeeName: string;
}

export function QuickBookingModal({
  isOpen,
  onClose,
  customer,
  staffName,
  onSuccess
}: QuickBookingModalProps) {
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    date: new Date(),
    startTime: '',
    duration: 60,
    numberOfPeople: 1,
    bay: '',
    employeeName: staffName || '',
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bay availability state
  const [bayAvailabilityData, setBayAvailabilityData] = useState<Array<{ name: string; apiName: string; isAvailable: boolean }>>([]);
  const [isCheckingBays, setIsCheckingBays] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: new Date(),
        startTime: '',
        duration: 60,
        numberOfPeople: 1,
        bay: '',
        employeeName: staffName || '',
      });
      setError(null);
      setIsSuccess(false);
      setBayAvailabilityData([]);
    }
  }, [isOpen, staffName]);

  // Check bay availability when date/time/duration changes
  const checkBayAvailability = useCallback(async () => {
    if (!formData.date || !formData.startTime || !formData.duration) {
      setBayAvailabilityData([]);
      return;
    }

    setIsCheckingBays(true);
    try {
      const response = await fetch('/api/bookings/check-slot-for-all-bays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: format(formData.date, 'yyyy-MM-dd'),
          start_time: formData.startTime,
          duration: formData.duration,
        }),
      });

      if (response.ok) {
        const results = await response.json();
        setBayAvailabilityData(results);

        // Auto-select first available bay if none selected
        if (!formData.bay) {
          const firstAvailable = results.find((b: any) => b.isAvailable);
          if (firstAvailable) {
            setFormData(prev => ({ ...prev, bay: firstAvailable.name }));
          }
        }
      }
    } catch (err) {
      console.error('Error checking bay availability:', err);
    } finally {
      setIsCheckingBays(false);
    }
  }, [formData.date, formData.startTime, formData.duration, formData.bay]);

  // Debounced availability check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.startTime) {
        checkBayAvailability();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.date, formData.startTime, formData.duration, checkBayAvailability]);

  const handleBaySelect = (bayName: string) => {
    const bayInfo = bayAvailabilityData.find(b => b.name === bayName);
    if (bayInfo?.isAvailable) {
      setFormData(prev => ({ ...prev, bay: bayName }));
    }
  };

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = addMinutes(startDate, durationMinutes);
    return format(endDate, 'HH:mm');
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!formData.startTime) {
      setError('Please select a start time');
      return;
    }
    if (!formData.bay) {
      setError('Please select a bay');
      return;
    }
    if (!formData.employeeName) {
      setError('Please select your name');
      return;
    }

    // Check bay is still available
    const selectedBay = bayAvailabilityData.find(b => b.name === formData.bay);
    if (!selectedBay?.isAvailable) {
      setError('Selected bay is no longer available. Please choose another.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create booking payload
      const bookingData = {
        id: generateBookingId(),
        user_id: '059090f8-2d76-4f10-81de-5efe4d2d0fd8',
        name: customer.name,
        email: 'info@len.golf',
        phone_number: customer.phone,
        date: format(formData.date, 'yyyy-MM-dd'),
        start_time: formData.startTime,
        duration: formData.duration / 60, // Convert to hours
        number_of_people: formData.numberOfPeople,
        status: 'confirmed',
        bay: formData.bay,
        customer_notes: `Booked via OB Sales call by ${formData.employeeName}`,
        booking_type: 'Normal Bay Rate',
        customer_id: customer.id,
        isNewCustomer: false,
        referral_source: 'OB Sales', // Track bookings from OB Sales calls
      };

      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking');
      }

      // Send LINE notification
      const endTime = calculateEndTime(formData.startTime, formData.duration);
      const lineMessage = `Booking Notification (ID: ${result.bookingId})\nName: ${customer.name}\nPhone: ${customer.phone}\nDate: ${format(formData.date, 'EEE, MMM dd')}\nTime: ${formData.startTime} - ${endTime}\nBay: ${formData.bay}\nType: Normal Bay Rate\nPeople: ${formData.numberOfPeople}\nChannel: OB Sales Call\nCreated by: ${formData.employeeName}`;

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: lineMessage,
          bookingType: 'Normal Bay Rate'
        })
      });

      setIsSuccess(true);
      toast({
        title: "Booking Created",
        description: `Booking confirmed for ${customer.name} on ${format(formData.date, 'MMM dd')} at ${formData.startTime}`,
      });

      // Auto-close after showing success
      setTimeout(() => {
        onSuccess?.(result.bookingId);
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('Booking creation error:', err);
      setError(err.message || 'Failed to create booking');
      toast({
        title: "Booking Failed",
        description: err.message || 'Failed to create booking',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-green-700">Booking Created!</h3>
            <p className="text-gray-600 text-center">
              {customer.name} is booked for {format(formData.date, 'MMM dd')} at {formData.startTime}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Booking</DialogTitle>
          <DialogDescription>
            Create a booking for this customer
          </DialogDescription>
        </DialogHeader>

        {/* Customer Info Display */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{customer.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">{customer.phone}</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.date, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <SimpleCalendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => date && setFormData(prev => ({ ...prev, date, bay: '' }))}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value, bay: '' }))}
                min="09:00"
                max="23:00"
              />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={formData.duration.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value), bay: '' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* End Time Display */}
          {formData.startTime && (
            <div className="text-sm text-gray-600">
              End time: {calculateEndTime(formData.startTime, formData.duration)}
            </div>
          )}

          {/* Bay Selection */}
          <div className="space-y-2">
            <Label>Bay</Label>
            {isCheckingBays ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking availability...
              </div>
            ) : bayAvailabilityData.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {bayAvailabilityData.map((bay) => (
                  <Button
                    key={bay.name}
                    type="button"
                    variant={formData.bay === bay.name ? 'default' : 'outline'}
                    onClick={() => handleBaySelect(bay.name)}
                    disabled={!bay.isAvailable}
                    className={`${!bay.isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                    size="sm"
                  >
                    {bay.name.replace('Bay ', '')}
                  </Button>
                ))}
              </div>
            ) : formData.startTime ? (
              <p className="text-sm text-gray-500">No availability data</p>
            ) : (
              <p className="text-sm text-gray-500">Select time to see available bays</p>
            )}
          </div>

          {/* Number of People */}
          <div className="space-y-2">
            <Label>Number of People</Label>
            <Select
              value={formData.numberOfPeople.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, numberOfPeople: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? 'person' : 'people'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Your Name <span className="text-red-500">*</span></Label>
            <Select
              value={formData.employeeName}
              onValueChange={(value) => setFormData(prev => ({ ...prev, employeeName: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your name" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYEES_LIST.map((emp) => (
                  <SelectItem key={emp.value} value={emp.value}>
                    {emp.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={isSubmitting || !formData.bay || !formData.startTime || !formData.employeeName}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Booking'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
