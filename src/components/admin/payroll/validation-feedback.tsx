/**
 * Reusable validation feedback component for payroll forms
 * Story #10: Error Handling & Validation
 */

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { ValidationResult } from '@/lib/payroll-error-handling'

interface ValidationFeedbackProps {
  validation: ValidationResult | null
  showSuccessMessage?: boolean
  successMessage?: string
  className?: string
}

export function ValidationFeedback({ 
  validation, 
  showSuccessMessage = false, 
  successMessage = 'Validation passed',
  className = ''
}: ValidationFeedbackProps) {
  if (!validation) return null

  const hasErrors = validation.errors.length > 0
  const hasWarnings = validation.warnings.length > 0
  const isValid = validation.isValid

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Error Messages */}
      {hasErrors && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validation.errors.map((error, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-sm">•</span>
                  <span className="text-sm">{error}</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Warning Messages */}
      {hasWarnings && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validation.warnings.map((warning, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-sm">•</span>
                  <span className="text-sm">{warning}</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {isValid && !hasWarnings && showSuccessMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

interface ValidationBadgeProps {
  validation: ValidationResult | null
  showOnValid?: boolean
  className?: string
}

export function ValidationBadge({ 
  validation, 
  showOnValid = false, 
  className = '' 
}: ValidationBadgeProps) {
  if (!validation) return null

  const hasErrors = validation.errors.length > 0
  const hasWarnings = validation.warnings.length > 0
  const isValid = validation.isValid

  if (!hasErrors && !hasWarnings && !showOnValid) return null

  if (hasErrors) {
    return (
      <Badge variant="destructive" className={`ml-2 ${className}`}>
        {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}
      </Badge>
    )
  }

  if (hasWarnings) {
    return (
      <Badge variant="secondary" className={`ml-2 ${className}`}>
        {validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''}
      </Badge>
    )
  }

  if (isValid && showOnValid) {
    return (
      <Badge variant="outline" className={`ml-2 text-green-600 border-green-200 ${className}`}>
        Valid
      </Badge>
    )
  }

  return null
}

interface ValidationSummaryProps {
  validations: Array<{
    name: string
    validation: ValidationResult | null
  }>
  className?: string
}

export function ValidationSummary({ validations, className = '' }: ValidationSummaryProps) {
  const totalErrors = validations.reduce((sum, v) => sum + (v.validation?.errors.length || 0), 0)
  const totalWarnings = validations.reduce((sum, v) => sum + (v.validation?.warnings.length || 0), 0)
  const allValid = validations.every(v => v.validation?.isValid !== false)

  if (totalErrors === 0 && totalWarnings === 0 && allValid) {
    return (
      <Alert className={`border-green-200 bg-green-50 ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          All validations passed successfully
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {totalErrors > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold">
                {totalErrors} validation error{totalErrors !== 1 ? 's' : ''} found:
              </div>
              {validations.map((v, index) => 
                v.validation?.errors.length ? (
                  <div key={index} className="ml-4">
                    <div className="font-medium text-sm">{v.name}:</div>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      {v.validation.errors.map((error, errorIndex) => (
                        <li key={errorIndex} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {totalWarnings > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold">
                {totalWarnings} warning{totalWarnings !== 1 ? 's' : ''}:
              </div>
              {validations.map((v, index) => 
                v.validation?.warnings.length ? (
                  <div key={index} className="ml-4">
                    <div className="font-medium text-sm">{v.name}:</div>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      {v.validation.warnings.map((warning, warningIndex) => (
                        <li key={warningIndex} className="text-sm">{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

interface RetryButtonProps {
  onRetry: () => void
  isRetrying: boolean
  retryCount?: number
  maxRetries?: number
  className?: string
}

export function RetryButton({ 
  onRetry, 
  isRetrying, 
  retryCount = 0, 
  maxRetries = 3,
  className = ''
}: RetryButtonProps) {
  const canRetry = retryCount < maxRetries

  if (!canRetry) return null

  return (
    <button
      onClick={onRetry}
      disabled={isRetrying}
      className={`inline-flex items-center gap-2 px-3 py-1 text-sm bg-blue-50 border border-blue-200 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isRetrying ? (
        <>
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
          Retrying...
        </>
      ) : (
        <>
          <AlertTriangle className="h-3 w-3" />
          Retry ({retryCount + 1}/{maxRetries})
        </>
      )}
    </button>
  )
}

interface ErrorDisplayProps {
  error: {
    message: string
    code?: string
    details?: string
    retryable?: boolean
  }
  onRetry?: () => void
  isRetrying?: boolean
  className?: string
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  isRetrying = false,
  className = '' 
}: ErrorDisplayProps) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <div className="font-semibold">{error.message}</div>
          {error.details && (
            <div className="text-sm opacity-90">{error.details}</div>
          )}
          {error.code && (
            <div className="text-xs opacity-75">Error Code: {error.code}</div>
          )}
          {error.retryable && onRetry && (
            <div className="pt-2">
              <RetryButton 
                onRetry={onRetry} 
                isRetrying={isRetrying}
                className="text-xs"
              />
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
} 