'use client'

import { useEffect, useState, useCallback } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DateTime } from 'luxon'
import { cn } from '@/lib/utils'
import { format, parse, addHours } from 'date-fns'

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
  const [allBayAvailabilities, setAllBayAvailabilities] = useState<Record<string, BusyTime[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [availableBays, setAvailableBays] = useState<string[]>([]);

  useEffect(() => {
    if (selectedDate && !isManualMode) {
      fetchAllBaysAvailability(selectedDate);
    }
  }, [selectedDate, isManualMode]);

  useEffect(() => {
    if (selectedStartTime && selectedEndTime && !isManualMode) {
      updateAvailableBays();
    }
  }, [selectedStartTime, selectedEndTime, busyTimesByBay, isManualMode, selectedDate]);

  const fetchAllBaysAvailability = useCallback(async (date: Date | string | null) => {
    if (!date) return;
    setLoading(true);
    const formattedDate = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    const availabilities: Record<string, BusyTime[]> = {};
    const bayKeys = Object.keys(BAYS) as string[];

    await Promise.all(bayKeys.map(async (bayKey) => {
      try {
        const response = await fetch('/api/bookings/availability', {
          method: 'POST',
          body: JSON.stringify({
            bayNumber: bayKey,
            date: formattedDate,
          }),
        }).then(res => res.json());
        if (!response.ok) {
          throw new Error(`Failed to fetch for ${bayKey}`);
        }
        availabilities[bayKey] = response.busyTimes;
      } catch (error) {
        console.error(`Error fetching availability for bay ${bayKey}:`, error);
        availabilities[bayKey] = [];
      }
    }));

    setBusyTimesByBay(availabilities);
    setIsLoading(false);
  }, []);

  const updateAvailableBays = useCallback(() => {
    if (!selectedStartTime || !selectedEndTime || !selectedDate) return;

    const startTime = selectedStartTime instanceof Date 
      ? DateTime.fromJSDate(selectedStartTime).setZone('Asia/Bangkok')
      : DateTime.fromFormat(selectedStartTime, 'HH:mm').set({
          year: selectedDate.getFullYear(),
          month: selectedDate.getMonth() + 1,
          day: selectedDate.getDate()
        }).setZone('Asia/Bangkok');

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
  }, [selectedStartTime, selectedEndTime, busyTimesByBay, selectedDate]);

  const isBayAvailable = (bayId: string) => {
    if (isManualMode) return true;
    return !selectedStartTime || availableBaysForTime.includes(bayId);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Bay</Label>
        {isLoading ? (
          <p>Loading bay availability...</p>
        ) : (
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
        )}
        {error?.bay && (
          <p className="text-sm text-red-500">{error.bay}</p>
        )}
      </div>
    </div>
  )
}