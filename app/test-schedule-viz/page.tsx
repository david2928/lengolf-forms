'use client'

import React from 'react'
import { ScheduleVisualizationContainer } from '@/components/schedule-visualization'

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
    id: 1,
    staff_name: 'John Doe',
    color: {
      name: 'blue',
      hex: '#3B82F6',
      bg: 'bg-blue-100',
      border: 'border-blue-300',
      text: 'text-blue-900'
    }
  },
  {
    id: 2,
    staff_name: 'Jane Smith',
    color: {
      name: 'green',
      hex: '#10B981',
      bg: 'bg-green-100',
      border: 'border-green-300',
      text: 'text-green-900'
    }
  }
]

export default function TestScheduleVisualization() {
  const [loading, setLoading] = React.useState(false)
  
  console.log('TestScheduleVisualization rendered')

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Schedule Visualization Test
          </h1>
          <p className="text-slate-600">
            Testing the schedule visualization component with mock data
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

        <div className="border-2 border-red-500 p-4 bg-yellow-100">
          <p className="text-red-800 font-bold mb-4">
            This should be visible - if you see this, the page is rendering
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