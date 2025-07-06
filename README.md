# Lengolf Forms

A comprehensive golf academy management system providing booking, scheduling, package management, and customer relationship management capabilities.

## Overview

Lengolf Forms is a full-featured booking and management system built specifically for golf training facilities. The application provides a complete solution for managing customer bookings, scheduling across multiple golf bays, tracking customer packages, integrating with external calendar systems, and maintaining customer relationships. Built with modern web technologies including Next.js, TypeScript, Tailwind CSS, and Supabase, the system offers a robust, scalable, and user-friendly platform for golf academy operations.

### System Capabilities
- **Multi-Bay Booking Management**: Coordinate bookings across multiple golf bays with real-time availability
- **Advanced Sales Analytics**: Comprehensive business intelligence dashboard with KPIs, trends, and performance metrics
- **Package Lifecycle Management**: Create, monitor, and track customer packages with expiration alerts
- **Enhanced Calendar System**: Intelligent booking consolidation with mobile-optimized interface
- **Calendar Integration**: Seamless synchronization with Google Calendar for staff coordination
- **Real-time Notifications**: Instant notifications via LINE Messaging API for booking updates
- **Customer Relationship Management**: Integrated CRM with automated data synchronization
- **Administrative Controls**: Role-based access with dedicated admin section and analytics suite
- **Staff Authentication**: Secure authentication with admin role differentiation
- **Audit & Compliance**: Comprehensive booking history and staff action tracking
- **Responsive Design**: Optimized for both desktop and mobile usage

## Key Features

- **Enhanced Booking Management**: Create, view, edit, and manage customer bookings with tabbed interface and real-time validation
- **Customer Experience Tracking**: New customer detection, referral source tracking, and visual indicators
- **Multi-Calendar Integration**: Synchronized with Google Calendar for seamless scheduling
- **Real-time Notifications**: LINE Messaging API integration for instant booking notifications and updates
- **Advanced Package Integration**: Direct package selection within booking flow with usage tracking
- **Package Monitoring**: Track active customer packages with expiration alerts
- **Sales Analytics Dashboard**: Comprehensive business intelligence with KPIs, charts, and performance tracking
- **Administrative Dashboard**: Dedicated admin section with enhanced management tools and reporting
- **User Authentication**: Secure staff login system with admin role support
- **Advanced Calendar System**: Enhanced booking calendar with consolidation and mobile optimization
- **Employee Accountability**: Track which staff member creates or modifies bookings
- **Responsive Design**: Works on desktop and mobile devices

## Core Features & Modules

This application is composed of several key modules that provide its core functionality:

*   **User Authentication**: Secure sign-in using Google accounts with role-based access control, managed via NextAuth.js. Supports binary admin roles (user/admin). (See `app/auth/`, `src/lib/auth-config.ts`)
*   **Enhanced Booking Management**:
    *   **Booking Creation**: A comprehensive form (`app/create-booking/`, `src/components/booking-form/`) with package integration, referral tracking, and new customer detection.
    *   **Booking Management**: Advanced interface (`app/manage-bookings/`) with tabbed edit modal, visual indicators for new customers, and enhanced filtering.
    *   **Booking Editing**: Sophisticated edit capabilities with main information and additional details tabs, supporting partial edits for past bookings.
    *   **Bookings Calendar**: A visual calendar (`app/bookings-calendar/`) displays bookings across different bays, with daily navigation and real-time updates.
    *   **Customer Experience**: Automatic new customer detection, referral source tracking, and visual badges for improved customer service.
    *   **API**: Enhanced backend logic for creating, updating, and retrieving bookings with new fields (`app/api/bookings/`).
