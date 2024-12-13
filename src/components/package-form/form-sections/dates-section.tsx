import { DatePicker } from '../date-picker'
import { DatesSectionProps } from '@/types/package-form'

export function DatesSection({ 
  form, 
  selectedDates,
  onDatesChange
}: DatesSectionProps) {
  return (
    <div className="space-y-6">
      <DatePicker
        label="Purchase Date"
        selected={selectedDates.purchase}
        onSelect={(date) => {
          onDatesChange({ purchase: date })
          if (date) form.setValue('purchaseDate', date)
          form.trigger('purchaseDate')
        }}
      />

      <DatePicker
        label="First Use Date"
        selected={selectedDates.firstUse}
        onSelect={(date) => {
          onDatesChange({ firstUse: date })
          if (date) form.setValue('firstUseDate', date)
          form.trigger('firstUseDate')
        }}
      />
    </div>
  )
}