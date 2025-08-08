# Staff Management System Documentation

## Overview

The Lengolf Forms Staff Management System provides comprehensive employee administration capabilities including staff records management, time tracking integration, payroll processing, and performance analytics. This system serves as the central hub for all staff-related operations in the golf academy.

## System Architecture

### Core Components
1. **Staff Records Management**: Complete employee lifecycle management
2. **Time Clock Integration**: Seamless time tracking and attendance
3. **Payroll Processing**: Automated payroll calculations and reporting
4. **Performance Analytics**: Staff productivity and performance monitoring
5. **Admin Controls**: Comprehensive administrative oversight

## Staff Records Management

### Staff Database Schema

#### Primary Table: `backoffice.staff`
```sql
CREATE TABLE backoffice.staff (
  id SERIAL PRIMARY KEY,
  staff_name TEXT NOT NULL,
  staff_id TEXT UNIQUE,
  pin_hash TEXT NOT NULL,        -- bcrypt hashed 6-digit PIN
  is_active BOOLEAN DEFAULT true,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ NULL,
  compensation_type TEXT CHECK (compensation_type IN ('salary', 'hourly')),
  base_salary DECIMAL(10,2),
  hourly_rate DECIMAL(10,2),
  daily_allowance DECIMAL(10,2),
  service_charge_eligible BOOLEAN DEFAULT false,
  hire_date DATE,
  department TEXT,
  position TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Staff Management Features

#### 1. Staff Creation and Onboarding
**Location**: `/admin/staff-management`
**API**: `POST /api/staff`

**Features**:
- Complete employee profile creation
- PIN generation and secure hashing
- Compensation setup (salary vs hourly)
- Department and position assignment
- Service charge eligibility configuration

**Onboarding Process**:
1. Admin creates staff record with basic information
2. System generates secure 6-digit PIN
3. Compensation type and rates configured
4. Time clock access automatically enabled
5. Initial orientation tracking setup

#### 2. Staff Profile Management
**Components**: `src/components/admin/staff/staff-profile-manager.tsx`

**Profile Information**:
- **Personal Details**: Name, staff ID, hire date
- **Position Information**: Department, role, responsibilities
- **Compensation Details**: Salary, hourly rate, allowances
- **Access Controls**: System permissions and restrictions
- **Contact Information**: Phone, email, emergency contacts

#### 3. Staff Directory and Search
**Features**:
- **Advanced Search**: Name, department, position, status filtering
- **Staff Listing**: Comprehensive staff directory with status indicators
- **Quick Actions**: Direct access to common administrative tasks
- **Bulk Operations**: Mass updates and administrative actions

## Time Clock Integration

### Staff Time Tracking
**Integration**: Seamless connection with Time Clock System
**Documentation**: See [TIME_CLOCK_SYSTEM.md](./TIME_CLOCK_SYSTEM.md)

#### Time Entry Management
- **Automatic Tracking**: PIN-based clock in/out with photo verification
- **Manual Adjustments**: Admin override capabilities for corrections
- **Break Tracking**: Lunch and break period management
- **Overtime Detection**: Automatic identification of overtime hours

#### Attendance Monitoring
- **Real-time Status**: Current clock in/out status for all staff
- **Attendance Patterns**: Historical attendance analysis
- **Absence Tracking**: Sick leave, vacation, and absence management
- **Late Arrival Alerts**: Automated notifications for tardiness

### Time Entry Corrections
**Location**: `/admin/time-clock/corrections`
**API**: `PUT /api/admin/time-entries/[id]`

**Correction Features**:
- **Manual Time Adjustments**: Correct clock in/out times
- **Break Period Additions**: Add missed break periods
- **Overtime Approval**: Review and approve overtime hours
- **Audit Trail**: Complete history of all time corrections

## Payroll Integration

### Payroll Processing System
**Location**: `/admin/payroll`
**Components**: `src/components/admin/payroll/*`

#### Monthly Payroll Calculations
**API**: `GET /api/admin/payroll/[month]/calculations`

**Calculation Components**:
- **Base Pay**: Salary or hourly wage calculations
- **Overtime Pay**: Time-and-a-half for overtime hours
- **Holiday Pay**: Special rate for holiday work
- **Daily Allowances**: Per-day allowance payments
- **Service Charges**: Customer service charge distribution

#### Payroll Reports
**Features**:
- **Monthly Summaries**: Complete payroll overview by month
- **Individual Reports**: Detailed breakdown per staff member
- **Tax Calculations**: Automated tax and deduction computations
- **Export Capabilities**: CSV/Excel export for external processing

### Compensation Management

#### Salary Staff
**Configuration**:
- **Monthly Base Salary**: Fixed monthly compensation
- **Daily Allowance**: Additional per-day payments
- **Service Charge Eligibility**: Customer service charge participation
- **Holiday Rates**: Special compensation for holiday work

#### Hourly Staff
**Configuration**:
- **Hourly Rate**: Base hourly wage
- **Regular Hours**: Standard work hour tracking
- **Overtime Multiplier**: Overtime rate calculation (typically 1.5x)
- **Daily Allowance**: Per-day allowance supplements

### Service Charge Distribution
**Location**: `src/components/admin/payroll/service-charge-manager.tsx`

**Distribution Logic**:
- **Eligibility Criteria**: Service charge participation requirements
- **Equal Distribution**: Fair distribution among eligible staff
- **Monthly Allocation**: Service charge pool distribution
- **Transparency**: Clear reporting of distribution calculations

## Performance Analytics

### Staff Performance Metrics
**Location**: `/admin/staff-analytics`
**API**: `GET /api/admin/staff/analytics`

#### Key Performance Indicators
- **Attendance Rate**: Regular attendance percentage
- **Punctuality Score**: On-time arrival tracking
- **Overtime Hours**: Overtime usage patterns
- **Productivity Metrics**: Work efficiency indicators
- **Service Ratings**: Customer service performance

#### Performance Reports
**Features**:
- **Individual Dashboards**: Personal performance tracking
- **Department Comparisons**: Team performance analysis
- **Trend Analysis**: Historical performance trends
- **Goal Tracking**: Performance target monitoring

### Productivity Analysis
**Components**: `src/components/admin/analytics/staff-productivity.tsx`

**Analytics Features**:
- **Work Hour Analysis**: Detailed time utilization
- **Efficiency Metrics**: Output per hour calculations
- **Comparative Analysis**: Staff performance comparisons
- **Improvement Recommendations**: Actionable insights

## Administrative Controls

### Staff Account Management
**Location**: `/admin/staff-management/accounts`

#### Account Security
- **PIN Management**: PIN reset and security controls
- **Account Lockouts**: Security lockout management
- **Access Permissions**: System access control
- **Security Auditing**: Account activity monitoring

#### Account Actions
- **Reset PIN**: Generate new secure PIN for staff member
- **Unlock Account**: Remove security lockouts
- **Deactivate Account**: Temporary account suspension
- **Archive Account**: Permanent account archival

### Bulk Operations
**Features**:
- **Mass Updates**: Bulk staff record updates
- **Department Transfers**: Mass department reassignments
- **Salary Adjustments**: Bulk compensation updates
- **System Notifications**: Mass communication capabilities

## API Endpoints

### Staff Management APIs

#### GET `/api/staff`
**Purpose**: List all staff members with filtering
**Authentication**: Admin session required
**Parameters**:
- `active`: Filter by active status
- `department`: Filter by department
- `search`: Search by name or staff ID

#### POST `/api/staff`
**Purpose**: Create new staff member
**Authentication**: Admin session required
**Payload**:
```json
{
  "staff_name": "Employee Name",
  "staff_id": "STAFF001",
  "compensation_type": "hourly",
  "hourly_rate": 200.00,
  "department": "Pro Shop",
  "position": "Sales Associate"
}
```

#### PUT `/api/staff/[id]`
**Purpose**: Update staff member information
**Authentication**: Admin session required

#### DELETE `/api/staff/[id]`
**Purpose**: Archive staff member (soft delete)
**Authentication**: Admin session required

### Payroll APIs

#### GET `/api/admin/payroll/[month]/calculations`
**Purpose**: Generate monthly payroll calculations
**Returns**: Complete payroll data including individual and summary information

#### POST `/api/admin/payroll/[month]/approve`
**Purpose**: Approve monthly payroll for processing
**Authentication**: Admin session required

### Analytics APIs

#### GET `/api/admin/staff/analytics`
**Purpose**: Retrieve staff performance analytics
**Parameters**:
- `period`: Analysis period (month, quarter, year)
- `staff_id`: Specific staff member analysis
- `department`: Department-specific analytics

## Security and Compliance

### Data Security
- **Encrypted Storage**: All sensitive data encrypted at rest
- **Secure Transmission**: HTTPS encryption for all communications
- **Access Controls**: Role-based access to sensitive information
- **Audit Logging**: Complete activity audit trails

### Privacy Compliance
- **Data Minimization**: Only necessary data collection
- **Access Restrictions**: Limited access to personal information
- **Data Retention**: Appropriate data retention policies
- **Employee Consent**: Clear data usage policies

### Financial Security
- **Payroll Protection**: Secure payroll data handling
- **Compensation Privacy**: Restricted access to salary information
- **Audit Trails**: Complete financial transaction logging
- **Reconciliation**: Regular financial data verification

## Integration Points

### Time Clock System
**Integration**: Complete bi-directional integration
- Time entries automatically feed into payroll calculations
- Staff records synchronized between systems
- Real-time attendance monitoring and reporting

### Admin Dashboard
**Location**: `/admin`
- Staff management accessible from main admin panel
- Quick access to common staff operations
- Integrated reporting and analytics

### Payroll Systems
**External Integration Points**:
- CSV export for external payroll processing
- API endpoints for third-party payroll integration
- Standardized data formats for system compatibility

## File Structure

### Admin Components
```
src/components/admin/
├── staff/
│   ├── staff-manager.tsx              # Main staff management interface
│   ├── staff-profile-editor.tsx       # Staff profile editing
│   ├── staff-list.tsx                 # Staff directory listing
│   └── staff-onboarding.tsx           # New staff onboarding
├── payroll/
│   ├── payroll-overview-table.tsx     # Monthly payroll display
│   ├── payroll-calculator.tsx         # Payroll calculation engine
│   ├── service-charge-manager.tsx     # Service charge distribution
│   └── compensation-settings.tsx      # Compensation configuration
└── analytics/
    ├── staff-performance.tsx          # Performance analytics
    ├── attendance-analytics.tsx       # Attendance reporting
    └── productivity-metrics.tsx       # Productivity analysis
```

### API Routes
```
app/api/
├── staff/
│   ├── route.ts                       # Staff CRUD operations
│   ├── [id]/route.ts                  # Individual staff operations
│   ├── [id]/reset-pin/route.ts        # PIN reset functionality
│   └── [id]/unlock/route.ts           # Account unlock
├── admin/
│   ├── payroll/
│   │   ├── [month]/calculations/route.ts  # Payroll calculations
│   │   └── [month]/approve/route.ts       # Payroll approval
│   └── staff/
│       ├── analytics/route.ts         # Staff analytics
│       └── performance/route.ts       # Performance metrics
```

### Database Schema Files
```
scripts/
├── staff-management-schema.sql        # Complete staff tables
├── payroll-integration.sql            # Payroll calculation functions
└── staff-analytics-views.sql          # Analytics database views
```

## Development and Testing

### Development Environment
**Setup Requirements**:
- Local Supabase instance with staff schema
- Admin authentication configured
- Test staff records for development

### Testing Scenarios
1. **Staff Onboarding**: Complete new employee setup
2. **Payroll Processing**: Monthly payroll calculation testing
3. **Performance Analytics**: Analytics data generation and reporting
4. **Security Testing**: Access control and data protection validation

### Development Tools
- **Database Seeding**: Test staff data generation
- **Mock Data**: Representative test datasets
- **Performance Testing**: System load and response time testing

## Maintenance and Operations

### Regular Maintenance
- **Data Cleanup**: Archive inactive staff records
- **Performance Monitoring**: System performance tracking
- **Security Audits**: Regular security review and updates
- **Backup Verification**: Data backup integrity checks

### Operational Procedures
- **Monthly Payroll**: Standardized payroll processing workflow
- **Staff Updates**: Regular staff information maintenance
- **Performance Reviews**: Scheduled performance evaluation cycles
- **System Updates**: Regular system maintenance and updates

## Future Enhancement Opportunities

### Technical Improvements
1. **Mobile App**: Native mobile app for staff self-service
2. **Real-time Notifications**: Push notifications for important updates
3. **Advanced Analytics**: Machine learning-powered insights
4. **API Expansion**: Additional integration capabilities

### Feature Enhancements
1. **Self-Service Portal**: Staff self-service capabilities
2. **Advanced Scheduling**: Shift scheduling and management
3. **Performance Goals**: Goal setting and tracking system
4. **Training Management**: Employee training and certification tracking

### Integration Expansions
1. **HR Systems**: Additional HR platform integrations
2. **Benefits Management**: Employee benefits administration
3. **Document Management**: Employee document storage and management
4. **Communication Tools**: Enhanced staff communication features

---

## Quick Reference

### Common Administrative Tasks

#### Adding New Staff Member
1. Navigate to `/admin/staff-management`
2. Click "Add New Staff"
3. Fill in employee information and compensation details
4. Generate secure PIN
5. Activate time clock access

#### Processing Monthly Payroll
1. Access `/admin/payroll`
2. Select target month
3. Review time entries and calculations
4. Approve service charge distribution
5. Export payroll data for processing

#### Managing Staff Performance
1. Open `/admin/staff-analytics`
2. Select staff member or department
3. Review performance metrics and trends
4. Generate performance reports
5. Set performance improvement goals

### API Quick Reference
- **Staff CRUD**: `/api/staff` endpoints
- **Payroll Data**: `/api/admin/payroll/[month]/calculations`
- **Performance Analytics**: `/api/admin/staff/analytics`
- **Time Clock Integration**: `/api/time-clock/*` endpoints

**Last Updated**: July 2025  
**System Status**: Production Ready  
**Integration**: Fully integrated with Time Clock and Payroll systems