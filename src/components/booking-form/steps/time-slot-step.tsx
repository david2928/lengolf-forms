'use client'

import { useFormContext } from '../context/form-context'
import { useStepContext } from '../navigation/step-context'
import { useEffect, useState } from 'react'
import { PaxSelector } from '../pax-selector'
import { TimeSelector } from '../time-selector'
import { BookingTimeSelector } from '../booking-time-selector'
import { ManualTimeInput } from '../manual-time-input'
import { TimeSlots } from '../time-slots'
import { BaySelector } from '../bay-selector'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { addHours, addMinutes, format } from 'date-fns'
import { DateTime } from 'luxon'

export function TimeSlotStep() {
  const { formData, setFormValue, errors } = useFormContext();
  const { setCanProgress } = useStepContext();

  useEffect(() => {
    if (!formData.bookingDate) setFormValue('bookingDate', new Date());
    if (formData.numberOfPax === undefined) setFormValue('numberOfPax', 1);
    if (formData.isManualMode === undefined) setFormValue('isManualMode', false);
    if (formData.isManualMode && !formData.startTime) {
      const now = new Date();
      setFormValue('startTime', format(now, 'HH:mm'));
      setFormValue('duration', 60);
      setFormValue('endTime', format(addMinutes(now, 60), 'HH:mm'));
    }
  }, [formData.isManualMode]);

  useEffect(() => {
    const startTimeValid = formData.isManualMode ? 
      typeof formData.startTime === 'string' && formData.startTime.length === 5 :
      formData.startTime instanceof Date;

    const hasRequiredFields = formData.numberOfPax && 
                            formData.bookingDate && 
                            formData.bayNumber &&
                            startTimeValid &&
                            (formData.isManualMode ? formData.duration : true);

    setCanProgress(!!hasRequiredFields);
  }, [formData, setCanProgress]);

  // Ensure bookingDate is always a Date
  const bookingDate = formData.bookingDate || new Date();

  const handleTimeSelect = (startTime: string, endTime: string) => {
    setFormValue('startTime', startTime);
    setFormValue('endTime', endTime);
  };

  const convertToDateTime = (timeString: string | null) => {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':');
    const date = new Date(bookingDate);
    date.setHours(parseInt(hours), parseInt(minutes));
    return date;
  };

  return (
    <div className="space-y-6">
      <PaxSelector
        value={formData.numberOfPax}
        onChange={(value) => setFormValue('numberOfPax', value)}
        error={errors.numberOfPax}
      />

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.isManualMode}
          onCheckedChange={(checked) => {
            setFormValue('isManualMode', checked);
            if (checked) {
              const now = new Date();
              setFormValue('startTime', format(now, 'HH:mm'));
              setFormValue('duration', 60);
              setFormValue('endTime', format(addMinutes(now, 60), 'HH:mm'));
            } else {
              setFormValue('startTime', null);
              setFormValue('endTime', null);
              setFormValue('duration', undefined);
            }
          }}
        />
        <Label className="text-sm font-medium">Manual Time Entry</Label>
      </div>

      <TimeSelector
        date={bookingDate}
        onDateSelect={(date) => {
          if (date) {
            setFormValue('bookingDate', date);
          }
        }}
        error={{ date: errors.bookingDate }}
      />

      {!formData.isManualMode ? (
        <>
          <BookingTimeSelector
            selectedDate={bookingDate}
            selectedTime={typeof formData.startTime === 'string' ? null : formData.startTime}
            onTimeSelect={(time) => {
              setFormValue('startTime', time);
              setFormValue('endTime', addHours(time, 1));
            }}
            error={errors.startTime}
          />
          {formData.startTime && (
            <TimeSlots
              startTime={typeof formData.startTime === 'string' ? 
                (() => {
                  const [hours, minutes] = formData.startTime.split(':');
                  const date = new Date(bookingDate);
                  date.setHours(parseInt(hours), parseInt(minutes));
                  return date;
                })() : 
                formData.startTime}
              endTime={typeof formData.endTime === 'string' ? convertToDateTime(formData.endTime) : formData.endTime}
              onEndTimeSelect={(time) => setFormValue('endTime', time)}
              error={errors.endTime}
            />
          )}
        </>
      ) : (
        <ManualTimeInput
          bookingDate={bookingDate}
          startTime={typeof formData.startTime === 'string' ? formData.startTime : format(new Date(), 'HH:mm')}
          onStartTimeChange={(time) => {
            setFormValue('startTime', time);
            if (formData.duration) {
              const [hours, minutes] = time.split(':');
              const startTime = new Date();
              startTime.setHours(parseInt(hours), parseInt(minutes));
              const endTime = addMinutes(startTime, formData.duration);
              setFormValue('endTime', format(endTime, 'HH:mm'));
            }
          }}
          onDurationChange={(duration) => {
            setFormValue('duration', duration);
            if (formData.startTime && typeof formData.startTime === 'string') {
              const [hours, minutes] = formData.startTime.split(':');
              const startTime = new Date();
              startTime.setHours(parseInt(hours), parseInt(minutes));
              const endTime = addMinutes(startTime, duration);
              setFormValue('endTime', format(endTime, 'HH:mm'));
            }
          }}
          duration={formData.duration}
        />
      )}

      <BaySelector
        selectedDate={bookingDate}
        selectedBay={formData.bayNumber || null}
        selectedStartTime={typeof formData.startTime === 'string' ? formData.startTime : formData.startTime ? format(formData.startTime, 'HH:mm') : null}
        selectedEndTime={formData.endTime || null}
        onBaySelect={(bay) => setFormValue('bayNumber', bay)}
        onTimeSelect={handleTimeSelect}
        isManualMode={formData.isManualMode}
        error={{ bay: errors.bayNumber }}
      />

      <div className="space-y-2">
        <Label>Notes (Optional)</Label>
        <Textarea
          placeholder="Any special requirements or notes"
          value={formData.notes || ''}
          onChange={(e) => setFormValue('notes', e.target.value)}
        />
      </div>
    </div>
  );
}