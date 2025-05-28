import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { StockLevelSlider } from './stock-level-slider'
import { GloveSizesInput } from './glove-sizes-input'
import { STOCK_LEVEL_VALUES, GloveSizeData } from '@/types/inventory'
import { AlertTriangle } from 'lucide-react'
import { ProductInputProps } from '@/types/inventory'
import { getDisplayValue, shouldShowReorderAlert, getProductFieldId } from './utils/form-helpers'

export function ProductInput({ product, value, onChange, error }: ProductInputProps) {
  const fieldId = getProductFieldId(product)
  const displayValue = getDisplayValue(product, value)
  const showReorderAlert = shouldShowReorderAlert(product, value)

  // Check if this is the cash field (Change #4)
  const isCashField = product.name.toLowerCase().includes('cash')

  const handleChange = (newValue: string | number) => {
    onChange(product.id, newValue)
  }

  // Format number with commas for US style (123,456.78)
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Parse formatted currency back to number
  const parseCurrency = (value: string): number => {
    // Remove commas and parse
    const cleaned = value.replace(/,/g, '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  // Handle cash field input with formatting
  const handleCashChange = (inputValue: string) => {
    // Remove commas for processing
    const cleanValue = inputValue.replace(/,/g, '')
    
    // Allow empty value
    if (cleanValue === '') {
      handleChange('')
      return
    }

    // Validate input - only allow numbers and one decimal point
    if (!/^\d*\.?\d{0,2}$/.test(cleanValue)) {
      return // Don't update if invalid format
    }

    // Check if it's within 6 digit limit (999,999.99)
    const numValue = parseFloat(cleanValue)
    if (numValue > 999999.99) {
      return // Don't update if too large
    }

    // Store the numeric value
    handleChange(numValue)
  }

  const renderInput = () => {
    switch (product.input_type) {
      case 'number':
        if (isCashField) {
          // Special handling for cash field with comma formatting
          const cashValue = typeof value === 'number' ? value : (value ? parseFloat(String(value)) : 0)
          const formattedValue = cashValue > 0 ? formatCurrency(cashValue) : ''
          
          return (
            <div className="flex items-center gap-2">
              <Input
                id={fieldId}
                type="text"
                value={formattedValue}
                onChange={(e) => handleCashChange(e.target.value)}
                placeholder="0"
                className="h-12 text-base text-right"
                maxLength={10} // Max for "999,999.99"
              />
              <span className="text-muted-foreground font-medium text-base whitespace-nowrap">
                THB
              </span>
            </div>
          )
        }

        // Regular number input for non-cash fields
        return (
          <div className="flex items-center gap-2">
            <Input
              id={fieldId}
              type="number"
              min="0"
              step="1"
              value={displayValue}
              onChange={(e) => handleChange(e.target.value ? parseFloat(e.target.value) : '')}
              placeholder={product.unit ? `# of ${product.unit}` : "#"}
              className="h-12 text-base"
            />
            {product.unit && (
              <span className="text-muted-foreground font-medium text-base whitespace-nowrap">
                {product.unit}
              </span>
            )}
          </div>
        )

      case 'textarea':
        return (
          <Textarea
            id={fieldId}
            value={displayValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Enter ${product.name.toLowerCase()} details`}
            className="min-h-[100px] text-base"
            rows={4}
          />
        )

      case 'checkbox':
        if (!product.input_options?.options) {
          return (
            <div className="text-red-500 text-sm">
              Configuration error: No options provided for {product.name}
            </div>
          )
        }

        return (
          <RadioGroup
            value={displayValue}
            onValueChange={handleChange}
            className="space-y-3"
          >
            {product.input_options.options.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${fieldId}_${option}`} />
                <Label 
                  htmlFor={`${fieldId}_${option}`} 
                  className="text-base font-normal cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )

      case 'stock_slider':
        return (
          <StockLevelSlider
            id={fieldId}
            value={typeof value === 'object' ? undefined : value}
            onChange={(numericValue) => {
              // Convert number back to string for API compatibility
              const stringValue = STOCK_LEVEL_VALUES[numericValue as keyof typeof STOCK_LEVEL_VALUES]
              handleChange(stringValue)
            }}
            productName={product.name}
            error={error}
          />
        )

      case 'glove_sizes':
        return (
          <GloveSizesInput
            id={fieldId}
            value={typeof value === 'number' ? undefined : value}
            onChange={(gloveSizeData: GloveSizeData) => {
              // Convert to JSON string for storage
              handleChange(JSON.stringify(gloveSizeData))
            }}
            productName={product.name}
            error={error}
          />
        )

      default:
        return (
          <div className="text-red-500 text-sm">
            Unsupported input type: {product.input_type}
          </div>
        )
    }
  }

  return (
    <div className="space-y-3">
      {/* Don't show product name label for glove_sizes - the component has its own clear heading */}
      {product.input_type !== 'glove_sizes' && (
        <div className="flex items-center gap-2">
          <Label htmlFor={fieldId} className="text-base font-medium">
            {product.name}
            {product.is_required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {showReorderAlert && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Low Stock</span>
            </div>
          )}
        </div>
      )}

      {renderInput()}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {product.reorder_threshold && product.input_type === 'number' && (
        <p className="text-xs text-muted-foreground">
          Reorder when below {product.reorder_threshold} {product.unit || 'units'}
        </p>
      )}
    </div>
  )
} 