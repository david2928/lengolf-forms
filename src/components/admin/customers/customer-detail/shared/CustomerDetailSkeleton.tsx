/**
 * Customer Detail Loading Skeleton
 * Provides consistent loading states for customer detail modal
 */

import React from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

/**
 * Header skeleton
 */
const HeaderSkeleton: React.FC = () => (
  <DialogHeader className="space-y-4">
    {/* Title and action buttons */}
    <div className="flex items-start justify-between">
      <div className="flex items-center space-x-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>

    {/* Engagement badge */}
    <div className="flex items-center space-x-2">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-4 w-24" />
    </div>

    {/* Contact info */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-36" />
    </div>

    <Separator />

    {/* Metrics cards */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center space-x-2">
              <Skeleton className="w-4 h-4" />
              <div>
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <Skeleton className="h-4 w-40" />
  </DialogHeader>
);

/**
 * Tabs skeleton
 */
const TabsSkeleton: React.FC = () => (
  <div className="flex-1 space-y-4">
    {/* Tab navigation */}
    <div className="flex space-x-1 p-1 bg-muted rounded-lg">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-8 flex-1" />
      ))}
    </div>

    {/* Tab content area */}
    <div className="space-y-4 p-6">
      {/* Content cards/rows */}
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-3 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/**
 * Main customer detail skeleton component
 */
export const CustomerDetailSkeleton: React.FC = () => (
  <div className="flex flex-col h-full max-h-[85vh]">
    <HeaderSkeleton />
    <TabsSkeleton />
  </div>
);

/**
 * Compact skeleton for when customer data is loading
 */
export const CustomerDetailCompactSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center space-x-3">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-24 mt-1" />
      </div>
    </div>
    <Separator />
    <div className="grid grid-cols-2 gap-3">
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  </div>
);