*   **Package Management**:
    *   **Package Creation**: A form (`app/create-package/`, `src/components/package-form/`, `src/hooks/usePackageForm.ts`) for creating new customer packages.
    *   **Package Usage**: Functionality to record and update the usage of customer packages (`app/update-package/`, `src/components/package-usage/`).
    *   **Package Monitoring**: A dashboard (`app/package-monitor/`, `src/hooks/use-package-monitor.ts`) to track active "Unlimited" packages and those nearing expiration.
    *   **API**: Endpoints for package data (`app/api/packages/`).
*   **Administrative System**:
    *   **Admin Dashboard**: A dedicated admin section (`app/admin/`) with overview of system management tools and future expansion capabilities.
    *   **Admin Authentication**: Role-based access control with `isUserAdmin()` function and middleware protection.
    *   **Admin Navigation**: Conditional admin menu items in the main navigation for privileged users.
*   **Customer Data Management**:
    *   **CRM Integration**: An API endpoint (`app/api/crm/update-customers/`) triggers a Google Cloud Run service to refresh customer data.
    *   **Data Hooks**: Custom hooks (`src/hooks/useCustomers.ts`, `src/hooks/use-customers.ts`) for fetching customer lists.
*   **Notifications**: Integration with LINE Messaging API (`src/lib/line-messaging.ts`) for sending real-time notifications, likely triggered via API routes in `app/api/notify/`.
*   **Google Services Integration**:
    *   **Google Calendar**: Synchronization for bookings (`src/lib/google-calendar.ts`).
    *   **Google Sheets**: Potential data exchange with Google Sheets (`src/lib/google-sheets-service.ts`).
*   **Navigation & UI**:
    *   **Main Navigation**: A responsive navigation bar (`src/components/nav.tsx`) provides access to all features with conditional admin menus.
    *   **UI Components**: A rich set of reusable UI components is available in `src/components/ui/`, based on Shadcn/UI principles.

For a more detailed breakdown of the entire codebase structure, refer to the [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) file.

### Future Admin Framework

The current admin implementation serves as a foundation for a comprehensive administrative system. A detailed framework for expanding admin capabilities is documented in [ADMIN_FRAMEWORK.md](docs/ADMIN_FRAMEWORK.md), which outlines:

- **Hierarchical Role System**: Staff/Admin/Super Admin role progression
- **Advanced Permission System**: Granular feature-level permissions
- **Enhanced Admin Features**: Analytics, inventory management, staff management
- **API Route Organization**: Structured API endpoints by access level
- **Audit & Compliance**: Comprehensive action logging and security measures

The framework provides a roadmap for scalable administrative functionality while maintaining backward compatibility with existing operations.

## Tech Stack

### Frontend Technologies
- **Framework**: Next.js 14.2.20 (App Router)
- **Language**: TypeScript 5.3.3
- **Styling**: Tailwind CSS 3.4.1
- **UI Components**: Radix UI, Shadcn/UI
- **Forms**: React Hook Form 7.50.0
- **State Management**: SWR 2.2.5, React Context
- **Date Handling**: date-fns 3.6.0, date-fns-tz 3.2.0

### Backend Technologies
- **Runtime**: Node.js (Serverless Functions)
- **API Framework**: Next.js API Routes
- **Database**: PostgreSQL (via Supabase 2.47.6)
- **Authentication**: NextAuth.js 4.24.7
- **Caching**: NodeCache 5.1.2
- **File Processing**: CSV Parser 3.2.0

### External Integrations
- **Calendar**: Google Calendar API (googleapis 144.0.0)
- **Messaging**: LINE Messaging API
- **Authentication Provider**: Google OAuth 2.0
- **Cloud Services**: Google Cloud Run
- **CRM Integration**: Custom Cloud Run service

### Infrastructure & Deployment
- **Hosting**: Vercel (Serverless)
- **Database Hosting**: Supabase (Managed PostgreSQL)
- **CDN**: Vercel Edge Network
- **Environment**: Production, Staging environments

## Project Structure

For a detailed explanation of the codebase structure, please refer to the [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) file.

For comprehensive backend documentation including API endpoints, database schema, and integration details, see [BACKEND_DOCUMENTATION.md](BACKEND_DOCUMENTATION.md).

