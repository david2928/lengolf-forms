/**
 * Booking Extras Form Component
 * Handles package selection, booking type, referral source
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, FileText, Tag, UserCheck } from 'lucide-react';
import { EditPackageSelector } from '@/components/booking-form/selectors/edit-package-selector';
import { SimpleBookingTypeSelector } from '@/components/booking-form/selectors/simple-booking-type-selector';
import { SimpleReferralSourceSelector } from '@/components/booking-form/selectors/simple-referral-source-selector';
import { EMPLOYEES_LIST } from '../utils/constants';
import type { EditBookingFormData } from '../utils/types';

interface BookingExtrasFormProps {
  formData: Partial<EditBookingFormData>;
  updateFormField: <K extends keyof EditBookingFormData>(
    field: K,
    value: EditBookingFormData[K]
  ) => void;
  displayPackageName: string | null;
  isLoadingPackage: boolean;
}

export function BookingExtrasForm({
  formData,
  updateFormField,
  displayPackageName,
  isLoadingPackage
}: BookingExtrasFormProps) {
  return (
    <div className="space-y-6">
      {/* Package Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Package (Optional)
        </Label>
        <EditPackageSelector
          value={formData.package_id || null}
          customerName={''} // TODO: Get from booking data
          customerPhone={''} // TODO: Get from booking data
          onChange={(packageId: string | null, packageName?: string | null) => {
            updateFormField('package_id', packageId);
            updateFormField('package_name', packageName || null);
          }}
        />
        {displayPackageName && (
          <p className="text-sm text-gray-600">
            Selected: {displayPackageName}
          </p>
        )}
      </div>

      {/* Booking Type */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Booking Type *
        </Label>
        <SimpleBookingTypeSelector
          value={formData.booking_type || ''}
          onChange={(type: string) => updateFormField('booking_type', type)}
        />
      </div>

      {/* Referral Source */}
      <div className="space-y-2">
        <Label>Referral Source (Optional)</Label>
        <SimpleReferralSourceSelector
          value={formData.referral_source || ''}
          onChange={(source: string) => updateFormField('referral_source', source)}
        />
      </div>

      {/* Employee Name */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          Updated By
        </Label>
        <Select
          value={formData.employee_name || ''}
          onValueChange={(value) => updateFormField('employee_name', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select staff member" />
          </SelectTrigger>
          <SelectContent>
            {EMPLOYEES_LIST.map((employee) => (
              <SelectItem key={employee.value} value={employee.value}>
                {employee.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Customer Notes */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Customer Notes
        </Label>
        <Textarea
          placeholder="Add any special notes or requests..."
          value={formData.customer_notes || ''}
          onChange={(e) => updateFormField('customer_notes', e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}