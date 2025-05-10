'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { EmployeeSection } from './employee-section'
import { PackageSelector } from './package-selector'
import { PackageInfoCard } from './package-info-card'
import { HoursInput } from './hours-input'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from '@/components/ui/use-toast'
import { ConfirmationDialog } from './confirmation-dialog'
import { AcknowledgmentDialog } from './acknowledgment-dialog'
import { PackageUsageFormData, UsageFormState } from '@/types/package-usage'
import { Loader2 } from 'lucide-react'

export function UsageForm() {
  const formRef = useRef<HTMLFormElement>(null);
  
  const [formData, setFormData] = useState<PackageUsageFormData>({
    employeeName: null,
    packageId: null,
    usedHours: null,
    usedDate: new Date(),
    customerSignature: null,
  })

  const [formState, setFormState] = useState<UsageFormState>({
    isLoading: false,
    error: null,
    success: false,
  })

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [selectedPackageName, setSelectedPackageName] = useState<string | null>(null)
  const [currentPackageRemainingHours, setCurrentPackageRemainingHours] = useState<number | null>(null);
  const [currentPackageExpirationDate, setCurrentPackageExpirationDate] = useState<string | null>(null);
  const [showAcknowledgmentDialog, setShowAcknowledgmentDialog] = useState(false);

  const resetForm = () => {
    // Reset React state completely
    setFormData({
      employeeName: null,
      packageId: null,
      usedHours: null,
      usedDate: new Date(),
      customerSignature: null,
    });

    // Reset selected package name
    setSelectedPackageName(null);
    setCurrentPackageRemainingHours(null); // Reset remaining hours
    setCurrentPackageExpirationDate(null); // Reset expiration date

    // Reset the actual form element
    if (formRef.current) {
      formRef.current.reset();
    }
  }

  const validateForm = () => {
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
    return true;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormState(prev => ({ ...prev, error: null }));
    if (validateForm()) {
      setShowConfirmation(true);
    }
  }

  const handleConfirm = async (signature: string | null) => {
    // Set the signature in formData right before submitting
    // This ensures the latest signature from the dialog is used
    const updatedFormData = { ...formData, customerSignature: signature };

    setFormState({ ...formState, isLoading: true, error: null });

    try {
      const response = await fetch('/api/packages/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: updatedFormData.packageId,
          employeeName: updatedFormData.employeeName,
          usedHours: updatedFormData.usedHours,
          usedDate: updatedFormData.usedDate?.toISOString().split('T')[0],
          customerSignature: updatedFormData.customerSignature,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to record package usage');
      }

      toast({
        title: 'Success',
        description: 'Package usage has been recorded.',
      });

      // Reset form
      resetForm();
      
      setShowConfirmation(false);
      setShowAcknowledgmentDialog(true);
      
      setFormState(prev => ({ ...prev, isLoading: false, error: null, success: true }));
    } catch (error) {
      console.error('Error submitting form:', error);
      setFormState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to record package usage',
        success: false,
      });
      setShowConfirmation(false);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record package usage',
        variant: 'destructive',
      });
    }
  }

  const handleAcknowledgmentDismiss = () => {
    resetForm();
    setShowAcknowledgmentDialog(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {formState.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-400 text-red-700 rounded-lg">
          <p>{formState.error}</p>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <EmployeeSection
          key={formState.success ? 'reset' : 'employee'} // Force re-render on success
          value={formData.employeeName}
          onChange={(name) => setFormData((prev) => ({ ...prev, employeeName: name }))}
        />
        
        <PackageSelector
          key={formState.success ? 'reset' : 'package'} // Force re-render on success
          value={formData.packageId}
          onChange={(id, name) => {
            setFormData((prev) => ({ ...prev, packageId: id }));
            setSelectedPackageName(name);
            setCurrentPackageRemainingHours(null); // Reset here
            setCurrentPackageExpirationDate(null); // Reset here too
          }}
          isLoading={formState.isLoading}
        />

        {formData.packageId && (
          <PackageInfoCard 
            packageId={formData.packageId}
            isLoading={formState.isLoading}
            onDataLoaded={({ remainingHours, expiration_date }) => {
              setCurrentPackageRemainingHours(remainingHours);
              setCurrentPackageExpirationDate(expiration_date);
            }}
          />
        )}

        <HoursInput
          key={formState.success ? 'reset' : 'hours'} // Force re-render on success
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
          currentPackageRemainingHours: currentPackageRemainingHours,
          currentPackageExpirationDate: currentPackageExpirationDate,
        }}
        onConfirm={handleConfirm}
      />

      <AcknowledgmentDialog
        open={showAcknowledgmentDialog}
        onOpenChange={setShowAcknowledgmentDialog}
        title="Usage Recorded"
        description="The package usage has been successfully recorded."
        onConfirm={handleAcknowledgmentDismiss}
      />
    </div>
  )
}