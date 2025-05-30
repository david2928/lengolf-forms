import { format } from 'date-fns'
import { InventoryProduct, STAFF_OPTIONS, STOCK_LEVEL_VALUES, GloveSizeData, GLOVE_SIZES } from '@/types/inventory'

// Validate staff name selection
export const isValidStaffName = (staffName: string): boolean => {
  return STAFF_OPTIONS.includes(staffName as any)
}

// Format date for submission (YYYY-MM-DD)
export const formatDateForSubmission = (date: Date): string => {
  return format(date, 'yyyy-MM-dd')
}

// Get today's date formatted for forms
export const getTodayFormatted = (): string => {
  return formatDateForSubmission(new Date())
}

// Count total fields including individual glove sizes
export const countTotalFields = (products: InventoryProduct[]): number => {
  let total = 0
  products.forEach(product => {
    if (product.input_type === 'glove_sizes') {
      total += GLOVE_SIZES.length // Each glove size counts as a separate field
    } else {
      total += 1
    }
  })
  return total
}

// Count empty fields
export const countEmptyFields = (
  products: InventoryProduct[],
  formData: Record<string, string | number | GloveSizeData>
): { emptyCount: number; emptyFields: string[] } => {
  let emptyCount = 0
  const emptyFields: string[] = []

  products.forEach(product => {
    const value = formData[product.id]
    
    if (product.input_type === 'glove_sizes') {
      // Check each individual glove size
      const gloveData = value as GloveSizeData | undefined
      GLOVE_SIZES.forEach(size => {
        const sizeValue = gloveData?.[size]
        if (!sizeValue || sizeValue === 0) {
          emptyCount++
          emptyFields.push(`${product.name} - Size ${size}`)
        }
      })
    } else {
      // Regular field
      if (!value || value === '') {
        emptyCount++
        emptyFields.push(product.name)
      }
    }
  })

  return { emptyCount, emptyFields }
}

// Check if we should show inline errors (>50% empty) or modal (<= 50% empty)
export const shouldShowInlineErrors = (
  products: InventoryProduct[],
  formData: Record<string, string | number | GloveSizeData>
): boolean => {
  const totalFields = countTotalFields(products)
  const { emptyCount } = countEmptyFields(products, formData)
  const emptyPercentage = emptyCount / totalFields
  
  return emptyPercentage > 0.5 // More than 50% empty = show inline errors
}

// Validate product input based on type
export const validateProductInput = (
  product: InventoryProduct,
  value: string | number | GloveSizeData | undefined
): string | null => {
  // Check if required field is empty
  if (product.is_required && (!value || value === '')) {
    return `${product.name} is required`
  }

  // Skip validation if field is not required and empty
  if (!value || value === '') {
    return null
  }

  // Validate number inputs
  if (product.input_type === 'number') {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue as number) || (numValue as number) < 0) {
      return `${product.name} must be a valid number (0 or greater)`
    }
    
    // Special validation for cash field (Change #4)
    const isCashField = product.name.toLowerCase().includes('cash')
    if (isCashField && (numValue as number) !== Math.round((numValue as number) * 100) / 100) {
      return `${product.name} must have at most 2 decimal places`
    }
  }

  // Validate checkbox/select options
  if (product.input_type === 'checkbox' && product.input_options) {
    const stringValue = String(value)
    if (!product.input_options.options.includes(stringValue)) {
      return `${product.name} has an invalid selection`
    }
  }

  // Validate stock slider (Change #2)
  if (product.input_type === 'stock_slider') {
    const stringValue = String(value)
    const validValues = Object.values(STOCK_LEVEL_VALUES)
    if (!validValues.includes(stringValue as any)) {
      return `${product.name} has an invalid stock level selection`
    }
  }

  // Validate glove sizes (Change #3)
  if (product.input_type === 'glove_sizes') {
    try {
      let gloveSizeData: GloveSizeData
      
      if (typeof value === 'string') {
        gloveSizeData = JSON.parse(value)
      } else if (typeof value === 'object' && value !== null) {
        gloveSizeData = value as GloveSizeData
      } else {
        return `${product.name} has invalid glove size data`
      }

      // Validate that all required sizes are present and are valid numbers
      for (const size of GLOVE_SIZES) {
        const quantity = gloveSizeData[size]
        if (quantity !== undefined && (isNaN(quantity) || quantity < 0)) {
          return `${product.name} size ${size} must be a valid number (0 or greater)`
        }
      }
    } catch {
      return `${product.name} has invalid glove size data format`
    }
  }

  return null
}

// Validate entire form data
export const validateFormData = (
  products: InventoryProduct[],
  formData: Record<string, string | number | GloveSizeData>,
  staffName: string
): Record<string, string> => {
  const errors: Record<string, string> = {}

  // Validate staff name
  if (!staffName || !isValidStaffName(staffName)) {
    errors.staff_name = 'Please select a valid staff member'
  }

  // Validate each product
  products.forEach(product => {
    const value = formData[product.id]
    const error = validateProductInput(product, value)
    if (error) {
      errors[product.id] = error
    }
  })

  return errors
}

// Transform form data for API submission
export const transformFormDataForSubmission = (
  formData: Record<string, string | number | GloveSizeData>,
  staffName: string,
  submissionDate: string,
  notes?: string
) => {
  // Convert GloveSizeData objects to JSON strings for API compatibility
  const transformedData: Record<string, string | number> = {}
  
  Object.entries(formData).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      // Convert GloveSizeData to JSON string
      transformedData[key] = JSON.stringify(value)
    } else {
      transformedData[key] = value
    }
  })

  return {
    staff_name: staffName,
    submission_date: submissionDate,
    inventory_data: transformedData,
    notes: notes || undefined
  }
}

// Check if product should show reorder alert
export const shouldShowReorderAlert = (
  product: InventoryProduct,
  value: string | number | GloveSizeData | undefined
): boolean => {
  if (!product.reorder_threshold || !value) {
    return false
  }

  // Only show reorder alerts for number inputs
  if (product.input_type !== 'number') {
    return false
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value
  return !isNaN(numValue as number) && (numValue as number) <= product.reorder_threshold
}

// Get display value for product input
export const getDisplayValue = (
  product: InventoryProduct,
  value: string | number | GloveSizeData | undefined
): string => {
  if (value === undefined || value === null || value === '') {
    return ''
  }

  if (product.input_type === 'number') {
    const isCashField = product.name.toLowerCase().includes('cash')
    if (isCashField && typeof value === 'number') {
      // Format cash with proper decimal places
      return value.toFixed(2)
    }
    return String(value)
  }

  // For glove_sizes and stock_slider, these are handled by their respective components
  // so we don't need to format them here
  if (product.input_type === 'glove_sizes' || product.input_type === 'stock_slider') {
    return ''
  }

  return String(value)
}

// Generate unique product ID for form fields
export const getProductFieldId = (product: InventoryProduct): string => {
  return `product_${product.id}`
}

// Parse existing form data for prefilling
export const parseExistingFormData = (
  inventoryData: Record<string, string | number>
): Record<string, string | number> => {
  // Clean and validate existing data
  const cleanedData: Record<string, string | number> = {}
  
  Object.entries(inventoryData).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      cleanedData[key] = value
    }
  })

  return cleanedData
} 