'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Clock, FileText, User, Calendar, RotateCcw } from 'lucide-react'

interface Staff {
  id: number
  staff_name: string
}

interface Schedule {
  id?: string
  staff_id: number
  schedule_date: string
  start_time: string
  end_time: string
  notes?: string
}

interface BulkSchedule {
  staff_id: number
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  days_of_week: number[] // 0 = Sunday, 1 = Monday, etc.
  notes?: string
}

interface ScheduleFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (schedule: Schedule | BulkSchedule) => Promise<void>
  schedule?: Schedule | null
  title?: string
  allowBulk?: boolean
}

export function ScheduleForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  schedule,
  title = 'Add Schedule',
  allowBulk = false
}: ScheduleFormProps) {
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false)
  const [formData, setFormData] = useState<Schedule>({
    staff_id: 0,
    schedule_date: '',
    start_time: '',
    end_time: '',
    notes: ''
  })
  const [bulkData, setBulkData] = useState<BulkSchedule>({
    staff_id: 0,
    start_date: '',
    end_date: '2025-12-31',
    start_time: '',
    end_time: '',
    days_of_week: [],
    notes: ''
  })
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [staffLoading, setStaffLoading] = useState(true)

  // Fetch staff list
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch('/api/admin/staff-scheduling/staff')
        const data = await response.json()
        
        if (data.success) {
          setStaff(data.data)
        } else {
          setError('Failed to load staff list')
        }
      } catch (err) {
        setError('Failed to load staff list')
      } finally {
        setStaffLoading(false)
      }
    }

    if (isOpen) {
      fetchStaff()
    }
  }, [isOpen])

  // Initialize form data when schedule prop changes
  useEffect(() => {
    if (schedule) {
      setFormData({
        staff_id: schedule.staff_id,
        schedule_date: schedule.schedule_date,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        notes: schedule.notes || ''
      })
      setIsBulkMode(false)
    } else {
      // Reset form for new schedule
      setFormData({
        staff_id: 0,
        schedule_date: '',
        start_time: '',
        end_time: '',
        notes: ''
      })
      setBulkData({
        staff_id: 0,
        start_date: '',
        end_date: '2025-12-31',
        start_time: '',
        end_time: '',
        days_of_week: [],
        notes: ''
      })
    }
  }, [schedule])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isBulkMode) {
        // Validate bulk form
        if (!bulkData.staff_id || !bulkData.start_date || !bulkData.end_date || !bulkData.start_time || !bulkData.end_time || bulkData.days_of_week.length === 0) {
          throw new Error('Please fill in all required fields and select at least one day')
        }

        // Validate time range
        if (bulkData.start_time >= bulkData.end_time) {
          throw new Error('End time must be after start time')
        }

        await onSubmit(bulkData)
      } else {
        // Validate single form
        if (!formData.staff_id || !formData.schedule_date || !formData.start_time || !formData.end_time) {
          throw new Error('Please fill in all required fields')
        }

        // Validate time range
        if (formData.start_time >= formData.end_time) {
          throw new Error('End time must be after start time')
        }

        await onSubmit(formData)
      }
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save schedule')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof Schedule, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleMakeRecurring = () => {
    // Copy data from main form to bulk form
    setBulkData(prev => ({
      ...prev,
      staff_id: formData.staff_id,
      start_date: formData.schedule_date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      notes: formData.notes
    }))
    setIsRecurringModalOpen(true)
  }

  const handleDayToggle = (dayIndex: number) => {
    setBulkData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(dayIndex)
        ? prev.days_of_week.filter(day => day !== dayIndex)
        : [...prev.days_of_week, dayIndex]
    }))
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayFullNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const getSelectedDaysText = () => {
    if (bulkData.days_of_week.length === 0) return ''
    return bulkData.days_of_week
      .sort((a, b) => a - b)
      .map(day => dayFullNames[day])
      .join(', ')
  }

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="w-full max-w-md bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Staff Selection */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 mb-2">
              <User className="h-4 w-4" />
              <span>Staff Member *</span>
            </label>
            <select
              value={formData.staff_id}
              onChange={(e) => handleInputChange('staff_id', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading || staffLoading}
            >
              <option value={0}>Select staff member...</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.staff_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 mb-2">
              <Calendar className="h-4 w-4" />
              <span>Date *</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={formData.schedule_date}
                onChange={(e) => handleInputChange('schedule_date', e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
              {!schedule && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleMakeRecurring}
                  disabled={loading || !formData.schedule_date}
                  className="flex items-center space-x-1 whitespace-nowrap"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Make Recurring</span>
                </Button>
              )}
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 mb-2">
                <Clock className="h-4 w-4" />
                <span>Start Time *</span>
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => handleInputChange('start_time', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 mb-2">
                <Clock className="h-4 w-4" />
                <span>End Time *</span>
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => handleInputChange('end_time', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>
          </div>



          {/* Notes */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 mb-2">
              <FileText className="h-4 w-4" />
              <span>Notes</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes or instructions..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || staffLoading}
              className="flex-1"
            >
              {loading ? 'Saving...' : schedule ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>

      {/* Recurring Schedule Modal */}
      {isRecurringModalOpen && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsRecurringModalOpen(false)
            }
          }}
        >
          <div 
            className="w-full max-w-md bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Make Recurring</h2>
              <button
                onClick={() => setIsRecurringModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Recurring Form */}
            <div className="p-6 space-y-4">
              {/* Start Date */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span>Start Date *</span>
                </label>
                <input
                  type="date"
                  value={bulkData.start_date}
                  onChange={(e) => setBulkData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Repeat Every */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Repeat every
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {dayNames.map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDayToggle(index)}
                      className={`h-10 w-10 rounded-full text-sm font-medium transition-colors ${
                        bulkData.days_of_week.includes(index)
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Days Summary */}
              {bulkData.days_of_week.length > 0 && (
                <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                  Occurs every {getSelectedDaysText()} until{' '}
                  {bulkData.end_date ? new Date(bulkData.end_date).toLocaleDateString() : 'end date'}
                </div>
              )}

              {/* End Date */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span>End Date *</span>
                </label>
                <input
                  type="date"
                  value={bulkData.end_date}
                  onChange={(e) => setBulkData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRecurringModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      await onSubmit(bulkData)
                      setIsRecurringModalOpen(false)
                      onClose()
                    } catch (err: any) {
                      setError(err.message || 'Failed to create recurring schedule')
                    }
                  }}
                  disabled={bulkData.days_of_week.length === 0}
                  className="flex-1"
                >
                  Create Recurring
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}