'use client'

import { useEffect, useState, useCallback } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DateTime } from 'luxon'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useAllBaysAvailability } from '@/hooks/useAvailability'

// Updated to use the simplified bay names from Phase 2
const BAYS = [
  { id: 'Bay 1', name: 'Bay 1' },
  { id: 'Bay 2', name: 'Bay 2' },
  { id: 'Bay 3', name: 'Bay 3' }
];

interface BusyTime {
  start: string;
  end: string;
}

interface BaySelectorProps {
  selectedDate: Date;
  selectedBay: string | null;
  selectedStartTime: string | null | Date;
  selectedEndTime: string | null | Date;
  onBaySelect: (bay: string) => void;
  onTimeSelect: (start: string, end: string) => void;
  isManualMode?: boolean;
  error?: {
    bay?: string;
    time?: string;
  };
}

export function BaySelector({
  selectedDate,
  selectedBay,
  selectedStartTime,
  selectedEndTime,
  onBaySelect,
  onTimeSelect,
  isManualMode = false,
  error
}: BaySelectorProps) {
  const [busyTimesByBay, setBusyTimesByBay] = useState<Record<string, BusyTime[]>>({});
  const [availableBaysForTime, setAvailableBaysForTime] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Calculate duration from selected times
  const duration = selectedStartTime && selectedEndTime ? (() => {
    const start = selectedStartTime instanceof Date
      ? DateTime.fromJSDate(selectedStartTime)
      : DateTime.fromFormat(selectedStartTime as string, 'HH:mm').set({
          year: selectedDate.getFullYear(),
          month: selectedDate.getMonth() + 1,
          day: selectedDate.getDate()
        });
    
    const end = selectedEndTime instanceof Date
      ? DateTime.fromJSDate(selectedEndTime)
      : DateTime.fromFormat(selectedEndTime as string, 'HH:mm').set({
          year: selectedDate.getFullYear(),
          month: selectedDate.getMonth() + 1,
          day: selectedDate.getDate()
        });
    
    return end.diff(start, 'hours').hours;
  })() : 1;

  // Get start time for availability check
  const startTimeForCheck = selectedStartTime ? (
    selectedStartTime instanceof Date
      ? DateTime.fromJSDate(selectedStartTime).toFormat('HH:mm')
      : selectedStartTime as string
  ) : '10:00';

  // Use our new real-time availability hook
  const { 
    availability, 
    loading: availabilityLoading, 
    error: availabilityError,
    refresh 
  } = useAllBaysAvailability(
    format(selectedDate, 'yyyy-MM-dd'),
    startTimeForCheck,
    duration
  );

  // Fetch individual bay busy times for conflict checking
  const fetchAllBaysAvailability = useCallback(async (date: Date | string | null) => {
    if (!date) return;
    setIsLoading(true);
    const formattedDate = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    const availabilities: Record<string, BusyTime[]> = {};

    await Promise.all(BAYS.map(async (bay) => {
      const bayId = bay.id;
      try {
        const response = await fetch('/api/bookings/availability', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            bayNumber: bayId,
            date: formattedDate,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch for ${bayId}. Status: ${response.status}. Message: ${errorText}`);
        }
        
        const data = await response.json();
        availabilities[bayId] = data.busyTimes || [];
      } catch (error) {
        console.error(`Error fetching availability for bay ${bayId}:`, error);
        availabilities[bayId] = [];
      }
    }));

    setBusyTimesByBay(availabilities);
    setIsLoading(false);
  }, []);

  const updateAvailableBays = useCallback(() => {
    if (!selectedStartTime || !selectedEndTime || !selectedDate) return;

    const startTime = selectedStartTime instanceof Date
      ? DateTime.fromJSDate(selectedStartTime).setZone('Asia/Bangkok')
      : DateTime.fromFormat(selectedStartTime as string, 'HH:mm').set({
          year: selectedDate.getFullYear(),
          month: selectedDate.getMonth() + 1,
          day: selectedDate.getDate()
        }).setZone('Asia/Bangkok');

    const endTime = selectedEndTime instanceof Date
      ? DateTime.fromJSDate(selectedEndTime).setZone('Asia/Bangkok')
      : DateTime.fromFormat(selectedEndTime as string, 'HH:mm').set({
          year: selectedDate.getFullYear(),
          month: selectedDate.getMonth() + 1,
          day: selectedDate.getDate()
        }).setZone('Asia/Bangkok');

    const available = BAYS.filter(bay => {
      const busyTimesForBay = busyTimesByBay[bay.id] || [];
      const isBusy = busyTimesForBay.some(busy => {
        let busyStart: DateTime, busyEnd: DateTime;
        try {
          busyStart = DateTime.fromISO(busy.start);
          busyEnd = DateTime.fromISO(busy.end);
          
          if (!busyStart.isValid || !busyEnd.isValid) {
            console.warn(`Invalid busy time format encountered for bay ${bay.id}:`, busy);
            return true;
          }

          return (startTime < busyEnd && endTime > busyStart);
        } catch (e) {
          console.error(`Error processing busy time for Bay ${bay.id}:`, busy, e);
          return true;
        }
      });
      return !isBusy;
    });

    setAvailableBaysForTime(available.map(bay => bay.id));
  }, [selectedStartTime, selectedEndTime, busyTimesByBay, selectedDate]);

  useEffect(() => {
    if (selectedDate && !isManualMode) {
      fetchAllBaysAvailability(selectedDate);
    }
  }, [selectedDate, isManualMode, fetchAllBaysAvailability]);

  useEffect(() => {
    if (selectedStartTime && selectedEndTime && !isManualMode) {
      if (Object.keys(busyTimesByBay).some(key => BAYS.some(b => b.id === key))) {
        updateAvailableBays();
      }
    }
  }, [selectedStartTime, selectedEndTime, busyTimesByBay, isManualMode, selectedDate, updateAvailableBays]);

  const isBayAvailable = (bayId: string) => {
    if (isManualMode) return true;
    
    // If we're still loading availability data, show as available to avoid blocking UX
    if (availabilityLoading) return true;
    
    // If there's an error with the availability service, show as available to not block user
    if (availabilityError) {
      console.warn('Availability service error, showing bays as available:', availabilityError);
      return true;
    }
    
    // Use real-time availability data if available and start time is selected
    if (selectedStartTime && availability && Object.keys(availability).length > 0) {
      // Check if this bay's availability is specifically defined
      if (availability[bayId] !== undefined) {
        return availability[bayId];
      }
    }
    
    // Fallback to old logic only if no start time is selected
    if (!selectedStartTime) {
      return true; // Show all bays as available when no time is selected
    }
    
    // If we have a start time but no availability data, fall back to old logic
    return availableBaysForTime.includes(bayId);
  };

  const loading = isLoading || availabilityLoading;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Bay</Label>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-gray-500">Loading bay availability...</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {BAYS.map((bay) => {
              const isAvailable = isBayAvailable(bay.id);
              const showAvailability = selectedStartTime && availability[bay.id] !== undefined;
              
              return (
                <Button
                  key={bay.id}
                  type="button"
                  variant={selectedBay === bay.id ? "default" : "outline"}
                  className={cn(
                    "h-auto py-4 px-2 relative",
                    selectedBay === bay.id && "bg-primary text-primary-foreground",
                    (!isAvailable && selectedStartTime) && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => onBaySelect(bay.id)}
                  disabled={!isAvailable && selectedStartTime !== null}
                >
                  <div className="flex flex-col items-center">
                    <span className="font-medium">{bay.name}</span>
                    {showAvailability && (
                      <span className={cn(
                        "text-xs mt-1",
                        isAvailable ? "text-green-600" : "text-red-600"
                      )}>
                        {isAvailable ? "Available" : "Busy"}
                      </span>
                    )}
                  </div>
                  {/* Real-time indicator */}
                  {showAvailability && (
                    <div className={cn(
                      "absolute top-1 right-1 w-2 h-2 rounded-full",
                      isAvailable ? "bg-green-500" : "bg-red-500"
                    )} />
                  )}
                </Button>
              );
            })}
          </div>
        )}
        
        {availabilityError && (
          <div className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              Real-time updates unavailable. Using cached data.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refresh()}
              className="text-yellow-800 hover:text-yellow-900"
            >
              Retry
            </Button>
          </div>
        )}
        
        {error?.bay && (
          <p className="text-sm text-red-500">{error.bay}</p>
        )}
      </div>
    </div>
  )
}