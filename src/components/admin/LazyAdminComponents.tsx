'use client'

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'
import { LoadingState } from '@/components/common/LoadingState'

// Loading component for admin components
const AdminLoadingFallback = () => (
  <div className="min-h-screen bg-gray-50 p-6">
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  </div>
)

// Lazy load admin components with optimized loading states
export const LazyScheduleDashboard = dynamic(
  () => import('./ScheduleDashboard').then(mod => ({ default: mod.ScheduleDashboard })),
  {
    loading: AdminLoadingFallback,
    ssr: false
  }
)

export const LazyScheduleForm = dynamic(
  () => import('./ScheduleForm').then(mod => ({ default: mod.ScheduleForm })),
  {
    loading: () => (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    ),
    ssr: false
  }
)

export const LazyScheduleGrid = dynamic(
  () => import('./ScheduleGrid').then(mod => ({ default: mod.ScheduleGrid })),
  {
    loading: () => (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-8 gap-2 mb-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="grid grid-cols-8 gap-2">
              {[...Array(8)].map((_, j) => (
                <div key={j} className="h-16 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    ssr: false
  }
)

export const LazyConfirmDialog = dynamic(
  () => import('./ConfirmDialog').then(mod => ({ default: mod.ConfirmDialog })),
  {
    loading: () => null, // No loading state needed for dialogs
    ssr: false
  }
)

// Higher-order component for lazy loading with error boundaries
export function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: ComponentType
) {
  return dynamic(importFn, {
    loading: fallback || (() => <LoadingState />),
    ssr: false
  })
}

// Preload functions for better UX
export const preloadAdminComponents = {
  dashboard: () => import('./ScheduleDashboard'),
  form: () => import('./ScheduleForm'),
  grid: () => import('./ScheduleGrid'),
  dialog: () => import('./ConfirmDialog')
}

// Utility to preload all admin components
export const preloadAllAdminComponents = () => {
  Object.values(preloadAdminComponents).forEach(preload => {
    preload().catch(err => {
      console.warn('Failed to preload admin component:', err)
    })
  })
}

// Hook to preload components on user interaction
export function useAdminComponentPreloader() {
  const preloadOnHover = (componentName: keyof typeof preloadAdminComponents) => {
    return {
      onMouseEnter: () => {
        preloadAdminComponents[componentName]().catch(err => {
          console.warn(`Failed to preload ${componentName}:`, err)
        })
      }
    }
  }

  const preloadOnFocus = (componentName: keyof typeof preloadAdminComponents) => {
    return {
      onFocus: () => {
        preloadAdminComponents[componentName]().catch(err => {
          console.warn(`Failed to preload ${componentName}:`, err)
        })
      }
    }
  }

  return {
    preloadOnHover,
    preloadOnFocus,
    preloadAll: preloadAllAdminComponents
  }
}