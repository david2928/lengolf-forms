import * as React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { TimeField } from "@/components/ui/time-field"

interface ManualTimeInputProps {
  bookingDate: Date
  startTime: string | null
  onStartTimeChange: (time: string) => void
  duration: number | undefined
  onDurationChange: (duration: number) => void
}

export function ManualTimeInput({
  bookingDate,
  startTime,
  onStartTimeChange,
  duration,
  onDurationChange
}: ManualTimeInputProps) {
  const [localDuration, setLocalDuration] = React.useState(duration?.toString() || '')

  React.useEffect(() => {
    setLocalDuration(duration?.toString() || '')
  }, [duration])

  const handleDurationChange = (value: string) => {
    setLocalDuration(value)
    const newDuration = parseInt(value)
    if (!isNaN(newDuration) && newDuration >= 30 && newDuration <= 300) {
      onDurationChange(newDuration)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Start Time (24-hour format)</Label>
        <TimeField
          value={startTime || ""}
          onChange={onStartTimeChange}
          className="w-[240px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Duration (minutes)</Label>
        <div className="flex w-[240px] items-center space-x-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min={30}
            max={300}
            value={localDuration}
            placeholder="Enter duration"
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onChange={(e) => handleDurationChange(e.target.value)}
            onBlur={() => {
              const newDuration = parseInt(localDuration)
              if (!localDuration || isNaN(newDuration) || newDuration < 30 || newDuration > 300) {
                setLocalDuration('60')
                onDurationChange(60)
              }
            }}
          />
          <span className="text-sm text-muted-foreground">min</span>
        </div>
        <span className="text-xs text-muted-foreground">30-300 minutes</span>
      </div>
    </div>
  )
}