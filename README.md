# LENGOLF Forms System

A modern web application for managing LENGOLF customer packages, usage tracking, and bay bookings, built with Next.js, TypeScript, and Supabase.

## Features

### Current Implementation
- ✓ Employee Management
  - Employee selection radio interface
  - Four preset employees (Dolly, May, Net, Winnie)
  - Employee tracking for package creation and usage

- ✓ Customer Management
  - Direct Supabase integration for customer data
  - Real-time customer search
  - Mobile-friendly customer selection interface
  - New vs existing customer handling
  - Customer contact information tracking

- ✓ Package Types
  - Managed through Supabase
  - Ordered display by priority
  - Easy selection interface
  - Hours and validity period tracking
  - Automatic expiration date calculation
  - Package duration rules for different types

- ✓ Package Creation Form
  - Employee selection
  - Customer search and selection
  - Package type selection
  - Purchase date selection
  - First use date selection
  - Calendar interface for dates
  - Enhanced date validation
  - Automatic expiration date calculation
  - Confirmation dialog before submission

- ✓ Package Usage Form
  - Employee selection
  - Advanced package selection interface
  - Used hours input with validation
  - Used date selection
  - Package information display
  - Form state management
  - Clear validation messages
  - Expiration date tracking

- ✓ Booking Management System (New)
  - Three-step booking process
  - Employee and customer association
  - Multiple booking types support
  - Bay availability checking
  - Time slot management
  - Google Calendar integration
  - LINE notifications
  - Package integration
  - Real-time availability updates
  - Mobile-optimized interface

### Tech Stack
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Supabase for database
- Google Calendar API
- LINE Notification API
- React Hook Form
- Luxon for date/time handling

## Project Structure

### Key Files and Their Purposes
| File/Directory | Purpose |
|---------------|----------|
| `/app/page.tsx` | Homepage with main navigation |
| `/app/create-package/page.tsx` | Package creation page |
| `/app/update-package/page.tsx` | Package usage page |
| `/app/create-booking/page.tsx` | Bay booking page |
| `/app/api/bookings/*` | Booking-related API endpoints |
| `/src/components/booking-form/*` | Booking form components |
| `/src/lib/google-calendar.ts` | Google Calendar integration |
| `/src/hooks/useBookingForm.ts` | Booking form state management |

### Directory Structure
```
.
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── crm/
│   │   └── bookings/
│   ├── create-package/
│   ├── update-package/
│   └── create-booking/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── package-form/
│   │   ├── package-usage/
│   │   └── booking-form/
│   ├── hooks/
│   ├── lib/
│   └── types/
```

## Setup Instructions

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Access to Supabase project
- Google Cloud project with Calendar API enabled
- LINE Notify API tokens
- Service account with appropriate permissions

### Environment Variables
Create a `.env.local` file with:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key

# Google Cloud Service Account
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=your-private-key
GOOGLE_PROJECT_ID=your-project-id

# LINE Notify
LINE_NOTIFY_TOKEN=your-line-token
LINE_NOTIFY_TOKEN_COACHING=your-coaching-token
LINE_NOTIFY_TOKEN_RATCHAVIN=your-ratchavin-token

# NextAuth.js
NEXTAUTH_URL=your-app-url
NEXTAUTH_SECRET=your-secret-key
```

## Running the Project
1. Install dependencies: `npm install`
2. Run development server: `npm run dev`
3. Build for production: `npm run build`

## Support and Maintenance
For any issues or questions, contact:  
Email: dgeiger@stc-global.com