'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700 text-white'
        }
      case 'warning':
        return {
          icon: 'text-yellow-600',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        }
      case 'info':
        return {
          icon: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700 text-white'
        }
      default:
        return {
          icon: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700 text-white'
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
        <div className="p-6">
          {/* Icon and Title */}
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-2 rounded-full bg-slate-100`}>
              <AlertTriangle className={`h-6 w-6 ${styles.icon}`} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          </div>

          {/* Message */}
          <p className="text-slate-600 mb-6">{message}</p>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 ${styles.button}`}
            >
              {loading ? 'Processing...' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}