## Documentation

Comprehensive documentation for the Lengolf Forms system is available in the `docs/` directory. The documentation is organized into logical sections to serve different audiences and use cases:

### 📚 Documentation Overview

The documentation covers all aspects of the system, from high-level architecture to detailed implementation guides:

- **Complete System Coverage**: Every major feature and component is documented
- **Multi-Audience Approach**: Documentation for developers, administrators, and end users
- **Technical Deep-Dives**: Detailed technical implementation with code examples
- **Business Logic Documentation**: Clear explanation of business rules and workflows
- **Integration Guides**: Comprehensive coverage of external system integrations

### 🗂️ Documentation Structure

**Core System Documentation:**
- **[docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)** - Complete codebase structure and organization
- **[docs/BACKEND_DOCUMENTATION.md](docs/BACKEND_DOCUMENTATION.md)** - API endpoints, database, and server-side architecture
- **[docs/frontend/FRONTEND_OVERVIEW.md](docs/frontend/FRONTEND_OVERVIEW.md)** - Component architecture, hooks, and UI patterns
- **[docs/technical/DATABASE_SCHEMA.md](docs/technical/DATABASE_SCHEMA.md)** - Complete database structure and relationships

**Feature Documentation:**
- **[docs/features/BOOKING_SYSTEM.md](docs/features/BOOKING_SYSTEM.md)** - Complete booking management workflow with multi-step creation, calendar integration, and audit trails
- **[docs/features/PACKAGE_MANAGEMENT.md](docs/features/PACKAGE_MANAGEMENT.md)** - Customer packages, usage tracking, expiration monitoring, and unlimited package support
- **[docs/features/ADMIN_PANEL.md](docs/features/ADMIN_PANEL.md)** - Administrative interface with role-based access and business intelligence tools
- **[docs/features/SALES_DASHBOARD.md](docs/features/SALES_DASHBOARD.md)** - Comprehensive analytics with KPIs, charts, and flexible date filtering

### 🎯 Documentation Highlights

**Comprehensive Feature Coverage:**
- **Booking System**: Multi-step booking creation, management, calendar integration, cancellation workflows
- **Package Management**: Creation, monitoring, usage tracking, expiration alerts for both time-based and unlimited packages
- **Admin System**: Role-based access control, sales analytics, business intelligence dashboard
- **Calendar Integration**: Google Calendar synchronization, booking consolidation, mobile optimization
- **Database Design**: Complete schema documentation with relationships, functions, and performance considerations

**Technical Implementation Details:**
- **API Documentation**: All endpoints with request/response examples and business logic
- **Database Schema**: Complete table structures, relationships, and stored procedures
- **Frontend Architecture**: Component organization, state management, and UI patterns
- **Integration Points**: External API integrations including Google Calendar and LINE Messaging

**Business Logic Documentation:**
- **Booking Rules**: Validation, time slot management, package integration
- **Package Lifecycle**: Creation, activation, usage tracking, expiration management
- **Admin Controls**: Access control, audit trails, analytics configuration
- **User Workflows**: Step-by-step processes for all major operations

### 📖 Quick Navigation

- **For Developers**: Start with [docs/DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md) → [Frontend Overview](docs/frontend/FRONTEND_OVERVIEW.md) → [Backend Documentation](docs/BACKEND_DOCUMENTATION.md)
- **For System Administrators**: [Admin Panel](docs/features/ADMIN_PANEL.md) → [Sales Dashboard](docs/features/SALES_DASHBOARD.md) → [Database Schema](docs/technical/DATABASE_SCHEMA.md)
- **For Feature Understanding**: [Booking System](docs/features/BOOKING_SYSTEM.md) → [Package Management](docs/features/PACKAGE_MANAGEMENT.md)
- **For Integration Work**: [Backend Documentation](docs/BACKEND_DOCUMENTATION.md) → [Database Schema](docs/technical/DATABASE_SCHEMA.md)

