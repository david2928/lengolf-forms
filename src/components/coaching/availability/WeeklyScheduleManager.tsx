'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Clock, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface WeeklySchedule {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

interface WeeklyScheduleManagerProps {
  coachId?: string;
}

export function WeeklyScheduleManager({ coachId }: WeeklyScheduleManagerProps) {
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  // Fetch existing weekly schedules
  const fetchSchedules = async () => {
    try {
      const url = coachId 
        ? `/api/coaching/availability/weekly-schedule?coach_id=${coachId}`
        : '/api/coaching/availability/weekly-schedule';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.weeklySchedule || []);
      } else {
        toast.error('Failed to load weekly schedule');
      }
    } catch (error) {
      console.error('Error fetching weekly schedules:', error);
      toast.error('Error loading weekly schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [coachId]);

  // Get schedule for a specific day
  const getScheduleForDay = (dayOfWeek: number): WeeklySchedule => {
    const existing = schedules.find(s => s.day_of_week === dayOfWeek);
    return existing || {
      day_of_week: dayOfWeek,
      start_time: '10:00',
      end_time: '17:00',
      is_available: false
    };
  };

  // Save schedule for a specific day
  const saveSchedule = async (dayOfWeek: number, schedule: Omit<WeeklySchedule, 'id'>) => {
    setSaving(dayOfWeek);
    try {
      const response = await fetch('/api/coaching/availability/weekly-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coachId,
          dayOfWeek: schedule.day_of_week,
          startTime: schedule.start_time,
          endTime: schedule.end_time,
          isAvailable: schedule.is_available,
        }),
      });

      if (response.ok) {
        toast.success(`${DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label} schedule saved`);
        await fetchSchedules(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save schedule');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Error saving schedule');
    } finally {
      setSaving(null);
    }
  };

  // Delete schedule for a specific day
  const deleteSchedule = async (dayOfWeek: number) => {
    setSaving(dayOfWeek);
    try {
      const url = coachId 
        ? `/api/coaching/availability/weekly-schedule?day_of_week=${dayOfWeek}&coach_id=${coachId}`
        : `/api/coaching/availability/weekly-schedule?day_of_week=${dayOfWeek}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`${DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label} schedule cleared`);
        await fetchSchedules(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete schedule');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Error deleting schedule');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p>Loading weekly schedule...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {DAYS_OF_WEEK.map((day) => {
        const schedule = getScheduleForDay(day.value);
        
        return (
          <WeeklyScheduleRow
            key={day.value}
            day={day}
            schedule={schedule}
            onSave={(updatedSchedule) => saveSchedule(day.value, updatedSchedule)}
            onDelete={() => deleteSchedule(day.value)}
            isSaving={saving === day.value}
          />
        );
      })}
    </div>
  );
}

interface WeeklyScheduleRowProps {
  day: { value: number; label: string };
  schedule: WeeklySchedule;
  onSave: (schedule: Omit<WeeklySchedule, 'id'>) => void;
  onDelete: () => void;
  isSaving: boolean;
}

function WeeklyScheduleRow({ day, schedule, onSave, onDelete, isSaving }: WeeklyScheduleRowProps) {
  const [localSchedule, setLocalSchedule] = useState(schedule);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local schedule when prop changes
  useEffect(() => {
    setLocalSchedule(schedule);
    setHasChanges(false);
  }, [schedule]);

  const handleSave = () => {
    // Validate time range (10:00 to 21:00)
    if (localSchedule.start_time < '10:00') {
      toast.error('Start time cannot be earlier than 10:00 AM');
      return;
    }
    if (localSchedule.end_time > '21:00') {
      toast.error('End time cannot be later than 9:00 PM');
      return;
    }
    if (localSchedule.start_time >= localSchedule.end_time) {
      toast.error('End time must be after start time');
      return;
    }
    onSave(localSchedule);
  };

  // Check if there are unsaved changes and auto-save
  useEffect(() => {
    const changed = 
      localSchedule.start_time !== schedule.start_time ||
      localSchedule.end_time !== schedule.end_time ||
      localSchedule.is_available !== schedule.is_available;
    setHasChanges(changed);

    // Auto-save after a delay if there are changes
    if (changed) {
      const timeoutId = setTimeout(() => {
        handleSave();
      }, 1000); // Save after 1 second of no changes

      return () => clearTimeout(timeoutId);
    }
  }, [localSchedule, schedule, handleSave]);

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-24">
            <span className="font-medium text-gray-900">{day.label}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={localSchedule.is_available}
              onCheckedChange={(checked) => 
                setLocalSchedule(prev => ({ ...prev, is_available: checked }))
              }
              disabled={isSaving}
            />
            <span className="text-sm text-gray-600">
              {localSchedule.is_available ? 'Available' : 'Unavailable'}
            </span>
          </div>
          
          {localSchedule.is_available && (
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <Input
                type="time"
                value={localSchedule.start_time}
                onChange={(e) => 
                  setLocalSchedule(prev => ({ ...prev, start_time: e.target.value }))
                }
                className="w-24"
                disabled={isSaving}
                min="10:00"
                max="21:00"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="time"
                value={localSchedule.end_time}
                onChange={(e) => 
                  setLocalSchedule(prev => ({ ...prev, end_time: e.target.value }))
                }
                className="w-24"
                disabled={isSaving}
                min="10:00"
                max="21:00"
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Button
              onClick={handleSave}
              size="sm"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          )}
          
          {schedule.id && (
            <Button
              onClick={onDelete}
              variant="outline"
              size="sm"
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}