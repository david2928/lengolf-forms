'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DateTime } from 'luxon'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const BAYS = [
  { id: 'Bay 1 (Bar)', name: 'Bay 1 (Bar)' },
  { id: 'Bay 2', name: 'Bay 2' },
  { id: 'Bay 3 (Entrance)', name: 'Bay 3 (Entrance)' }
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
  const [loading, setLoading] = useState(false);
  const [busyTimesByBay, setBusyTimesByBay] = useState<Record<string, BusyTime[]>>({});
  const [availableBaysForTime, setAvailableBaysForTime] = useState<string[]>([]);

  useEffect(() => {
    if (selectedDate && !isManualMode) {
      fetchAllBaysAvailability();
    }
  }, [selectedDate, isManualMode]);

  useEffect(() => {
    if (selectedStartTime && selectedEndTime && !isManualMode) {
      updateAvailableBays();
    }
  }, [selectedStartTime, selectedEndTime, busyTimesByBay, isManualMode, selectedDate]);

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
    if (!selectedStartTime || !selectedEndTime || !selectedDate) return;

    // Convert start time
    const startTime = selectedStartTime instanceof Date 
      ? DateTime.fromJSDate(selectedStartTime).setZone('Asia/Bangkok')
      : DateTime.fromFormat(selectedStartTime, 'HH:mm').set({
          year: selectedDate.getFullYear(),
          month: selectedDate.getMonth() + 1,
          day: selectedDate.getDate()
        }).setZone('Asia/Bangkok');

    // Convert end time
    const endTime = selectedEndTime instanceof Date
      ? DateTime.fromJSDate(selectedEndTime).setZone('Asia/Bangkok')
      : DateTime.fromFormat(selectedEndTime, 'HH:mm').set({
          year: selectedDate.getFullYear(),
          month: selectedDate.getMonth() + 1,
          day: selectedDate.getDate()
        }).setZone('Asia/Bangkok');

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