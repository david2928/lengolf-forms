'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { DateTime } from 'luxon'
import { format } from 'date-fns'

interface TimeSlotSelectorProps {
  selectedDate: Date
  selectedTime: Date | null
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

interface TimeSlot {
  time: DateTime;
  availableBays: string[];
}

const BAYS = ['Bay 1 (Bar)', 'Bay 2', 'Bay 3 (Entrance)'] as const;

export function BookingTimeSelector({ 
  selectedDate, 
  selectedTime, 
  onTimeSelect, 
  error 
}: TimeSlotSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [apiResponses, setApiResponses] = useState<Record<string, BayAvailability>>({});
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

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
      if (!dateStr) {
        setLoading(false);
        return;
      }

      try {
        const promises = BAYS.map(bay => fetchBayAvailability(bay, dateStr));
        const results = await Promise.all(promises);
        
        if (mounted) {
          const newResponses: Record<string, BayAvailability> = {};
          results.forEach(({ bayNumber, data }) => {
            newResponses[bayNumber] = data;
          });
          setApiResponses(newResponses);
          generateAvailableSlots(newResponses);
        }
      } catch (error) {
        console.error('Error fetching bays:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAllBays();

    return () => {
      mounted = false;
    };
  }, [selectedDate]);

  const isBayAvailable = (bay: string, time: DateTime, busyTimesByBay: Record<string, BayAvailability>): boolean => {
    const bayBusyTimes = busyTimesByBay[bay]?.busyTimes || [];
    const slotStart = time;
    const slotEnd = time.plus({ hours: 1 });

    return !bayBusyTimes.some(busy => {
      const busyStart = DateTime.fromISO(busy.start);
      const busyEnd = DateTime.fromISO(busy.end);
      return (
        (slotStart < busyEnd && slotEnd > busyStart)
      );
    });
  };

  const generateAvailableSlots = (busyTimesByBay: Record<string, BayAvailability>) => {
    const slots: TimeSlot[] = [];
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

    setAvailableSlots(slots);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Select Start Time</Label>
        <div className="text-sm text-muted-foreground">Loading availability...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Label>Select Start Time</Label>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {availableSlots.map((slot) => (
          <button
            key={slot.time.toISO()}
            onClick={() => onTimeSelect(slot.time.toJSDate(), slot.availableBays)}
            className={`
              py-2 px-3 rounded-lg text-sm font-medium text-center
              transition-colors duration-200
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
          </button>
        ))}
      </div>

      {availableSlots.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">No available time slots for this date.</p>
      )}
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}