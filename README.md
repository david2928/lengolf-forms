# LENGOLF Forms System

A modern web application for managing LENGOLF customer packages and usage tracking, built with Next.js, TypeScript, and Supabase.

## Features

### Current Implementation
- ✓ Employee Management
  - Employee selection radio interface
  - Four preset employees (Dolly, May, Net, Winnie)
  - Employee tracking for package creation and usage

- ✓ Customer Management
  - Google Sheets integration for customer data
  - Real-time customer search
  - Mobile-friendly customer selection interface
  - Periodic data refresh for up-to-date information

- ✓ Package Types
  - Managed through Supabase
  - Ordered display by priority
  - Easy selection interface
  - Hours and validity period tracking

- ✓ Package Creation Form
  - Employee selection
  - Customer search and selection
  - Package type selection
  - Purchase date selection
  - First use date selection
  - Calendar interface for dates
  - Enhanced date validation
  - Confirmation dialog before submission

- ✓ Package Usage Form
  - Employee selection
  - Available package search with remaining hours
  - Used hours input with validation (0.5 minimum)
  - Used date selection
  - Package information display
  - Expiration date tracking
  - Confirmation dialog before submission

- ✓ Authentication & Authorization
  - Google OAuth integration
  - User management through Supabase
  - Secure access control
  - Session persistence
  - Role-based access control
  - Protected routes
  - Mobile-friendly navigation
  - Responsive design

- ✓ User Interface
  - Modern, clean interface using shadcn/ui
  - LENGOLF brand colors and styling
  - Responsive design for all screen sizes
  - Loading states and error handling
  - Form validation with error messages
  - Confirmation dialogs
  - Mobile-optimized navigation
  - Toast notifications for user feedback

### Tech Stack
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Supabase for database and user management
- Google Sheets API for customer data
- NextAuth.js for authentication
- Google OAuth for user authentication
- Cloud Run for deployment
- GitHub Actions for CI/CD

## Project Structure
```
.
├── .github/                   # GitHub Actions workflows
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   ├── auth/                 # Auth pages
│   ├── create-package/       # Package creation page
│   └── update-package/       # Package usage page
├── src/
│   ├── components/           # React components
│   │   ├── ui/              # UI components
│   │   ├── package-form/    # Package creation components
│   │   └── package-usage/   # Package usage components
│   ├── lib/                 # Utilities and configurations
│   │   ├── auth.ts         # Authentication utilities
│   │   └── supabase.ts     # Supabase client
│   └── types/              # TypeScript types
```

## Database Schema
```sql
-- Packages table
CREATE TABLE packages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  customer_name varchar,
  package_type_id int4 REFERENCES package_types(id),
  purchase_date date,
  first_use_date date,
  employee_name varchar,
  expiration_date date
);

-- Package usage table
CREATE TABLE package_usage (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  package_id uuid REFERENCES packages(id),
  package_type_id int4 REFERENCES package_types(id),
  employee_name varchar,
  used_hours numeric(4,1) CHECK (used_hours >= 0.5 AND used_hours <= 30),
  used_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Setup Instructions

1. Environment Variables
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key

   # Google OAuth
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY=your-private-key
   GOOGLE_SHEET_ID=your-sheet-id

   # NextAuth.js
   NEXTAUTH_URL=your-app-url
   NEXTAUTH_SECRET=your-secret-key
   ```

2. Dependencies Installation
   ```bash
   npm install
   ```

3. Development Server
   ```bash
   npm run dev
   ```

## Deployment
The project is deployed on Google Cloud Run with automated deployments through GitHub Actions. For detailed deployment instructions, refer to the CI/CD configuration in `.github/workflows/`.

## Support
For any issues or questions, contact:
Email: dgeiger@stc-global.com