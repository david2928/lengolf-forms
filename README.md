# Lengolf Forms

A modern web application for managing golf academy bookings, scheduling, and package management.

## Overview

Lengolf Forms is a full-featured booking and management system built for golf training facilities. The application handles booking management, scheduling, calendar integration, notifications, and package tracking. It's built with Next.js, TypeScript, Tailwind CSS, and uses Supabase for the backend database.

## Key Features

- **Booking Management**: Create, view, and manage customer bookings for golf bays and coaching sessions
- **Multi-Calendar Integration**: Synchronized with Google Calendar for seamless scheduling
- **Real-time Notifications**: LINE Messaging API integration for instant booking notifications
- **Package Monitoring**: Track active customer packages with expiration alerts
- **User Authentication**: Secure staff login system
- **Responsive Design**: Works on desktop and mobile devices

## Core Features & Modules

This application is composed of several key modules that provide its core functionality:

*   **User Authentication**: Secure sign-in using Google accounts, managed via NextAuth.js. (See `app/auth/`, `src/lib/auth-config.ts`)
*   **Booking Management**:
    *   **Booking Creation**: A dedicated form (`app/create-booking/`, `src/components/booking-form/`) allows users to create new bookings.
    *   **Bookings Calendar**: A visual calendar (`app/bookings-calendar/`) displays bookings across different bays, with daily navigation and real-time updates.
    *   **API**: Backend logic for creating and retrieving bookings (`app/api/bookings/`).
*   **Package Management**:
    *   **Package Creation**: A form (`app/create-package/`, `src/components/package-form/`, `src/hooks/usePackageForm.ts`) for creating new customer packages.
    *   **Package Usage**: Functionality to record and update the usage of customer packages (`app/update-package/`, `src/components/package-usage/`).
    *   **Package Monitoring**: A dashboard (`app/package-monitor/`, `src/hooks/use-package-monitor.ts`) to track active "Unlimited" packages and those nearing expiration.
    *   **API**: Endpoints for package data (`app/api/packages/`).
*   **Customer Data Management**:
    *   **CRM Integration**: An API endpoint (`app/api/crm/update-customers/`) triggers a Google Cloud Run service to refresh customer data.
    *   **Data Hooks**: Custom hooks (`src/hooks/useCustomers.ts`, `src/hooks/use-customers.ts`) for fetching customer lists.
*   **Notifications**: Integration with LINE Messaging API (`src/lib/line-messaging.ts`) for sending real-time notifications, likely triggered via API routes in `app/api/notify/`.
*   **Google Services Integration**:
    *   **Google Calendar**: Synchronization for bookings (`src/lib/google-calendar.ts`).
    *   **Google Sheets**: Potential data exchange with Google Sheets (`src/lib/google-sheets-service.ts`).
*   **Navigation & UI**:
    *   **Main Navigation**: A responsive navigation bar (`src/components/nav.tsx`) provides access to all features.
    *   **UI Components**: A rich set of reusable UI components is available in `src/components/ui/`, based on Shadcn/UI principles.

For a more detailed breakdown of the entire codebase structure, refer to the [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) file.

## Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS, React Hook Form
- **Backend**: Next.js API Routes, Supabase
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL (via Supabase)
- **Calendar**: Google Calendar API
- **Messaging**: LINE Messaging API
- **Deployment**: Vercel

## Project Structure

For a detailed explanation of the codebase structure, please refer to the [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) file.

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

## Environment Setup

The application requires several environment variables to be set up properly:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Calendar Integration
GOOGLE_PRIVATE_KEY=your-google-private-key
GOOGLE_CLIENT_EMAIL=your-google-client-email
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_PROJECT_ID=your-google-project-id

# Calendar IDs
BAY_1_CALENDAR_ID=your-bay1-calendar-id
BAY_2_CALENDAR_ID=your-bay2-calendar-id
BAY_3_CALENDAR_ID=your-bay3-calendar-id
COACHING_BOSS_CALENDAR_ID=your-coaching-calendar-id
COACHING_RATCHAVIN_CALENDAR_ID=your-ratchavin-coaching-calendar-id

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_GROUP_ID=default-group-id
LINE_GROUP_RATCHAVIN_ID=ratchavin-group-id
LINE_GROUP_COACHING_ID=coaching-group-id

# NextAuth
NEXTAUTH_URL=your-app-url
NEXTAUTH_SECRET=your-nextauth-secret
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