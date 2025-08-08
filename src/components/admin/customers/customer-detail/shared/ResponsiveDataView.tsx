/**
 * Responsive Data View Component
 * Generic pattern component to eliminate mobile/desktop duplication
 * Replaces 3+ duplicate mobile/desktop rendering patterns from original component
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ResponsiveDataViewProps } from '../utils/customerTypes';

/**
 * Hook to detect mobile screen size
 * Could be moved to a shared hook if used elsewhere
 */
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  return isMobile;
};

/**
 * Loading skeleton for data tables/cards
 */
const DataSkeleton: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  if (isMobile) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-3 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex space-x-4 items-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
};

/**
 * Empty state component
 */
const EmptyState: React.FC<{ message: string; onRefresh?: () => void }> = ({ 
  message, 
  onRefresh 
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
      <AlertTriangle className="w-8 h-8 text-muted-foreground" />
    </div>
    <p className="text-muted-foreground mb-4">{message}</p>
    {onRefresh && (
      <Button variant="outline" onClick={onRefresh} size="sm">
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh
      </Button>
    )}
  </div>
);

/**
 * Error state component
 */
const ErrorState: React.FC<{ error: string; onRetry?: () => void }> = ({ 
  error, 
  onRetry 
}) => (
  <div className="p-6">
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  </div>
);

/**
 * Generic responsive data view component
 * Automatically switches between mobile cards and desktop tables
 * Handles loading, error, and empty states consistently
 */
export function ResponsiveDataView<T>({
  data,
  loading,
  renderCard,
  renderTable,
  emptyState,
  error,
  onRefresh,
  onRetry
}: ResponsiveDataViewProps<T> & {
  onRefresh?: () => void;
  onRetry?: () => void;
}) {
  const isMobile = useIsMobile();
  
  // Loading state
  if (loading) {
    return <DataSkeleton isMobile={isMobile} />;
  }
  
  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  
  // Empty state
  if (!data || data.length === 0) {
    return <EmptyState message={emptyState} onRefresh={onRefresh} />;
  }
  
  // Mobile view - render cards
  if (isMobile) {
    return (
      <div className="space-y-4 p-4 max-h-[60vh] overflow-y-auto">
        {data.map((item, index) => (
          <div key={index}>
            {renderCard(item, index)}
          </div>
        ))}
      </div>
    );
  }
  
  // Desktop view - render table
  return (
    <div className="p-6 max-h-[60vh] overflow-y-auto">
      {renderTable()}
    </div>
  );
}

/**
 * Specialized wrapper for paginated data
 */
export function PaginatedResponsiveDataView<T>({
  data,
  loading,
  renderCard,
  renderTable,
  emptyState,
  error,
  onRefresh,
  onRetry,
  // Pagination props
  currentPage,
  totalPages,
  onPageChange,
  showPagination = true
}: ResponsiveDataViewProps<T> & {
  onRefresh?: () => void;
  onRetry?: () => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  showPagination?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <ResponsiveDataView
          data={data}
          loading={loading}
          renderCard={renderCard}
          renderTable={renderTable}
          emptyState={emptyState}
          error={error}
          onRefresh={onRefresh}
          onRetry={onRetry}
        />
      </div>
      
      {/* Pagination */}
      {showPagination && totalPages && totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-6 py-4 border-t bg-background">
          <div className="text-sm text-muted-foreground">
            Page {currentPage || 1} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange((currentPage || 1) - 1)}
              disabled={!currentPage || currentPage <= 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange((currentPage || 1) + 1)}
              disabled={!currentPage || currentPage >= totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing responsive data view state
 * Useful for components that need to implement custom loading/error handling
 */
export const useResponsiveDataView = () => {
  const isMobile = useIsMobile();
  const [refreshKey, setRefreshKey] = React.useState(0);
  
  const refresh = React.useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);
  
  return {
    isMobile,
    refresh,
    refreshKey
  };
};