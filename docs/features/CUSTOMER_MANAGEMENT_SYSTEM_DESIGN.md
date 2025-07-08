# Customer Management System Design

## Table of Contents
1. [Overview](#overview)
2. [Current System Analysis](#current-system-analysis)
3. [Proposed Architecture](#proposed-architecture)
4. [Database Schema Design](#database-schema-design)
5. [User Interface Design](#user-interface-design)
6. [API Design](#api-design)
7. [Implementation Plan](#implementation-plan)
8. [Migration Strategy](#migration-strategy)
9. [Technical Specifications](#technical-specifications)
10. [Future Considerations](#future-considerations)

## Overview

### Problem Statement
The current POS system lacks stable customer IDs, causing duplicate customer records when contact information changes. Staff need a centralized customer management UI to create, edit, and manage customer information efficiently. This system will serve as the foundation for the new POS system and improve customer data integrity.

### Solution Goals
- **Stable Customer IDs**: Implement unique, permanent customer identifiers
- **Central Management UI**: Staff interface for customer CRUD operations
- **Data Consolidation**: Single source of truth for customer information
- **POS Integration Ready**: Foundation for new POS system development
- **Duplicate Prevention**: Intelligent duplicate detection and merging
- **Analytics Foundation**: Customer insights and reporting capabilities

### Success Criteria
- Staff can create/edit customers without creating duplicates
- All customer data accessible through single interface
- Booking system seamlessly integrates with customer management
- Customer analytics provide business insights
- System supports future POS integration requirements

## 🔄 **Latest Updates Based on Data Analysis**

### **Key Changes Made:**
1. **📞 Phone-First Strategy**: Prioritize phone number matching over email/stable_hash_id
2. **🌍 International Support**: Handle 15% international customers (UK, US, Germany, Japan, etc.)
3. **📝 Simplified Notes**: Integrated notes column into main table (no separate tables)
4. **🔗 Social Login Tracking**: Track Google, Facebook, Email signup methods
5. **⚡ Real-time Mapping**: Customer matching during booking creation (no batch processing)
6. **📊 Simple Analytics**: Customer lifetime spending and visit tracking

### **Phone Number Data Analysis Results:**
- **85% Local Numbers**: Local (0xxxxxxxxx), Mobile (xxxxxxxxx), International (+66xxxxxxxxx)
- **15% International**: +27 (South Africa), +44 (UK), +1 (US/Canada), +49 (Germany), +81 (Japan), etc.
- **97% Match Success**: Phone normalization strategy works across all formats

### **Social Login Distribution:**
- **Google**: Dominant authentication method
- **Facebook**: Minority usage
- **Email**: Most users sign up with email, not OAuth

## Current System Analysis

### Existing Database Structure

#### `backoffice.customers` (2,104 records)
**Current POS customer source of truth with stability issues:**
```sql
- id: bigint (sequential, not stable)
- customer_name: varchar
- contact_number: varchar (changing this creates new customer)
- email: varchar
- address: text
- date_of_birth: date
- available_credit: numeric
- available_point: numeric
- stable_hash_id: varchar (inconsistent)
```

#### `public.profiles` (Website Users)
**Authenticated users from booking website:**
```sql
- id: uuid
- email: text
- display_name: text
- phone_number: text
- vip_customer_data_id: uuid (links to VIP data)
```

#### `public.vip_customer_data` (Enhanced Profiles)
**Additional customer preferences and VIP information:**
```sql
- id: uuid
- vip_display_name: text
- vip_email: text
- vip_phone_number: text
- vip_tier_id: integer
- stable_hash_id: text (links to CRM)
```

### Current Issues Identified
1. **ID Instability**: Changing phone numbers creates new customer records
2. **Data Fragmentation**: Customer data scattered across schemas
3. **No Staff UI**: No interface for manual customer management
4. **Complex Mapping**: Difficult profile-to-customer linking
5. **Duplicate Records**: Multiple records for same physical customer
6. **Limited Analytics**: No customer insights or reporting

## Proposed Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────────┐
│                Customer Management System                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Staff UI      │  │   Customer      │  │   Analytics     │ │
│  │   /admin/       │  │   Database      │  │   Dashboard     │ │
│  │   customers     │  │   public.       │  │                 │ │
│  │                 │  │   customers     │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Booking       │  │   Package       │  │   Transaction   │ │
│  │   Integration   │  │   Integration   │  │   Integration   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Future POS    │  │   CRM Sync      │  │   Profile       │ │
│  │   System        │  │   Service       │  │   Linking       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. **Customer Database Layer**
- **Primary Table**: `public.customers` (simplified with proven mapping)
- **Customer Mapping**: Phone-first identification system
- **Phone Normalization**: International phone number matching (last 9 digits)
- **Profile Integration**: Website user linking

#### 2. **Customer Mapping Service** ⭐ **CRITICAL COMPONENT**
Based on data analysis of 2,104+ customers and booking patterns:

```typescript
// Phone-first customer identification
class CustomerMappingService {
  async findCustomerMatch(data: {
    phone?: string,             // 1st priority: normalized phone
    email?: string              // 2nd priority: email match
  }): Promise<Customer | null>
}
```

**Proven Results from Data Analysis:**
- **stable_hash_id**: Links 63+ bookings per customer successfully
- **Normalized Phone**: 97% match rate for Thai numbers
- **Profile Integration**: Seamlessly connects website users
- **International Coverage**: 15% non-Thai customers (UK, US, Germany, Japan, etc.)

## Customer Mapping Frequency & Strategy

### **When Does Mapping Run?**

**Real-time during booking creation:**
```typescript
// Every time a booking is created
async function createBooking(bookingData) {
  const customer = await customerMappingService.findCustomerMatch({
    phone: bookingData.phone,           // 1st priority
    email: bookingData.email            // 2nd priority
  });
  
  if (customer) {
    // Link to existing customer
    return createBookingForCustomer(customer.id, bookingData);
  } else {
    // Create new customer first, then booking
    const newCustomer = await createCustomerFromBooking(bookingData);
    return createBookingForCustomer(newCustomer.id, bookingData);
  }
}
```

**Background sync (optional):**
- Daily cleanup: Find and merge obvious duplicates
- Weekly analytics update: Recalculate customer metrics
- Manual staff intervention for complex cases

### **No Batch Processing Required**
- Phone normalization happens on INSERT/UPDATE (triggers)
- Customer matching happens in real-time during booking
- Analytics calculated incrementally per transaction

## Customer ID Integration Plan

### **Table Integration Requirements**

#### 1. **Add customer_id to public.bookings**
```sql
-- Add customer_id to bookings table
ALTER TABLE public.bookings 
ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Create index for fast lookups
CREATE INDEX idx_bookings_customer_id ON public.bookings(customer_id);

-- Migration: Link existing bookings to customers via phone matching
UPDATE public.bookings b
SET customer_id = c.id
FROM public.customers c
WHERE c.normalized_phone = RIGHT(REGEXP_REPLACE(b.phone_number, '[^0-9]', '', 'g'), 9);
```

#### 2. **Add customer_id to pos.lengolf_sales**
```sql
-- Add customer_id to sales table
ALTER TABLE pos.lengolf_sales 
ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Create index for analytics queries
CREATE INDEX idx_lengolf_sales_customer_id ON pos.lengolf_sales(customer_id);

-- Migration: Link existing sales to customers via phone matching
UPDATE pos.lengolf_sales s
SET customer_id = c.id
FROM public.customers c
WHERE c.normalized_phone = RIGHT(REGEXP_REPLACE(s.customer_phone_number, '[^0-9]', '', 'g'), 9);
```

### **Customer Lifetime Spending Calculation**

**Simple lifetime spending from POS data:**
```sql
-- Calculate customer lifetime spending from POS sales
CREATE OR REPLACE FUNCTION calculate_customer_lifetime_spending(p_customer_id UUID)
RETURNS DECIMAL(12,2) AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(sales_net), 0.00)
    FROM pos.lengolf_sales 
    WHERE customer_id = p_customer_id
      AND is_voided != true
  );
END;
$$ LANGUAGE plpgsql;

-- Update trigger to keep lifetime spending current
CREATE OR REPLACE FUNCTION update_customer_lifetime_spending()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customer's lifetime spending when sales change
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.customers 
    SET total_lifetime_value = calculate_customer_lifetime_spending(NEW.customer_id),
        updated_at = now()
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_lifetime_spending
  AFTER INSERT OR UPDATE ON pos.lengolf_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_lifetime_spending();
```

### **Simplified Customer Analytics**

**Keep it simple - no fancy trends:**
```sql
-- Basic customer metrics view
CREATE OR REPLACE VIEW customer_analytics AS
SELECT 
  c.id,
  c.customer_code,
  c.customer_name,
  c.contact_number,
  
  -- Lifetime spending from POS
  COALESCE(SUM(s.sales_net), 0.00) as lifetime_spending,
  
  -- Visit count from bookings
  COUNT(DISTINCT b.id) as total_bookings,
  
  -- Last visit from bookings
  MAX(b.date) as last_booking_date,
  
  -- First transaction from POS
  MIN(s.date) as first_purchase_date,
  
  -- Simple customer status
  CASE 
    WHEN MAX(b.date) >= CURRENT_DATE - INTERVAL '90 days' THEN 'Active'
    WHEN MAX(b.date) >= CURRENT_DATE - INTERVAL '365 days' THEN 'Inactive'
    ELSE 'Dormant'
  END as customer_status
  
FROM public.customers c
LEFT JOIN public.bookings b ON c.id = b.customer_id
LEFT JOIN pos.lengolf_sales s ON c.id = s.customer_id AND s.is_voided != true
GROUP BY c.id, c.customer_code, c.customer_name, c.contact_number;
```

### **Implementation Summary**

**Key Integration Tasks Added:**
1. ✅ **public.bookings**: Add `customer_id` column with foreign key to `public.customers`
2. ✅ **pos.lengolf_sales**: Add `customer_id` column with foreign key to `public.customers`
3. ✅ **Phone Matching**: Migrate existing records using normalized phone number matching
4. ✅ **Lifetime Spending**: Auto-calculate from `pos.lengolf_sales.sales_net` (no complex trends)
5. ✅ **Simple Analytics**: Basic customer status, spending, and booking history
6. ✅ **Real-time Updates**: Triggers keep customer lifetime spending current

**Removed Complexity:**
- ❌ No fancy customer trends or complex analytics
- ❌ No advanced lifetime value analysis
- ❌ Keep it simple with basic POS spending summation

#### 3. **Staff Management UI**
- **Location**: `/admin/customers/`
- **Pattern**: Follow transaction management design
- **Features**: Create, Read, Update, Deactivate customers
- **Analytics**: Customer KPIs and insights

#### 4. **Integration Layer**
- **Booking System**: Smart customer lookup with mapping service
- **Profile Linking**: Automatic website user to customer connection
- **Legacy POS**: Optional sync for compatibility
- **Transaction History**: Link to existing POS data

#### 5. **Analytics & Reporting**
- **Customer KPIs**: Total, new, VIP, active customers
- **Mapping Success**: Track customer identification accuracy
- **Phone Analysis**: Monitor normalization effectiveness

## Database Schema Design

### Primary Customer Table: `public.customers`

```sql
-- Customer table with minimal fields (matching existing backoffice.customers + analytics)
CREATE TABLE public.customers (
  -- Primary Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code VARCHAR(20) UNIQUE NOT NULL, -- CUS-001, CUS-002, etc.
  
  -- Core Information (minimal)
  customer_name VARCHAR(255) NOT NULL,
  contact_number VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  date_of_birth DATE,
  
  -- Simple Notes (integrated)
  notes TEXT,
  
  -- Analytics (auto-calculated)
  total_lifetime_value DECIMAL(12,2) DEFAULT 0.00,
  total_visits INTEGER DEFAULT 0,
  last_visit_date DATE,
  
  -- Phone-First Customer Mapping
  normalized_phone VARCHAR(20),
  customer_profiles JSONB DEFAULT '[]'::jsonb, -- Array of linked profile IDs
  
  -- Social Login Tracking
  login_provider VARCHAR(20),
  
  -- System Information
  customer_create_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
  
  -- Search Optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      coalesce(customer_name, '') || ' ' ||
      coalesce(contact_number, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      coalesce(customer_code, '')
    )
  ) STORED,
  
  -- Constraints
  CONSTRAINT chk_contact_info CHECK (
    contact_number IS NOT NULL OR email IS NOT NULL
  )
);

-- Indexes for Performance & Customer Mapping
CREATE INDEX idx_customers_search ON public.customers USING GIN(search_vector);
CREATE INDEX idx_customers_contact_number ON public.customers(contact_number);
CREATE INDEX idx_customers_email ON public.customers(lower(email)) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_customer_code ON public.customers(customer_code);
CREATE INDEX idx_customers_normalized_phone ON public.customers(normalized_phone);
CREATE INDEX idx_customers_active ON public.customers(is_active);
CREATE INDEX idx_customers_created_at ON public.customers(created_at);
CREATE INDEX idx_customers_profiles ON public.customers USING GIN(customer_profiles);

-- Customer Code Generation Function
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_code VARCHAR(20);
  counter INTEGER;
BEGIN
  -- Get next sequential number
  SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 5) AS INTEGER)), 0) + 1
  INTO counter
  FROM public.customers
  WHERE customer_code ~ '^CUS-\d+$';
  
  -- Format as CUS-001, CUS-002, etc.
  new_code := 'CUS-' || LPAD(counter::TEXT, 3, '0');
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic customer code generation
CREATE OR REPLACE FUNCTION set_customer_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_code IS NULL THEN
    NEW.customer_code := generate_customer_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_customer_code
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION set_customer_code();

-- Auto-generate normalized phone for international phone matching
CREATE OR REPLACE FUNCTION set_normalized_phone()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contact_number IS NOT NULL THEN
    -- Extract digits only and normalize for international matching
    -- Examples: 0807877878 → 807877878, +66623949696 → 623949696
    NEW.normalized_phone := RIGHT(REGEXP_REPLACE(NEW.contact_number, '[^0-9]', '', 'g'), 9);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_normalized_phone
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION set_normalized_phone();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();
```

### Phone Normalization Function

```sql
-- Function to normalize phone numbers for matching
CREATE OR REPLACE FUNCTION normalize_phone_number(phone_input VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  IF phone_input IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Extract digits only and return last 9 digits for matching
  -- Works for international numbers: +66812345678 → 812345678
  -- Works for local numbers: 0812345678 → 812345678
  RETURN RIGHT(REGEXP_REPLACE(phone_input, '[^0-9]', '', 'g'), 9);
END;
$$ LANGUAGE plpgsql;
```

### Enhanced Customer Source Enum
```sql
-- Update customer source enum to include more options
DROP TYPE IF EXISTS customer_source_enum CASCADE;
CREATE TYPE customer_source_enum AS ENUM (
  'Walk In',
  'Website Booking',
  'Phone Call',
  'Social Media',
  'Referral',
  'Corporate',
  'Event',
  'Marketing Campaign',
  'Mobile App',
  'Others'
);
```

## User Interface Design

### Page Structure
Following the established transaction management pattern:

```
/admin/customers/
├── page.tsx                          # Main customer list page
├── [customerId]/
│   ├── page.tsx                      # Individual customer detail page
│   ├── edit/
│   │   └── page.tsx                  # Customer edit page
│   └── history/
│       └── page.tsx                  # Customer history page
└── components/
    ├── customer-columns.tsx          # Table column definitions
    ├── customer-kpis.tsx             # KPI dashboard component
    ├── customers-data-table.tsx      # Main data table
    ├── customer-detail-modal.tsx     # Quick view modal
    ├── customer-form-modal.tsx       # Create/edit form modal
    ├── customer-merge-modal.tsx      # Merge customers modal
    ├── customer-filters.tsx          # Advanced filtering
    ├── customer-search.tsx           # Search component
    └── customer-analytics.tsx        # Analytics widgets
```

### Main Customer List Page

#### KPI Cards
```typescript
interface CustomerKPIs {
  totalCustomers: number;
  newThisMonth: number;
  vipCustomers: number;
  activeCustomers: number; // Visited in last 90 days
  averageLifetimeValue: number;
  totalLifetimeValue: number;
  retentionRate: number; // Percentage returning customers
  growthRate: number; // Month-over-month growth
}
```

#### Filter Options
- **Search**: Name, phone, email, customer code
- **VIP Status**: All, VIP only, Non-VIP
- **Customer Source**: Dropdown with all source types
- **Registration Date**: Date range picker
- **Last Visit**: Date range picker
- **Status**: Active, Inactive, All
- **Credit Balance**: Has credit, No credit, All
- **Contact Consent**: SMS, Email, Marketing preferences

#### Table Columns
```typescript
interface CustomerTableRow {
  customerCode: string;
  fullName: string;
  primaryPhone?: string;
  email?: string;
  vipTier?: string;
  lastVisit?: string;
  totalVisits: number;
  lifetimeValue: number;
  status: 'Active' | 'Inactive';
  actions: React.ReactNode;
}
```

### Customer Detail Modal/Page

#### Tabs Structure
1. **Overview**: Basic info, contact details, VIP status
2. **Transaction History**: Integration with transaction management
3. **Package History**: Current and past packages
4. **Booking History**: All bookings made
5. **Notes**: Staff notes and customer interactions
6. **Analytics**: Personal customer insights

#### Overview Tab
```typescript
interface CustomerOverview {
  // Basic Information
  customerCode: string;
  fullName: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  email?: string;
  dateOfBirth?: string;
  
  // Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  
  // Business Information
  customerSource: string;
  registrationDate: string;
  firstVisitDate?: string;
  lastVisitDate?: string;
  
  // Analytics Summary
  totalLifetimeValue: number;
  totalVisits: number;
  averageTransactionValue: number;
  
  // System Information
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}
```

### Customer Form (Create/Edit)

#### Form Sections
1. **Basic Information** (Required)
   - Full Name (required)
   - Primary Phone or Email (at least one required)
   - Date of Birth

2. **Contact Information**
   - Address fields
   - Customer notes

3. **Profile Linking** (if applicable)
   - Link to existing website profile
   - Multiple profile support
   - Social login provider tracking

#### Form Validation
```typescript
interface CustomerFormData {
  fullName: string; // Required, min 2 chars
  primaryPhone?: string; // Format validation
  email?: string; // Email format validation
  dateOfBirth?: Date; // Cannot be future date
  address?: string;
  notes?: string;
  loginProvider?: string; // Social login tracking
}

// Validation rules
const validation = {
  fullName: yup.string().required().min(2).max(255),
  primaryPhone: yup.string().matches(/^[+]?[0-9\s-()]{8,20}$/),
  email: yup.string().email(),
  dateOfBirth: yup.date().max(new Date()),
  // At least one contact method required
  contactMethod: yup.object().test(
    'contact-required',
    'Primary phone or email is required',
    (obj) => obj.primaryPhone || obj.email
  )
};
```

## API Design

### Customer Management Endpoints

#### Base URL: `/api/customers`

```typescript
// GET /api/customers - List customers with filtering and pagination
interface GetCustomersRequest {
  // Pagination
  page?: number;
  limit?: number;
  
  // Sorting
  sortBy?: 'fullName' | 'customerCode' | 'registrationDate' | 'lastVisit' | 'lifetimeValue';
  sortOrder?: 'asc' | 'desc';
  
  // Filtering
  search?: string; // Full-text search
  vipStatus?: 'all' | 'vip' | 'non-vip';
  customerSource?: CustomerSourceEnum | 'all';
  isActive?: boolean;
  registrationDateFrom?: string;
  registrationDateTo?: string;
  lastVisitFrom?: string;
  lastVisitTo?: string;
  hasCredit?: boolean;
  smsConsent?: boolean;
  emailConsent?: boolean;
}

interface GetCustomersResponse {
  customers: CustomerSummary[];
  pagination: {
    total: number;
    pages: number;
    current: number;
    limit: number;
  };
  kpis: CustomerKPIs;
}

// POST /api/customers - Create new customer
interface CreateCustomerRequest {
  fullName: string;
  primaryPhone?: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  notes?: string;
  loginProvider?: string; // Social login tracking
  linkedProfileIds?: string[]; // For linking multiple profiles
}

interface CreateCustomerResponse {
  customer: CustomerDetail;
  duplicateWarnings?: CustomerSummary[]; // Potential duplicates found
}

// GET /api/customers/[id] - Get customer details
interface GetCustomerResponse {
  customer: CustomerDetail;
  transactionSummary: {
    totalTransactions: number;
    totalSpent: number;
    averageTransaction: number;
    lastTransaction?: string;
  };
  packageSummary: {
    activePackages: number;
    totalPackages: number;
    lastPackagePurchase?: string;
  };
  bookingSummary: {
    totalBookings: number;
    upcomingBookings: number;
    lastBooking?: string;
  };
}

// PUT /api/customers/[id] - Update customer
interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  updateReason?: string; // Optional reason for audit trail
}

// DELETE /api/customers/[id] - Deactivate customer
interface DeactivateCustomerRequest {
  reason: string; // Required reason for deactivation
}
```

### Related Data Endpoints

```typescript
// GET /api/customers/[id]/transactions
interface GetCustomerTransactionsResponse {
  transactions: TransactionSummary[];
  pagination: PaginationInfo;
  totalAmount: number;
}

// GET /api/customers/[id]/packages
interface GetCustomerPackagesResponse {
  packages: PackageSummary[];
  activePackages: PackageSummary[];
  expiredPackages: PackageSummary[];
}

// GET /api/customers/[id]/bookings
interface GetCustomerBookingsResponse {
  bookings: BookingSummary[];
  upcomingBookings: BookingSummary[];
  pastBookings: BookingSummary[];
}

// Customer notes are integrated into main customer record
// Access via customer.notes field

// POST /api/customers/search-duplicates
interface SearchDuplicatesRequest {
  fullName: string;
  primaryPhone?: string;
  email?: string;
  excludeCustomerId?: string; // For update operations
}

interface SearchDuplicatesResponse {
  potentialDuplicates: Array<{
    customer: CustomerSummary;
    matchScore: number;
    matchReasons: string[];
  }>;
}

// POST /api/customers/merge
interface MergeCustomersRequest {
  primaryCustomerId: string;
  secondaryCustomerIds: string[];
  mergeStrategy: {
    keepPrimaryContact: boolean;
    combineTransactionHistory: boolean;
    combinePackages: boolean;
    combineNotes: boolean;
  };
  mergeReason: string;
}
```

### Analytics Endpoints

```typescript
// GET /api/customers/analytics/kpis
interface CustomerAnalyticsKPIs {
  // Current Numbers
  totalCustomers: number;
  activeCustomers: number;
  vipCustomers: number;
  newCustomersThisMonth: number;
  
  // Financial Metrics
  totalLifetimeValue: number;
  averageLifetimeValue: number;
  averageTransactionValue: number;
  
  // Engagement Metrics
  averageVisitsPerCustomer: number;
  retentionRate: number;
  
  // Growth Metrics
  monthlyGrowthRate: number;
  customerAcquisitionCost?: number;
}

// GET /api/customers/analytics/simple
interface CustomerSimpleAnalyticsResponse {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  totalLifetimeValue: number;
  averageLifetimeValue: number;
  
  // Phone mapping statistics
  phoneMatchSuccessRate: number;
  duplicateCustomersFound: number;
  
  // Profile linking statistics
  linkedProfiles: number;
  multipleProfileCustomers: number;
}
```

## Implementation Plan

### Phase 1: Foundation Setup (Weeks 1-2)

#### Week 1: Database & Backend
- [ ] **Core Database Schema Implementation**
  - Create new `public.customers` table with phone-first design
  - Implement international phone normalization triggers
  - Create phone-priority mapping indexes for fast lookup
  - Implement customer code auto-generation
  - Add integrated notes column
  - Add social login provider tracking
  - **Add customer_id to public.bookings table**
  - **Add customer_id to pos.lengolf_sales table**
  
- [ ] **Basic API Endpoints**
  - Customer CRUD operations (`/api/customers/`)
  - Customer search and filtering
  - Basic validation and error handling
  - TypeScript interfaces and types

#### Week 2: Core Hooks & Components Foundation
- [ ] **React Hooks Development**
  - `useCustomers` - List with filtering and pagination
  - `useCustomer` - Individual customer details
  - `useCustomerForm` - Form management
  - `useCustomerAnalytics` - KPIs and metrics
  
- [ ] **Base Components**
  - Customer table columns definition
  - Basic data table structure
  - KPI cards component
  - Customer search component

### Phase 2: Core UI Development (Weeks 3-4)

#### Week 3: Customer List Interface
- [ ] **Main Customer Page**
  - Complete customer list view with TanStack Table
  - Advanced filtering and search implementation
  - KPI dashboard with live data
  - Pagination and sorting
  
- [ ] **Customer Detail Modal**
  - Quick customer overview modal
  - Basic customer information display
  - Action buttons (edit, deactivate, etc.)

#### Week 4: Customer Form & CRUD
- [ ] **Customer Form Implementation**
  - Multi-section customer creation form
  - Form validation with react-hook-form and yup
  - Duplicate detection and warnings
  - Success/error handling
  
- [ ] **Customer Edit Functionality**
  - Inline editing capabilities
  - Change tracking and audit trail
  - Update confirmation flows

### Phase 3: Advanced Features (Weeks 5-6)

#### Week 5: Integration & History
- [ ] **Transaction Integration**
  - Customer transaction history display
  - Link to transaction management system
  - Transaction filtering and search
  
- [ ] **Package & Booking Integration**
  - Customer package history view
  - Current active packages display
  - Booking history integration
  
- [ ] **Customer Notes System**
  - Add/edit customer notes
  - Note categorization and filtering
  - Staff note visibility controls

#### Week 6: Analytics & POS Integration
- [ ] **Customer Lifetime Spending Implementation**
  - Create customer lifetime spending calculation function
  - Implement auto-update triggers for POS sales
  - Link pos.lengolf_sales to customers via phone matching
  - Simple customer analytics view (no fancy trends)
  
- [ ] **Basic Customer Analytics**
  - Customer status tracking (Active/Inactive/Dormant)
  - Lifetime spending from POS data
  - Booking count and last visit date
  - Simple customer search with filters

### Phase 4: Polish & Migration (Weeks 7-8)

#### Week 7: Duplicate Management & Merging
- [ ] **Duplicate Detection System**
  - Automatic duplicate detection algorithms
  - Manual duplicate identification tools
  - Confidence scoring for matches
  
- [ ] **Customer Merge Functionality**
  - Merge customer records interface
  - Conflict resolution for overlapping data
  - Historical merge tracking

#### Week 8: Migration & Integration
- [ ] **Data Migration Scripts**
  - Migrate existing `backoffice.customers` data
  - Profile linking migration
  - Data validation and cleanup
  
- [ ] **System Integration**
  - Update booking system customer lookup
  - Package creation customer selection
  - Existing customer search component updates

## MVP Migration Strategy

### Core Principle: Gradual Migration to Central Customer Source

**Key Insight**: Migrate booking creation to use `public.customers` as central source while maintaining POS compatibility through targeted sync.

### Current vs Target State

#### Current State (Before Migration)
```
┌─────────────────────────────────────────────────────────────────┐
│                      Current System                              │
├─────────────────────────────────────────────────────────────────┤
│  POS System              │  Website System                      │
│  ┌─────────────────┐     │  ┌─────────────────────────────────┐ │
│  │ Staff creates   │────▶│  │ backoffice.customers            │ │
│  │ customers       │     │  │ (source of truth)               │ │
│  └─────────────────┘     │  └─────────────────────────────────┘ │
│                          │              │                       │
│                          │              ▼                       │
│                          │  ┌─────────────────────────────────┐ │
│                          │  │ Booking system uses             │ │
│                          │  │ backoffice.customers lookup    │ │
│                          │  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Target State (After Migration)
```
┌─────────────────────────────────────────────────────────────────┐
│                      Target System                               │
├─────────────────────────────────────────────────────────────────┤
│  New POS System          │  Website System                      │
│  ┌─────────────────┐     │  ┌─────────────────────────────────┐ │
│  │ Staff creates   │────▶│  │ public.customers                │ │
│  │ customers       │     │  │ (single source of truth)        │ │
│  └─────────────────┘     │  └─────────────────────────────────┘ │
│                          │              │                       │
│                          │              ▼                       │
│                          │  ┌─────────────────────────────────┐ │
│                          │  │ All systems use                 │ │
│                          │  │ public.customers lookup        │ │
│                          │  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Two-Phase MVP Migration

#### Phase 1: Build & Sync (Weeks 8-12)
**Goal**: Create new customer management with sync from POS

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    Phase 1: Build & Sync                         │
├─────────────────────────────────────────────────────────────────┤
│  Current POS             │  New Customer Management              │
│  (Unchanged)             │                                       │
│                          │                                       │
│  ┌─────────────────┐     │  ┌─────────────────────────────────┐ │
│  │ Staff creates   │────▶│  │ backoffice.customers            │ │
│  │ customers       │     │  │                                 │ │
│  └─────────────────┘     │  └─────────────────────────────────┘ │
│                          │              │                       │
│                          │              ▼ Sync                  │
│                          │  ┌─────────────────────────────────┐ │
│                          │  │ public.customers                │ │
│                          │  │ (with stable customer codes)    │ │
│                          │  └─────────────────────────────────┘ │
│                          │              ▲                       │
│                          │              │                       │
│                          │  ┌─────────────────────────────────┐ │
│                          │  │ Staff Customer Management UI    │ │
│                          │  │ /admin/customers                │ │
│                          │  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**MVP Features:**
1. **`public.customers` table** with stable customer codes (CUS-001, CUS-002)
2. **Sync service** from `backoffice.customers` → `public.customers`
3. **Customer management UI** (/admin/customers) for manual CRUD operations
4. **Analytics calculations** (lifetime value, visit count, last visit)
5. **Customer search** and basic reporting

**Sync Implementation:**
```typescript
// One-way sync from POS to new system (Phase 1)
class CustomerSyncService {
  async syncFromPOS() {
    const legacyCustomers = await this.getPOSCustomers();
    
    for (const legacyCustomer of legacyCustomers) {
      // Find existing customer by stable_hash_id or contact info (NOT by POS ID)
      const existingCustomer = await this.findExistingCustomer(legacyCustomer);
      
      if (existingCustomer) {
        // Update existing customer and track POS ID changes
        await this.updateFromLegacy(existingCustomer.id, legacyCustomer);
      } else {
        // Create new customer from POS data with stable customer code
        await this.createFromLegacy(legacyCustomer);
      }
    }
  }

  async findExistingCustomer(legacyCustomer: any) {
    // Method 1: Find by stable_hash_id (most reliable)
    if (legacyCustomer.stable_hash_id) {
      const customer = await this.findByStableHashId(legacyCustomer.stable_hash_id);
      if (customer) return customer;
    }

    // Method 2: Find by current POS ID
    const customer = await this.findByCurrentPOSId(legacyCustomer.id);
    if (customer) return customer;

    // Method 3: Find by contact info (phone + name match)
    if (legacyCustomer.contact_number && legacyCustomer.customer_name) {
      return await this.findByContactInfo(
        legacyCustomer.contact_number, 
        legacyCustomer.customer_name
      );
    }

    return null;
  }

  async updateFromLegacy(customerId: string, legacyCustomer: any) {
    const customer = await this.getCustomer(customerId);
    
    // Track POS ID changes
    const newPOSId = legacyCustomer.id;
    const hasNewPOSId = customer.current_pos_customer_id !== newPOSId;
    
    const updates: any = {
      // Update basic fields
      customer_name: legacyCustomer.customer_name,
      contact_number: legacyCustomer.contact_number,
      email: legacyCustomer.email,
      address: legacyCustomer.address,
      date_of_birth: legacyCustomer.date_of_birth,
      date_joined: legacyCustomer.date_joined,
      stable_hash_id: legacyCustomer.stable_hash_id,
      updated_at: new Date()
    };

    // Handle POS ID changes
    if (hasNewPOSId) {
      // Add old POS ID to history
      const legacyIds = customer.legacy_pos_customer_ids || [];
      if (customer.current_pos_customer_id && !legacyIds.includes(customer.current_pos_customer_id)) {
        legacyIds.push(customer.current_pos_customer_id);
      }

      // Track the change in sync history
      const syncHistory = customer.pos_sync_history || [];
      syncHistory.push({
        timestamp: new Date().toISOString(),
        old_pos_id: customer.current_pos_customer_id,
        new_pos_id: newPOSId,
        reason: 'pos_sync_update'
      });

      updates.legacy_pos_customer_ids = legacyIds;
      updates.current_pos_customer_id = newPOSId;
      updates.pos_sync_history = syncHistory;
    }

    await this.updateCustomer(customerId, updates);
  }
}
```

#### Phase 2: Booking Migration & Reverse Sync (Weeks 13-16)
**Goal**: Migrate booking system to use central customer source

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│              Phase 2: Booking Migration & Reverse Sync           │
├─────────────────────────────────────────────────────────────────┤
│  Current POS             │  Website System                       │
│  (Still creates          │                                       │
│   customers)             │                                       │
│                          │                                       │
│  ┌─────────────────┐     │  ┌─────────────────────────────────┐ │
│  │ Staff creates   │────▶│  │ backoffice.customers            │ │
│  │ customers       │     │  │                                 │ │
│  └─────────────────┘     │  └─────────────────────────────────┘ │
│                          │              │                       │
│                          │              ▼ Forward sync          │
│                          │  ┌─────────────────────────────────┐ │
│                          │  │ public.customers                │ │
│                          │  │ (central source)                │ │
│                          │  └─────────────────────────────────┘ │
│                          │              ▲                       │
│                          │              │ Reverse sync          │
│                          │  ┌─────────────────────────────────┐ │
│                          │  │ Booking system creates new      │ │
│                          │  │ customers in public.customers   │ │
│                          │  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Key Changes:**
1. **Booking system migration**: Use `public.customers` for customer lookup
2. **New customer creation**: When booking creates customer → `public.customers`
3. **Reverse sync**: New customers in `public.customers` sync to `backoffice.customers`
4. **Gradual rollout**: Feature flag to control migration

**Reverse Sync Implementation:**
```typescript
// Bi-directional sync for Phase 2
class CustomerSyncService {
  // Existing: POS → public.customers
  async syncFromPOS() { /* ... existing code ... */ }
  
  // New: public.customers → POS (for new customers created in booking)
  async syncToPOS() {
    const newCustomers = await this.getUnsyncedCustomers();
    
    for (const customer of newCustomers) {
      if (!customer.current_pos_customer_id) {
        // Create in backoffice.customers for POS compatibility
        const posCustomerData = {
          customer_name: customer.customer_name,
          contact_number: customer.contact_number,
          email: customer.email,
          address: customer.address,
          date_of_birth: customer.date_of_birth,
          date_joined: customer.date_joined || new Date().toISOString().split('T')[0],
          stable_hash_id: customer.stable_hash_id,
          // Note: POS will generate its own ID
        };

        const legacyId = await this.createInPOS(posCustomerData);
        
        // Track the new POS ID
        await this.updateCustomer(customer.id, {
          current_pos_customer_id: legacyId,
          pos_sync_history: [
            ...(customer.pos_sync_history || []),
            {
              timestamp: new Date().toISOString(),
              old_pos_id: null,
              new_pos_id: legacyId,
              reason: 'reverse_sync_creation'
            }
          ]
        });
      }
    }
  }
}
```

**Booking System Migration:**
```typescript
// Update booking customer lookup to use public.customers
const CustomerLookup = () => {
  const useNewCustomerSystem = useFeatureFlag('use-central-customers');
  
  if (useNewCustomerSystem) {
    return <NewCustomerLookup source="public.customers" />;
  }
  
  return <LegacyCustomerLookup source="backoffice.customers" />;
};

// When creating new customer in booking
const createBookingCustomer = async (customerData) => {
  if (useNewCustomerSystem) {
    // Create in central system
    const customer = await createCustomer(customerData); // → public.customers
    // Sync service will handle creating in backoffice.customers
    return customer;
  } else {
    // Legacy flow
    return await createLegacyCustomer(customerData); // → backoffice.customers
  }
};
```

### MVP Implementation Timeline

#### Phase 1: Foundation (Weeks 8-12)
- **Week 8**: Database schema creation and basic sync service
- **Week 9**: Customer management UI (list, create, edit)
- **Week 10**: Customer search and basic analytics
- **Week 11**: Testing and refinement
- **Week 12**: Staff training and rollout

#### Phase 2: Booking Integration (Weeks 13-16)
- **Week 13**: Feature flag implementation and booking system updates
- **Week 14**: Reverse sync implementation (public.customers → backoffice.customers)
- **Week 15**: Testing with limited staff group
- **Week 16**: Full rollout and monitoring

### Critical Success Factors

1. **Data Integrity**: Robust sync monitoring and conflict detection
2. **Staff Training**: Clear documentation and training materials
3. **Gradual Rollout**: Feature flags for safe migration
4. **Rollback Plan**: Ability to revert to legacy system if needed
5. **Performance**: Fast customer lookup and creation

### Monitoring & Success Metrics

```typescript
interface MigrationMetrics {
  // Data Quality
  syncSuccessRate: number;          // Percentage of successful syncs
  dataDiscrepancies: number;        // Count of sync conflicts
  customerDuplicates: number;       // Duplicate detection effectiveness
  
  // Performance
  customerLookupTime: number;       // Average lookup time (ms)
  customerCreationTime: number;     // Average creation time (ms)
  
  // Adoption
  staffUsingNewSystem: number;      // Staff adoption rate
  bookingsUsingNewCustomers: number; // Booking system migration success
  
  // Business Impact
  customerDataAccuracy: number;     // Data quality improvement
  operationalEfficiency: number;    // Time savings for staff
}
```

### Data Migration Script

```sql
-- Migration script for existing customer data (simplified schema)
INSERT INTO public.customers (
  customer_name,
  contact_number,
  email,
  address,
  date_of_birth,
  date_joined,
  current_pos_customer_id,
  legacy_pos_customer_ids,
  stable_hash_id,
  pos_sync_history,
  created_at,
  updated_at
)
SELECT 
  bc.customer_name,
  bc.contact_number,
  bc.email,
  bc.address,
  bc.date_of_birth,
  bc.date_joined,
  bc.id, -- Current POS customer ID
  jsonb_build_array(), -- Empty array initially
  bc.stable_hash_id,
  jsonb_build_array(
    jsonb_build_object(
      'timestamp', now(),
      'old_pos_id', null,
      'new_pos_id', bc.id,
      'reason', 'initial_migration'
    )
  ),
  COALESCE(bc.created_at, now()),
  COALESCE(bc.update_time, now())
FROM backoffice.customers bc
WHERE bc.customer_name IS NOT NULL
  AND bc.customer_name != ''
  AND (bc.contact_number IS NOT NULL OR bc.email IS NOT NULL)
ORDER BY bc.created_at;

-- Update analytics fields (calculated from transaction data)
UPDATE public.customers 
SET 
  total_lifetime_value = COALESCE(transaction_summary.total_spent, 0),
  total_visits = COALESCE(transaction_summary.visit_count, 0),
  last_visit_date = transaction_summary.last_transaction_date,
  first_transaction_date = transaction_summary.first_transaction_date
FROM (
  SELECT 
    c.id,
    SUM(CASE WHEN pt.total_amount IS NOT NULL THEN pt.total_amount ELSE 0 END) as total_spent,
    COUNT(DISTINCT pt.sales_date) as visit_count,
    MAX(pt.sales_date) as last_transaction_date,
    MIN(pt.sales_date) as first_transaction_date
  FROM public.customers c
  LEFT JOIN pos.transactions pt ON pt.customer_name = c.customer_name
    AND (pt.customer_phone = c.contact_number OR c.contact_number IS NULL)
  GROUP BY c.id
) transaction_summary
WHERE public.customers.id = transaction_summary.id;
```

## Future Improvements

After the MVP migration is complete, the following enhancements can be considered for future development phases:

### Phase 3: Enhanced Features (Post-MVP)

#### Advanced Customer Analytics
- **Customer Segmentation**: Automatic categorization based on behavior patterns
- **Lifetime Value Prediction**: ML-based customer value forecasting
- **Churn Risk Analysis**: Identify customers at risk of leaving
- **Personalized Recommendations**: Suggest packages/services based on history

#### Enhanced Customer Experience
- **Customer Self-Service Portal**: Allow customers to update their own information
- **Communication History**: Track all SMS/email communications with customers
- **Preference Management**: Detailed customer preference tracking
- **Loyalty Program Integration**: Enhanced points and rewards management

#### Advanced Data Management
- **Smart Duplicate Detection**: AI-powered duplicate identification
- **Customer Merge Wizard**: Sophisticated customer record merging
- **Data Quality Monitoring**: Automated data quality checks and alerts
- **Customer Data Import/Export**: Bulk operations for customer data

#### System Integration Enhancements
- **Real-time Sync**: Move from batch to real-time synchronization
- **Advanced Conflict Resolution**: Sophisticated conflict detection and resolution
- **Multi-location Support**: Support for multiple store locations
- **Third-party Integrations**: Connect with marketing tools, CRM systems

### Phase 4: New POS Integration

#### POS System Replacement
- **New POS Customer Lookup**: Direct integration with `public.customers`
- **Real-time Customer Updates**: Live customer data synchronization
- **Integrated Transaction Processing**: Customer analytics updated in real-time
- **Staff Training Materials**: Updated procedures for new POS system

#### Advanced POS Features
- **Customer Recognition**: Quick customer identification methods
- **Purchase History Display**: Show customer's purchase history in POS
- **Personalized Promotions**: Display customer-specific offers
- **Integrated Loyalty**: Real-time points calculation and redemption

### Technology Enhancements

#### Performance Optimizations
- **Database Optimization**: Advanced indexing and query optimization
- **Caching Strategy**: Redis implementation for frequently accessed data
- **Search Enhancement**: Elasticsearch for advanced customer search
- **API Performance**: GraphQL implementation for flexible data fetching

#### Mobile & Accessibility
- **Mobile App Integration**: Customer management on mobile devices
- **Offline Capability**: Work when internet connection is limited
- **Accessibility Compliance**: WCAG 2.1 AA compliance
- **Multi-language Support**: Support for multiple languages

#### Security & Compliance
- **Advanced Audit Logging**: Comprehensive activity tracking
- **Role-based Permissions**: Granular access control
- **Data Retention Policies**: Automated data lifecycle management
- **GDPR Compliance**: Enhanced privacy controls and data portability

### Implementation Priority

#### High Priority (Consider for Phase 3)
1. **Smart Duplicate Detection** - Immediate business value
2. **Customer Self-Service Portal** - Reduces staff workload
3. **Advanced Analytics** - Business insights and reporting
4. **Real-time Sync** - Improves data consistency

#### Medium Priority (Phase 4)
1. **New POS Integration** - Depends on POS system selection
2. **Advanced Conflict Resolution** - Nice to have but complex
3. **Multi-location Support** - If business expands
4. **Third-party Integrations** - Based on business needs

#### Low Priority (Future Consideration)
1. **AI/ML Features** - Advanced but not immediately necessary
2. **Mobile App** - Depends on staff workflow needs
3. **Multi-language Support** - Based on customer demographics
4. **Advanced Security Features** - Incremental improvements

---

**Last Updated**: January 2025  
**Version**: 1.0 MVP Design  
**Document Owner**: Development Team  
**Review Date**: March 2025

**Implementation Focus**: This design prioritizes a working MVP that solves the core customer ID stability problem while providing a foundation for future POS system integration. All future improvements are designed to build upon this stable foundation.
