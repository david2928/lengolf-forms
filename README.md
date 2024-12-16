# LENGOLF Forms System

A modern web application for managing LENGOLF customer packages and usage tracking, built with Next.js, TypeScript, and Supabase.

## Features

### Current Implementation
- ✓ Employee Management
  - Employee selection radio interface
  - Four preset employees (Dolly, May, Net, Winnie)
  - Employee tracking for package creation and usage

- ✓ Customer Management
  - Direct Supabase integration for customer data
  - Real-time customer search
  - Mobile-friendly customer selection interface:
    - Full-screen modal on mobile devices
    - Instant search filtering
    - Clear display of customer details
  - Manual refresh button to sync latest customer data:
    - Integration with Cloud Run service
    - Authenticated API calls
    - Progress tracking with batch information
    - User feedback throughout the process

- ✓ Package Types
  - Managed through Supabase
  - Ordered display by priority
  - Easy selection interface
  - Hours and validity period tracking
  - Automatic expiration date calculation
  - Package duration rules:
    - Gold (30H): 6 months
    - Silver (15H): 3 months
    - Bronze (5H): 1 month
    - Early Bird (10H): 6 months
    - Diamond (Unlimited, 1 month): 1 month
    - Diamond+ (Unlimited, 3 months): 3 months
    - Coaching (10H): 1 year
    - Coaching (5H): 6 months
    - Starter: 6 months

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
  - Advanced package selection interface:
    - Full-screen mobile interface with optimized layout
    - Search functionality with instant filtering
    - Clear package information display
    - Smart package filtering:
      - Excludes Diamond packages
      - Shows only non-expired packages
      - Sorts by customer name ascending
      - Shows remaining hours
  - Used hours input with validation (0.5 minimum)
  - Used date selection (defaults to today)
  - Package information display
  - Form state management
  - Clear validation messages
  - Expiration date tracking
  - Confirmation dialog with detailed package info

- ✓ Authentication & Authorization
  - Google OAuth integration
  - User management through Supabase
  - Secure access control
  - Session persistence
  - Role-based access control
  - Protected routes
  - Service account authentication for Cloud Run services

- ✓ User Interface
  - Modern, clean interface using shadcn/ui
  - LENGOLF brand colors and styling
  - Responsive design for all screen sizes
  - Mobile-optimized components:
    - Full-screen modals for selection interfaces
    - Simplified navigation
    - Essential buttons (Home, Sign Out)
    - Optimized button text and spacing
  - Loading states and error handling
  - Form validation with error messages
  - Confirmation dialogs
  - Toast notifications for user feedback

### Tech Stack
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Supabase for database and customer management
- Google Auth Library for service authentication
- Cloud Run for customer data sync service
- GitHub Actions for CI/CD

## Project Structure

### Key Files and Their Purposes
| File/Directory | Purpose |
|---------------|----------|
| `/app/page.tsx` | Homepage with main navigation and customer data refresh |
| `/app/create-package/page.tsx` | Package creation page layout and routing |
| `/app/update-package/page.tsx` | Package usage update page layout and routing |
| `/app/api/auth/cloud-run-token/route.ts` | API endpoint for Cloud Run authentication |
| `/app/api/crm/update-customers/route.ts` | API endpoint for customer data synchronization |
| `/src/components/package-form/index.tsx` | Main package creation form component |
| `/src/components/package-form/customer-search.tsx` | Customer search and selection modal |
| `/src/components/package-usage/usage-form.tsx` | Package usage tracking form |
| `/src/components/package-usage/package-selector.tsx` | Package selection modal for usage tracking |
| `/src/hooks/usePackages.ts` | Hook for package data management |
| `/src/hooks/usePackageForm.ts` | Hook for package form state management |
| `/src/types/package-form.ts` | TypeScript types for package-related features |
| `/src/lib/supabase.ts` | Supabase client configuration |

