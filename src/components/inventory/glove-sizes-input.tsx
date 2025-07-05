import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GLOVE_SIZES, GloveSizeData } from '@/types/inventory'

interface GloveSizesInputProps {
  id: string
  value: GloveSizeData | string | undefined
  onChange: (value: GloveSizeData) => void
  productName: string
  error?: string
}

export function GloveSizesInput({ id, value, onChange, productName, error }: GloveSizesInputProps) {
  // Convert value to GloveSizeData format
  const getGloveSizeData = (val: GloveSizeData | string | undefined): GloveSizeData => {
    if (typeof val === 'string') {
      try {
        // Try to parse JSON string
        const parsed = JSON.parse(val)
        if (typeof parsed === 'object' && parsed !== null) {
          // Ensure all glove sizes are represented
          const result: GloveSizeData = {} as GloveSizeData
          for (const size of GLOVE_SIZES) {
            result[size] = parsed[size] || 0
          }
          return result
        }
      } catch {
        // Fall through to default
      }
    }
    
    if (typeof val === 'object' && val !== null) {
      // Ensure all glove sizes are represented
      const result: GloveSizeData = {} as GloveSizeData
      for (const size of GLOVE_SIZES) {
        result[size] = val[size] || 0
      }
      return result
    }
    
    // Default: all sizes with 0 quantity
    const result: GloveSizeData = {} as GloveSizeData
    for (const size of GLOVE_SIZES) {
      result[size] = 0
    }
    return result
  }

  const currentData = getGloveSizeData(value)

  const handleSizeChange = (size: string, quantity: string) => {
    const numericQuantity = quantity === '' ? 0 : parseInt(quantity) || 0
    const updatedData = {
      ...currentData,
      [size]: numericQuantity
    }
    onChange(updatedData)
  }

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">
        Golf Glove Quantities by Size
      </Label>
      
      {/* 4x2 Grid */}
      <div className="space-y-4">
        {/* First row: sizes 18-21 */}
        <div className="grid grid-cols-4 gap-4">
          {GLOVE_SIZES.slice(0, 4).map((size) => (
            <div key={size} className="space-y-2">
              <Label htmlFor={`${id}-${size}`} className="text-sm font-medium text-center block">
                Size {size}
              </Label>
              <Input
                id={`${id}-${size}`}
                type="number"
                inputMode="numeric"
                min="0"
                max="99"
                value={currentData[size] || ''}
                onChange={(e) => handleSizeChange(size, e.target.value)}
                placeholder="0"
                className="h-10 text-center"
              />
            </div>
          ))}
        </div>

        {/* Second row: sizes 22-25 */}
        <div className="grid grid-cols-4 gap-4">
          {GLOVE_SIZES.slice(4).map((size) => (
            <div key={size} className="space-y-2">
              <Label htmlFor={`${id}-${size}`} className="text-sm font-medium text-center block">
                Size {size}
              </Label>
              <Input
                id={`${id}-${size}`}
                type="number"
                inputMode="numeric"
                min="0"
                max="99"
                value={currentData[size] || ''}
                onChange={(e) => handleSizeChange(size, e.target.value)}
                placeholder="0"
                className="h-10 text-center"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Total count display */}
      <div className="text-sm text-muted-foreground text-right">
        Total Gloves: {Object.values(currentData).reduce((sum, count) => sum + count, 0)}
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
} 