# Error Handling and Validation System Documentation

## Overview

The staff scheduling system implements a comprehensive error handling and validation system that provides consistent error management across the entire application. This system includes structured error types, validation utilities, retry mechanisms, and user-friendly error displays.

## Architecture

### Error Types (`src/types/errors.ts`)

The system uses structured error types with specific error codes for different scenarios:

```typescript
export enum ScheduleErrorCodes {
  // Validation errors
  INVALID_DATE_FORMAT = 'INVALID_DATE_FORMAT',
  INVALID_TIME_FORMAT = 'INVALID_TIME_FORMAT',
  INVALID_STAFF_ID = 'INVALID_STAFF_ID',
  INVALID_TIME_RANGE = 'INVALID_TIME_RANGE',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
  
  // Business logic errors
  SCHEDULE_CONFLICT = 'SCHEDULE_CONFLICT',
  STAFF_NOT_FOUND = 'STAFF_NOT_FOUND',
  SCHEDULE_NOT_FOUND = 'SCHEDULE_NOT_FOUND',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  PAST_DATE_SCHEDULING = 'PAST_DATE_SCHEDULING',
  
  // Authorization errors
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // System errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

### Error Structure

Each error follows a consistent structure:

```typescript
export interface ScheduleError {
  code: ScheduleErrorCodes
  message: string
  details?: any
  field?: string
  timestamp: string
  path?: string
}
```

## Validation System (`src/lib/validation.ts`)

### Core Validation Functions

- `validateDate(date: string)` - Validates date format and validity
- `validateTime(time: string)` - Validates time format (HH:MM)
- `validateStaffId(staffId: any)` - Validates staff ID is a positive integer
- `validateTimeRange(startTime: string, endTime: string)` - Validates time ranges
- `validateDateRange(startDate: string, endDate: string)` - Validates date ranges
- `validateNotPastDate(date: string)` - Prevents scheduling in the past

### Complex Validation Functions

- `validateScheduleCreate(data: ScheduleCreateData)` - Validates schedule creation data
- `validateScheduleUpdate(data: ScheduleUpdateData)` - Validates schedule update data
- `validateScheduleQuery(params: ScheduleQueryParams)` - Validates API query parameters

### Usage Example

```typescript
import { validateScheduleCreate, hasValidationErrors } from '@/lib/validation'

const scheduleData = {
  staff_id: 1,
  schedule_date: '2024-12-01',
  start_time: '09:00',
  end_time: '17:00'
}

const errors = validateScheduleCreate(scheduleData)
if (hasValidationErrors(errors)) {
  console.log('Validation failed:', errors)
} else {
  console.log('Validation passed')
}
```

## API Client with Retry Logic (`src/lib/api-client.ts`)

### Features

- **Automatic Retry**: Configurable retry logic with exponential backoff
- **Timeout Handling**: Request timeout with proper error handling
- **Error Transformation**: Converts HTTP errors to structured ScheduleError objects
- **Jitter**: Adds randomization to retry delays to prevent thundering herd

### Configuration

```typescript
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and server errors
    return [
      ScheduleErrorCodes.NETWORK_ERROR,
      ScheduleErrorCodes.TIMEOUT_ERROR,
      ScheduleErrorCodes.SERVER_ERROR,
      ScheduleErrorCodes.DATABASE_ERROR
    ].includes(error.code)
  }
}
```

### Usage Example

```typescript
import { scheduleApi } from '@/lib/api-client'

try {
  const result = await scheduleApi.getSchedules({
    staff_id: 1,
    start_date: '2024-12-01',
    end_date: '2024-12-07'
  })
  
  if (result.success) {
    console.log('Schedules:', result.data)
  }
} catch (error) {
  console.error('API Error:', error)
}
```

## Error Boundaries (`src/components/common/ErrorBoundary.tsx`)

### ErrorBoundary

General-purpose error boundary for catching JavaScript errors:

```typescript
<ErrorBoundary fallback={<CustomErrorUI />} onError={handleError}>
  <YourComponent />
</ErrorBoundary>
```

### ScheduleErrorBoundary

Specialized error boundary for schedule-related components:

```typescript
<ScheduleErrorBoundary>
  <StaffScheduleView />
</ScheduleErrorBoundary>
```

## Error Display Components (`src/components/common/ErrorDisplay.tsx`)

### ErrorDisplay

Flexible error display component with multiple variants:

```typescript
<ErrorDisplay
  error={error}
  variant="card" // 'inline' | 'card' | 'banner'
  onRetry={handleRetry}
  onDismiss={handleDismiss}
  showRetry={true}
  showDismiss={true}
/>
```

### Specialized Error Displays

- `NetworkErrorDisplay` - For network-related errors
- `ServerErrorDisplay` - For server-related errors
- `ValidationErrorDisplay` - For validation error lists

## Loading States (`src/components/common/LoadingState.tsx`)

### LoadingState

General loading component with multiple variants:

```typescript
<LoadingState
  message="Loading schedules..."
  variant="spinner" // 'spinner' | 'skeleton' | 'pulse'
  size="md" // 'sm' | 'md' | 'lg'
