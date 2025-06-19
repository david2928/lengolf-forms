'use client'

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface TimeClockErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class TimeClockErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  TimeClockErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): TimeClockErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Time Clock Admin Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Time Clock Administration</h1>
              <p className="text-muted-foreground">
                Comprehensive time clock management and reports
              </p>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div>
                Something went wrong loading the time clock administration dashboard.
              </div>
              <div className="text-sm text-muted-foreground">
                {this.state.error?.message || 'An unexpected error occurred'}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  this.setState({ hasError: false })
                  window.location.reload()
                }}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return this.props.children
  }
} 