The documentation is maintained alongside the codebase and updated with each major feature release to ensure accuracy and completeness.

## Recent Changes

### Booking System Bug Fixes and Enhancements (January 2025)

Fixed critical issues in the booking management system to improve data accuracy and user experience:

**Bugs Fixed:**
- **LINE Notification Duration Bug**: Fixed incorrect duration change notifications when only editing other fields (e.g., referral source). The system was incorrectly showing "Duration: 60h → 1h" due to unit conversion mismatches between frontend (minutes) and database (hours).
- **Bay Selection Availability**: Fixed issue where users couldn't switch bays when editing bookings because the system wasn't checking real availability for other bays.

**Technical Improvements:**
- **Proper Unit Conversion**: Implemented consistent duration handling throughout the system, ensuring proper conversion between minutes (frontend) and hours (database)
- **Smart Change Detection**: Enhanced the booking update API to only update fields that actually changed, preventing false change notifications
- **Real-time Bay Availability**: Edit modal now fetches actual availability for all bays on open, allowing users to see which bays are available for switching
- **Performance Optimization**: Reduced redundant availability checks and improved state management in the edit booking modal

**Code Quality:**
- Removed all debug console.log statements from production code
- Improved error handling and validation
- Enhanced documentation for booking editing system

### Sales Dashboard Implementation (June 2025)

A comprehensive sales analytics dashboard has been added to the admin section, providing detailed insights into business performance:

**Key Features:**
- **Advanced Analytics**: Real-time KPI tracking with revenue, bookings, and customer metrics
- **Interactive Charts**: Multiple chart types including trend analysis, category breakdowns, and utilization rates
- **Flexible Date Filtering**: Support for various date presets (today, last 7/30 days, month-to-date, year-to-date)
- **Comparison Analysis**: Period-over-period comparisons with previous periods, months, or years
- **Bay Utilization Tracking**: Simulator usage statistics across all golf bays
- **Revenue Trends**: Historical revenue analysis with growth tracking
- **Customer Growth Analytics**: New customer acquisition and retention metrics
- **Payment Method Analysis**: Breakdown of payment preferences and trends
- **Category Performance**: Detailed analysis of different booking types and packages
- **Export Capabilities**: Data export functionality for reporting
- **Mobile Responsive**: Optimized for desktop and mobile viewing

**Technical Implementation:**
- New API endpoints: `/api/dashboard/summary`, `/api/dashboard/charts`, `/api/sales/flexible-analytics`
- Custom React hooks for data fetching and state management
- Recharts integration for interactive data visualization
- Real-time data updates with SWR caching
- Error handling and loading states
- Modular component architecture

### Calendar System Enhancements (June 2025)

Significant improvements have been made to the bookings calendar system:

**Booking Consolidation:**
- Intelligent merging of adjacent bookings from the same customer
- Improved visual representation of continuous booking periods
- Better handling of booking overlaps and time slot management

**Enhanced User Experience:**
- Mobile-responsive calendar interface
- Improved date navigation with calendar picker
- Real-time booking updates and refresh capabilities
- Better error handling and loading states

**Performance Optimizations:**
- Optimized database queries for faster loading
- Improved client-side booking processing
- Enhanced date/time formatting and timezone handling

### Booking Cancellation System Improvements (June 2025)

Enhanced booking cancellation functionality with improved reliability:

**Staff-Initiated Cancellations:**
- Mandatory employee identification for audit trails
- Optional cancellation reason tracking
- Comprehensive booking history logging

**Google Calendar Integration:**
- Automatic deletion of linked calendar events
- Improved error handling for calendar sync failures
- Status tracking for calendar event deletions
- Partial deletion recovery mechanisms

**Audit and Compliance:**
- Detailed cancellation logging with before/after snapshots
- Staff action tracking for accountability
- Enhanced error reporting and debugging

