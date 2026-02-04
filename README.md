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
- **Framework**: Next.js 15.5.7 (App Router)
- **React**: React 19.1.1
- **Language**: TypeScript 5.3.3
- **Styling**: Tailwind CSS 3.4.1
- **UI Components**: Radix UI, Shadcn/UI, Lucide React
- **Forms**: React Hook Form 7.60.0 with Yup validation
- **State Management**: SWR 2.2.5, TanStack React Query 5.90.12, React Context
- **Date Handling**: date-fns 3.6.0, date-fns-tz 3.2.0, Luxon 3.4.4
- **Charts & Visualization**: Recharts 2.15.4
- **Animations**: Framer Motion 12.23.6
- **Calendar Components**: React Big Calendar 1.19.2, React Day Picker 9.9.0
- **Data Tables**: TanStack React Table 8.21.3
- **Drag & Drop**: DND Kit (core, sortable, utilities)
- **File Upload**: React Dropzone 14.3.8
- **Phone Input**: React Phone Number Input 3.4.14
- **Signature Capture**: React Signature Canvas

### Backend Technologies
- **Runtime**: Node.js (Serverless Functions)
- **API Framework**: Next.js API Routes
- **Database**: PostgreSQL (via Supabase 2.57.4)
- **Authentication**: NextAuth.js 4.24.7
- **Caching**: NodeCache 5.1.2
- **File Processing**: CSV Parser 3.2.0, ExcelJS 4.4.0
- **Image Processing**: Sharp 0.34.3
- **AI Integration**: OpenAI 5.22.1 (GPT-4o-mini, embeddings)
- **Push Notifications**: Web Push 3.6.7
- **QR Code Generation**: QRCode 1.5.4, PromptPay QR 0.5.0
- **Thermal Printing**: Node Thermal Printer 4.5.0

### External Integrations
- **Calendar**: Google Calendar API (googleapis 144.0.0)
- **Messaging**: LINE Messaging API, WhatsApp Business API (Meta)
- **Authentication Provider**: Google OAuth 2.0
- **Cloud Services**: Google Cloud Run, Supabase Edge Functions
- **AI Services**: OpenAI GPT-4o-mini for chat suggestions
- **Business APIs**: Google Business Profile (Reviews), Meta Ads
- **POS Integration**: Qashier POS system

### Infrastructure & Deployment
- **Hosting**: Vercel (Serverless)
- **Database Hosting**: Supabase (Managed PostgreSQL)
- **CDN**: Vercel Edge Network
- **Testing**: Playwright 1.54.1, Jest 30.1.2
- **Environment**: Production, Preview (PR branches), Development

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
- **[docs/features/public/booking-scheduling/BOOKING_SYSTEM.md](docs/features/public/booking-scheduling/BOOKING_SYSTEM.md)** - Complete booking management workflow with multi-step creation, calendar integration, and audit trails
- **[docs/features/public/customer-packages/PACKAGE_MANAGEMENT.md](docs/features/public/customer-packages/PACKAGE_MANAGEMENT.md)** - Customer packages, usage tracking, expiration monitoring, and unlimited package support
- **[docs/features/admin/system-management/ADMIN_PANEL.md](docs/features/admin/system-management/ADMIN_PANEL.md)** - Administrative interface with role-based access and business intelligence tools
- **[docs/features/admin/analytics/SALES_DASHBOARD.md](docs/features/admin/analytics/SALES_DASHBOARD.md)** - Comprehensive analytics with KPIs, charts, and flexible date filtering

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
- **For System Administrators**: [Admin Panel](docs/features/admin/system-management/ADMIN_PANEL.md) → [Sales Dashboard](docs/features/admin/analytics/SALES_DASHBOARD.md) → [Database Schema](docs/technical/DATABASE_SCHEMA.md)
- **For Feature Understanding**: [Booking System](docs/features/public/booking-scheduling/BOOKING_SYSTEM.md) → [Package Management](docs/features/public/customer-packages/PACKAGE_MANAGEMENT.md)
- **For Integration Work**: [Backend Documentation](docs/BACKEND_DOCUMENTATION.md) → [Database Schema](docs/technical/DATABASE_SCHEMA.md)

The documentation is maintained alongside the codebase and updated with each major feature release to ensure accuracy and completeness.

## Recent Changes

### Google Reviews Integration (February 2025)

A comprehensive Google Reviews management system has been implemented:

