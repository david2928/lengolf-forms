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

  // Stock level descriptions
  const descriptions = {
    1: 'Nothing left. Must reorder immediately.',
    2: 'Will last less than 2 weeks. Should reorder soon.',
    3: 'Will last more than 2 weeks. No action needed.'
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
          max={3}
          step={1}
          value={[currentValue]}
          onValueChange={handleValueChange}
          className="w-full"
        />
      </div>

      {/* Labels with descriptions */}
      <div className="flex justify-between text-xs px-3">
        <div className={`text-center flex-1 ${currentValue === 1 ? 'font-semibold text-red-600' : 'text-muted-foreground'}`}>
          <div className="font-medium">Out of Stock</div>
          <div className="italic mt-1">{descriptions[1]}</div>
        </div>
        <div className={`text-center flex-1 ${currentValue === 2 ? 'font-semibold text-amber-600' : 'text-muted-foreground'}`}>
          <div className="font-medium">Need to Order</div>
          <div className="italic mt-1">{descriptions[2]}</div>
        </div>
        <div className={`text-center flex-1 ${currentValue === 3 ? 'font-semibold text-green-600' : 'text-muted-foreground'}`}>
          <div className="font-medium">Enough Stock</div>
          <div className="italic mt-1">{descriptions[3]}</div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
} 