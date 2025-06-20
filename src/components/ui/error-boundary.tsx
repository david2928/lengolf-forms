'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { RefreshCw, AlertTriangle, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  maxRetries?: number
  showTechnicalDetails?: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeout: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Auto-retry after delay for temporary errors
    if (this.shouldAutoRetry(error)) {
      this.resetTimeout = setTimeout(() => {
        this.handleRetry()
      }, 2000)
    }
  }

  componentWillUnmount() {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout)
    }
  }

  shouldAutoRetry = (error: Error): boolean => {
    const maxRetries = this.props.maxRetries ?? 2
    if (this.state.retryCount >= maxRetries) return false

    // Auto-retry for network/temporary errors
    const retryableErrors = [
      'NetworkError',
      'ChunkLoadError',
      'Loading chunk',
      'Failed to fetch'
    ]
    
    return retryableErrors.some(pattern => 
      error.message.includes(pattern) || error.name.includes(pattern)
    )
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }))
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleGoBack = () => {
    window.history.back()
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error } = this.state
      const maxRetries = this.props.maxRetries ?? 2
      const canRetry = this.state.retryCount < maxRetries

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-center">
                We apologize for the inconvenience. The application encountered an unexpected error.
              </p>

              {this.state.retryCount > 0 && (
                <div className="text-sm text-gray-500 text-center">
                  Retry attempt {this.state.retryCount} of {maxRetries}
                </div>
              )}

              <div className="flex flex-col gap-2">
                {canRetry && (
                  <Button onClick={this.handleRetry} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={this.handleGoBack}
                    className="flex-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Back
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={this.handleGoHome}
                    className="flex-1"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Home
                  </Button>
                </div>
              </div>

              {this.props.showTechnicalDetails && error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-32">
                    <div className="font-semibold">Error:</div>
                    <div>{error.toString()}</div>
                    {this.state.errorInfo?.componentStack && (
                      <>
                        <div className="font-semibold mt-2">Component Stack:</div>
                        <div>{this.state.errorInfo.componentStack}</div>
                      </>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: string) => {
    console.error('Manual error reported:', error, errorInfo)
    throw error // Will be caught by ErrorBoundary
  }
} 