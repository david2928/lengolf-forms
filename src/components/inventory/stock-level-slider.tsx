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

  // Stock level descriptions with enhanced info
  const levelConfig = {
    1: {
      label: 'Out of Stock',
      description: 'Nothing left. Must reorder immediately.',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    2: {
      label: 'Need to Order', 
      description: 'Will last less than 2 weeks. Should reorder soon.',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    3: {
      label: 'Enough Stock',
      description: 'Will last more than 2 weeks. No action needed.',
      color: 'text-green-600', 
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  }

  const currentConfig = levelConfig[currentValue as keyof typeof levelConfig]

  return (
    <div className="space-y-3">
      {/* Current status with enhanced visual feedback */}
      <div className={`rounded-lg border p-3 ${currentConfig.bgColor} ${currentConfig.borderColor}`}>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor={id} className="text-sm font-medium text-muted-foreground">
            Current Level:
          </Label>
          <span className={`text-base font-semibold ${currentConfig.color}`}>
            {currentConfig.label}
          </span>
        </div>
        
        {/* Only show description for current selection */}
        <p className="text-sm text-muted-foreground">
          {currentConfig.description}
        </p>
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

      {/* Compact labels */}
      <div className="flex justify-between text-xs px-3">
        <div className={`text-center flex-1 ${currentValue === 1 ? 'font-semibold text-red-600' : 'text-muted-foreground'}`}>
          <div className="font-medium">Out of Stock</div>
        </div>
        <div className={`text-center flex-1 ${currentValue === 2 ? 'font-semibold text-amber-600' : 'text-muted-foreground'}`}>
          <div className="font-medium">Need to Order</div>
        </div>
        <div className={`text-center flex-1 ${currentValue === 3 ? 'font-semibold text-green-600' : 'text-muted-foreground'}`}>
          <div className="font-medium">Enough Stock</div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
} 