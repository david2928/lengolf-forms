'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepNavigationProps {
  currentStep: number
  totalSteps: number
  onNext: () => void
  onPrevious: () => void
  onSave?: () => void
  canProgress: boolean
  isSubmitting?: boolean
  className?: string
}

export function StepNavigation({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSave,
  canProgress,
  isSubmitting,
  className
}: StepNavigationProps) {
  return (
    <div className={cn("flex items-center justify-between pt-6", className)}>
      <div className="flex-1">
        {currentStep > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
        )}
      </div>

      {onSave && (
        <Button
          type="button"
          variant="outline"
          onClick={onSave}
          disabled={isSubmitting}
          className="mx-2"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Progress
        </Button>
      )}

      <div className="flex-1 flex justify-end">
        <Button
          type="button"
          onClick={onNext}
          disabled={!canProgress || isSubmitting}
          className="flex items-center gap-2"
        >
          {currentStep === totalSteps ? (
            isSubmitting ? 'Creating Booking...' : 'Create Booking'
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}