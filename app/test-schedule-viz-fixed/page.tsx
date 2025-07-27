'use client'

import React from 'react'
import dynamic from 'next/dynamic'

// Dynamically import the component to avoid SSR issues
const ScheduleVisualizationContainer = dynamic(
  () => import('@/components/schedule-visualization').then(mod => ({ default: mod.ScheduleVisualizationContainer })),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">Schedule Overview</h3>
          <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
            Loading...
          </div>
        </div>
        <div className="animate-pulse">
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    )
  }
)

// Mock data for testing
const mockScheduleData = {
  week_period: {
    start_date: '2024-01-01',
    end_date: '2024-01-07'
  },
  kpis: {
    total_staff: 5,
    scheduled_shifts: 10,
    staff_scheduled: 5,
    coverage_percentage: 80,
    conflicts_count: 0
  },
  schedule_grid: {},
  conflicts: [],
  raw_schedules: [
    {
      id: 1,
      staff_id: 1,
      staff_name: 'John Doe',
      start_time: '10:00',
      end_time: '14:00',
      schedule_date: '2024-01-01',
      location: 'Front Desk'
    },
    {
      id: 2,
      staff_id: 2,
      staff_name: 'Jane Smith',
      start_time: '14:00',
      end_time: '18:00',
      schedule_date: '2024-01-01',
      location: 'Pro Shop'
    },
    {
      id: 3,
      staff_id: 1,
      staff_name: 'John Doe',
      start_time: '09:00',
      end_time: '13:00',
      schedule_date: '2024-01-02',
      location: 'Course'
    }
  ]
}

const mockStaffAssignments = [
  {
    staffId: 1,
    staffName: 'John Doe',
    color: {
      name: 'Blue',
      hex: '#3B82F6',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      accent: 'bg-blue-100'
    }
  },
  {
    staffId: 2,
    staffName: 'Jane Smith',
    color: {
      name: 'Green',
      hex: '#10B981',
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      accent: 'bg-green-100'
    }
  }
]

export default function TestScheduleVisualizationFixed() {
  const [loading, setLoading] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">
            Loading...
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Schedule Visualization Test (Fixed)
          </h1>
          <p className="text-slate-600">
            Testing the schedule visualization component with mock data (no hydration issues)
          </p>
          <div className="mt-4 flex space-x-4">
            <button
              onClick={() => setLoading(!loading)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Toggle Loading: {loading ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="border-2 border-green-500 p-4 bg-green-50 rounded-lg">
          <p className="text-green-800 font-bold mb-4">
            ✅ This green box should be visible - if you see this, the page is rendering correctly
          </p>
          
          <ScheduleVisualizationContainer
            scheduleData={mockScheduleData}
            staffAssignments={mockStaffAssignments}
            weekStart="2024-01-01"
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}