'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { DateTime } from 'luxon'
import { format } from 'date-fns'
import { useAvailability } from '@/hooks/useAvailability'
import { TimeSlot } from '@/lib/availability-subscription'
import { Button } from '@/components/ui/button'

interface TimeSlotSelectorProps {
  selectedDate: Date
  selectedTime: Date | null
  selectedBay?: string | null
  duration?: number
  onTimeSelect: (time: Date, availableBays: string[]) => void
  error?: string
}

interface BusyTime {
  start: string;
  end: string;
}

interface BayAvailability {
  busyTimes: BusyTime[];
}

// Updated to use simplified bay names from Phase 2
const BAYS = ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4'] as const;

export function BookingTimeSelector({ 
  selectedDate, 
  selectedTime,
  selectedBay = null,
  duration = 1.0, 
  onTimeSelect, 
  error 
}: TimeSlotSelectorProps) {
  const [apiResponses, setApiResponses] = useState<Record<string, BayAvailability>>({});
  const [legacySlots, setLegacySlots] = useState<Array<{time: DateTime, availableBays: string[]}>>([]);

  // Use our new availability hook for real-time updates
  const {
    availableSlots,
    loading: availabilityLoading,
    error: availabilityError,
    refreshAvailability
  } = useAvailability({
    date: format(selectedDate, 'yyyy-MM-dd'),
    bay: selectedBay || undefined,
    duration,
    startHour: 10,
    endHour: 22,
    autoRefresh: true
  });

  // Fallback to legacy API for compatibility
  useEffect(() => {
    let mounted = true;

    const fetchBayAvailability = async (bayNumber: string, dateStr: string) => {
      try {
        const response = await fetch('/api/bookings/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bayNumber, date: dateStr }),
        });
        const data = await response.json();
        return { bayNumber, data };
      } catch (error) {
        console.error(`Error fetching ${bayNumber}:`, error);
        return { bayNumber, data: { busyTimes: [] } };
      }
    };

    const fetchAllBays = async () => {
      const dateStr = DateTime.fromJSDate(selectedDate).toISODate();
      if (!dateStr) return;

      try {
        const promises = BAYS.map(bay => fetchBayAvailability(bay, dateStr));
        const results = await Promise.all(promises);
        
        if (mounted) {
          const newResponses: Record<string, BayAvailability> = {};
          results.forEach(({ bayNumber, data }) => {
            newResponses[bayNumber] = data;
          });
          setApiResponses(newResponses);
          generateLegacySlots(newResponses);
        }
      } catch (error) {
        console.error('Error fetching bays:', error);
      }
    };

    // Only fetch legacy data if we don't have available slots from the new API
    if (availableSlots.length === 0 && !availabilityLoading) {
      fetchAllBays();
    }

    return () => {
      mounted = false;
    };
  }, [selectedDate, availableSlots.length, availabilityLoading]);

  const isBayAvailable = (bay: string, time: DateTime, busyTimesByBay: Record<string, BayAvailability>): boolean => {
    const bayBusyTimes = busyTimesByBay[bay]?.busyTimes || [];
    const slotStart = time;
    const slotEnd = time.plus({ hours: duration });

    return !bayBusyTimes.some(busy => {
      const busyStart = DateTime.fromISO(busy.start);
      const busyEnd = DateTime.fromISO(busy.end);
      return (slotStart < busyEnd && slotEnd > busyStart);
    });
  };

  const generateLegacySlots = (busyTimesByBay: Record<string, BayAvailability>) => {
    const slots: Array<{time: DateTime, availableBays: string[]}> = [];
    const now = DateTime.local().setZone('Asia/Bangkok');
    
    let currentTime = DateTime.fromJSDate(selectedDate)
      .setZone('Asia/Bangkok')
      .set({ hour: 10, minute: 0, second: 0, millisecond: 0 });

    if (currentTime.hasSame(now, 'day') && now.hour >= 10) {
      currentTime = now.set({ minute: now.minute >= 30 ? 60 : 30, second: 0, millisecond: 0 });
    }

    const endTime = currentTime.set({ hour: 22, minute: 0 });

    while (currentTime <= endTime) {
      if (!currentTime.hasSame(now, 'day') || currentTime >= now) {
        const availableBays = BAYS.filter(bay => 
          isBayAvailable(bay, currentTime, busyTimesByBay)
        );

        if (availableBays.length > 0) {
          slots.push({
            time: currentTime,
            availableBays
          });
        }
      }
      
      currentTime = currentTime.plus({ minutes: 30 });
    }

    setLegacySlots(slots);
  };

  // Determine which slots to use (prefer new API)
  const slotsToRender = availableSlots.length > 0 ? 
    availableSlots.map(slot => ({
      time: DateTime.fromFormat(slot.time, 'HH:mm').set({
        year: selectedDate.getFullYear(),
        month: selectedDate.getMonth() + 1,
        day: selectedDate.getDate()
      }),
      availableBays: selectedBay ? [selectedBay] : BAYS.filter(bay => slot.bay === bay || !slot.bay)
    })) : 
    legacySlots;

  const loading = availabilityLoading;

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Select Start Time</Label>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="ml-2 text-sm text-gray-500">Loading time slots...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Select Start Time</Label>
        {availabilityError && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshAvailability()}
            className="text-yellow-600 hover:text-yellow-700 text-xs"
          >
            Refresh
          </Button>
        )}
      </div>

      {/* Real-time indicator */}
      {availableSlots.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Real-time availability
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {slotsToRender.map((slot, index) => (
          <button
            key={`${slot.time.toISO()}-${index}`}
            onClick={() => onTimeSelect(slot.time.toJSDate(), slot.availableBays)}
            className={`
              py-2 px-3 rounded-lg text-sm font-medium text-center
              transition-colors duration-200 relative
              ${selectedTime && format(selectedTime, 'HH:mm') === slot.time.toFormat('HH:mm')
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            type="button"
          >
            <div>{slot.time.toFormat('h:mm a')}</div>
            <div className="text-xs mt-1 text-inherit opacity-75">
              {slot.availableBays.length} {slot.availableBays.length === 1 ? 'Bay' : 'Bays'}
            </div>
            
            {/* Show specific bay if only one available */}
            {slot.availableBays.length === 1 && (
              <div className="text-xs opacity-60">
                {slot.availableBays[0]}
              </div>
            )}
          </button>
        ))}
      </div>

      {slotsToRender.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-2">
            No available time slots for this date.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshAvailability()}
          >
            Check Again
          </Button>
        </div>
      )}

      {availabilityError && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            Real-time updates temporarily unavailable. Showing cached availability.
          </p>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}