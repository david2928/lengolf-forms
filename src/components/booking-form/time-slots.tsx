import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { addHours, format, isAfter, set } from "date-fns"

interface TimeSlotsProps {
  startTime: Date
  endTime: Date | null
  onEndTimeSelect: (time: Date) => void
  error?: string
}

export function TimeSlots({ startTime, endTime, onEndTimeSelect, error }: TimeSlotsProps) {
  const slots = [];
  const currentTime = new Date(startTime);
  const lastAllowedTime = set(new Date(currentTime), { hours: 23, minutes: 0 });
  
  let maxHours = 5;
  for (let i = 1; i <= 5; i++) {
    const potentialEndTime = addHours(currentTime, i);
    if (isAfter(potentialEndTime, lastAllowedTime)) {
      maxHours = i - 1;
      break;
    }
  }

  for (let i = 1; i <= maxHours; i++) {
    const slotEndTime = addHours(currentTime, i);
    const isSelected = endTime && 
      format(new Date(endTime), 'HH:mm') === format(slotEndTime, 'HH:mm');
      
    const durationText = i === 1 
      ? '60min (1 hour)'
      : `${i * 60}min (${i} hours)`;

    slots.push(
      <Button
        key={i}
        type="button"
        variant={isSelected ? "default" : "outline"}
        className={`h-auto py-3 text-center ${isSelected ? 'bg-blue-600 text-white' : ''}`}
        onClick={() => onEndTimeSelect(slotEndTime)}
      >
        <div>
          <div className="text-sm">{format(currentTime, 'h:mm a')} - {format(slotEndTime, 'h:mm a')}</div>
          <div className="text-xs mt-1 opacity-75">{durationText}</div>
        </div>
      </Button>
    );
  }

  return slots.length > 0 ? (
    <div className="space-y-2">
      <Label>Select Duration</Label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {slots}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  ) : null;
}