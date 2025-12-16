"use client"

import { format } from 'date-fns'
import { SimpleCalendar } from '@/components/ui/simple-calendar'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerProps {
  label: string;
  selected: Date | null;
  onSelect: (date: Date | null) => void;
}

export function DatePicker({
  label,
  selected,
  onSelect,
}: DatePickerProps) {
  const handleSelect = (date: Date | undefined) => {
    onSelect(date ?? null);
    const event = new Event('keydown');
    (event as any).key = 'Escape';
    document.dispatchEvent(event);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal border border-gray-200 focus:border-[#005a32] focus:outline-none focus:ring-1 focus:ring-[#005a32] hover:border-gray-300 transition-colors bg-white"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selected ? format(selected, 'PP') : 'Select date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <SimpleCalendar
            mode="single"
            selected={selected || undefined}
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}