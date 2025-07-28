# Schedule Visualization Design

## Overview

The Schedule Visualization feature adds a read-only visual timeline display to the admin staff-scheduling page, positioned below the existing editable schedule grid. This component provides administrators with an intuitive hourly view of staff coverage, displaying staff schedules as colored blocks that span their working hours. The visualization uses the same design language as the staff-schedule interface to maintain consistency across the application.

## Architecture

### Component Structure

```
ScheduleVisualization/
├── ScheduleVisualizationContainer.tsx    # Main container component
├── TimelineGrid.tsx                      # Grid layout with time slots
├── StaffScheduleBlock.tsx               # Individual staff schedule blocks
├── TimelineHeader.tsx                   # Day and time headers
├── ScheduleVisualizationTypes.ts        # Type definitions
└── __tests__/                          # Component tests
```

### Data Flow

1. **Data Source**: Uses the same API endpoints and data structures as the existing admin schedule grid
2. **State Management**: Subscribes to schedule updates from the parent admin page
3. **Real-time Updates**: Automatically reflects changes made in the editable grid above
4. **Performance**: Implements virtualization for smooth rendering of large schedules

## Components and Interfaces

### ScheduleVisualizationContainer

**Purpose**: Main container that orchestrates the visualization display

**Props**:
```typescript
interface ScheduleVisualizationProps {
  scheduleData: ScheduleOverview
  staffAssignments: StaffColorAssignment[]
  weekStart: string
  loading?: boolean
  className?: string
}
```

**Responsibilities**:
- Processes raw schedule data into visualization format
- Manages responsive layout behavior
- Handles error states and loading indicators
- Coordinates updates between child components

### TimelineGrid

**Purpose**: Renders the main grid structure with time slots and day columns

**Props**:
```typescript
interface TimelineGridProps {
  weekStart: string
  businessHours: { start: number; end: number }
  scheduleBlocks: ProcessedScheduleBlock[]
  staffAssignments: StaffColorAssignment[]
  onBlockHover?: (block: ProcessedScheduleBlock | null) => void
}
```

**Features**:
- 7-column layout (Monday through Sunday)
- 13-row layout (10:00 AM to 11:00 PM)
- Responsive grid that adapts to screen size
- Hover states for better user interaction
- Accessibility support with proper ARIA labels

### StaffScheduleBlock

**Purpose**: Renders individual staff schedule blocks within the timeline

**Props**:
```typescript
interface StaffScheduleBlockProps {
  schedule: ProcessedScheduleBlock
  staffColor: StaffColorAssignment
  gridPosition: GridPosition
  duration: number
  className?: string
}
```

**Visual Design**:
- Rounded corners matching staff-schedule card design
- Staff name tab at the top of the block
- Subtle shadow and border styling
- Color consistency with existing staff color system
- Responsive text sizing

### TimelineHeader

**Purpose**: Displays day names and time labels for the grid

**Props**:
```typescript
interface TimelineHeaderProps {
  weekStart: string
  businessHours: { start: number; end: number }
  className?: string
}
```

**Layout**:
- Day headers with date numbers (matching admin grid style)
- Time labels in 12-hour format (10am, 11am, etc.)
- Sticky positioning for better usability during scrolling
- Responsive typography

## Data Models

### ProcessedScheduleBlock

```typescript
interface ProcessedScheduleBlock {
  id: string
  staffId: number
  staffName: string
  startTime: string
  endTime: string
  date: string
  location?: string
  notes?: string
  gridPosition: GridPosition
  duration: number
  isRecurring?: boolean
}
```

### GridPosition

```typescript
interface GridPosition {
  dayIndex: number      // 0-6 (Monday to Sunday)
  startRow: number      // 0-12 (10am to 11pm)
  endRow: number        // 0-12 (10am to 11pm)
  rowSpan: number       // Number of hour slots to span
}
```

### VisualizationConfig

```typescript
interface VisualizationConfig {
  businessHours: {
    start: number       // 10 (10am)
    end: number         // 23 (11pm)
  }
  timeSlotHeight: number  // Height of each hour slot in pixels
  dayColumnWidth: string  // CSS width for each day column
  blockPadding: number    // Padding inside schedule blocks
  responsive: {
    mobile: VisualizationBreakpoint
    tablet: VisualizationBreakpoint
    desktop: VisualizationBreakpoint
  }
}
```

## Error Handling

### Error States

1. **Data Loading Errors**: Display error message with retry option
2. **Invalid Schedule Data**: Show warning and skip invalid entries
3. **Rendering Errors**: Graceful fallback with error boundary
4. **Network Errors**: Offline indicator with retry mechanism

### Error Recovery

```typescript
interface ErrorHandlingStrategy {
  retryAttempts: number
  retryDelay: number
  fallbackDisplay: 'empty' | 'skeleton' | 'error'
  errorReporting: boolean
}
```

## Testing Strategy

### Unit Tests

1. **Component Rendering**: Test all components render correctly with various props
2. **Data Processing**: Verify schedule data transformation logic
3. **Grid Calculations**: Test time slot and position calculations
4. **Color Assignment**: Ensure consistent staff color mapping
5. **Responsive Behavior**: Test layout adaptation across screen sizes

### Integration Tests

