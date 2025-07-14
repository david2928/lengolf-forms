# Time Clock System Documentation

## Overview

The Lengolf Forms Time Clock System is a comprehensive staff time tracking solution designed for golf academy operations. It provides PIN-based authentication, camera capture for verification, admin management capabilities, and seamless integration with payroll processing.

## System Architecture

The time clock system is built on a three-tier architecture:

### 1. Frontend Layer
- **Staff Interface**: Mobile-optimized PIN-based time tracking
- **Admin Dashboard**: Complete management and reporting interface
- **Navigation Integration**: Accessible through main navigation menu

### 2. API Layer
- **Public APIs**: PIN-authenticated staff time tracking
- **Admin APIs**: Session-authenticated management endpoints
- **Photo Management**: Secure photo storage and retrieval

### 3. Database Layer
- **Schema**: `backoffice` schema in PostgreSQL
- **Security**: Row Level Security (RLS) policies
- **Audit Trail**: Complete activity logging

## Core Features

### Staff Time Tracking Interface

#### Location: `/time-clock`
**Main Component**: `src/components/time-clock/time-clock-interface.tsx`

**Key Features**:
- **PIN-Based Authentication**: 6-digit numeric PIN with bcrypt hashing
- **Camera Integration**: Automatic photo capture for verification
- **Real-Time Clock**: Bangkok timezone display
- **Mobile Optimization**: Responsive design for all devices
- **Security Features**: Account lockout after failed attempts

**User Flow**:
1. Staff enters 6-digit PIN
2. System automatically detects clock in/out action
3. Camera captures verification photo
4. Time entry recorded with timestamp
5. Confirmation displayed to user

### Admin Management Dashboard

#### Location: `/admin/time-clock`
**Main Component**: `src/components/admin/time-clock/time-clock-admin-dashboard.tsx`

**Management Features**:
- **Time Reports**: Comprehensive reporting with date filtering
- **Staff Management**: Create, update, and manage staff records
- **Photo Management**: View and manage verification photos
- **Payroll Integration**: Export data for payroll processing
- **Analytics**: Staff productivity monitoring

### Camera Capture System

**Component**: `src/components/time-clock/camera-capture.tsx`

**Technical Features**:
- Browser MediaDevices API integration
- Ultra-compressed photo capture (240x180, 30% JPEG quality)
- Automatic camera cleanup on navigation
- Permission handling and error recovery
- Background processing for performance

## API Endpoints

### Staff Time Tracking APIs

#### POST `/api/time-clock/punch`
**Purpose**: Primary endpoint for staff time tracking
**Authentication**: PIN-based with bcrypt verification
**Features**:
- Automatic action detection (clock in vs clock out)
- Asynchronous photo processing
- Rate limiting and security controls
- Bangkok timezone handling
- Performance optimized (~1 second response)

#### GET `/api/time-clock/status/[pin]`
**Purpose**: Check current status without creating entries
**Returns**: Current clock status, lockout status, next action

### Admin Management APIs

#### GET `/api/time-clock/entries`
**Purpose**: Time entry reporting for admin dashboard
**Features**:
- Date range filtering with timezone support
- Staff filtering and pagination
- Photo URL generation
- Summary statistics

#### Staff Management APIs
- `GET/POST /api/staff` - Staff CRUD operations
- `PUT /api/staff/[id]` - Staff updates
- `POST /api/staff/[id]/reset-pin` - PIN reset functionality
- `POST /api/staff/[id]/unlock` - Account unlock

#### Photo Management APIs
- `GET /api/admin/photo-management/photos` - Photo listing
- `DELETE /api/admin/photo-management/photos/[id]` - Photo deletion
- `POST /api/admin/photo-management/cleanup` - Bulk cleanup
- `GET /api/admin/photo-management/stats` - Storage statistics

## Database Schema

### Core Tables