**Phase 1 - Reviews Dashboard:**
- **Reviews Dashboard**: View and analyze all Google reviews in one place
- **KPI Tracking**: Monitor review ratings, response rates, and trends
- **Filtering**: Filter by rating, date range, and response status
- **Sync via Edge Function**: Automated sync using Supabase Edge Functions for reliability

**Phase 2 - Manual Reply Posting:**
- **Reply Composition**: Write and post replies directly from the dashboard
- **Google Business API Integration**: Direct posting to Google Business Profile
- **Reply History**: Track all posted replies with timestamps

### AI-Powered Chat System (January 2025)

Enhanced chat capabilities with AI-powered features:

**Features:**
- **AI Chat Suggestions**: GPT-4o-mini powered response suggestions
- **Customer Info Extraction**: Automatic extraction of customer details from chat messages
- **Multi-Platform Support**: LINE, WhatsApp, and web chat integration
- **SLA Tracking**: Monitor response times and chat performance

### OB Calling Queue System (January 2025)

Automated outbound calling queue generation:

**Features:**
- **Eligibility Rules**: Auto-generate queue based on customer eligibility criteria
- **KPI Metrics**: Track calling performance and conversion rates
- **Staff Assignment**: Assign calls to specific staff members
- **Follow-up Tracking**: Monitor call outcomes and schedule follow-ups

### Booking System Enhancements (January 2025)

Multiple improvements to the booking workflow:

**New Features:**
- **Phone Confirmation Tracking**: Track and manage booking confirmations via phone
- **International Phone Support**: Country code selector for international customers
- **Customer Self-Service Step**: New step in booking flow for customer data entry
- **WhatsApp Support**: Send booking confirmations via WhatsApp
- **ResOS Badge**: Visual indicator for unconfirmed booking cards

**Technical Improvements:**
- **Excel Date Handling**: Support for merged cells and JS Date formats in reconciliation
- **Dash-Delimited Dates**: Additional date format parsing support

### Customer Management System Implementation (January 2025)

A comprehensive customer management system has been implemented to enhance customer data organization and analysis:

**Core Features:**
- **Customer Dashboard**: Complete customer information management with advanced filtering and search capabilities
- **Customer Analytics**: Real-time KPIs including total customers, active customers, recent registrations, and growth metrics
- **Data Integration**: Seamless integration between bookings, packages, transactions, and customer records
- **Mapping System**: Automated and manual customer mapping for POS data reconciliation
- **Duplicate Detection**: Advanced fuzzy matching to prevent duplicate customer records

**Technical Implementation:**
- New customer management API endpoints with full CRUD operations
- Customer analytics view with cached KPI calculations
- Advanced search with hybrid text matching and filtering
- Database migrations for customer table structure and foreign key relationships
- Customer mapping service for data reconciliation

**Business Intelligence:**
- Customer lifecycle tracking from registration to last visit
- Spending analytics and lifetime value calculations
- Package usage patterns and customer retention metrics
- Automated customer profile creation during booking process

### POS Data Reconciliation Enhancements (January 2025)

Improved POS data reconciliation system with better date handling and filtering:

**Enhancements:**
- **Excel Serial Number Support**: Automatic detection and conversion of Excel date serial numbers
- **Improved Date Parsing**: Enhanced date format detection for MM/DD/YYYY, DD/MM/YYYY, and YYYY-MM-DD formats
- **Voided Transaction Handling**: Proper filtering of voided transactions using null-safe queries
- **Debug Logging**: Comprehensive logging for troubleshooting date parsing issues

**Technical Improvements:**
- Enhanced date parsing with multiple format support
- Better error handling for malformed date data
- Improved query optimization for large datasets
- Auto-detection of date ranges from uploaded files

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

A comprehensive admin section with 26+ management modules:

**Analytics & Reporting:**
- **Sales Dashboard**: Real-time sales analytics with KPIs, charts, and trends
- **Finance Dashboard**: Financial overview and reporting
- **Marketing Dashboard**: Google Ads and Meta Ads performance tracking
- **Meta Ads Dashboard**: Detailed Meta advertising analytics
- **Referral Analytics**: Track referral sources and conversion rates
- **Performance Dashboard**: Staff and system performance metrics

**Customer & Operations:**
- **Customer Management**: Complete customer database with search and filtering
- **Customer Outreach**: OB calling queue and follow-up management
- **Chat SLA Tracking**: Monitor chat response times and SLA compliance
- **Google Reviews**: Review management and reply posting
- **LINE Messages**: View and manage LINE message history

