# Technical Documentation - Lengolf Package Automation

## Project Overview

Lengolf Package Automation serves as a comprehensive golf facility management system built with Next.js. The application handles booking management, customer package tracking, and facility resource coordination through a sophisticated multi-step booking process. The system integrates deeply with customer relationship management systems and provides real-time availability checking for facility resources.

The application uses Next.js 14 with TypeScript for type safety and implements modern React patterns including hooks, context, and server components. Data management is handled through a combination of server-side APIs and client-side state management using SWR for efficient caching and real-time updates.

## System Architecture

### Project Structure

The application follows a carefully organized structure that separates concerns and promotes maintainability:

```
lengolf-forms/
├── app/                    # Next.js 14 app directory
│   ├── api/               # API routes for different domains
│   │   ├── auth/         # Authentication endpoints
│   │   ├── bookings/     # Booking management endpoints
│   │   ├── customers/    # Customer data endpoints
│   │   ├── packages/     # Package management endpoints
│   │   └── crm/         # CRM integration endpoints
│   ├── auth/             # Authentication pages
│   ├── create-booking/   # Booking creation flow
│   ├── create-package/   # Package creation interface
│   └── update-package/   # Package update functionality
├── src/
│   ├── components/       # React components
│   │   ├── booking-form/ # Booking system components
│   │   │   ├── bay-selector.tsx
│   │   │   ├── booking-form.tsx
│   │   │   ├── customer-details.tsx
│   │   │   ├── time-selector.tsx
│   │   │   └── ... 
│   │   ├── package-form/
│   │   └── ui/          # Shared UI components
│   ├── hooks/           # Custom React hooks
│   ├── lib/            # Utility functions
│   └── types/          # TypeScript type definitions
├── public/             # Static assets
└── docs/              # Documentation
```

### Component Architecture

The component architecture is built around three main domains:

1. Authentication System: Located in C:\vs_code\lengolf-forms\src\components\, the authentication system uses NextAuth.js for session management. The session-provider.tsx component provides the authentication context throughout the application, while logout-button.tsx and nav.tsx handle session termination and authenticated navigation respectively.

2. Booking System: Found in C:\vs_code\lengolf-forms\src\components\booking-form\, the booking system comprises interconnected components managing the booking process. The booking-form.tsx serves as the main orchestrator, coordinating between customer information collection, bay selection, and time management. This system implements form state management through React Context, maintaining consistent state across multiple booking steps.

3. Package Management: The package management system, distributed across multiple components, tracks customer packages, their usage, and availability. Components in the package-form directory handle package creation and modification, while the package-usage directory contains components for tracking utilization.

### Data Flow Architecture

The application implements a sophisticated data flow architecture with several key systems:

1. State Management: The application employs multiple state management strategies:
   - Form context manages the booking process state
   - Authentication state through NextAuth.js
   - Data fetching and caching via SWR
   - Local component state for UI interactions

2. API Structure: Located in C:\vs_code\lengolf-forms\app\api\, the API follows a domain-driven design with distinct endpoints for bookings, packages, customers, and CRM integration.

3. Validation System: The application implements comprehensive validation at multiple levels:
   - Step validation during the booking process
   - Field-level validation for individual inputs
   - Cross-field validation for data consistency
   - API-level validation for data integrity

## Environment Setup

The application requires specific environment configuration for proper operation. Create a `.env.local` file in the root directory with the following configuration:

```env
# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Database Configuration
DATABASE_URL="your-database-connection-string"

# Google Calendar Integration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALENDAR_ID="your-calendar-id"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:3000/api"

# CRM Integration
CRM_API_KEY="your-crm-api-key"
CRM_BASE_URL="your-crm-base-url"

# Notification Settings
SMTP_HOST="your-smtp-host"
SMTP_PORT="587"
SMTP_USER="your-smtp-user"
SMTP_PASSWORD="your-smtp-password"
```

### Development Environment

Setting up the development environment requires several steps:

1. Node.js Dependencies:
```bash
npm install
```

2. Development Tools:
```bash
npm install -D typescript @types/react @types/node
npm install -D eslint eslint-config-next
npm install -D prettier
```

3. Database Setup:
```bash
# Initialize Supabase
npx supabase init
npx supabase start

# Generate types
npm run generate-types
```

## Security Implementation

The application implements comprehensive security measures across several layers:

1. Authentication Flow:
   - NextAuth.js handles user authentication
   - Protected routes ensure authorized access
   - Secure session management
   - Role-based access control

2. Data Protection:
   - Input validation and sanitization
   - TypeScript type checking
   - API-level validation
   - Secure password handling
   - CSRF protection

3. API Security:
   - Rate limiting
   - Request validation
   - Error handling
   - Secure headers

## Deployment Configuration

The application supports multiple deployment configurations:

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

### Development Environment

For local development with dependencies:

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build:
      context: .
      target: development
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    depends_on:
      - db
      - redis

  db:
    image: postgres:14
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: lengolf
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Cloud Deployment

Google Cloud Build configuration:

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/lengolf-forms', '.']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/lengolf-forms']

  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
    - run
    - --filename=k8s/
    - --location=asia-southeast1
    - --cluster=lengolf-cluster

images:
  - 'gcr.io/$PROJECT_ID/lengolf-forms'
```

## Development Workflow

The development process follows established patterns for consistency and quality:

### Version Control

Git workflow procedures:
```bash
# Feature development
git checkout -b feature/feature-name
git add .
git commit -m "feat: description of the feature"
git push origin feature/feature-name

# Bug fixes
git checkout -b fix/bug-name
git add .
git commit -m "fix: description of the fix"
git push origin fix/bug-name
```

### Testing

The application implements comprehensive testing:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- path/to/test-file.test.tsx
```

### Code Quality

Code quality is maintained through several tools:

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check

# Run all checks
npm run validate
```

## Error Handling

The application implements a comprehensive error handling strategy:

1. Client-side Error Handling:
   - Form validation with immediate feedback
   - API error handling with user notifications
   - Global error boundaries for unexpected errors
   - Offline handling and retry mechanisms

2. Server-side Error Handling:
   - API validation and error responses
   - Database error handling
   - Integration error handling
   - Logging and monitoring

## Performance Optimization

The application implements various performance optimizations:

1. Client-side Optimization:
   - Component code splitting
   - Image optimization
   - SWR for data caching
   - Bundle optimization

2. Server-side Optimization:
   - API response caching
   - Database query optimization
   - Connection pooling
   - Rate limiting

## Monitoring and Maintenance

The application includes comprehensive monitoring and maintenance capabilities:

1. Error Tracking:
   - Client-side error tracking
   - Server-side error logging
   - Performance monitoring
   - User behavior analytics

2. Maintenance Procedures:
   - Regular security updates
   - Database maintenance
   - Backup procedures
   - Performance optimization

This documentation provides a comprehensive overview of the Lengolf Package Automation system's technical architecture and implementation details. It serves as the primary reference for developers working on the system and should be updated as the application evolves.