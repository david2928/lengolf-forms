# Lengolf Forms

Internal staff operations dashboard and admin back-office for Lengolf, a premium indoor golf simulator facility in Bangkok, Thailand.

## Overview

Lengolf operates 4 Korean Bravo golf simulator bays at The Mercury Ville @ BTS Chidlom, offering hourly bay rentals (primary revenue), professional coaching sessions, food and beverage service, golf club rentals (complimentary with bay bookings), used club sales, and event hosting. The facility is open 10 AM - 11 PM daily.

Lengolf Forms is the largest of three applications sharing a single Supabase database. It handles all internal operations: booking management, customer relationship management, package tracking, POS transactions, staff scheduling, financial reporting, AI-powered customer chat, and administrative analytics. The other two applications are the public marketing website (len.golf) and the customer-facing booking system (booking.len.golf).

## Key Features

**Booking & Scheduling**
- Multi-bay booking creation with Google Calendar sync and LINE notifications
- Visual bookings calendar with consolidation and mobile optimization
- Coaching assistant with availability management and automated broadcasts

**Customer & Packages**
- Customer management with analytics, duplicate detection, and CRM mapping
- Package creation, usage tracking, auto-activation, and expiration monitoring
- Club rental booking system (indoor and course rentals)
- Used clubs inventory management

**Point of Sale**
- Full POS with table/bay management, split payments, PromptPay QR
- Thermal and Bluetooth receipt printing
- Product catalog management with categories, modifiers, and custom products
- Discount rules with product eligibility

**Communication & AI**
- Unified chat (LINE + Meta/WhatsApp) with real-time updates
- AI-powered reply suggestions (GPT-4o-mini) with function calling
- FAQ knowledge base with image associations for AI training
- LINE broadcast campaigns with audience management
- Push notifications for booking events and chat messages

**Financial & Admin**
- Sales dashboard with KPIs, charts, and flexible date filtering
- Finance dashboard with P&L, period comparison, and operating expenses
- Bank reconciliation (KBank statements vs POS/merchant settlements)
- Expense tracker with vendor receipts and smart invoice extraction
- Monthly closing with VAT, WHT, and trial balance
- Payroll calculations with service charge distribution
- Tax filing tools (PP30/PP36/PND3)

**Staff Operations**
- Time clock (clock in/out with break deductions)
- Staff scheduling with calendar views and bulk operations
- Cash check (opening/closing amounts) and petty cash tracking
- Daily inventory reporting with spike warnings
- Vendor receipt upload with AI-powered data extraction

**Marketing & Analytics**
- Google Reviews management with AI-generated draft replies
- Google Ads and Meta Ads performance dashboards
- Traffic analytics with GA4 insights
- Competitor social media tracking
- Customer outreach and OB sales calling queue
- Referral source analytics and offline conversion tracking
- Automated Welcome Back re-engagement campaigns

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

For a detailed explanation of the codebase structure, please refer to the [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) file.

For comprehensive backend documentation including API endpoints, database schema, and integration details, see [BACKEND_DOCUMENTATION.md](docs/BACKEND_DOCUMENTATION.md).

## Documentation

Comprehensive documentation for the Lengolf Forms system is available in the `docs/` directory. The documentation is organized into logical sections to serve different audiences and use cases:

### Documentation Overview

The documentation covers all aspects of the system, from high-level architecture to detailed implementation guides:

- **Complete System Coverage**: Every major feature and component is documented
- **Multi-Audience Approach**: Documentation for developers, administrators, and end users
- **Technical Deep-Dives**: Detailed technical implementation with code examples
- **Business Logic Documentation**: Clear explanation of business rules and workflows
- **Integration Guides**: Comprehensive coverage of external system integrations

### Documentation Structure

**Core System Documentation:**
- **[docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)** - Complete codebase structure and organization
- **[docs/BACKEND_DOCUMENTATION.md](docs/BACKEND_DOCUMENTATION.md)** - API endpoints, database, and server-side architecture
- **[docs/frontend/FRONTEND_OVERVIEW.md](docs/frontend/FRONTEND_OVERVIEW.md)** - Component architecture, hooks, and UI patterns
- **[docs/database/DATABASE_DOCUMENTATION_INDEX.md](docs/database/DATABASE_DOCUMENTATION_INDEX.md)** - Complete database structure and relationships

**Feature Documentation:**
- **[docs/features/public/booking-scheduling/BOOKING_SYSTEM.md](docs/features/public/booking-scheduling/BOOKING_SYSTEM.md)** - Complete booking management workflow with multi-step creation, calendar integration, and audit trails
- **[docs/features/public/customer-packages/PACKAGE_MANAGEMENT.md](docs/features/public/customer-packages/PACKAGE_MANAGEMENT.md)** - Customer packages, usage tracking, expiration monitoring, and unlimited package support
- **[docs/features/admin/system-management/ADMIN_PANEL.md](docs/features/admin/system-management/ADMIN_PANEL.md)** - Administrative interface with role-based access and business intelligence tools
- **[docs/features/admin/analytics/SALES_DASHBOARD.md](docs/features/admin/analytics/SALES_DASHBOARD.md)** - Comprehensive analytics with KPIs, charts, and flexible date filtering

### Documentation Highlights

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

### Quick Navigation

- **For Developers**: Start with [docs/DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md) → [Frontend Overview](docs/frontend/FRONTEND_OVERVIEW.md) → [Backend Documentation](docs/BACKEND_DOCUMENTATION.md)
- **For System Administrators**: [Admin Panel](docs/features/admin/system-management/ADMIN_PANEL.md) → [Sales Dashboard](docs/features/admin/analytics/SALES_DASHBOARD.md) → [Database Documentation](docs/database/DATABASE_DOCUMENTATION_INDEX.md)
- **For Feature Understanding**: [Booking System](docs/features/public/booking-scheduling/BOOKING_SYSTEM.md) → [Package Management](docs/features/public/customer-packages/PACKAGE_MANAGEMENT.md)
- **For Integration Work**: [Backend Documentation](docs/BACKEND_DOCUMENTATION.md) → [Database Documentation](docs/database/DATABASE_DOCUMENTATION_INDEX.md)

The documentation is maintained alongside the codebase and updated with each major feature release to ensure accuracy and completeness.

## Recent Changes

See [CHANGELOG.md](CHANGELOG.md) for detailed release history.

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