### LINE Messaging API Migration

We've recently migrated from LINE Notify to LINE Messaging API due to the upcoming discontinuation of LINE Notify. The migration includes:

- Implementation of a new LINE Messaging client that supports text and flex messages
- Multi-group notification support:
  - Default group (receives all notifications)
  - Ratchavin coaching group (receives Ratchavin coaching notifications)
  - General coaching group (receives other coaching notifications)
- Enhanced error handling with detailed logging
- Complete removal of the deprecated LINE Notify functionality

### CRM Integration Migration

The customer data synchronization has been migrated from a separate Google Cloud Run service to an integrated API endpoint:

- **New Endpoint**: `/api/crm/sync-customers` - Direct integration within the Next.js application
- **Automated Sync**: Daily Supabase cron job at 2:00 AM Thailand time
- **Manual Sync**: "Update Customer Data" button on the main dashboard
- **Technology**: Playwright for browser automation, integrated data processing
- **Benefits**: Simplified architecture, reduced costs, improved reliability

### Package Monitor

A new package monitoring feature has been added allowing staff to:

- View all active packages
- Track Unlimited packages
- Get alerts on soon-to-expire packages
- View detailed package information

### Admin Section Implementation

A dedicated admin section has been implemented to provide enhanced management capabilities:

- **Admin Dashboard**: Central hub for administrative tools and system overview
- **Sales Dashboard**: Comprehensive analytics and reporting suite
- **Role-Based Access**: Binary admin role system with middleware protection
- **Enhanced Navigation**: Conditional admin menu items for privileged users
- **Future Expansion**: Framework for advanced admin features (inventory, analytics, user management)
- **Secure Authentication**: Admin role detection integrated with existing Google OAuth flow

**Current Features**: Admin dashboard with sales analytics, system management tools
**Planned Features**: Advanced analytics, inventory management, staff management, system settings

## Environment Setup

The application requires several environment variables to be set up properly:

### Database Configuration
```bash
# Primary Supabase Instance (Legacy)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Refactored Supabase Instance (Current)
NEXT_PUBLIC_REFAC_SUPABASE_URL=your-refac-supabase-url
NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY=your-refac-supabase-anon-key
REFAC_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin System Database Tables (backoffice schema):
# - allowed_users: User whitelist with is_admin flag
# - customers: Customer management
# - package_types: Package definitions
```

### Google Services Configuration
```bash
# Google Authentication & APIs
GOOGLE_PRIVATE_KEY=your-google-private-key
GOOGLE_CLIENT_EMAIL=your-google-client-email
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_PROJECT_ID=your-google-project-id

# Google Calendar IDs
BAY_1_CALENDAR_ID=your-bay1-calendar-id
BAY_2_CALENDAR_ID=your-bay2-calendar-id
BAY_3_CALENDAR_ID=your-bay3-calendar-id
COACHING_BOSS_CALENDAR_ID=your-coaching-calendar-id
COACHING_RATCHAVIN_CALENDAR_ID=your-ratchavin-coaching-calendar-id
COACHING_NOON_CALENDAR_ID=your-noon-coaching-calendar-id
```

### Messaging & Notifications
```bash
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_GROUP_ID=default-group-id
LINE_GROUP_RATCHAVIN_ID=ratchavin-group-id
LINE_GROUP_COACHING_ID=coaching-group-id
LINE_GROUP_NOON_ID=noon-group-id
```

### Authentication
```bash
# NextAuth Configuration
NEXTAUTH_URL=your-app-url
NEXTAUTH_SECRET=your-nextauth-secret
```

### Development Environment
```bash
# Optional: Development-specific variables
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development
```

## Development

To run the application locally:

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

## Deployment

The application is deployed on Vercel. Updates to the main branch automatically trigger a new deployment.

When deploying, remember to set all environment variables in the Vercel project settings.

## License

Proprietary - All rights reserved © Lengolf 