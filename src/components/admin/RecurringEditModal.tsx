'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Calendar, RotateCcw } from 'lucide-react'

interface RecurringEditModalProps {
  isOpen: boolean
  onClose: () => void
  onEditSingle: () => void
  onEditSeries: () => void
  scheduleDate: string
  staffName: string
}

export function RecurringEditModal({
  isOpen,
  onClose,
  onEditSingle,
  onEditSeries,
  scheduleDate,
  staffName
}: RecurringEditModalProps) {
  const [selectedOption, setSelectedOption] = useState<'single' | 'series' | null>(null)

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleContinue = () => {
    if (selectedOption === 'single') {
      onEditSingle()
    } else if (selectedOption === 'series') {
      onEditSeries()
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
          <h2 className="text-lg font-semibold text-slate-900">Edit Recurring Schedule</h2>
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
            You're editing a recurring schedule for <strong>{staffName}</strong> on{' '}
            <strong>{formatDate(scheduleDate)}</strong>. How would you like to proceed?
          </div>

          {/* Option 1: Edit Single Occurrence */}
          <label 
            className={`border rounded-lg p-4 cursor-pointer transition-colors block ${
              selectedOption === 'single' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <input
                  type="radio"
                  name="edit-option"
                  value="single"
                  checked={selectedOption === 'single'}
                  onChange={() => setSelectedOption('single')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-slate-900">Edit this occurrence only</span>
                </div>
                <p className="text-sm text-slate-600">
                  Only this specific date will be changed. Other dates in the recurring series will remain unchanged.
                </p>
              </div>
            </div>
          </label>

          {/* Option 2: Edit Entire Series */}
          <label 
            className={`border rounded-lg p-4 cursor-pointer transition-colors block ${
              selectedOption === 'series' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <input
                  type="radio"
                  name="edit-option"
                  value="series"
                  checked={selectedOption === 'series'}
                  onChange={() => setSelectedOption('series')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <RotateCcw className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-slate-900">Edit entire recurring series</span>
                </div>
                <p className="text-sm text-slate-600">
                  All dates in this recurring series will be updated with the same changes.
                </p>
              </div>
            </div>
          </label>

          {/* Warning for series edit */}
          {selectedOption === 'series' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm text-amber-800">
                  <strong>Caution:</strong> This will update all future occurrences of this recurring schedule. 
                  Past occurrences will not be changed.
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
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}