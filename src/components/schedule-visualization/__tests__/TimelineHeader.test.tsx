/**
 * Tests for TimelineHeader Component
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { TimelineHeader, TimeLabels } from '../TimelineHeader'

describe('TimelineHeader', () => {
  const defaultProps = {
    weekStart: '2024-01-15', // Monday
    businessHours: { start: 10, end: 23 },
    className: 'test-class'
  }

  it('should render day headers correctly', () => {
    render(<TimelineHeader {...defaultProps} />)
    
    // Check that all day names are rendered
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Tue')).toBeInTheDocument()
    expect(screen.getByText('Wed')).toBeInTheDocument()
    expect(screen.getByText('Thu')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()
    
    // Check that Time header is rendered
    expect(screen.getByText('Time')).toBeInTheDocument()
  })

  it('should render day numbers correctly', () => {
    render(<TimelineHeader {...defaultProps} />)
    
    // Check that day numbers are rendered (15-21 for the week starting Jan 15, 2024)
    expect(screen.getByText('15')).toBeInTheDocument() // Monday
    expect(screen.getByText('16')).toBeInTheDocument() // Tuesday
    expect(screen.getByText('17')).toBeInTheDocument() // Wednesday
    expect(screen.getByText('18')).toBeInTheDocument() // Thursday
    expect(screen.getByText('19')).toBeInTheDocument() // Friday
    expect(screen.getByText('20')).toBeInTheDocument() // Saturday
    expect(screen.getByText('21')).toBeInTheDocument() // Sunday
  })

  it('should apply custom className', () => {
    const { container } = render(<TimelineHeader {...defaultProps} />)
    
    expect(container.firstChild).toHaveClass('schedule-timeline-header')
    expect(container.firstChild).toHaveClass('test-class')
  })

  it('should have proper accessibility attributes', () => {
    render(<TimelineHeader {...defaultProps} />)
    
    // Check for columnheader role on day headers
    const mondayHeader = screen.getByRole('columnheader', { name: /Mon, 2024-01-15/ })
    expect(mondayHeader).toBeInTheDocument()
    
    const tuesdayHeader = screen.getByRole('columnheader', { name: /Tue, 2024-01-16/ })
    expect(tuesdayHeader).toBeInTheDocument()
  })

  it('should render with different week start dates', () => {
    const props = {
      ...defaultProps,
      weekStart: '2024-02-05' // Different Monday
    }
    
    render(<TimelineHeader {...props} />)
    
    // Check that day numbers are rendered for the new week (5-11 for Feb 5-11, 2024)
    expect(screen.getByText('5')).toBeInTheDocument()   // Monday
    expect(screen.getByText('6')).toBeInTheDocument()   // Tuesday
    expect(screen.getByText('7')).toBeInTheDocument()   // Wednesday
    expect(screen.getByText('8')).toBeInTheDocument()   // Thursday
    expect(screen.getByText('9')).toBeInTheDocument()   // Friday
    expect(screen.getByText('10')).toBeInTheDocument()  // Saturday
    expect(screen.getByText('11')).toBeInTheDocument()  // Sunday
  })
})

describe('TimeLabels', () => {
  const defaultProps = {
    businessHours: { start: 10, end: 23 },
    className: 'time-labels-test'
  }

  it('should render all time slots', () => {
    render(<TimeLabels {...defaultProps} />)
    
    // Check that time labels are rendered
    expect(screen.getByText('10am')).toBeInTheDocument()
    expect(screen.getByText('11am')).toBeInTheDocument()
    expect(screen.getByText('12pm')).toBeInTheDocument()
    expect(screen.getByText('1pm')).toBeInTheDocument()
    expect(screen.getByText('2pm')).toBeInTheDocument()
    expect(screen.getByText('3pm')).toBeInTheDocument()
    expect(screen.getByText('4pm')).toBeInTheDocument()
    expect(screen.getByText('5pm')).toBeInTheDocument()
    expect(screen.getByText('6pm')).toBeInTheDocument()
    expect(screen.getByText('7pm')).toBeInTheDocument()
    expect(screen.getByText('8pm')).toBeInTheDocument()
    expect(screen.getByText('9pm')).toBeInTheDocument()
    expect(screen.getByText('10pm')).toBeInTheDocument()
    expect(screen.getByText('11pm')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<TimeLabels {...defaultProps} />)
    
    expect(container.firstChild).toHaveClass('time-labels-column')
    expect(container.firstChild).toHaveClass('time-labels-test')
  })

  it('should have proper accessibility attributes for time labels', () => {
    render(<TimeLabels {...defaultProps} />)
    
    // Check for rowheader role on time labels
    const tenAmLabel = screen.getByRole('rowheader', { name: /10am time slot/ })
    expect(tenAmLabel).toBeInTheDocument()
    
    const elevenPmLabel = screen.getByRole('rowheader', { name: /11pm time slot/ })
    expect(elevenPmLabel).toBeInTheDocument()
  })

  it('should render correct number of time slots', () => {
    const { container } = render(<TimeLabels {...defaultProps} />)
    
    // Should have 14 time slots (10am to 11pm inclusive)
    const timeLabels = container.querySelectorAll('.time-label-cell')
    expect(timeLabels).toHaveLength(14)
  })

  it('should have correct grid positioning styles', () => {
    const { container } = render(<TimeLabels {...defaultProps} />)
    
    const timeLabels = container.querySelectorAll('.time-label-cell')
    
    // First time label should be at grid row 2 (accounting for header)
    expect(timeLabels[0]).toHaveStyle({ gridRow: '2', gridColumn: '1' })
    
    // Last time label should be at grid row 15 (2 + 13)
    expect(timeLabels[13]).toHaveStyle({ gridRow: '15', gridColumn: '1' })
  })
})