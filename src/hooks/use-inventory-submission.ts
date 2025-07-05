import { useState } from 'react'
import { CreateSubmissionRequest, CreateSubmissionResponse, UseInventorySubmissionReturn } from '@/types/inventory'

export const useInventorySubmission = (): UseInventorySubmissionReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const submit = async (data: CreateSubmissionRequest): Promise<CreateSubmissionResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      // Use the new simplified API endpoint
      const response = await fetch('/api/inventory/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result: CreateSubmissionResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit inventory')
      }

      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred')
      setError(error)
      return {
        success: false,
        error: error.message
      }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    submit,
    isLoading,
    error
  }
} 