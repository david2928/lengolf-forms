import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STAFF_OPTIONS } from '@/types/inventory'

interface StaffSelectorProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

export function StaffSelector({ value, onChange, error }: StaffSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="staff-selector" className="text-base font-medium">
        Staff Member <span className="text-red-500">*</span>
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="staff-selector" className="h-12 text-base">
          <SelectValue placeholder="Select staff member" />
        </SelectTrigger>
        <SelectContent>
          {STAFF_OPTIONS.map((staff) => (
            <SelectItem key={staff} value={staff} className="text-base">
              {staff}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
} 