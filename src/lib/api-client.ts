// Enhanced API client with error handling and retry mechanisms

import { 
  ScheduleError, 
  ScheduleErrorCodes, 
  createScheduleError, 
  ApiResponse,
  getHttpStatusFromErrorCode 
} from '@/types/errors'

interface RetryOptions {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  retryCondition?: (error: ScheduleError) => boolean
}

interface RequestOptions extends RequestInit {
  timeout?: number
  retry?: Partial<RetryOptions>
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and server errors
    return [
      ScheduleErrorCodes.NETWORK_ERROR,
      ScheduleErrorCodes.TIMEOUT_ERROR,
      ScheduleErrorCodes.SERVER_ERROR,
      ScheduleErrorCodes.DATABASE_ERROR
    ].includes(error.code)
  }
}

class ApiClient {
  private baseUrl: string
  private defaultTimeout: number

  constructor(baseUrl = '', defaultTimeout = 10000) {
    this.baseUrl = baseUrl
    this.defaultTimeout = defaultTimeout
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private calculateDelay(attempt: number, options: RetryOptions): number {
    const delay = Math.min(
      options.baseDelay * Math.pow(options.backoffFactor, attempt),
      options.maxDelay
    )
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(createScheduleError(
          ScheduleErrorCodes.TIMEOUT_ERROR,
          { timeout },
          undefined,
          'request-timeout'
        ))
      }, timeout)
    })
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    let data: any
    
    try {
      data = await response.json()
    } catch (error) {
      throw createScheduleError(
        ScheduleErrorCodes.SERVER_ERROR,
        { parseError: error },
        undefined,
        response.url
      )
    }

    if (!response.ok) {
      // Handle API error responses
      if (data.error) {
        throw data.error
      }
      
      // Create error based on HTTP status
      let errorCode: ScheduleErrorCodes
      switch (response.status) {
        case 400:
          errorCode = ScheduleErrorCodes.INVALID_TIME_RANGE
          break
        case 401:
          errorCode = ScheduleErrorCodes.UNAUTHORIZED_ACCESS
          break
        case 403:
          errorCode = ScheduleErrorCodes.INSUFFICIENT_PERMISSIONS
          break
        case 404:
          errorCode = ScheduleErrorCodes.SCHEDULE_NOT_FOUND
          break
        case 409:
          errorCode = ScheduleErrorCodes.SCHEDULE_CONFLICT
          break
        case 408:
          errorCode = ScheduleErrorCodes.TIMEOUT_ERROR
          break
        case 500:
          errorCode = ScheduleErrorCodes.SERVER_ERROR
          break
        case 503:
          errorCode = ScheduleErrorCodes.NETWORK_ERROR
          break
        default:
          errorCode = ScheduleErrorCodes.UNKNOWN_ERROR
      }
      
      throw createScheduleError(
        errorCode,
        { status: response.status, statusText: response.statusText },
        undefined,
        response.url
      )
    }

    return data
  }

  private async makeRequest<T>(
    url: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { timeout = this.defaultTimeout, retry = {}, ...fetchOptions } = options
    const retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...retry }
    
    let lastError: ScheduleError | null = null
    
    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const fetchPromise = fetch(this.baseUrl + url, {
          ...fetchOptions,
          signal: controller.signal
        })
        
        const timeoutPromise = this.createTimeoutPromise(timeout)
        
        const response = await Promise.race([fetchPromise, timeoutPromise])
        return await this.handleResponse<T>(response)
        
      } catch (error: any) {
        const scheduleError = error instanceof Error && 'code' in error && 'timestamp' in error
          ? error as ScheduleError
          : createScheduleError(
              ScheduleErrorCodes.NETWORK_ERROR,
              { originalError: error },
              undefined,
              url
            )
        
        lastError = scheduleError
        
        // Don't retry if this is the last attempt or if retry condition fails
        if (attempt === retryOptions.maxRetries || !retryOptions.retryCondition!(scheduleError)) {
          break
        }
        
        // Wait before retrying
        const delay = this.calculateDelay(attempt, retryOptions)
        await this.delay(delay)
        
        console.warn(`API request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retryOptions.maxRetries})`, {
          url,
          error: scheduleError,
          attempt: attempt + 1
        })
      }
    }
    
    throw lastError
  }

  async get<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...options, method: 'GET' })
  }

  async post<T>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async put<T>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...options, method: 'DELETE' })
  }
}

// Create default API client instance
export const apiClient = new ApiClient()

// Specialized API functions for staff scheduling
export const scheduleApi = {
  // Get staff list
  getStaff: () => apiClient.get('/api/staff-schedule/staff'),
  
  // Get schedules
  getSchedules: (params: {
    staff_id?: number | null
    start_date?: string
    end_date?: string
    view_mode?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params.staff_id !== undefined && params.staff_id !== null) {
      searchParams.append('staff_id', params.staff_id.toString())
    }
    if (params.start_date) searchParams.append('start_date', params.start_date)
    if (params.end_date) searchParams.append('end_date', params.end_date)
    if (params.view_mode) searchParams.append('view_mode', params.view_mode)
    
    return apiClient.get(`/api/staff-schedule/schedules?${searchParams.toString()}`)
  },
  
  // Get team schedule
  getTeamSchedule: (date: string) => 
    apiClient.get(`/api/staff-schedule/team?date=${date}`),
  
  // Admin endpoints
  admin: {
    getSchedules: (params: {
      staff_id?: string
      start_date: string
      end_date: string
    }) => {
      const searchParams = new URLSearchParams()
      if (params.staff_id) searchParams.append('staff_id', params.staff_id)
      searchParams.append('start_date', params.start_date)
      searchParams.append('end_date', params.end_date)
      
      return apiClient.get(`/api/admin/staff-scheduling/schedules?${searchParams.toString()}`)
    },
    
    createSchedule: (data: {
      staff_id: number
      schedule_date: string
      start_time: string
      end_time: string
      location?: string
      notes?: string
    }) => apiClient.post('/api/admin/staff-scheduling/schedules', data),
    
    updateSchedule: (id: string, data: Partial<{
      staff_id: number
      schedule_date: string
      start_time: string
      end_time: string
      location: string
      notes: string
    }>) => apiClient.put(`/api/admin/staff-scheduling/schedules/${id}`, data),
    
    deleteSchedule: (id: string) => 
      apiClient.delete(`/api/admin/staff-scheduling/schedules/${id}`)
  }
}

// Utility function to handle API errors in components
export function handleApiError(error: any): ScheduleError {
  if (error && typeof error === 'object' && 'code' in error) {
    return error as ScheduleError
  }
  
  return createScheduleError(
    ScheduleErrorCodes.UNKNOWN_ERROR,
    { originalError: error }
  )
}