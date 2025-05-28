import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { STOCK_LEVEL_VALUES, StockLevelValue } from '@/types/inventory'

interface StockLevelSliderProps {
  id: string
  value: number | string | undefined
  onChange: (value: number) => void
  productName: string
  error?: string
}

export function StockLevelSlider({ id, value, onChange, productName, error }: StockLevelSliderProps) {
  // Convert string values from API back to numbers
  const getNumericValue = (val: number | string | undefined): number => {
    if (typeof val === 'string') {
      // Convert string back to number based on mapping
      const entry = Object.entries(STOCK_LEVEL_VALUES).find(([_, label]) => label === val)
      return entry ? parseInt(entry[0]) : 2 // Default to "Need to Order"
    }
    return typeof val === 'number' ? val : 2 // Default to "Need to Order"
  }

  const currentValue = getNumericValue(value)
  const currentLabel = STOCK_LEVEL_VALUES[currentValue as StockLevelValue] || 'Need to Order'

  const handleValueChange = (values: number[]) => {
    onChange(values[0])
  }

  return (
    <div className="space-y-4">
      {/* Current value display */}
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-muted-foreground">
          Current Level:
        </Label>
        <span className="text-base font-semibold text-foreground">
          {currentLabel}
        </span>
      </div>

      {/* Slider */}
      <div className="px-3">
        <Slider
          id={id}
          min={1}
          max={4}
          step={1}
          value={[currentValue]}
          onValueChange={handleValueChange}
          className="w-full"
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-muted-foreground px-3">
        <span className={`text-center ${currentValue === 1 ? 'font-semibold text-red-600' : ''}`}>
          Out of Stock
        </span>
        <span className={`text-center ${currentValue === 2 ? 'font-semibold text-amber-600' : ''}`}>
          Need to Order
        </span>
        <span className={`text-center ${currentValue === 3 ? 'font-semibold text-blue-600' : ''}`}>
          Enough
        </span>
        <span className={`text-center ${currentValue === 4 ? 'font-semibold text-green-600' : ''}`}>
          Plenty
        </span>
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
} 