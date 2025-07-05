'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { EmployeeSection } from './employee-section'
import { PackageSelector } from './package-selector'
import { PackageInfoCard } from './package-info-card'
import { HoursInput } from './hours-input'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from '@/components/ui/use-toast'
import { FullscreenSignature } from './fullscreen-signature'
import { AcknowledgmentDialog } from './acknowledgment-dialog'
import { PackageUsageFormData, UsageFormState } from '@/types/package-usage'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'

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

  const [selectedPackageName, setSelectedPackageName] = useState<string | null>(null)
  const [currentPackageRemainingHours, setCurrentPackageRemainingHours] = useState<number | null>(null);
  const [currentPackageExpirationDate, setCurrentPackageExpirationDate] = useState<string | null>(null);
  const [isPackageActivated, setIsPackageActivated] = useState<boolean>(true);
  const [showAcknowledgmentDialog, setShowAcknowledgmentDialog] = useState(false);
  const [showFullscreenSignature, setShowFullscreenSignature] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(false);

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
    setIsPackageActivated(true); // Reset activation status

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
      // Skip confirmation dialog, go directly to signature
      setShowFullscreenSignature(true);
    }
  }

  const handleSignatureSave = async (signature: string | null) => {
    setShowFullscreenSignature(false);
    
    if (!signature) {
      toast({
        title: 'Signature Required',
        description: 'Please provide a customer signature to continue.',
        variant: 'destructive',
      })
      return;
    }

    // Set the signature and submit immediately
    const updatedFormData = { ...formData, customerSignature: signature };
    setPendingSubmission(true);
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

      const result = await response.json();

      toast({
        title: 'Success',
        description: 'Package usage recorded successfully!',
      });

      // Reset form
      resetForm();
      
      setShowAcknowledgmentDialog(true);
      
      setFormState(prev => ({ ...prev, isLoading: false, error: null, success: true }));
    } catch (error) {
      console.error('Error submitting form:', error);
      setFormState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to record package usage',
        success: false,
      });
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record package usage',
        variant: 'destructive',
      });
    } finally {
      setPendingSubmission(false);
    }
  }

  const handleSignatureCancel = () => {
    setShowFullscreenSignature(false);
    // Don't reset form, just return to form state
  }

  const handleAcknowledgmentDismiss = () => {
    resetForm();
    setShowAcknowledgmentDialog(false);
  };

  // Parse package name for fullscreen signature
  const packageParts = selectedPackageName?.split(' - ') || [];
  const customerInfo = packageParts[0] || 'Unknown Customer';
  const packageType = packageParts[1] || 'Unknown Package';

  return (
    <>
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
              onDataLoaded={({ remainingHours, expiration_date, isActivated }) => {
                setCurrentPackageRemainingHours(remainingHours);
                setCurrentPackageExpirationDate(expiration_date);
                setIsPackageActivated(isActivated);
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
            disabled={formState.isLoading || pendingSubmission || !isPackageActivated}
          >
            {formState.isLoading || pendingSubmission ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : !isPackageActivated ? (
              'Package Must Be Activated First'
            ) : (
              'Record Usage & Get Signature'
            )}
          </Button>
        </form>

        <AcknowledgmentDialog
          open={showAcknowledgmentDialog}
          onOpenChange={setShowAcknowledgmentDialog}
          title="Usage Recorded"
          description="The package usage has been successfully recorded with customer signature."
          onConfirm={handleAcknowledgmentDismiss}
        />
      </div>

      {/* Fullscreen Signature Component */}
      <FullscreenSignature
        isOpen={showFullscreenSignature}
        customerName={customerInfo}
        packageType={packageType}
        usedHours={formData.usedHours || 0}
        onSave={handleSignatureSave}
        onCancel={handleSignatureCancel}
      />
    </>
  )
}