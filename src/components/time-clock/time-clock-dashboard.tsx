'use client'

// OPTIMIZED TIME CLOCK DASHBOARD
// This file has been completely refactored for better maintainability and performance.
// The original 1,715-line component has been split into focused, reusable components.
//
// Key improvements:
// - Split into 8+ focused components with clear responsibilities
// - Consolidated API calls for better performance  
// - Memoized expensive calculations
// - Progressive filter disclosure for better UX
// - Responsive design with shared patterns
// - Proper error boundaries and loading states
//
// Original component backed up to: time-clock-dashboard-original.tsx.backup

import { TimeClockDashboard } from './TimeClockDashboardOptimized'

// Export the optimized dashboard component
// This maintains backward compatibility for existing imports
export { TimeClockDashboard }