1. **Data Synchronization**: Test real-time updates from parent schedule grid
2. **API Integration**: Verify data fetching and error handling
3. **User Interactions**: Test hover states and accessibility features
4. **Performance**: Measure rendering performance with large datasets

### E2E Tests

1. **Full Workflow**: Test visualization display within admin page context
2. **Cross-browser**: Ensure compatibility across different browsers
3. **Mobile Testing**: Verify touch interactions and responsive design
4. **Accessibility**: Test screen reader compatibility and keyboard navigation

## Implementation Details

### Time Slot Calculations

```typescript
function calculateGridPosition(schedule: StaffSchedule): GridPosition {
  const startHour = parseInt(schedule.start_time.split(':')[0])
  const endHour = parseInt(schedule.end_time.split(':')[0])
  const startMinutes = parseInt(schedule.start_time.split(':')[1])
  const endMinutes = parseInt(schedule.end_time.split(':')[1])
  
  // Convert to grid positions (10am = row 0, 11am = row 1, etc.)
  const startRow = startHour - 10
  const endRow = endHour - 10
  
  // Handle partial hours and calculate span
  const rowSpan = endRow - startRow + (endMinutes > 0 ? 1 : 0)
  
  return {
    dayIndex: getDayIndex(schedule.schedule_date),
    startRow: Math.max(0, startRow),
    endRow: Math.min(12, endRow),
    rowSpan: Math.max(1, rowSpan)
  }
}
```

### Responsive Design Strategy

```css
/* Mobile-first approach */
.schedule-visualization {
  /* Base mobile styles */
  font-size: 0.75rem;
  padding: 0.5rem;
}

@media (min-width: 768px) {
  .schedule-visualization {
    /* Tablet styles */
    font-size: 0.875rem;
    padding: 1rem;
  }
}

@media (min-width: 1024px) {
  .schedule-visualization {
    /* Desktop styles */
    font-size: 1rem;
    padding: 1.5rem;
  }
}
```

### Performance Optimizations

1. **Memoization**: Use React.memo for schedule blocks to prevent unnecessary re-renders
2. **Virtualization**: Implement virtual scrolling for large datasets
3. **Lazy Loading**: Load visualization only when visible in viewport
4. **Debounced Updates**: Batch schedule updates to reduce render frequency

### Accessibility Implementation

```typescript
// ARIA labels for screen readers
const getBlockAriaLabel = (schedule: ProcessedScheduleBlock): string => {
  return `${schedule.staffName} scheduled from ${formatTime(schedule.startTime)} to ${formatTime(schedule.endTime)} on ${formatDate(schedule.date)}${schedule.location ? ` at ${schedule.location}` : ''}`
}

// Keyboard navigation support
const handleKeyDown = (event: KeyboardEvent, block: ProcessedScheduleBlock) => {
  switch (event.key) {
    case 'Enter':
    case ' ':
      // Focus on block details (read-only, no action needed)
      event.preventDefault()
      break
    case 'Tab':
      // Allow natural tab navigation
      break
  }
}
```

### Color System Integration

```typescript
// Use existing staff color system
function getScheduleBlockStyles(
  staffId: number, 
  staffAssignments: StaffColorAssignment[]
): React.CSSProperties {
  const staffColor = getStaffColor(staffId, staffAssignments)
  
  return {
    backgroundColor: `var(--${staffColor.bg.replace('bg-', '')})`,
    borderColor: `var(--${staffColor.border.replace('border-', '')})`,
    color: `var(--${staffColor.text.replace('text-', '')})`
  }
}
```

### Data Synchronization

```typescript
// Listen for schedule updates from parent component
useEffect(() => {
  const processedBlocks = scheduleData.raw_schedules?.map(schedule => ({
    ...schedule,
    gridPosition: calculateGridPosition(schedule),
    duration: calculateDuration(schedule.start_time, schedule.end_time)
  })) || []
  
  setScheduleBlocks(processedBlocks)
}, [scheduleData])
```

## Design Consistency

### Visual Alignment with Staff Interface

1. **Typography**: Use same font families and sizes as staff-schedule components
2. **Color Palette**: Implement identical staff color assignments
3. **Border Radius**: Match the rounded corner styling (rounded-xl)
4. **Shadows**: Use consistent shadow depths and blur values
5. **Spacing**: Apply same padding and margin patterns

### Component Styling

```typescript
// Consistent with ScheduleCard component styling
const scheduleBlockStyles = {
  borderRadius: '0.75rem',           // rounded-xl
  border: '1px solid',               // border
  padding: '0.5rem',                 // p-2
  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', // shadow-sm
  transition: 'all 0.2s ease-in-out' // transition-all duration-200
}
```

### Layout Integration

The visualization will be positioned as a new section below the existing weekly calendar grid, maintaining the same container width and padding as other admin sections:

```typescript
// Integration within admin page layout
<div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
  {/* Existing KPI cards */}
  {/* Existing weekly hours section */}
  {/* Existing weekly calendar grid */}
  
  {/* NEW: Schedule Visualization */}
  <ScheduleVisualizationContainer
    scheduleData={overview}
    staffAssignments={staffAssignments}
    weekStart={overview.week_period.start_date}
    loading={loading}
    className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4"
  />
</div>
```