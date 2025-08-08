/**
 * Customer Detail Error Component
 * Consistent error handling for customer detail modal
 */

import React from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface CustomerDetailErrorProps {
  error: string;
  onRetry?: () => void;
  onClose?: () => void;
  title?: string;
}

/**
 * Error state component for customer detail modal
 */
export const CustomerDetailError: React.FC<CustomerDetailErrorProps> = ({
  error,
  onRetry,
  onClose,
  title = 'Error Loading Customer'
}) => (
  <div className="flex flex-col h-full max-h-[85vh]">
    <DialogHeader>
      <div className="flex items-center justify-between">
        <DialogTitle className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <span>{title}</span>
        </DialogTitle>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </DialogHeader>

    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>

        <p className="text-sm text-muted-foreground">
          There was a problem loading the customer information. 
          Please try refreshing or contact support if the problem persists.
        </p>

        <div className="flex justify-center space-x-2">
          {onRetry && (
            <Button onClick={onRetry} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </Button>
          )}
          
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  </div>
);

/**
 * Compact error component for tab content
 */
export const CustomerTabError: React.FC<{
  error: string;
  onRetry?: () => void;
  tabName?: string;
}> = ({ error, onRetry, tabName }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center space-y-4 max-w-sm">
      <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6 text-destructive" />
      </div>
      
      <div>
        <p className="text-sm font-medium text-destructive">
          Failed to load {tabName || 'data'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {error}
        </p>
      </div>

      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="w-3 h-3 mr-2" />
          Retry
        </Button>
      )}
    </div>
  </div>
);