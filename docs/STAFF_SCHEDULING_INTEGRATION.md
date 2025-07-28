# Staff Scheduling System Integration

This document describes how the Staff Scheduling System integrates with existing systems in the LenGolf application.

## Overview

The Staff Scheduling System is designed to seamlessly integrate with:
1. **Staff Management System** - Uses existing staff data and status
2. **Admin Panel Navigation** - Integrated into existing admin interface
3. **Time Clock System** - Links schedules with time tracking
4. **Payroll System** - Provides schedule data for payroll calculations

## Integration Points

### 1. Staff Management System Integration

#### Data Source
- Uses existing `backoffice.staff` table as the single source of truth
- Respects `is_active` status for staff availability
- Maintains referential integrity with foreign key constraints

#### Key Components
- `src/lib/staff-integration.ts` - Utilities for consistent staff data access
- `app/api/staff-schedule/staff/route.ts` - Staff data API endpoint

#### Features
- **Consistent Data Access**: All scheduling components use the same staff data
- **Status Synchronization**: Inactive staff are handled appropriately in schedules
- **Profile Integration**: Uses staff names, IDs, and profile information

```typescript
// Example: Get active staff for scheduling
const staff = await getActiveStaffForScheduling()

// Example: Validate staff member
const isValid = await validateStaffMember(staffId)
```

### 2. Admin Panel Navigation Integration

#### Implementation
- Staff Scheduling is integrated into the existing admin dashboard
- Located in "Inventory & Operations" section alongside other management tools
- Follows consistent UI/UX patterns from existing admin components

#### Navigation Path
```
Admin Dashboard → Inventory & Operations → Staff Scheduling
```

#### Consistency Features
- Uses same design patterns as other admin pages
- Consistent loading states and error handling
- Matches existing color scheme and typography

### 3. Time Clock System Integration

#### Data Flow
1. Staff selects shift from schedule
2. Enters PIN for authentication
3. System validates timing against schedule
4. Records time entry with schedule link
5. Updates staff clock-in status

#### Key Components
- `src/lib/time-clock-integration.ts` - Time clock integration utilities
- `app/api/staff-schedule/time-clock/route.ts` - Time clock API endpoint

#### Features
- **Schedule Validation**: Prevents early/late clock-ins outside allowed windows
- **Linked Entries**: Time entries are linked to specific schedules
- **PIN Authentication**: Uses existing PIN system for security
- **Status Tracking**: Maintains current clock-in/out status

```typescript
// Example: Clock in from scheduled shift
const result = await clockInOutFromSchedule(pin, scheduleId, deviceInfo)

// Example: Get current clock status
const status = await getStaffClockStatus(staffId)
```

#### Timing Rules
- **Clock In**: Allowed 15 minutes before scheduled start time
- **Clock Out**: Allowed 30 minutes after scheduled end time
- **Validation**: Prevents clock-in after shift end time

### 4. Payroll System Integration

#### Data Availability
The scheduling system provides comprehensive data for payroll calculations:

- **Schedule Data**: Planned hours, locations, dates
- **Attendance Data**: Actual clock-in/out times
- **Variance Tracking**: Differences between scheduled and actual hours
- **Compliance Metrics**: On-time attendance rates

#### Key Components
- `src/lib/payroll-integration.ts` - Payroll data utilities
- `app/api/admin/staff-scheduling/payroll/route.ts` - Payroll API endpoint

#### Available Reports

##### Payroll Summary
```typescript
const summary = await generatePayrollSummary(startDate, endDate, staffId)
// Returns: total hours, variance, shift details
```

##### Attendance Report
```typescript
const report = await generateAttendanceReport(startDate, endDate, staffId)
// Returns: scheduled vs actual times, status, compliance
```

##### Schedule Statistics
```typescript
const stats = await getScheduleStatistics(startDate, endDate)
// Returns: coverage rates, compliance metrics, trends
```

#### Export Formats
- **JSON**: Structured data for system integration
- **CSV**: Compatible with external payroll systems

## API Endpoints

### Staff Data
```
GET /api/staff-schedule/staff
- Returns active staff formatted for UI components
- Includes names, IDs, initials, departments
```

