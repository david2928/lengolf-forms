'use client'

import { useFormContext } from '../context/form-context'
import { EmployeeSelector } from '../employee-selector'
import { BookingTypeSelector, ContactMethodSelector, CustomerTypeSelector } from '../selectors'

export function BookingStep() {
  const { formData, setFormValue, errors } = useFormContext();

  return (
    <div className="space-y-6">
      <EmployeeSelector 
        value={formData.employeeName || null}
        onChange={(value) => setFormValue('employeeName', value)}
        error={errors.employeeName}
      />
      <ContactMethodSelector
        value={formData.customerContactedVia || null}
        onChange={(value) => setFormValue('customerContactedVia', value)}
        error={errors.customerContactedVia}
      />
      <BookingTypeSelector
        value={formData.bookingType || null}
        onChange={(value) => setFormValue('bookingType', value)}
        error={errors.bookingType}
      />
      <CustomerTypeSelector
        value={formData.isNewCustomer || false}
        onChange={(value) => setFormValue('isNewCustomer', value)}
        error={errors.isNewCustomer}
      />
    </div>
  );
}