'use client';

import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  Bug, 
  Network,
  Server,
  Database,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';

// Error types for better error handling
export type DashboardErrorType = 
  | 'network' 
  | 'server' 
  | 'data' 
  | 'client' 
  | 'auth' 
  | 'timeout'
  | 'unknown';

export interface DashboardError {
  type: DashboardErrorType;
  message: string;
  code?: string;
  details?: string;
  timestamp: Date;
  retryable: boolean;
}

// Error boundary props
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

// Main Error Boundary component
export class DashboardErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to monitoring service in production
    console.error('Dashboard Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback 
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          retryCount={this.state.retryCount}
          maxRetries={this.maxRetries}
        />
      );
    }

    return this.props.children;
  }
}

// Error fallback component
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onRetry: () => void;
  onReset: () => void;
  retryCount: number;
  maxRetries: number;
}

function ErrorFallback({ 
  error, 
  errorInfo, 
  onRetry, 
  onReset, 
  retryCount, 
  maxRetries 
}: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  const errorType = getErrorType(error);
  const canRetry = retryCount < maxRetries && errorType !== 'client';

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <div className="flex-1">
            <CardTitle className="text-red-800">Dashboard Error</CardTitle>
            <p className="text-sm text-red-600 mt-1">
              Something went wrong while loading the dashboard
            </p>
          </div>
          <Badge variant="destructive" className="text-xs">
            {errorType.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Error message */}
          <div className="p-3 bg-white border border-red-200 rounded-lg">
            <p className="text-sm text-gray-800 font-medium mb-1">
              Error Message
            </p>
            <p className="text-sm text-gray-600">
              {error?.message || 'An unexpected error occurred'}
            </p>
          </div>

          {/* Error details (collapsible) */}
          {(error?.stack || errorInfo) && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="h-auto p-2 text-xs text-gray-600 hover:text-gray-800"
              >
                <span className="mr-2">Technical Details</span>
                {showDetails ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>

              {showDetails && (
                <div className="p-3 bg-gray-100 border rounded-lg text-xs font-mono">
                  <div className="space-y-2">
                    {error?.stack && (
                      <div>
                        <p className="font-semibold text-gray-700">Stack Trace:</p>
                        <pre className="whitespace-pre-wrap text-gray-600 mt-1">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div>
                        <p className="font-semibold text-gray-700">Component Stack:</p>
                        <pre className="whitespace-pre-wrap text-gray-600 mt-1">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2 border-t border-red-200">
            {canRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry ({maxRetries - retryCount} left)
              </Button>
            )}

            <Button
              onClick={onReset}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset Dashboard
            </Button>

            <Button
              onClick={() => window.location.reload()}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-gray-600"
            >
              <ExternalLink className="h-4 w-4" />
              Reload Page
            </Button>
          </div>

          {/* Help text */}
          <div className="text-xs text-gray-500 pt-2 border-t border-red-200">
            <p>
              If this problem persists, please contact support or try refreshing the page.
              {retryCount > 0 && ` (Attempt ${retryCount + 1}/${maxRetries + 1})`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Component-level error display
export function ComponentError({ 
  error, 
  onRetry, 
  title = "Component Error",
  className = "" 
}: {
  error: string | DashboardError;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  const errorObj = typeof error === 'string' 
    ? { type: 'unknown' as DashboardErrorType, message: error, retryable: true, timestamp: new Date() }
    : error;

  const ErrorIcon = getErrorIcon(errorObj.type);

  return (
    <Card className={`border-red-200 bg-red-50 ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-8">
        <ErrorIcon className="h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-red-800 mb-2">{title}</h3>
        <p className="text-sm text-red-600 text-center mb-4 max-w-md">
          {errorObj.message}
        </p>
        
        {errorObj.retryable && onRetry && (
          <Button
            onClick={onRetry}
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}

        <div className="mt-4 text-xs text-red-500">
          {errorObj.code && <span>Error Code: {errorObj.code}</span>}
          {errorObj.timestamp && (
            <span className="block mt-1">
              {errorObj.timestamp.toLocaleTimeString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Network/API error display
export function NetworkError({ 
  onRetry, 
  message = "Unable to load dashboard data. Please check your internet connection.",
  className = ""
}: {
  onRetry?: () => void;
  message?: string;
  className?: string;
}) {
  return (
    <Card className={`border-orange-200 bg-orange-50 ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-8">
        <Network className="h-12 w-12 text-orange-400 mb-4" />
        <h3 className="text-lg font-medium text-orange-800 mb-2">Connection Error</h3>
        <p className="text-sm text-orange-600 text-center mb-4 max-w-md">
          {message}
        </p>
        
        {onRetry && (
          <Button
            onClick={onRetry}
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Empty state component
export function EmptyState({
  title = "No Data Available",
  message = "There's no data to display at the moment.",
  icon: Icon = Database,
  action,
  className = ""
}: {
  title?: string;
  message?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Icon className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 text-center mb-4 max-w-md">
          {message}
        </p>
        {action}
      </CardContent>
    </Card>
  );
}

// Utility functions
function getErrorType(error: Error | null): DashboardErrorType {
  if (!error) return 'unknown';
  
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'network';
  } else if (message.includes('timeout')) {
    return 'timeout';
  } else if (message.includes('server') || message.includes('500')) {
    return 'server';
  } else if (message.includes('auth') || message.includes('401')) {
    return 'auth';
  } else if (message.includes('data') || message.includes('json')) {
    return 'data';
  }
  
  return 'client';
}

function getErrorIcon(type: DashboardErrorType) {
  switch (type) {
    case 'network':
      return Network;
    case 'server':
      return Server;
    case 'data':
      return Database;
    case 'timeout':
      return RefreshCw;
    case 'auth':
      return AlertTriangle;
    default:
      return Bug;
  }
} 