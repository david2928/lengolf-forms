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

## Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS, React Hook Form
- **Backend**: Next.js API Routes, Supabase
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL (via Supabase)
- **Calendar**: Google Calendar API
- **Messaging**: LINE Messaging API
- **Deployment**: Vercel

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

### Package Monitor

A new package monitoring feature has been added allowing staff to:

- View all active packages
- Track Diamond packages
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