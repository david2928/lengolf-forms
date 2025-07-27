'use client'

import React from 'react'

// Simple test to see if the basic structure works
function SimpleScheduleViz() {
  console.log('SimpleScheduleViz rendered')
  
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="text-base font-semibold text-slate-900 mb-4">
        Simple Schedule Test
      </h3>
      <div className="bg-blue-100 p-4 rounded">
        <p>This is a simple test component to verify rendering works.</p>
      </div>
    </div>
  )
}

export default function DebugScheduleVisualization() {
  console.log('DebugScheduleVisualization page rendered')
  
  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          Debug Schedule Visualization
        </h1>
        
        <div className="space-y-6">
          <SimpleScheduleViz />
          
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              Import Test
            </h3>
            <p>Testing if we can import the actual component...</p>
            
            {/* Try to import and render the actual component */}
            <React.Suspense fallback={<div>Loading component...</div>}>
              <LazyScheduleVisualization />
            </React.Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}

// Lazy load the actual component to catch import errors
const LazyScheduleVisualization = React.lazy(async () => {
  try {
    console.log('Attempting to import ScheduleVisualizationContainer...')
    const module = await import('@/components/schedule-visualization')
    console.log('Successfully imported:', Object.keys(module))
    
    // Create a simple wrapper component
    const TestComponent = () => {
      const mockData = {
        week_period: { start_date: '2024-01-01', end_date: '2024-01-07' },
        kpis: { total_staff: 1, scheduled_shifts: 1, staff_scheduled: 1, coverage_percentage: 100, conflicts_count: 0 },
        schedule_grid: {},
        conflicts: [],
        raw_schedules: []
      }
      
      return (
        <module.ScheduleVisualizationContainer
          scheduleData={mockData}
          staffAssignments={[]}
          weekStart="2024-01-01"
          loading={false}
        />
      )
    }
    
    return { default: TestComponent }
  } catch (error) {
    console.error('Failed to import ScheduleVisualizationContainer:', error)
    
    const ErrorComponent = () => (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <h4 className="text-red-800 font-medium">Import Error</h4>
        <p className="text-red-700 text-sm mt-1">
          Failed to import ScheduleVisualizationContainer: {error?.toString()}
        </p>
      </div>
    )
    
    return { default: ErrorComponent }
  }
})