# Lengolf Forms

A comprehensive golf academy management system providing booking, scheduling, package management, and customer relationship management capabilities.

## Overview

Lengolf Forms is a full-featured booking and management system built specifically for golf training facilities. The application provides a complete solution for managing customer bookings, scheduling across multiple golf bays, tracking customer packages, integrating with external calendar systems, and maintaining customer relationships. Built with modern web technologies including Next.js, TypeScript, Tailwind CSS, and Supabase, the system offers a robust, scalable, and user-friendly platform for golf academy operations.

### System Capabilities
- **Multi-Bay Booking Management**: Coordinate bookings across multiple golf bays with real-time availability
- **Package Lifecycle Management**: Create, monitor, and track customer packages with expiration alerts
- **Calendar Integration**: Seamless synchronization with Google Calendar for staff coordination
- **Real-time Notifications**: Instant notifications via LINE Messaging API for booking updates
- **Customer Relationship Management**: Integrated CRM with automated data synchronization
- **Administrative Controls**: Role-based access with dedicated admin section for privileged users
- **Staff Authentication**: Secure authentication with admin role differentiation
- **Responsive Design**: Optimized for both desktop and mobile usage

## Key Features

- **Booking Management**: Create, view, and manage customer bookings for golf bays and coaching sessions
- **Multi-Calendar Integration**: Synchronized with Google Calendar for seamless scheduling
- **Real-time Notifications**: LINE Messaging API integration for instant booking notifications
- **Package Monitoring**: Track active customer packages with expiration alerts
- **Administrative Dashboard**: Dedicated admin section with enhanced management tools
- **User Authentication**: Secure staff login system with admin role support
- **Responsive Design**: Works on desktop and mobile devices

## Core Features & Modules

This application is composed of several key modules that provide its core functionality:

*   **User Authentication**: Secure sign-in using Google accounts with role-based access control, managed via NextAuth.js. Supports binary admin roles (user/admin). (See `app/auth/`, `src/lib/auth-config.ts`)
*   **Booking Management**:
    *   **Booking Creation**: A dedicated form (`app/create-booking/`, `src/components/booking-form/`) allows users to create new bookings.
    *   **Booking Management**: Advanced booking management interface (`app/manage-bookings/`) for editing, canceling, and bulk operations.
    *   **Bookings Calendar**: A visual calendar (`app/bookings-calendar/`) displays bookings across different bays, with daily navigation and real-time updates.
    *   **API**: Backend logic for creating and retrieving bookings (`app/api/bookings/`).
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

## Recent Changes

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
- **Role-Based Access**: Binary admin role system with middleware protection
- **Enhanced Navigation**: Conditional admin menu items for privileged users
- **Future Expansion**: Framework for advanced admin features (inventory, analytics, user management)
- **Secure Authentication**: Admin role detection integrated with existing Google OAuth flow

**Current Features**: Admin dashboard with placeholder cards for future functionality
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
```

### Messaging & Notifications
```bash
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_GROUP_ID=default-group-id
LINE_GROUP_RATCHAVIN_ID=ratchavin-group-id
LINE_GROUP_COACHING_ID=coaching-group-id
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