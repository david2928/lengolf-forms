import { render, screen } from '@testing-library/react'
import { ScheduleCard } from '../ScheduleCard'

describe('ScheduleCard - Recurring Indicator', () => {
  const mockOnCardTap = jest.fn()

  const baseSchedule = {
    schedule_id: 'schedule-123',
    schedule_date: '2025-07-15',
    start_time: '09:00',
    end_time: '17:00',
    location: 'Main Office',
    notes: 'Regular shift',
    shift_color: '#06B6D4',
    is_recurring: false,
    recurring_group_id: null
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows recurring indicator for recurring schedules', () => {
    const recurringSchedule = {
      ...baseSchedule,
      is_recurring: true,
      recurring_group_id: 'group-123'
    }

    render(
      <ScheduleCard
        schedule={recurringSchedule}
        onCardTap={mockOnCardTap}
        viewMode="personal"
      />
    )

    const indicator = screen.getByTitle('Recurring schedule')
    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveAttribute('aria-label', 'This is a recurring schedule')
  })

  it('does not show recurring indicator for one-time schedules', () => {
    const oneTimeSchedule = {
      ...baseSchedule,
      is_recurring: false
    }

    render(
      <ScheduleCard
        schedule={oneTimeSchedule}
        onCardTap={mockOnCardTap}
        viewMode="personal"
      />
    )

    expect(screen.queryByTitle('Recurring schedule')).not.toBeInTheDocument()
  })

  it('includes recurring status in aria-label', () => {
    const recurringSchedule = {
      ...baseSchedule,
      is_recurring: true,
      recurring_group_id: 'group-123'
    }

    render(
      <ScheduleCard
        schedule={recurringSchedule}
        onCardTap={mockOnCardTap}
        viewMode="personal"
      />
    )

    const card = screen.getByRole('button')
    const ariaLabel = card.getAttribute('aria-label')
    expect(ariaLabel).toContain('(recurring)')
  })

  it('works in team view mode as well', () => {
    const recurringSchedule = {
      ...baseSchedule,
      is_recurring: true,
      recurring_group_id: 'group-123',
      staff_names: ['John Doe'],
      staff_photos: ['/photo.jpg']
    }

    render(
      <ScheduleCard
        schedule={recurringSchedule}
        onCardTap={mockOnCardTap}
        viewMode="team"
      />
    )

    const indicator = screen.getByTitle('Recurring schedule')
    expect(indicator).toBeInTheDocument()
  })
})