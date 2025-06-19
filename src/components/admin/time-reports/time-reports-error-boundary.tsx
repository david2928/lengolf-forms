'use client'

import { Component, ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class TimeReportsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Time Reports Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert className="my-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Something went wrong while loading the time reports dashboard. 
            Please refresh the page or contact support if the problem persists.
          </AlertDescription>
        </Alert>
      )
    }

    return this.props.children
  }
} 