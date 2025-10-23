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

  // Define duration options in hours (including half-hour increments)
  const durationOptions = [1, 1.5, 2, 2.5, 3, 4, 5];

  // Filter out options that would exceed the last allowed time
  const validDurations = durationOptions.filter(hours => {
    const potentialEndTime = addHours(currentTime, hours);
    return !isAfter(potentialEndTime, lastAllowedTime);
  });

  for (const hours of validDurations) {
    const slotEndTime = addHours(currentTime, hours);
    const isSelected = endTime &&
      format(new Date(endTime), 'HH:mm') === format(slotEndTime, 'HH:mm');

    const minutes = hours * 60;
    const durationText = hours === 1
      ? '60min (1 hour)'
      : hours % 1 === 0
      ? `${minutes}min (${hours} hours)`
      : `${minutes}min (${hours} hours)`;

    slots.push(
      <Button
        key={hours}
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