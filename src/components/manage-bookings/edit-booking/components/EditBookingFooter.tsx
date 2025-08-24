/**
 * Edit Booking Footer Component
 * Footer with action buttons for saving/canceling
 */

import React from 'react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Save, X } from 'lucide-react';

interface EditBookingFooterProps {
  isSubmitting: boolean;
  onSave: () => void;
  onCancel: () => void;
  canSave: boolean;
}

export function EditBookingFooter({
  isSubmitting,
  onSave,
  onCancel,
  canSave
}: EditBookingFooterProps) {
  return (
    <DialogFooter className="gap-2 pt-4 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
        className="gap-2"
      >
        <X className="h-4 w-4" />
        Cancel
      </Button>
      <Button
        type="button"
        onClick={onSave}
        disabled={isSubmitting || !canSave}
        className="gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Update Booking
          </>
        )}
      </Button>
    </DialogFooter>
  );
}