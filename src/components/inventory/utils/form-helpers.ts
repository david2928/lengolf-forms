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

// Check if a product is a slider type (these are optional)
export const isSliderProduct = (product: InventoryProduct): boolean => {
  return product.input_type === 'stock_slider'
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

// Count empty fields - now enforcing that all non-slider products must have values
export const countEmptyFields = (
  products: InventoryProduct[],
  formData: Record<string, string | number | GloveSizeData>
): { emptyCount: number; emptyFields: string[] } => {
  let emptyCount = 0
  const emptyFields: string[] = []

  products.forEach(product => {
    const value = formData[product.id]
    
    // Skip slider products as they are optional
    if (isSliderProduct(product)) {
      return
    }
    
    if (product.input_type === 'glove_sizes') {
      // Check each individual glove size - ALL must have values for non-slider products
      const gloveData = value as GloveSizeData | undefined
      GLOVE_SIZES.forEach(size => {
        const sizeValue = gloveData?.[size]
        if (!sizeValue || sizeValue === 0) {
          emptyCount++
          emptyFields.push(`${product.name} - Size ${size}`)
        }
      })
    } else {
      // Regular field - ALL non-slider products must have values
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

// Validate product input based on type - now enforcing required values for non-slider products
export const validateProductInput = (
  product: InventoryProduct,
  value: string | number | GloveSizeData | undefined
): string | null => {
  const isSlider = isSliderProduct(product)
  
  // All non-slider products are now required to have values (since is_required is removed)
  if (!isSlider && (!value || value === '')) {
    return `${product.name} is required (all products except sliders must have values)`
  }

  // Skip validation if field is a slider and empty (sliders are optional)
  if (isSlider && (!value || value === '')) {
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

  // Validate stock slider (Change #2) - these are optional but if provided must be valid
  if (product.input_type === 'stock_slider') {
    const stringValue = String(value)
    const validValues = Object.values(STOCK_LEVEL_VALUES)
    if (value && !validValues.includes(stringValue as any)) {
      return `${product.name} has an invalid stock level selection`
    }
  }

  // Validate glove sizes (Change #3) - for non-sliders, all sizes must have values
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

      // Validate that all sizes are present and are valid numbers for non-slider products
      for (const size of GLOVE_SIZES) {
        const quantity = gloveSizeData[size]
        if (!isSlider && (quantity === undefined || quantity === null)) {
          return `${product.name} size ${size} is required`
        }
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

// Transform form data for new API submission structure
export const transformFormDataForSubmission = (
  formData: Record<string, string | number | GloveSizeData>,
  staffName: string,
  submissionDate: string,
  generalNotes?: string,
  products?: InventoryProduct[]
) => {
  // Transform to API structure (removed inventory_date)
  const productSubmissions = Object.entries(formData)
    .map(([productId, value]) => {
      const product = products?.find(p => p.id === productId)
      
      const submission = {
        product_id: productId,
        category_id: product?.category_id || '', // Will be validated on server
        note: undefined as string | undefined
      }

      // Handle different value types
      if (value === null || value === undefined || value === '') {
        // For sliders, skip empty values. For others, should be caught by validation
        if (product && isSliderProduct(product)) {
          return null // Skip empty slider values - will be filtered out
        }
        // For non-sliders, default to 0 to satisfy constraint
        return { ...submission, value_numeric: 0 }
      } else if (product?.input_type === 'glove_sizes' || (typeof value === 'object' && value !== null)) {
        // JSON data (glove sizes or other complex data)
        return { ...submission, value_json: typeof value === 'string' ? JSON.parse(value) : value }
      } else if (typeof value === 'number' || !isNaN(Number(value))) {
        // Numeric data
        return { ...submission, value_numeric: Number(value) }
      } else {
        // Text data
        return { ...submission, value_text: String(value) }
      }
    })
    .filter((submission): submission is NonNullable<typeof submission> => submission !== null) // Type-safe filter

  return {
    staff_name: staffName,
    submission_date: submissionDate,
    products: productSubmissions,
    general_notes: generalNotes || undefined
  }
}

// Legacy transform function for backward compatibility
export const transformFormDataForLegacySubmission = (
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