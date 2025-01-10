'use client'

import { useEffect } from 'react'
import { useFormContext } from '../context/form-context'
import { CustomerDetails } from '../customer-details'
import { PackageSelector } from '../package-selector'
import { PackageInfoCard } from '@/components/package-usage/package-info-card'
import { mutate } from 'swr'

const PACKAGE_TYPES = ['Package', 'Coaching (Boss)', 'Coaching (Boss - Ratchavin)']

export function CustomerStep() {
  const { 
    formData, 
    setFormValue, 
    errors,
    handleCustomerSelect,
    handlePackageSelection,
    isSubmitting,
    customers 
  } = useFormContext();

  useEffect(() => {
    mutate('/api/customers')
  }, [])

  const showPackageSelector = !formData.isNewCustomer && 
    formData.customerName && 
    PACKAGE_TYPES.includes(formData.bookingType!)

  return (
    <div className="space-y-6">
      <CustomerDetails
        isNewCustomer={formData.isNewCustomer!}
        customers={customers}
        selectedCustomerId={formData.customerId || ''}
        onCustomerSelect={handleCustomerSelect}
        customerName={formData.customerName || ''}
        onCustomerNameChange={(value) => setFormValue('customerName', value)}
        phoneNumber={formData.customerPhone || ''}
        onPhoneNumberChange={(value) => setFormValue('customerPhone', value)}
        error={{
          customer: errors.customerId,
          customerName: errors.customerName,
          phoneNumber: errors.customerPhone,
        }}
      />

      {showPackageSelector && (
        <div className="space-y-2">
          <PackageSelector
            customerName={formData.customerName}
            customerPhone={formData.customerPhone}
            value={formData.packageId || ''}
            onChange={handlePackageSelection}
            error={errors.packageId}
          />
          {formData.packageId && formData.packageId !== '' && (
            <PackageInfoCard packageId={formData.packageId} isLoading={isSubmitting} />
          )}
        </div>
      )}
    </div>
  );
}