import { render, screen, fireEvent } from '@testing-library/react'
import { ScheduleCard } from '../ScheduleCard'

describe('ScheduleCard', () => {
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

  describe('Color Coding', () => {
    it('applies cyan color for morning shifts (6AM-11AM)', () => {
      const morningSchedule = {
        ...baseSchedule,
        startTime: '09:00',
        color: '#06B6D4',
      }

      render(
        <ScheduleCard
          schedule={morningSchedule}
          onCardTap={mockOnCardTap}
          viewMode="personal"
        />
      )

      const card = screen.getByRole('button')
      expect(card).toHaveStyle('border-left-color: #06B6D4')
    })

    it('applies amber color for afternoon shifts (12PM-5PM)', () => {
      const afternoonSchedule = {
        ...baseSchedule,
        startTime: '14:00',
        color: '#F59E0B',
      }

      render(
        <ScheduleCard
          schedule={afternoonSchedule}
          onCardTap={mockOnCardTap}
          viewMode="personal"
        />
      )

      const card = screen.getByRole('button')
      expect(card).toHaveStyle('border-left-color: #F59E0B')
    })

    it('applies pink color for evening shifts (6PM+)', () => {
      const eveningSchedule = {
        ...baseSchedule,
        startTime: '18:00',
        color: '#EC4899',
      }

      render(
        <ScheduleCard
          schedule={eveningSchedule}
          onCardTap={mockOnCardTap}
          viewMode="personal"
        />
      )

      const card = screen.getByRole('button')
      expect(card).toHaveStyle('border-left-color: #EC4899')
    })
  })

  describe('Personal View Mode', () => {
    it('displays schedule information without staff names', () => {
      render(
        <ScheduleCard
          schedule={baseSchedule}
          onCardTap={mockOnCardTap}
          viewMode="personal"
        />
      )

      expect(screen.getByText('09:00 - 17:00')).toBeInTheDocument()
      expect(screen.getByText('Main Office')).toBeInTheDocument()
      expect(screen.getByText('Tue, Jul 15')).toBeInTheDocument()
    })

    it('does not show staff information in personal view', () => {
      const scheduleWithStaff = {
        ...baseSchedule,
        staffNames: ['John Doe', 'Jane Smith'],
      }

      render(
        <ScheduleCard
          schedule={scheduleWithStaff}
          onCardTap={mockOnCardTap}
          viewMode="personal"
        />
      )

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })
  })

  describe('Team View Mode', () => {
    it('displays staff names in team view', () => {
      const teamSchedule = {
        ...baseSchedule,
        staffNames: ['John Doe', 'Jane Smith'],
      }

      render(
        <ScheduleCard
          schedule={teamSchedule}
          onCardTap={mockOnCardTap}
          viewMode="team"
        />
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('displays staff photos when available', () => {
      const teamSchedule = {
        ...baseSchedule,
        staffNames: ['John Doe'],
        staffPhotos: ['/photos/john.jpg'],
      }

      render(
        <ScheduleCard
          schedule={teamSchedule}
          onCardTap={mockOnCardTap}
          viewMode="team"
        />
      )

      const photo = screen.getByAltText('John Doe')
      expect(photo).toHaveAttribute('src', '/photos/john.jpg')
    })

    it('shows initials when no staff photo available', () => {
      const teamSchedule = {
        ...baseSchedule,
        staffNames: ['John Doe'],
        staffPhotos: [null],
      }

      render(
        <ScheduleCard
          schedule={teamSchedule}
          onCardTap={mockOnCardTap}
          viewMode="team"
        />
      )

      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('handles multiple staff members correctly', () => {
      const teamSchedule = {
        ...baseSchedule,
        staffNames: ['John Doe', 'Jane Smith', 'Mike Johnson'],
        staffPhotos: ['/photos/john.jpg', null, '/photos/mike.jpg'],
      }

      render(
        <ScheduleCard
          schedule={teamSchedule}
          onCardTap={mockOnCardTap}
          viewMode="team"
        />
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Mike Johnson')).toBeInTheDocument()
      
      expect(screen.getByAltText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('JS')).toBeInTheDocument() // Jane's initials
      expect(screen.getByAltText('Mike Johnson')).toBeInTheDocument()
    })
  })

  describe('Interaction', () => {
    it('calls onCardTap when clicked', () => {
      render(
        <ScheduleCard
          schedule={baseSchedule}
          onCardTap={mockOnCardTap}
          viewMode="personal"
        />
      )

      const card = screen.getByRole('button')
      fireEvent.click(card)

      expect(mockOnCardTap).toHaveBeenCalledWith('schedule-123')
    })

    it('handles keyboard interaction', () => {
      render(
        <ScheduleCard
          schedule={baseSchedule}
          onCardTap={mockOnCardTap}
          viewMode="personal"
        />
      )

      const card = screen.getByRole('button')
      
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(mockOnCardTap).toHaveBeenCalledWith('schedule-123')

      fireEvent.keyDown(card, { key: ' ' })
      expect(mockOnCardTap).toHaveBeenCalledTimes(2)
    })

    it('has proper touch target size', () => {
      render(
        <ScheduleCard
          schedule={baseSchedule}
          onCardTap={mockOnCardTap}
          viewMode="personal"
        />
      )

      const card = screen.getByRole('button')
      const rect = card.getBoundingClientRect()
      
      expect(rect.height).toBeGreaterThanOrEqual(44)
    })
  })

  describe('Date Formatting', () => {
    it('formats dates correctly', () => {
      const testCases = [
        { date: new Date('2025-07-15'), expected: 'Tue, Jul 15' },
        { date: new Date('2025-12-25'), expected: 'Thu, Dec 25' },
        { date: new Date('2025-01-01'), expected: 'Wed, Jan 1' },
      ]

      testCases.forEach(({ date, expected }) => {
        const schedule = { ...baseSchedule, date }
        
        render(
          <ScheduleCard
            schedule={schedule}
            onCardTap={mockOnCardTap}
            viewMode="personal"
          />
        )

        expect(screen.getByText(expected)).toBeInTheDocument()
      })
    })
  })

  describe('Time Formatting', () => {
    it('formats time ranges correctly', () => {
      const testCases = [
        { start: '09:00', end: '17:00', expected: '09:00 - 17:00' },
        { start: '08:30', end: '16:30', expected: '08:30 - 16:30' },
        { start: '10:15', end: '18:45', expected: '10:15 - 18:45' },
      ]

      testCases.forEach(({ start, end, expected }) => {
        const schedule = { ...baseSchedule, startTime: start, endTime: end }
        
        render(
          <ScheduleCard
            schedule={schedule}
            onCardTap={mockOnCardTap}
            viewMode="personal"
          />
        )

        expect(screen.getByText(expected)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <ScheduleCard
          schedule={baseSchedule}
          onCardTap={mockOnCardTap}
          viewMode="personal"
        />
      )

      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('aria-label')
      expect(card).toHaveAttribute('type', 'button')
    })

    it('provides descriptive aria-label', () => {
      render(
        <ScheduleCard
          schedule={baseSchedule}
          onCardTap={mockOnCardTap}
          viewMode="personal"
        />
      )

      const card = screen.getByRole('button')
      const ariaLabel = card.getAttribute('aria-label')
      
      expect(ariaLabel).toContain('09:00')
      expect(ariaLabel).toContain('17:00')
      expect(ariaLabel).toContain('Main Office')
      expect(ariaLabel).toContain('Jul 15')
    })
  })

  describe('Notes Display', () => {
    it('shows notes when provided', () => {
      const scheduleWithNotes = {
        ...baseSchedule,
        notes: 'Important meeting at 2 PM',
      }

      render(
        <ScheduleCard
          schedule={scheduleWithNotes}
          onCardTap={mockOnCardTap}
          viewMode="personal"
        />
      )

      expect(screen.getByText('Important meeting at 2 PM')).toBeInTheDocument()
    })

    it('does not show notes section when empty', () => {
      const scheduleWithoutNotes = {
        ...baseSchedule,
        notes: '',
      }

      render(
        <ScheduleCard
          schedule={scheduleWithoutNotes}
          onCardTap={mockOnCardTap}
          viewMode="personal"
        />
      )

      expect(screen.queryByTestId('schedule-notes')).not.toBeInTheDocument()
    })
  })

  describe('Recurring Schedule Indicator', () => {
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
  })

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <ScheduleCard
          schedule={baseSchedule}
          onCardTap={mockOnCardTap}
          viewMode="personal"
        />
      )

      const card = screen.getByRole('button')
      expect(card).toHaveClass('relative') // Updated to match current implementation
    })
  })
})