### Directory Structure
```
.
├── .github/                   # GitHub Actions workflows
├── app/                      # Next.js app directory
│   ├── api/                 # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   └── crm/            # Customer data sync endpoints
│   ├── create-package/     # Package creation page
│   └── update-package/     # Package usage page
├── src/
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── package-form/  # Package creation components
│   │   └── package-usage/ # Package usage components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and configurations
│   └── types/             # TypeScript types
```

## Database Schema

### Tables
```sql
-- Customers table
CREATE TABLE customers (
  id bigint PRIMARY KEY,
  store varchar(100) NOT NULL,
  customer_name varchar(200) NOT NULL,
  contact_number varchar(50),
  address text,
  email varchar(255),
  date_of_birth date,
  date_joined date,
  available_credit numeric DEFAULT 0,
  available_point numeric DEFAULT 0,
  source text,
  sms_pdpa boolean DEFAULT false,
  email_pdpa boolean DEFAULT false,
  batch_id varchar(50) NOT NULL,
  update_time timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

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

-- Package types table
CREATE TABLE package_types (
  id serial PRIMARY KEY,
  name varchar NOT NULL,
  hours numeric(4,1),
  validity_months int,
  display_order int,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### Functions and Triggers
```sql
-- Calculate expiration date based on package type
CREATE OR REPLACE FUNCTION calculate_expiration_date(package_type_name text, first_use_date date)
RETURNS date AS $$
BEGIN
    RETURN first_use_date + 
           (SELECT (validity_months || ' months')::interval 
            FROM package_types 
            WHERE name = package_type_name) - 
           INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Automatic expiration date calculation trigger
CREATE OR REPLACE TRIGGER tr_set_expiration_date
    BEFORE INSERT OR UPDATE OF first_use_date, package_type_id
    ON packages
    FOR EACH ROW
    EXECUTE FUNCTION set_expiration_date();

-- Get available packages for usage form
CREATE OR REPLACE FUNCTION get_available_packages()
RETURNS TABLE (
    id uuid,
    customer_name varchar,
    package_type_name varchar,
    first_use_date date,
    expiration_date date,
    remaining_hours numeric,
    label text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.customer_name,
        pt.name as package_type_name,
        p.first_use_date,
        p.expiration_date,
        CASE 
            WHEN pt.name LIKE '%Diamond%' THEN NULL
            ELSE pt.hours - COALESCE(
                (SELECT SUM(used_hours) 
                 FROM package_usage pu 
                 WHERE pu.package_id = p.id), 0)
        END as remaining_hours,
        p.customer_name || ' - ' || pt.name || ' - ' || 
        to_char(p.first_use_date, 'MM/DD/YYYY') as label
    FROM packages p
    JOIN package_types pt ON p.package_type_id = pt.id
    WHERE 
        p.expiration_date >= CURRENT_DATE
        AND NOT (pt.name LIKE '%Diamond%')
        AND (
            pt.hours IS NULL OR 
            pt.hours - COALESCE(
                (SELECT SUM(used_hours) 
                 FROM package_usage pu 
                 WHERE pu.package_id = p.id), 0) > 0
        )
    ORDER BY p.customer_name ASC, p.first_use_date DESC;
END;
$$ LANGUAGE plpgsql;
```

## Setup Instructions

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Access to Supabase project
- Google Cloud project with necessary APIs enabled
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

# NextAuth.js
NEXTAUTH_URL=your-app-url
NEXTAUTH_SECRET=your-secret-key
```

### Installation Steps
1. Clone the repository
```bash
git clone [repository-url]
cd lengolf_package_automation
```

2. Install dependencies
```bash
npm install
```

3. Run development server
```bash
npm run dev
```

4. Build for production
```bash
npm run build
```

## Deployment
The project is deployed on Google Cloud Run with automated deployments through GitHub Actions. For detailed deployment instructions, refer to the CI/CD configuration in `.github/workflows/`.

## Support and Maintenance
For any issues or questions, contact:  
Email: dgeiger@stc-global.com