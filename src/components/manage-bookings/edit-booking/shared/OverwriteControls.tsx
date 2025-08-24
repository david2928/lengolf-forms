/**
 * Overwrite Controls Component
 * Controls for allowing booking overwrite when slot is unavailable
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface OverwriteControlsProps {
  allowOverwrite: boolean;
  onAllowOverwriteChange: (allowed: boolean) => void;
  isSlotAvailable: boolean;
  availabilityStatus: string;
}

export function OverwriteControls({
  allowOverwrite,
  onAllowOverwriteChange,
  isSlotAvailable,
  availabilityStatus
}: OverwriteControlsProps) {
  // Only show overwrite controls when slot is unavailable
  if (availabilityStatus !== 'unavailable' || isSlotAvailable) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          The selected time slot is not available. There may be a conflicting booking.
        </AlertDescription>
      </Alert>
      
      <div className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <Switch
          id="allow-overwrite"
          checked={allowOverwrite}
          onCheckedChange={onAllowOverwriteChange}
        />
        <div className="space-y-1">
          <Label
            htmlFor="allow-overwrite"
            className="text-sm font-medium text-yellow-800"
          >
            Allow overwrite
          </Label>
          <p className="text-xs text-yellow-700">
            Check this to proceed despite the conflict. This may overwrite an existing booking.
          </p>
        </div>
      </div>
    </div>
  );
}