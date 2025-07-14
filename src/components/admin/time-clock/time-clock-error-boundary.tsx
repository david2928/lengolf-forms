'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface TimeClockErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface TimeClockErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; retry?: () => void }>
}

export class TimeClockErrorBoundary extends React.Component<
  TimeClockErrorBoundaryProps,
  TimeClockErrorBoundaryState
> {
  constructor(props: TimeClockErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): TimeClockErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Time Clock Error Boundary caught an error:', error, errorInfo)
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} retry={this.retry} />
      }

      return <DefaultErrorFallback error={this.state.error} retry={this.retry} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, retry }: { error?: Error; retry?: () => void }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-xl">Time Clock Error</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Something went wrong while loading the time clock dashboard.
          </p>
          {process.env.NODE_ENV === 'development' && error && (
            <div className="text-left bg-gray-100 p-3 rounded text-sm font-mono">
              <div className="font-semibold text-red-600 mb-2">Error Details:</div>
              <div className="text-gray-700">{error.message}</div>
              {error.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-gray-600">Stack Trace</summary>
                  <pre className="mt-2 text-xs overflow-auto">{error.stack}</pre>
                </details>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
            {retry && (
              <Button onClick={retry}>
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}