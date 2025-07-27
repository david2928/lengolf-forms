'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { VisualizationError } from '@/types/schedule-visualization'
import { ErrorDisplay } from '@/components/common/ErrorDisplay'
import { ScheduleVisualizationSkeleton } from './ScheduleVisualizationSkeleton'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  weekStart?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorId: string | null
  retryCount: number
}

/**
 * Specialized error boundary for schedule visualization components
 * Provides graceful failure handling with retry mechanisms
 */
export class ScheduleVisualizationErrorBoundary extends Component<Props, State> {
  private maxRetries = 3
  private retryDelay = 1000

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substring(7)
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Schedule Visualization Error Boundary:', error, errorInfo)
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Schedule visualization error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        weekStart: this.props.weekStart
      })
    }
  }

  handleRetry = async () => {
    if (this.state.retryCount >= this.maxRetries) {
      console.warn('Max retries reached for schedule visualization')
      return
    }

    // Add delay before retry
    await new Promise(resolve => 
      setTimeout(resolve, this.retryDelay * (this.state.retryCount + 1))
    )

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: prevState.retryCount + 1
    }))
  }

  handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      const canRetry = this.state.retryCount < this.maxRetries
      const isRenderError = this.state.error?.message?.includes('render') || 
                           this.state.error?.name === 'ChunkLoadError'

      // Default error UI with schedule visualization context
      return (
        <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Schedule Overview</h3>
            <div className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
              Error
            </div>
          </div>
          
          <div className="min-h-[300px] flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Schedule Visualization Error
              </h4>
              
              <p className="text-sm text-gray-500 mb-4">
                {isRenderError 
                  ? "There was a problem loading the schedule visualization. This might be due to a temporary issue."
                  : "We encountered an unexpected error while displaying the schedule timeline."
                }
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left mb-4 p-3 bg-gray-100 rounded text-xs">
                  <summary className="cursor-pointer font-medium text-gray-700">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-gray-600">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="space-y-2">
                {canRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                  </button>
                )}
                
                <button
                  onClick={this.handleRefresh}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Page
                </button>
              </div>

              {this.state.errorId && (
                <p className="text-xs text-gray-400 mt-3">
                  Error ID: {this.state.errorId}
                </p>
              )}
              
              {this.state.retryCount > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Retry attempts: {this.state.retryCount}/{this.maxRetries}
                </p>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook to use with the error boundary for manual error reporting
 */
export function useScheduleVisualizationErrorHandler() {
  return (error: Error, context?: string) => {
    console.error(`Schedule Visualization Error${context ? ` (${context})` : ''}:`, error)
    
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service
      console.error('Schedule visualization error report:', {
        error: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
      })
    }
  }
}

export default ScheduleVisualizationErrorBoundary