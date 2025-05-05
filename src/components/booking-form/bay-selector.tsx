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