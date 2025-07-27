'use client'

import { ScheduleCard } from '@/components/staff-schedule/ScheduleCard'

export default function TestRecurringIndicatorPage() {
  const handleCardTap = (scheduleId: string) => {
    console.log('Card tapped:', scheduleId)
  }

  const oneTimeSchedule = {
    schedule_id: 'schedule-1',
    schedule_date: '2025-07-25',
    start_time: '09:00',
    end_time: '17:00',
    location: 'Pro Shop',
    notes: 'Regular shift',
    shift_color: '#06B6D4',
    is_recurring: false,
    recurring_group_id: null
  }

  const recurringSchedule = {
    schedule_id: 'schedule-2',
    schedule_date: '2025-07-25',
    start_time: '14:00',
    end_time: '18:00',
    location: 'Driving Range',
    notes: 'Recurring afternoon shift',
    shift_color: '#F59E0B',
    is_recurring: true,
    recurring_group_id: 'group-123'
  }

  const teamRecurringSchedule = {
    schedule_id: 'schedule-3',
    schedule_date: '2025-07-25',
    start_time: '18:00',
    end_time: '22:00',
    location: 'Restaurant',
    notes: 'Evening team shift',
    shift_color: '#EC4899',
    is_recurring: true,
    recurring_group_id: 'group-456',
    staff_names: ['John Doe', 'Jane Smith'],
    staff_photos: [null, null]
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Recurring Schedule Indicator Test
        </h1>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              One-time Schedule (No Indicator)
            </h2>
            <ScheduleCard
              schedule={oneTimeSchedule}
              viewMode="personal"
              onCardTap={handleCardTap}
            />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Recurring Schedule (Personal View)
            </h2>
            <ScheduleCard
              schedule={recurringSchedule}
              viewMode="personal"
              onCardTap={handleCardTap}
            />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Recurring Schedule (Team View)
            </h2>
            <ScheduleCard
              schedule={teamRecurringSchedule}
              viewMode="team"
              onCardTap={handleCardTap}
            />
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">
            What to look for:
          </h3>
          <ul className="text-blue-800 space-y-1">
            <li>• One-time schedules have no indicator</li>
            <li>• Recurring schedules show a small circular arrow icon in the bottom right corner</li>
            <li>• The indicator appears in both personal and team view modes</li>
            <li>• Hover over the indicator to see the tooltip "Recurring schedule"</li>
            <li>• The aria-label includes "(recurring)" for accessibility</li>
          </ul>
        </div>
      </div>
    </div>
  )
}