/>
```

### Specialized Loading States

- `ScheduleLoadingState` - For schedule views
- `StaffSelectionLoadingState` - For staff selection
- `AdminDashboardLoadingState` - For admin dashboard
- `LoadingOverlay` - For form overlays

## Form Validation Hook (`src/hooks/useFormValidation.ts`)

### useFormValidation

Provides form validation with real-time error handling:

```typescript
const {
  errors,
  hasErrors,
  isValid,
  validate,
  validateField,
  clearErrors,
  getFieldError
} = useFormValidation<ScheduleCreateData>('create')

// Validate entire form
const isFormValid = validate(formData)

// Validate single field
const isFieldValid = validateField('start_time', '09:00', formData)

// Get field error
const fieldError = getFieldError('start_time')
```

### useApiErrorHandler

Handles API calls with error management:

```typescript
const { apiError, isSubmitting, handleApiCall, clearApiError } = useApiErrorHandler()

const handleSubmit = async () => {
  await handleApiCall(
    () => scheduleApi.admin.createSchedule(formData),
    (result) => console.log('Success:', result),
    (error) => console.error('Error:', error)
  )
}
```

## Enhanced Hook (`src/hooks/useStaffSchedule.ts`)

The staff schedule hook now includes:

- **Structured Error Handling**: Returns ScheduleError objects instead of strings
- **Retry Functions**: `retryStaff()`, `retrySchedules()`, `retryTeamSchedule()`
- **Enhanced API Integration**: Uses the enhanced API client with retry logic

```typescript
const {
  staff,
  staffLoading,
  staffError, // Now ScheduleError | null
  schedules,
  schedulesLoading,
  schedulesError, // Now ScheduleError | null
  retryStaff,
  retrySchedules,
  fetchSchedules
} = useStaffSchedule()
```

## API Route Error Handling

### Enhanced Validation

API routes now use structured validation:

```typescript
// Validate query parameters
const validationErrors = validateScheduleQuery({
  staff_id: staffIdParam,
  start_date: startDate,
  end_date: endDate,
  view_mode: viewMode
})

if (validationErrors.length > 0) {
  const firstError = validationErrors[0]
  const scheduleError = createScheduleError(
    firstError.code,
    { validationErrors },
    firstError.field,
    request.url
  )
  
  return NextResponse.json({
    success: false,
    error: scheduleError,
    validationErrors
  }, { status: getHttpStatusFromErrorCode(firstError.code) })
}
```

### Consistent Error Responses

All API routes return consistent error responses:

```typescript
{
  success: false,
  error: {
    code: 'INVALID_DATE_FORMAT',
    message: 'Invalid date format. Please use YYYY-MM-DD format.',
    details: { value: '2023-13-01' },
    field: 'date',
    timestamp: '2024-01-15T10:30:00.000Z',
    path: '/api/staff-schedule/schedules'
  },
  validationErrors?: ValidationError[]
}
```

## Best Practices

### 1. Error Handling in Components

```typescript
// Use error boundaries for component-level error catching
<ScheduleErrorBoundary>
  <YourScheduleComponent />
</ScheduleErrorBoundary>

// Use ErrorDisplay for user-friendly error messages
{error && (
  <ErrorDisplay
    error={error}
    variant="card"
    onRetry={handleRetry}
  />
)}
```

### 2. Form Validation

```typescript
// Use form validation hook for real-time validation
const { validate, getFieldError, hasErrors } = useFormValidation('create')

// Validate on submit
const handleSubmit = (data) => {
  if (!validate(data)) {
    return // Show validation errors
  }
  // Proceed with submission
}

// Show field errors
<input className={getFieldError('start_time') ? 'error' : ''} />
{getFieldError('start_time') && (
  <span className="error">{getFieldError('start_time')}</span>
)}
```

### 3. API Error Handling

```typescript
// Use the enhanced API client
try {
  const result = await scheduleApi.getSchedules(params)
  if (result.success) {
    // Handle success
  }
} catch (error) {
  // Error is automatically structured as ScheduleError
  console.error('Structured error:', error)
}
```

### 4. Loading States

```typescript
// Use appropriate loading states
{isLoading ? (
  <ScheduleLoadingState />
) : error ? (
  <ErrorDisplay error={error} onRetry={retry} />
) : (
  <YourContent />
)}
```

## Testing

The system includes comprehensive tests in `src/lib/__tests__/error-handling.test.ts` covering:

- Error type creation and utilities
- Validation functions
- Integration scenarios
- Edge cases

Run tests with:
```bash
npm test error-handling
```

## Error Monitoring

In production, errors are automatically logged with:
- Error ID for tracking
- Stack traces (development only)
- Context information
- Timestamp and path

Future integration with error tracking services (Sentry, LogRocket, etc.) can be added to the ErrorBoundary components.

## Migration Guide

### From String Errors to ScheduleError

Old:
```typescript
const [error, setError] = useState<string | null>(null)
setError('Something went wrong')
```

New:
```typescript
const [error, setError] = useState<ScheduleError | null>(null)
setError(createScheduleError(ScheduleErrorCodes.SERVER_ERROR, { details }))
```

### From Manual Validation to Structured Validation

Old:
```typescript
if (!startTime || !endTime) {
  setError('Start time and end time are required')
  return
}
```

New:
```typescript
const errors = validateScheduleCreate(data)
if (hasValidationErrors(errors)) {
  setErrors(groupValidationErrorsByField(errors))
  return
}
```

This comprehensive error handling system ensures consistent, user-friendly error management throughout the staff scheduling application.