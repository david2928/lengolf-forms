'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { EmployeeSection } from './employee-section'
import { PackageSelector } from './package-selector'
import { PackageInfoCard } from './package-info-card'
import { HoursInput } from './hours-input'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from '@/components/ui/use-toast'
import { ConfirmationDialog } from './confirmation-dialog'
import { PackageUsageFormData, UsageFormState } from '@/types/package-usage'
import { Loader2 } from 'lucide-react'

export function UsageForm() {
  const [formData, setFormData] = useState<PackageUsageFormData>({
    employeeName: null,
    packageId: null,
    usedHours: null,
    usedDate: null,
  })

  const [formState, setFormState] = useState<UsageFormState>({
    isLoading: false,
    error: null,
    success: false,
  })

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [selectedPackageName, setSelectedPackageName] = useState<string | null>(null)

  const validateForm = () => {
    console.log('Validating form data:', formData);
    
    if (!formData.employeeName) {
      toast({
        title: 'Validation Error',
        description: 'Please select an employee.',
        variant: 'destructive',
      })
      return false;
    }
    if (!formData.packageId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a package.',
        variant: 'destructive',
      })
      return false;
    }
    if (!formData.usedHours) {
      toast({
        title: 'Validation Error',
        description: 'Please enter valid hours.',
        variant: 'destructive',
      })
      return false;
    }
    if (!formData.usedDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select a date.',
        variant: 'destructive',
      })
      return false;
    }
    console.log('Form validation passed');
    return true;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted');
    
    if (validateForm()) {
      console.log('Opening confirmation dialog');
      setShowConfirmation(true);
    }
  }

  const handleConfirm = async () => {
    console.log('Confirming submission');
    setFormState({ ...formState, isLoading: true, error: null })
    setShowConfirmation(false)

    try {
      const response = await fetch('/api/packages/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: formData.packageId,
          employeeName: formData.employeeName,
          usedHours: formData.usedHours,
          usedDate: formData.usedDate?.toISOString().split('T')[0],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to record package usage')
      }

      toast({
        title: 'Success',
        description: 'Package usage has been recorded.',
      })

      // Reset form
      setFormData({
        employeeName: null,
        packageId: null,
        usedHours: null,
        usedDate: null,
      })
      setSelectedPackageName(null)
      setFormState({ isLoading: false, error: null, success: true })
    } catch (error) {
      console.error('Error submitting form:', error)
      setFormState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to record package usage',
        success: false,
      })
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record package usage',
        variant: 'destructive',
      })
    }
  }

  console.log('Current form state:', { formData, showConfirmation });

  return (
    <div className="w-full max-w-2xl mx-auto">
      {formState.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-400 text-red-700 rounded-lg">
          <p>{formState.error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <EmployeeSection
          value={formData.employeeName}
          onChange={(name) => setFormData((prev) => ({ ...prev, employeeName: name }))}
        />
        
        <PackageSelector
          value={formData.packageId}
          onChange={(id, name) => {
            console.log('Package selected:', { id, name });
            setFormData((prev) => ({ ...prev, packageId: id }))
            setSelectedPackageName(name)
          }}
          isLoading={formState.isLoading}
        />

        {formData.packageId && (
          <PackageInfoCard 
            packageId={formData.packageId}
            isLoading={formState.isLoading}
          />
        )}

        <HoursInput
          value={formData.usedHours}
          onChange={(hours) => setFormData((prev) => ({ ...prev, usedHours: hours }))}
          isDisabled={!formData.packageId || formState.isLoading}
        />

        <DatePicker
          value={formData.usedDate}
          onChange={(date) => setFormData((prev) => ({ ...prev, usedDate: date }))}
          label="Used Date"
          disabled={formState.isLoading}
        />

        <Button 
          type="submit"
          className="w-full"
          disabled={formState.isLoading}
        >
          {formState.isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recording...
            </>
          ) : (
            'Record Usage'
          )}
        </Button>
      </form>

      <ConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        data={{
          employeeName: formData.employeeName,
          packageName: selectedPackageName,
          usedHours: formData.usedHours,
          usedDate: formData.usedDate
        }}
        onConfirm={handleConfirm}
      />
    </div>
  )
}