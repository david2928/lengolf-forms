# LENGOLF Forms System

A modern web application for managing LENGOLF customer packages and usage tracking, built with Next.js, TypeScript, and Supabase.

## Features

### Current Implementation
- ✓ Employee Management
  - Employee selection radio interface
  - Four preset employees (Dolly, May, Net, Winnie)
  - Employee tracking for package creation

- ✓ Customer Management
  - Google Sheets integration for customer data
  - Real-time customer search
  - Mobile-friendly customer selection interface
  - Periodic data refresh for up-to-date information

- ✓ Package Types
  - Managed through Supabase
  - Ordered display by priority
  - Easy selection interface

- ✓ Date Management
  - Purchase date selection
  - First use date selection
  - Calendar interface for both dates
  - Enhanced date validation

- ✓ Authentication & Authorization
  - Google OAuth integration
  - User management through Supabase
  - Secure access control
  - Session persistence
  - Role-based access control

- ✓ UI/UX
  - Modern, clean interface using shadcn/ui
  - LENGOLF brand colors and styling
  - Responsive design for all screen sizes
  - Loading states and error handling
  - Form validation
  - Confirmation dialog for review before submission

### Tech Stack
- Next.js 14
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Supabase for database and user management
- Google Sheets API for customer data
- NextAuth.js for authentication
- Google OAuth for user authentication
- Cloud Run for deployment

## Planned Features

### High Priority
- [ ] Git CI/CD Pipeline
  - Automated testing
  - Automated deployment
  - Environment management

- [ ] Data Migration
  - Import historical data from previous system
  - Data validation and cleaning
  - Migration scripts

- [ ] Package Usage Tracking
  - New form for tracking package usage
  - Usage history
  - Remaining sessions calculation
  - Usage patterns analysis

- [ ] Enhanced Reporting
  - Integrated reporting with new data source
  - Custom report generation
  - Data visualization
  - Export capabilities

### Future Enhancements
- [ ] Enhanced Analytics
- [ ] Customer Portal
- [ ] Mobile App
- [ ] Automated Notifications

## Setup Instructions

1. Environment Variables
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key

   # Google OAuth
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret

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

### Cloud Run Deployment
```bash
# Build and submit to Cloud Build
gcloud builds submit --config=cloudbuild.yaml \
--substitutions=_NEXT_PUBLIC_SUPABASE_URL="url",\
_NEXT_PUBLIC_SUPABASE_ANON_KEY="key",\
_GOOGLE_CLIENT_ID="id",\
_GOOGLE_CLIENT_SECRET="secret",\
_NEXTAUTH_SECRET="secret",\
_NEXTAUTH_URL="url"

# Deploy to Cloud Run
gcloud run deploy lengolf-forms \
  --image gcr.io/lengolf-forms/lengolf-forms \
  --platform managed \
  --region asia-southeast1
```

## Project Structure

```
src/
  ├── app/                      # Next.js app directory
  ├── components/               # React components
  │   ├── ui/                  # shadcn/ui components
  │   └── package-form/        # Package form components
  ├── lib/                     # Utilities and configurations
  │   ├── auth.ts             # Authentication utilities
  │   └── supabase.ts         # Supabase client
  └── types/                   # TypeScript types
```

## Documentation

### Authentication Flow
1. User accesses the application
2. Redirected to Google Sign-in
3. Email verified against allowed users in Supabase
4. Session persisted for 30 days
5. Manual logout available

### Data Flow
1. Customer data sourced from Google Sheets
2. Package types managed in Supabase
3. Form submissions stored in Supabase
4. Real-time updates and validation

## Support
For any issues or questions, contact:
Email: dgeiger@stc-global.com