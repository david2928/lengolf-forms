'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'
import { DateTime } from 'luxon'
import { cn } from '@/lib/utils'

const BAYS = [
  { id: 'Bay 1 (Bar)', name: 'Bay 1 (Bar)' },
  { id: 'Bay 2', name: 'Bay 2' },
  { id: 'Bay 3 (Entrance)', name: 'Bay 3 (Entrance)' }
];

const BUSINESS_START = '10:00';
const BUSINESS_END = '22:00';

interface BusyTime {
  start: string;
  end: string;
}

interface BaySelectorProps {
  selectedDate: Date;
  selectedBay: string | null;
  selectedStartTime: string | null;
  selectedEndTime: string | null;
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
  const [loading, setLoading] = useState(false);
  const [busyTimesByBay, setBusyTimesByBay] = useState<Record<string, BusyTime[]>>({});
  const [availableBaysForTime, setAvailableBaysForTime] = useState<string[]>([]);

  useEffect(() => {
    if (selectedDate && !isManualMode) {
      fetchAllBaysAvailability();
    }
  }, [selectedDate, isManualMode]);

  useEffect(() => {
    if (selectedStartTime && !isManualMode) {
      updateAvailableBays();
    }
  }, [selectedStartTime, busyTimesByBay, isManualMode]);

  const fetchAllBaysAvailability = async () => {
    setLoading(true);
    try {
      const promises = BAYS.map(bay => 
        fetch('/api/bookings/availability', {
          method: 'POST',
          body: JSON.stringify({
            bayNumber: bay.id,
            date: DateTime.fromJSDate(selectedDate).toISODate(),
          }),
        }).then(res => res.json())
      );

      const results = await Promise.all(promises);
      const busyTimes: Record<string, BusyTime[]> = {};
      
      BAYS.forEach((bay, index) => {
        busyTimes[bay.id] = results[index].busyTimes;
      });

      setBusyTimesByBay(busyTimes);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAvailableBays = () => {
    if (!selectedStartTime) return;

    const startTime = DateTime.fromFormat(selectedStartTime, 'HH:mm');
    const endTime = startTime.plus({ hours: 1 });

    const available = BAYS.filter(bay => {
      const busyTimesForBay = busyTimesByBay[bay.id] || [];
      return !busyTimesForBay.some(busy => {
        const busyStart = DateTime.fromISO(busy.start);
        const busyEnd = DateTime.fromISO(busy.end);
        return (startTime < busyEnd && endTime > busyStart);
      });
    });

    setAvailableBaysForTime(available.map(bay => bay.id));
  };

  const isBayAvailable = (bayId: string) => {
    if (isManualMode) return true;
    return !selectedStartTime || availableBaysForTime.includes(bayId);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Bay</Label>
        <div className="grid grid-cols-3 gap-2">
          {BAYS.map((bay) => (
            <Button
              key={bay.id}
              type="button"
              variant={selectedBay === bay.id ? "default" : "outline"}
              className={cn(
                "h-auto py-4 px-2",
                selectedBay === bay.id && "bg-primary text-primary-foreground",
                (!isBayAvailable(bay.id) && selectedStartTime) && "opacity-50"
              )}
              onClick={() => onBaySelect(bay.id)}
              disabled={!isBayAvailable(bay.id)}
            >
              {bay.name}
            </Button>
          ))}
        </div>
        {error?.bay && (
          <p className="text-sm text-red-500">{error.bay}</p>
        )}
      </div>
    </div>
  )
}