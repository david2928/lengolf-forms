/**
 * Booking Details Form Component
 * Handles core booking information: date, time, bay, duration
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users, RefreshCw } from 'lucide-react';
import type { EditBookingFormData } from '../utils/types';
import { BAY_OPTIONS } from '../utils/constants';
import { AvailabilityIndicator } from '../shared/AvailabilityIndicator';
import { BayAvailabilityGrid } from '../shared/BayAvailabilityGrid';
import { OverwriteControls } from '../shared/OverwriteControls';

interface BookingDetailsFormProps {
  formData: Partial<EditBookingFormData>;
  updateFormField: <K extends keyof EditBookingFormData>(
    field: K,
    value: EditBookingFormData[K]
  ) => void;
  availabilityStatus: string;
  isSlotAvailable: boolean;
  allowOverwrite: boolean;
  setAllowOverwrite: (allow: boolean) => void;
  bayAvailabilityData: Array<{ name: string; apiName: string; isAvailable: boolean }>;
  isCheckingAllBays: boolean;
  onCheckAllBayAvailability: () => void;
}

export function BookingDetailsForm({
  formData,
  updateFormField,
  availabilityStatus,
  isSlotAvailable,
  allowOverwrite,
  setAllowOverwrite,
  bayAvailabilityData,
  isCheckingAllBays,
  onCheckAllBayAvailability
}: BookingDetailsFormProps) {
  const durationOptions = [
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 150, label: '2.5 hours' },
    { value: 180, label: '3 hours' },
    { value: 210, label: '3.5 hours' },
    { value: 240, label: '4 hours' },
    { value: 300, label: '5 hours' },
    { value: 360, label: '6 hours' }
  ];

  return (
    <div className="space-y-6">
      {/* Date and Time Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date *
          </Label>
          <DatePicker
            value={formData.date || null}
            onChange={(date: Date | null) => date && updateFormField('date', date)}
            disabled={false}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Start Time *
          </Label>
          <Input
            type="time"
            value={formData.start_time || ''}
            onChange={(e) => updateFormField('start_time', e.target.value)}
            required
          />
        </div>
      </div>

      {/* Bay and Duration Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Bay *
          </Label>
          <Select
            value={formData.bay || ''}
            onValueChange={(value) => updateFormField('bay', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a bay" />
            </SelectTrigger>
            <SelectContent>
              {BAY_OPTIONS.map((bay) => (
                <SelectItem key={bay} value={bay}>
                  {bay}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Duration *
          </Label>
          <Select
            value={formData.duration?.toString() || ''}
            onValueChange={(value) => updateFormField('duration', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {durationOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Number of People */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Number of People *
        </Label>
        <Input
          type="number"
          min="1"
          max="8"
          value={formData.number_of_people || ''}
          onChange={(e) => updateFormField('number_of_people', parseInt(e.target.value))}
          className="w-full md:w-32"
        />
      </div>

      {/* Availability Status */}
      {formData.date && formData.start_time && formData.bay && formData.duration && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <AvailabilityIndicator
              status={availabilityStatus as any}
              isSlotAvailable={isSlotAvailable}
              allowOverwrite={allowOverwrite}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCheckAllBayAvailability}
              disabled={isCheckingAllBays}
              className="gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isCheckingAllBays ? 'animate-spin' : ''}`} />
              Check All Bays
            </Button>
          </div>

          {/* Bay Availability Grid */}
          <BayAvailabilityGrid
            bayAvailabilityData={bayAvailabilityData}
            isCheckingAllBays={isCheckingAllBays}
            selectedBay={formData.bay || ''}
            onBaySelect={(bay) => updateFormField('bay', bay)}
            onRefresh={onCheckAllBayAvailability}
            showRefreshButton={false}
          />

          {/* Overwrite Controls */}
          <OverwriteControls
            allowOverwrite={allowOverwrite}
            onAllowOverwriteChange={setAllowOverwrite}
            isSlotAvailable={isSlotAvailable}
            availabilityStatus={availabilityStatus}
          />
        </div>
      )}
    </div>
  );
}