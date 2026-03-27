'use client';

import { useState } from 'react';
import { format, isBefore, startOfDay, addMonths, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MultiDatePickerProps {
  selectedDates: Date[];
  onChange: (dates: Date[]) => void;
  minDate?: Date;
  maxDate?: Date;
}

export function MultiDatePicker({
  selectedDates,
  onChange,
  minDate = startOfDay(new Date()),
  maxDate,
}: MultiDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const toggleDate = (date: Date) => {
    const normalized = startOfDay(date);
    if (isBefore(normalized, minDate)) return;
    if (maxDate && isBefore(maxDate, normalized)) return;

    const exists = selectedDates.some((d) => isSameDay(d, normalized));
    if (exists) {
      onChange(selectedDates.filter((d) => !isSameDay(d, normalized)));
    } else {
      const updated = [...selectedDates, normalized].sort((a, b) => a.getTime() - b.getTime());
      onChange(updated);
    }
  };

  const removeDate = (date: Date) => {
    onChange(selectedDates.filter((d) => !isSameDay(d, date)));
  };

  // Generate calendar grid for current month
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  // Fill leading nulls
  for (let i = 0; i < startOffset; i++) {
    currentWeek.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(new Date(year, month, day));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Fill trailing nulls
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const isSelected = (date: Date) => selectedDates.some((d) => isSameDay(d, date));
  const isPast = (date: Date) => isBefore(startOfDay(date), minDate);

  return (
    <div className="space-y-3">
      {/* Calendar */}
      <div className="border rounded-lg p-3 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-sm">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((date, di) => {
              if (!date) {
                return <div key={di} className="h-9" />;
              }
              const selected = isSelected(date);
              const past = isPast(date);
              return (
                <button
                  key={di}
                  type="button"
                  disabled={past}
                  onClick={() => toggleDate(date)}
                  className={`h-9 w-full rounded-md text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : past
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-900 hover:bg-gray-100 cursor-pointer'
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Selected dates summary */}
      {selectedDates.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedDates.map((date) => (
              <Badge
                key={date.toISOString()}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1"
              >
                {format(date, 'EEE, MMM d')}
                <button
                  type="button"
                  onClick={() => removeDate(date)}
                  className="ml-0.5 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