**Inventory & Products:**
- **Inventory Dashboard**: Track stock levels and inventory movements
- **Product Management**: Manage POS product catalog
- **Discounts Management**: Create and manage discount codes

**Financial Operations:**
- **Transactions**: View and manage all transactions
- **Invoices**: Invoice generation and management
- **Reconciliation**: POS data reconciliation tools
- **Sales Reports**: Detailed sales reporting

**Staff Management:**
- **Staff Management**: Employee records and access control
- **Staff Scheduling**: Shift scheduling and management
- **Time Clock**: Employee time tracking
- **Payroll Calculations**: Automated payroll processing

**Additional Features:**
- **Package Management**: Admin view of customer packages
- **Competitors**: Competitor tracking and analysis
- **Photo Management**: Customer and facility photo management
- **Meta Leads**: Facebook/Instagram lead management

**Technical Implementation:**
- Role-based access with middleware protection
- Conditional navigation for admin users
- Secure authentication via Google OAuth

## Environment Setup

The application requires several environment variables to be set up properly. See `.env` for a complete template.

### Database Configuration
```bash
# Refactored Supabase Instance (Primary - Current)
NEXT_PUBLIC_REFAC_SUPABASE_URL=your-refac-supabase-url
NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY=your-refac-supabase-anon-key
REFAC_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Legacy Supabase Instance (Deprecated)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Database Schemas:
# - public: Core booking tables
# - backoffice: Customer, package, admin tables
# - pos: POS transaction data
# - marketing: Marketing analytics data
# - auth: Supabase authentication (managed)
```

### Google Services Configuration
```bash
# Google Authentication & APIs
GOOGLE_PRIVATE_KEY=your-google-private-key
GOOGLE_CLIENT_EMAIL=your-google-client-email
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_PROJECT_ID=your-google-project-id

# Google Calendar IDs (Bay Bookings)
BAY_1_CALENDAR_ID=your-bay1-calendar-id
BAY_2_CALENDAR_ID=your-bay2-calendar-id
BAY_3_CALENDAR_ID=your-bay3-calendar-id

# Google Calendar IDs (Coaching)
COACHING_BOSS_CALENDAR_ID=your-coaching-calendar-id
COACHING_RATCHAVIN_CALENDAR_ID=your-ratchavin-coaching-calendar-id
COACHING_NOON_CALENDAR_ID=your-noon-coaching-calendar-id

# Google Business Profile (Reviews)
GOOGLE_BUSINESS_ACCOUNT_ID=your-business-account-id
GOOGLE_BUSINESS_LOCATION_ID=your-business-location-id

# Google Sheets (Data Export)
GOOGLE_SHEET_ID=your-sheet-id
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
LINE_GROUP_MIN_ID=min-group-id
LINE_GROUP_SEXY_PIZZA_ID=partner-group-id
LINE_GROUP_SMITH_CO_ID=partner-group-id

# LINE Notify Tokens (Legacy)
LINE_TOKEN_DEFAULT=default-notify-token
LINE_TOKEN_RATCHAVIN=ratchavin-notify-token
LINE_TOKEN_COACHING=coaching-notify-token

# Meta/WhatsApp Integration
META_APP_SECRET=your-meta-app-secret
META_PAGE_ACCESS_TOKEN=your-page-access-token
META_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token
META_WA_PHONE_NUMBER_ID=your-whatsapp-phone-id

# Push Notifications (VAPID)
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@yourdomain.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
```

### AI & Machine Learning
```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# AI Feature Flags
AI_SUGGESTION_ENABLED=true
AI_CONFIDENCE_THRESHOLD=0.6
AI_EMBEDDING_SECRET=your-embedding-secret
```

### Authentication
```bash
# NextAuth Configuration
NEXTAUTH_URL=your-app-url
NEXTAUTH_SECRET=your-nextauth-secret

# Vercel OIDC (Auto-populated on Vercel)
VERCEL_OIDC_TOKEN=auto-populated
```

### External Integrations
```bash
# Qashier POS Integration
QASHIER_LOGIN=base64-encoded-login
QASHIER_PASSWORD=base64-encoded-password

# Webhook Security
CRON_SECRET=your-cron-secret
WEBSITE_WEBHOOK_SECRET=your-webhook-secret
```

### Development Environment
```bash
# Development Authentication Bypass
SKIP_AUTH=true
NEXT_SKIP_AUTH=true
NEXT_PUBLIC_SKIP_AUTH=true

# Environment Indicator
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