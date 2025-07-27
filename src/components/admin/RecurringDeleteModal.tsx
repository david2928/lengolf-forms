'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Calendar, RotateCcw, Trash2 } from 'lucide-react'

interface RecurringDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onDeleteSingle: () => void
  onDeleteSeries: () => void
  scheduleDate: string
  staffName: string
}

export function RecurringDeleteModal({
  isOpen,
  onClose,
  onDeleteSingle,
  onDeleteSeries,
  scheduleDate,
  staffName
}: RecurringDeleteModalProps) {
  const [selectedOption, setSelectedOption] = useState<'single' | 'series' | null>(null)

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleContinue = () => {
    if (selectedOption === 'single') {
      onDeleteSingle()
    } else if (selectedOption === 'series') {
      onDeleteSeries()
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="w-full max-w-md bg-white rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Delete Recurring Schedule</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-sm text-slate-600 mb-4">
            You're deleting a recurring schedule for <strong>{staffName}</strong> on{' '}
            <strong>{formatDate(scheduleDate)}</strong>. How would you like to proceed?
          </div>

          {/* Option 1: Delete Single Occurrence */}
          <label 
            className={`border rounded-lg p-4 cursor-pointer transition-colors block ${
              selectedOption === 'single' 
                ? 'border-red-500 bg-red-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <input
                  type="radio"
                  name="delete-option"
                  value="single"
                  checked={selectedOption === 'single'}
                  onChange={() => setSelectedOption('single')}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-slate-300"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-slate-900">Delete this occurrence only</span>
                </div>
                <p className="text-sm text-slate-600">
                  Only this specific date will be deleted. Other dates in the recurring series will remain unchanged.
                </p>
              </div>
            </div>
          </label>

          {/* Option 2: Delete Entire Series */}
          <label 
            className={`border rounded-lg p-4 cursor-pointer transition-colors block ${
              selectedOption === 'series' 
                ? 'border-red-500 bg-red-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <input
                  type="radio"
                  name="delete-option"
                  value="series"
                  checked={selectedOption === 'series'}
                  onChange={() => setSelectedOption('series')}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-slate-300"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <RotateCcw className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-slate-900">Delete entire recurring series</span>
                </div>
                <p className="text-sm text-slate-600">
                  All future dates in this recurring series will be deleted. Past occurrences will not be affected.
                </p>
              </div>
            </div>
          </label>

          {/* Warning for series delete */}
          {selectedOption === 'series' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div className="text-sm text-red-800">
                  <strong>Warning:</strong> This will permanently delete all future occurrences of this recurring schedule. 
                  This action cannot be undone.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3 p-6 pt-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={!selectedOption}
            variant="destructive"
            className="flex-1"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}