#### backoffice.staff
```sql
CREATE TABLE backoffice.staff (
  id SERIAL PRIMARY KEY,
  staff_name TEXT NOT NULL,
  staff_id TEXT UNIQUE,
  pin_hash TEXT NOT NULL,        -- bcrypt hashed 6-digit PIN
  is_active BOOLEAN DEFAULT true,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### backoffice.time_entries
```sql
CREATE TABLE backoffice.time_entries (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES backoffice.staff(id),
  action TEXT NOT NULL CHECK (action IN ('clock_in', 'clock_out')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  photo_url TEXT,               -- Supabase storage path
  photo_captured BOOLEAN DEFAULT false,
  camera_error TEXT,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### backoffice.staff_audit_log
```sql
CREATE TABLE backoffice.staff_audit_log (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER REFERENCES backoffice.staff(id),
  action_type TEXT NOT NULL,
  changed_by_type TEXT NOT NULL,
  changed_by_identifier TEXT NOT NULL,
  changes_summary TEXT,
  old_data_snapshot JSONB,
  new_data_snapshot JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Security Features

### PIN-Based Authentication
- **6-digit numeric PINs** with bcrypt hashing (12 rounds)
- **Account lockout** after 10 failed attempts (60-minute duration)
- **Warning system** at 9 attempts
- **No PIN storage** - only hashed versions in database

### Photo Security
- **Dedicated storage bucket** (`time-clock-photos`) in Supabase
- **Admin-only access** to photo management
- **30-day retention policy** with automatic cleanup
- **Signed URL generation** for secure access

### API Security
- **NextAuth.js session validation** for admin endpoints
- **Role-based access control** for different user types
- **Rate limiting** and brute force protection
- **Comprehensive input validation** on all endpoints

### Database Security
- **Row Level Security (RLS)** policies on all tables
- **Service role isolation** for admin operations
- **Schema separation** (`backoffice`) for data organization
- **Complete audit logging** for all actions

## Performance Optimizations

### Performance Improvement History
The system underwent comprehensive optimization through multiple phases:

1. **Phase 1**: Eliminated redundant status API call (2-3s improvement)
2. **Phase 2**: Asynchronous photo processing (2-3s improvement)
3. **Phase 4**: Ultra photo compression (0.3s improvement)
4. **Phase 5**: Database query optimization (0.5-1s improvement)
5. **Phase 5.5**: Streamlined device info collection (0.05-0.1s improvement)

**Total Performance Improvement**: 83% faster (6s → 1s response time)

### Current Performance Characteristics
- **PIN Verification**: 0.5s (parallel processing)
- **Photo Processing**: 0s (async background)
- **Photo Transfer**: 0.2s (compressed files)
- **Database Operations**: 0.3s (background cleanup)
- **Total Response Time**: ~1 second

### Technical Optimizations
- **Parallel Operations**: PIN verification and photo processing
- **Background Processing**: Photo upload and database cleanup
- **Ultra Compression**: 240x180 resolution, 30% JPEG quality (65% smaller files)
- **Strategic Indexing**: Optimized database queries for performance

## Integration Points

### Navigation Integration
**Location**: `src/config/menu-items.ts`
- Staff Time Clock menu item in main navigation
- Available to all authenticated users (non-admin only in mobile view)
- Uses Timer icon for easy recognition

### Admin Dashboard Integration
- Located in admin dashboard under "Inventory & Operations"
- Direct access at `/admin/time-clock`
- Comprehensive management interface

### Payroll System Integration
**Location**: `src/components/admin/payroll/*`
- Time entries feed into monthly payroll calculations
- Holiday hours tracking and management
- Service charge integration based on time worked
- Review and audit capabilities for payroll administrators

## File Structure

### Frontend Components
```
src/components/
├── time-clock/
│   ├── time-clock-interface.tsx     # Main staff interface
│   ├── time-clock-dashboard.tsx     # Dashboard component
│   ├── camera-capture.tsx           # Camera functionality
│   └── numeric-keypad.tsx           # PIN entry keypad
└── admin/
    ├── time-clock/
    │   ├── time-clock-admin-dashboard.tsx  # Admin dashboard
    │   └── time-clock-error-boundary.tsx   # Error handling
    └── payroll/                     # Payroll integration components
```

### API Routes
```
app/api/
├── time-clock/
│   ├── punch/route.ts               # Main punch API
│   ├── entries/route.ts             # Time entries API
│   ├── status/[pin]/route.ts        # Status check API
│   └── photos/url/route.ts          # Photo URL API
└── admin/
    ├── payroll/                     # Payroll integration APIs
    └── photo-management/            # Photo management APIs
```

### Utility Libraries
```
src/lib/
├── staff-utils.ts                   # Core staff utilities
├── photo-storage.ts                 # Photo management
├── time-calculation.ts              # Time calculations
└── payroll-calculations.ts          # Payroll integration
```

### Type Definitions
```
src/types/
└── staff.ts                         # TypeScript interfaces
```

## Error Handling

### User-Facing Errors
- **Invalid PIN**: Clear feedback with attempt counter
- **Camera Errors**: Graceful fallback with error messages
- **Network Issues**: Retry mechanisms and offline handling
- **Account Lockout**: Clear messaging and unlock procedures

### System Error Logging
- **API Errors**: Comprehensive logging for debugging
- **Database Errors**: Connection and query error handling
- **Photo Processing**: Upload and storage error recovery
- **Performance Monitoring**: Response time and failure tracking

## Development Features

### Authentication Bypass
For development environments with `SKIP_AUTH=true`:
- Direct access to all time clock features
- Bypasses session authentication for testing
- Maintains security in production environments

### Debug Tools
- Comprehensive logging for development
- Performance monitoring and optimization tools
- Database debugging utilities
- Photo management debugging interfaces

## Production Deployment

### Environment Requirements
- **Node.js**: Version 18 or higher
- **Database**: PostgreSQL with Supabase
- **Storage**: Supabase Storage for photo management
- **Authentication**: NextAuth.js with session management

### Configuration
```env
# Required environment variables
NEXT_PUBLIC_REFAC_SUPABASE_URL=your_supabase_url
REFAC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
```

### Production Optimizations
- **Photo Compression**: Automatic optimization for storage efficiency
- **Database Indexing**: Strategic indexes for query performance
- **Caching**: Response caching for frequently accessed data
- **Monitoring**: Performance and error monitoring

## Maintenance and Monitoring

### Regular Maintenance Tasks
- **Photo Cleanup**: 30-day retention policy enforcement
- **Database Optimization**: Index maintenance and query optimization
- **Security Audits**: Regular review of access controls and permissions
- **Performance Monitoring**: Response time and resource usage tracking

### Monitoring Metrics
- **Response Times**: API endpoint performance tracking
- **Error Rates**: System error frequency and types
- **Storage Usage**: Photo storage utilization
- **User Activity**: Staff time tracking usage patterns

## Future Enhancement Opportunities

### Technical Improvements
1. **Advanced Caching**: Redis integration for improved performance
2. **Photo Optimization**: WebP format support for better compression
3. **Real-time Updates**: WebSocket integration for live status updates
4. **Mobile App**: Native mobile application for enhanced staff experience

### Feature Enhancements
1. **Facial Recognition**: Enhanced security with photo verification
2. **Geofencing**: Location-based clock in restrictions
3. **Advanced Reporting**: Business intelligence and analytics
4. **Integration Expansion**: Additional payroll and HR system integrations

### Security Enhancements
1. **Two-Factor Authentication**: Enhanced security options
2. **Biometric Integration**: Fingerprint or facial recognition
3. **Advanced Audit Logging**: More detailed activity tracking
4. **Compliance Features**: Industry-specific compliance support

---

## Quick Reference

### Staff Usage
1. Navigate to `/time-clock`
2. Enter 6-digit PIN
3. System automatically detects clock in/out
4. Camera captures verification photo
5. Confirm action completion

### Admin Management
1. Access `/admin/time-clock`
2. View time reports and staff activity
3. Manage staff records and PINs
4. Review and manage photos
5. Export data for payroll processing

### API Integration
- Use PIN-based authentication for staff endpoints
- Session authentication required for admin endpoints
- Photo URLs generated with signed access for security
- Comprehensive error handling and response codes

**Last Updated**: July 2025  
**System Status**: Production Ready  
**Performance**: Optimized for sub-second response times