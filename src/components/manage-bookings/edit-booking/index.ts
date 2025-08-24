/**
 * Edit Booking Modal - Backward Compatibility Exports
 * Maintains existing import patterns while providing optimized implementation
 * Following the customer modal optimization pattern
 */

// Main component export - optimized version
export { EditBookingModalOptimized as EditBookingModal } from './EditBookingModalOptimized';

// Export individual components for advanced usage
export { EditBookingHeader } from './components/EditBookingHeader';
export { EditBookingFooter } from './components/EditBookingFooter';
export { BookingDetailsForm } from './components/BookingDetailsForm';
export { BookingExtrasForm } from './components/BookingExtrasForm';

// Export shared components
export { AvailabilityIndicator } from './shared/AvailabilityIndicator';
export { BayAvailabilityGrid } from './shared/BayAvailabilityGrid';
export { FormErrorAlert } from './shared/FormErrorAlert';
export { OverwriteControls } from './shared/OverwriteControls';

// Export hooks
export { useEditBookingData } from './hooks/useEditBookingData';

// Export utilities
export * from './utils/formatters';
export * from './utils/constants';
export * from './utils/types';

// Backward compatibility - this maintains existing imports
// Any code importing from '../EditBookingModal' will get the optimized version
export { EditBookingModalOptimized as default } from './EditBookingModalOptimized';