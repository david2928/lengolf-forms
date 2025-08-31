'use client'

import { useFormContext } from '../../booking-form/context/form-context'
import { useStepContext } from '../../booking-form/navigation/step-context'
import { useEffect, useState, useMemo } from 'react'
import { PaxSelector } from '../../booking-form/pax-selector'
import { TimeSelector } from '../../booking-form/time-selector'
import { BookingTimeSelector } from '../../booking-form/booking-time-selector'
import { ManualTimeInput } from '../../booking-form/manual-time-input'
import { TimeSlots } from '../../booking-form/time-slots'
import { BaySelector } from '../../booking-form/bay-selector'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { addHours, addMinutes, format, differenceInMinutes, parse as parseDateFns } from 'date-fns'
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
  }, [formData.bookingDate, formData.numberOfPax, formData.isManualMode, formData.startTime, setFormValue]);

  useEffect(() => {
    const startTimeValid = formData.isManualMode ? 
      typeof formData.startTime === 'string' && formData.startTime.length === 5 :
      formData.startTime ? true : false;

    const hasRequiredFields = formData.numberOfPax && 
                            formData.bookingDate && 
                            formData.bayNumber &&
                            startTimeValid &&
                            (formData.isManualMode ? formData.duration && formData.duration > 0 : formData.endTime ? true : false);

    setCanProgress(!!hasRequiredFields);
  }, [formData.bookingDate, formData.numberOfPax, formData.startTime, formData.bayNumber, formData.isManualMode, formData.duration, formData.endTime, setCanProgress]);

  // Ensure bookingDate is always a Date
  const bookingDate = useMemo(() => formData.bookingDate || new Date(), [formData.bookingDate]);

  // Effect to synchronize duration with startTime and endTime
  useEffect(() => {
    if (formData.isManualMode) return; // In manual mode, duration is set directly

    if (formData.startTime && formData.endTime) {
      let startDateTime: Date | null = null;
      let endDateTime: Date | null = null;

      if (formData.startTime instanceof Date) {
        startDateTime = formData.startTime;
      } else if (typeof formData.startTime === 'string') {
        try {
          startDateTime = parseDateFns(formData.startTime, 'HH:mm', bookingDate);
        } catch (e) { console.error("Error parsing startTime string:", e); }
      }

      if (formData.endTime instanceof Date) {
        endDateTime = formData.endTime;
      } else if (typeof formData.endTime === 'string') {
        try {
          endDateTime = parseDateFns(formData.endTime, 'HH:mm', bookingDate);
        } catch (e) { console.error("Error parsing endTime string:", e); }
      }
      
      // Ensure dates are on the same day as bookingDate for correct comparison / diff
      if (startDateTime) {
        startDateTime.setFullYear(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
      }
      if (endDateTime) {
        endDateTime.setFullYear(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
      }

      if (startDateTime && endDateTime && endDateTime > startDateTime) {
        const durationInMinutes = differenceInMinutes(endDateTime, startDateTime);
        if (formData.duration !== durationInMinutes) {
          setFormValue('duration', durationInMinutes);
        }
      } else if (startDateTime && !endDateTime && !formData.isManualMode) {
        // If only startTime is set (e.g. from BookingTimeSelector) and not manual mode, default to 1hr duration
        // This provides an initial valid state before TimeSlots might be used.
        const defaultEndTime = addHours(startDateTime, 1);
        setFormValue('endTime', defaultEndTime);
        setFormValue('duration', 60);
      }
    }
  // Listen to bookingDate as well, because HH:mm strings for startTime/endTime are relative to it.
  }, [formData.startTime, formData.endTime, formData.isManualMode, bookingDate, setFormValue, formData.duration]);

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
              const initialEndTime = addHours(time, 1);
              setFormValue('endTime', initialEndTime);
            }}
            error={errors.startTime}
          />
          {formData.startTime && (
            <TimeSlots
              startTime={formData.startTime instanceof Date ? formData.startTime : parseDateFns(formData.startTime, 'HH:mm', bookingDate) }
              endTime={formData.endTime instanceof Date ? formData.endTime : formData.endTime ? parseDateFns(formData.endTime, 'HH:mm', bookingDate) : null}
              onEndTimeSelect={(time) => {
                setFormValue('endTime', time);
              }}
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