### Time Clock Integration
```
POST /api/staff-schedule/time-clock
- Handles clock in/out from scheduled shifts
- Validates timing and links to schedules
- Returns updated clock status
```

### Payroll Data
```
GET /api/admin/staff-scheduling/payroll
- Query params: start_date, end_date, staff_id, type, format
- Types: summary, attendance, export, statistics
- Formats: json, csv
```

## Database Schema Integration

### Existing Tables Used
- `backoffice.staff` - Staff member information
- `backoffice.time_entries` - Time clock records
- `backoffice.staff_audit_log` - Audit trail

### New Tables Added
- `backoffice.staff_schedules` - Individual shift assignments
- `backoffice.staff_weekly_schedules` - Recurring patterns (optional)

### Relationships
```sql
-- Schedule references staff
staff_schedules.staff_id → staff.id

-- Time entries link to schedules via device_info
time_entries.device_info->>'schedule_id' → staff_schedules.id
```

## Security Considerations

### Access Control
- **Staff Interface**: Available to all authenticated users
- **Admin Interface**: Requires admin privileges
- **API Endpoints**: Proper authentication and authorization

### Data Protection
- **PIN Security**: Uses existing bcrypt hashing
- **Audit Logging**: All schedule changes are logged
- **Input Validation**: Server-side validation for all operations

## Performance Optimizations

### Caching Strategy
- **Staff Data**: Cached for 5 minutes (changes infrequently)
- **Schedule Data**: Cached for 1 minute (more dynamic)
- **Payroll Reports**: Cached for 5 minutes (computation intensive)

### Database Optimization
- **Indexes**: Optimized for date range queries
- **Query Efficiency**: Minimized N+1 queries
- **Connection Pooling**: Efficient database connections

## Error Handling

### Graceful Degradation
- **Database Errors**: Fallback to cached data when possible
- **Integration Failures**: Continue core functionality
- **Network Issues**: Retry mechanisms with exponential backoff

### User Experience
- **Loading States**: Clear feedback during operations
- **Error Messages**: User-friendly error descriptions
- **Fallback Options**: Alternative paths when integrations fail

## Testing Strategy

### Integration Tests
- **Cross-System Data Consistency**: Verify data integrity across systems
- **API Integration**: Test all integration endpoints
- **Error Scenarios**: Test failure modes and recovery

### Performance Tests
- **Load Testing**: Verify performance under realistic loads
- **Cache Effectiveness**: Measure cache hit rates
- **Database Performance**: Monitor query execution times

## Monitoring and Maintenance

### Health Checks
- **Integration Status**: Monitor connection to all integrated systems
- **Data Consistency**: Regular validation of cross-system data
- **Performance Metrics**: Track response times and error rates

### Maintenance Tasks
- **Cache Cleanup**: Regular cleanup of expired cache entries
- **Log Rotation**: Manage audit log growth
- **Index Maintenance**: Monitor and optimize database indexes

## Future Enhancements

### Planned Integrations
- **Notification System**: Schedule change notifications
- **Mobile App**: Native mobile application
- **Third-party Systems**: External scheduling tools

### Scalability Considerations
- **Microservices**: Potential service separation
- **Event-Driven Architecture**: Async integration patterns
- **API Versioning**: Support for multiple integration versions

## Troubleshooting

### Common Issues

#### Staff Data Not Appearing
1. Check `backoffice.staff.is_active` status
2. Verify database permissions
3. Check cache expiration

#### Time Clock Integration Failures
1. Verify PIN authentication system
2. Check schedule timing validation
3. Review device info formatting

#### Payroll Data Inconsistencies
1. Validate date range parameters
2. Check time zone handling
3. Verify schedule-time entry linking

### Debug Tools
- **API Testing**: Use provided test endpoints
- **Database Queries**: Direct database inspection
- **Log Analysis**: Review application and integration logs

## Support and Documentation

### Additional Resources
- **API Documentation**: Detailed endpoint specifications
- **Database Schema**: Complete table and relationship documentation
- **UI Components**: Component library and usage examples

### Contact Information
- **Technical Issues**: Development team
- **Business Logic**: Product management
- **Integration Support**: System administrators