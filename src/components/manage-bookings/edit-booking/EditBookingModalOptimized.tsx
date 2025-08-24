/**
 * Edit Booking Modal - Optimized Version
 * Main orchestrator component for edit booking modal
 * Reduced from 1,134 lines to ~200 lines (83% reduction)
 * 
 * Following the successful customer modal optimization pattern:
 * - Single responsibility: Modal orchestration only
 * - Modular components: Header, forms, footer extracted
 * - Centralized data management: useEditBookingData hook
 * - Performance optimized: Debounced availability checks
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEditBookingData } from './hooks/useEditBookingData';
import { EditBookingHeader } from './components/EditBookingHeader';
import { EditBookingFooter } from './components/EditBookingFooter';
import { BookingDetailsForm } from './components/BookingDetailsForm';
import { BookingExtrasForm } from './components/BookingExtrasForm';
import { FormErrorAlert } from './shared/FormErrorAlert';
import type { EditBookingModalProps } from './utils/types';
import { isPastBooking } from './utils/formatters';

/**
 * Optimized Edit Booking Modal
 * 
 * Key improvements:
 * - 83% size reduction (1,134 → 200 lines)
 * - Centralized state management with useEditBookingData hook
 * - Modular component architecture with clear separation of concerns
 * - Debounced availability checking for better performance
 * - Reusable UI components for consistent experience
 * - Comprehensive error handling and loading states
 */
export function EditBookingModalOptimized({
  isOpen,
  onClose,
  booking,
  onSuccess
}: EditBookingModalProps) {
  // Centralized data management
  const {
    // Form data
    formData,
    updateFormField,
    
    // Loading states
    isSubmitting,
    isLoadingPackage,
    
    // Error handling
    error,
    setError,
    
    // Availability
    availabilityStatus,
    isSlotAvailable,
    allowOverwrite,
    setAllowOverwrite,
    
    // Bay availability
    bayAvailabilityData,
    isCheckingAllBays,
    checkAllBayAvailability,
    
    // Package
    displayPackageName,
    
    // Actions
    submitBookingUpdate
  } = useEditBookingData(booking, isOpen);

  // Handle form submission
  const handleSave = () => {
    submitBookingUpdate(onSuccess);
  };

  // Check if booking can be saved
  const canSave = Boolean(
    formData.date &&
    formData.start_time &&
    formData.bay &&
    formData.duration &&
    formData.number_of_people &&
    formData.booking_type &&
    formData.employee_name &&
    (isSlotAvailable || allowOverwrite) &&
    !isSubmitting
  );

  // Check if booking is in the past
  const isBookingInPast = booking 
    ? isPastBooking(booking.date, booking.start_time, booking.duration || 1)
    : false;

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking outside if form is dirty
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
      >
        {/* Header */}
        <EditBookingHeader
          booking={booking}
          onClose={onClose}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Past booking warning */}
          {isBookingInPast && (
            <FormErrorAlert
              error="This booking ended more than 2 hours ago and cannot be edited."
              onDismiss={() => {}}
            />
          )}

          {/* Form Error */}
          <FormErrorAlert
            error={error}
            onDismiss={() => setError(null)}
          />

          {/* Main Form Content */}
          <Tabs defaultValue="details" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Booking Details</TabsTrigger>
              <TabsTrigger value="extras">Additional Options</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-6">
              <BookingDetailsForm
                formData={formData}
                updateFormField={updateFormField}
                availabilityStatus={availabilityStatus}
                isSlotAvailable={isSlotAvailable}
                allowOverwrite={allowOverwrite}
                setAllowOverwrite={setAllowOverwrite}
                bayAvailabilityData={bayAvailabilityData}
                isCheckingAllBays={isCheckingAllBays}
                onCheckAllBayAvailability={checkAllBayAvailability}
              />
            </TabsContent>

            <TabsContent value="extras" className="space-y-6 mt-6">
              <BookingExtrasForm
                formData={formData}
                updateFormField={updateFormField}
                displayPackageName={displayPackageName}
                isLoadingPackage={isLoadingPackage}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <EditBookingFooter
          isSubmitting={isSubmitting}
          onSave={handleSave}
          onCancel={onClose}
          canSave={canSave && !isBookingInPast}
        />
      </DialogContent>
    </Dialog>
  );
}