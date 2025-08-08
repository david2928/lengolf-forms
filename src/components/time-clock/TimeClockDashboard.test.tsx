import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TimeClockDashboard } from './TimeClockDashboardOptimized'

// Mock the API calls and dependencies
jest.mock('@/hooks/useTimeClockData', () => ({
  useTimeClockData: () => ({
    timeEntries: [],
    staffList: [],
    monthlyComparison: {
      currentMonthHours: 0,
      previousMonthHours: 0,
      percentageChange: { value: '0%', isPositive: true }
    },
    monthToDateSummary: {
      totalEntries: 0,
      photoCompliance: 0
    },
    loading: false,
    error: null,
    filters: {
      startDate: '2025-01-01',
      endDate: '2025-01-08',
      staffId: 'all',
      action: 'all',
      photoFilter: 'all'
    },
    handleFilterChange: jest.fn(),
    handleQuickDateFilter: jest.fn(),
    refreshData: jest.fn()
  })
}))

jest.mock('@/hooks/useTimeClockCalculations', () => ({
  useTimeClockCalculations: () => ({
    workShifts: [],
    staffAnalytics: [],
    statistics: {
      totalCompleteShifts: 0,
      totalIncompleteShifts: 0,
      totalHours: 0,
      totalOvertimeHours: 0,
      averageShiftLength: 0
    }
  })
}))

jest.mock('@/hooks/usePhotoManager', () => ({
  usePhotoManager: () => ({
    photoUrls: new Map(),
    loadingPhotos: new Set(),
    loadPhotoUrl: jest.fn(),
    getCachedPhotoUrl: jest.fn(),
    isPhotoLoading: jest.fn()
  })
}))

describe('TimeClockDashboard', () => {
  it('renders without crashing', () => {
    render(<TimeClockDashboard />)
    
    // Check if main components are present
    expect(screen.getByText(/Total Entries/i)).toBeInTheDocument()
    expect(screen.getByText(/Photo Compliance/i)).toBeInTheDocument()
    expect(screen.getByText(/Filters & Export/i)).toBeInTheDocument()
  })

  it('renders all three tabs', () => {
    render(<TimeClockDashboard />)
    
    expect(screen.getByText(/Time Entries/i)).toBeInTheDocument()
    expect(screen.getByText(/Work Shifts/i)).toBeInTheDocument()
    expect(screen.getByText(/Staff Analytics/i)).toBeInTheDocument()
  })

  it('shows data flow indicator on desktop', () => {
    render(<TimeClockDashboard />)
    
    expect(screen.getByText(/Raw Entries → Processed Shifts → Analytics Summary/i)).toBeInTheDocument()
  })
})