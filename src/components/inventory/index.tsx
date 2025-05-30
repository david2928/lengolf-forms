'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useInventoryProducts } from '@/hooks/use-inventory-products'
import { useInventorySubmission } from '@/hooks/use-inventory-submission'
import { InventoryFormState, GloveSizeData } from '@/types/inventory'
import { StaffSelector } from './staff-selector'
import { CategorySection } from './category-section'
import { ConfirmationModal } from './confirmation-modal'
import { SuccessModal } from './success-modal'
import { 
  validateFormData, 
  transformFormDataForSubmission, 
  getTodayFormatted,
  shouldShowInlineErrors,
  countEmptyFields
} from './utils/form-helpers'

export default function InventoryForm() {
  const { data: productsData, isLoading: isLoadingProducts, error: productsError } = useInventoryProducts()
  const { submit, isLoading: isSubmitting, error: submissionError } = useInventorySubmission()

  const [formState, setFormState] = useState<InventoryFormState>({
    categories: [],
    products: [],
    isLoading: false,
    error: null,
    selectedStaff: '',
    submissionDate: new Date(),
    formData: {},
    isSubmitting: false,
    showConfirmation: false
  })

  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [pendingEmptyFields, setPendingEmptyFields] = useState<string[]>([])

  // Update form state when products data is loaded
  useEffect(() => {
    if (productsData?.categories) {
      const allProducts = productsData.categories.flatMap(cat => cat.products)
      setFormState(prev => ({
        ...prev,
        categories: productsData.categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          display_order: cat.display_order,
          is_active: true,
          created_at: '',
          updated_at: ''
        })),
        products: allProducts
      }))
    }
  }, [productsData])

  // Handle form field changes
  const handleFieldChange = (productId: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [productId]: value
    }))
    
    // Clear error for this field if it exists
    if (errors[productId]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[productId]
        return newErrors
      })
    }
  }

  const setFormData = (updater: (prev: Record<string, string | number | GloveSizeData>) => Record<string, string | number | GloveSizeData>) => {
    setFormState(prev => ({
      ...prev,
      formData: updater(prev.formData)
    }))
  }

  // Handle staff selection
  const handleStaffChange = (staffName: string) => {
    setFormState(prev => ({ ...prev, selectedStaff: staffName }))
    
    // Clear staff error if it exists
    if (errors.staff_name) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.staff_name
        return newErrors
      })
    }
  }

  // Validate and submit form
  const handleSubmit = async () => {
    setShowSuccessModal(false)
    
    // First validate required fields and data types
    const validationErrors = validateFormData(
      formState.products,
      formState.formData,
      formState.selectedStaff
    )

    // Check if we should show inline errors or modal based on 50% rule
    const showInline = shouldShowInlineErrors(formState.products, formState.formData)
    
    if (Object.keys(validationErrors).length > 0) {
      if (showInline) {
        // More than 50% empty - show inline errors
        setErrors(validationErrors)
        setFormState(prev => ({ ...prev, error: 'Please fill out more fields before submitting.' }))
        return
      } else {
        // Less than 50% empty - check if there are any empty fields for confirmation
        const { emptyFields } = countEmptyFields(formState.products, formState.formData)
        if (emptyFields.length > 0) {
          setPendingEmptyFields(emptyFields)
          setShowConfirmModal(true)
          return
        }
      }
    }

    // Proceed with submission
    await performSubmission()
  }

  // Handle modal confirmation
  const handleModalConfirm = async () => {
    setShowConfirmModal(false)
    await performSubmission()
  }

  // Handle modal close
  const handleModalClose = () => {
    setShowConfirmModal(false)
    setPendingEmptyFields([])
  }

  // Actual submission logic
  const performSubmission = async () => {
    // Clear errors and prepare submission
    setErrors({})
    setFormState(prev => ({ ...prev, error: null, isSubmitting: true }))

    try {
      const submissionData = transformFormDataForSubmission(
        formState.formData,
        formState.selectedStaff,
        getTodayFormatted(),
        notes || undefined
      )

      const result = await submit(submissionData)

      if (result.success) {
        setShowSuccessModal(true)
        // Reset form
        setFormState(prev => ({
          ...prev,
          selectedStaff: '',
          formData: {},
          isSubmitting: false
        }))
        setNotes('')
      } else {
        setFormState(prev => ({ 
          ...prev, 
          error: result.error || 'Failed to submit inventory',
          isSubmitting: false 
        }))
      }
    } catch (error) {
      setFormState(prev => ({ 
        ...prev, 
        error: 'An unexpected error occurred. Please try again.',
        isSubmitting: false 
      }))
    }
  }

  // Loading state
  if (isLoadingProducts) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading inventory form...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (productsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load inventory data. Please refresh the page and try again.
        </AlertDescription>
      </Alert>
    )
  }

  // No data state
  if (!productsData?.categories || productsData.categories.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No inventory categories found. Please contact your administrator.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success Modal */}
      {showSuccessModal && (
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      {/* Error Message */}
      {(formState.error || submissionError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {formState.error || submissionError?.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Staff Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Information</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffSelector
            value={formState.selectedStaff}
            onChange={handleStaffChange}
            error={errors.staff_name}
          />
        </CardContent>
      </Card>

      {/* Inventory Categories */}
      {productsData.categories.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          formData={formState.formData}
          onChange={handleFieldChange}
          errors={errors}
        />
      ))}

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-medium">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about today's inventory..."
              className="min-h-[100px] text-base"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !formState.selectedStaff}
          size="lg"
          className="min-w-[200px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Inventory'
          )}
        </Button>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        emptyFields={pendingEmptyFields}
        isSubmitting={isSubmitting}
      />
    </div>
  )
} 