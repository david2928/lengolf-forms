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
- **Primary Table**: `public.customers` (redesigned)
- **Supporting Tables**: VIP tiers, customer notes, contact history
- **Search Optimization**: Full-text search capabilities
- **Audit Trail**: Complete change tracking

#### 2. **Staff Management UI**
- **Location**: `/admin/customers/`
- **Pattern**: Follow transaction management design
- **Features**: Create, Read, Update, Deactivate customers
- **Analytics**: Customer KPIs and insights

#### 3. **Integration Layer**
- **Booking System**: Customer lookup and selection
- **Package Management**: Customer-package associations
- **Transaction History**: Link to POS transaction data
- **Profile Linking**: Connect website users to customers

#### 4. **Analytics & Reporting**
- **Customer KPIs**: Total, new, VIP, active customers
- **Trend Analysis**: Customer growth, retention, lifetime value
- **Segmentation**: Customer categories and behaviors

## Database Schema Design

### Primary Customer Table: `public.customers`

```sql
-- New customer table with minimal fields (matching existing backoffice.customers + analytics)
CREATE TABLE public.customers (
  -- Primary Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code VARCHAR(20) UNIQUE NOT NULL, -- CUS-001, CUS-002, etc.
  
  -- Core Information (from backoffice.customers)
  customer_name VARCHAR(255) NOT NULL,
  contact_number VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  date_of_birth DATE,
  date_joined DATE,
  
  -- Financial Information (from backoffice.customers)
  available_credit DECIMAL(10,2) DEFAULT 0.00,
  available_point INTEGER DEFAULT 0,
  customer_source customer_source_enum DEFAULT 'Walk In',
  
  -- Consent (from backoffice.customers)
  sms_pdpa BOOLEAN DEFAULT false,
  email_pdpa BOOLEAN DEFAULT false,
  
  -- Analytics Information (new calculated fields)
  total_lifetime_value DECIMAL(12,2) DEFAULT 0.00,
  total_visits INTEGER DEFAULT 0,
  last_visit_date DATE,
  first_transaction_date DATE,
  
  -- Legacy Compatibility
  legacy_pos_customer_id BIGINT, -- Maps to backoffice.customers.id
  stable_hash_id VARCHAR(255), -- For existing system compatibility
  
  -- System Information
  created_by UUID REFERENCES backoffice.allowed_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES backoffice.allowed_users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Status Management
  is_active BOOLEAN DEFAULT true,
  
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

-- Indexes for Performance
CREATE INDEX idx_customers_search ON public.customers USING GIN(search_vector);
CREATE INDEX idx_customers_contact_number ON public.customers(contact_number);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customers_customer_code ON public.customers(customer_code);
CREATE INDEX idx_customers_legacy_pos_id ON public.customers(legacy_pos_customer_id);
CREATE INDEX idx_customers_active ON public.customers(is_active);
CREATE INDEX idx_customers_created_at ON public.customers(created_at);
CREATE UNIQUE INDEX idx_customers_stable_hash ON public.customers(stable_hash_id) WHERE stable_hash_id IS NOT NULL;

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

### Supporting Tables

#### Customer Notes Table
```sql
CREATE TABLE public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  note_type VARCHAR(50) DEFAULT 'general', -- general, complaint, preference, etc.
  note_text TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true, -- Internal staff notes vs customer-visible
  created_by UUID REFERENCES backoffice.allowed_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_customer_notes_customer_id ON public.customer_notes(customer_id);
CREATE INDEX idx_customer_notes_created_at ON public.customer_notes(created_at);
```

#### Customer Contact History
```sql
CREATE TABLE public.customer_contact_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  contact_type VARCHAR(50) NOT NULL, -- phone, email, sms, visit
  contact_method VARCHAR(100), -- The actual phone/email used
  contacted_by UUID REFERENCES backoffice.allowed_users(id),
  contact_date TIMESTAMPTZ DEFAULT now(),
  purpose VARCHAR(100), -- booking, follow-up, marketing, etc.
  notes TEXT,
  successful BOOLEAN DEFAULT true
);

CREATE INDEX idx_contact_history_customer_id ON public.customer_contact_history(customer_id);
CREATE INDEX idx_contact_history_contact_date ON public.customer_contact_history(contact_date);
```

#### Customer Merge History
```sql
CREATE TABLE public.customer_merge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_customer_id UUID NOT NULL REFERENCES public.customers(id),
  merged_customer_data JSONB NOT NULL, -- Full data of merged customer
  merged_customer_code VARCHAR(20) NOT NULL,
  merge_reason TEXT,
  merged_by UUID REFERENCES backoffice.allowed_users(id),
  merged_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_merge_history_primary_customer ON public.customer_merge_history(primary_customer_id);
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
  
  // Financial Summary
  totalLifetimeValue: number;
  totalVisits: number;
  averageTransactionValue: number;
  availableCredit: number;
  loyaltyPoints: number;
  
  // VIP Information
  vipTier?: {
    id: number;
    name: string;
    description: string;
  };
  vipStatusDate?: string;
  
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
   - Secondary Phone
   - Date of Birth

2. **Contact Information**
   - Address fields
   - Preferred language
   - Contact preferences (SMS, Email, Marketing consent)

3. **Business Information**
   - Customer Source
   - Initial credit amount
   - VIP tier assignment
   - Special notes

4. **Profile Linking** (if applicable)
   - Link to existing website profile
   - Confidence score display
   - Manual override options

#### Form Validation
```typescript
interface CustomerFormData {
  fullName: string; // Required, min 2 chars
  primaryPhone?: string; // Format validation
  secondaryPhone?: string; // Format validation
  email?: string; // Email format validation
  dateOfBirth?: Date; // Cannot be future date
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  customerSource: CustomerSourceEnum; // Required
  availableCredit: number; // >= 0
  vipTierId?: number;
  smsConsent: boolean;
  emailConsent: boolean;
  marketingConsent: boolean;
  notes?: string;
}

// Validation rules
const validation = {
  fullName: yup.string().required().min(2).max(255),
  primaryPhone: yup.string().matches(/^[+]?[0-9\s-()]{8,20}$/),
  email: yup.string().email(),
  dateOfBirth: yup.date().max(new Date()),
  availableCredit: yup.number().min(0),
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
  secondaryPhone?: string;
  email?: string;
  dateOfBirth?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  customerSource: CustomerSourceEnum;
  availableCredit?: number;
  vipTierId?: number;
  smsConsent: boolean;
  emailConsent: boolean;
  marketingConsent: boolean;
  notes?: string;
  linkedProfileId?: string; // For manual profile linking
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

// GET /api/customers/[id]/notes
// POST /api/customers/[id]/notes
interface CustomerNote {
  id: string;
  noteType: string;
  noteText: string;
  isInternal: boolean;
  createdBy: string;
  createdAt: string;
}

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

// GET /api/customers/analytics/trends
interface CustomerTrendsResponse {
  registrationTrends: Array<{
    date: string;
    newCustomers: number;
    cumulativeCustomers: number;
  }>;
  
  sourceTrends: Array<{
    source: CustomerSourceEnum;
    count: number;
    percentage: number;
  }>;
  
  vipTrends: Array<{
    tierName: string;
    count: number;
    percentage: number;
    averageLifetimeValue: number;
  }>;
}

// GET /api/customers/analytics/segmentation
interface CustomerSegmentationResponse {
  segments: Array<{
    segmentName: string;
    count: number;
    percentage: number;
    averageLifetimeValue: number;
    criteria: string;
  }>;
}
```

## Implementation Plan

### Phase 1: Foundation Setup (Weeks 1-2)

#### Week 1: Database & Backend
- [ ] **Database Schema Implementation**
  - Create new `public.customers` table with full schema
  - Set up supporting tables (notes, contact history, merge history)
  - Create indexes and constraints
  - Implement triggers for auto-generation and updates
  
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

#### Week 6: Analytics & Reporting
- [ ] **Customer Analytics Dashboard**
  - Customer KPI calculations
  - Trend analysis charts
  - Customer segmentation views
  - Export capabilities
  
- [ ] **Advanced Search & Filtering**
  - Full-text search implementation
  - Saved filter presets
  - Advanced filter combinations

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
      const existingCustomer = await this.findByLegacyId(legacyCustomer.id);
      
      if (existingCustomer) {
        // Update existing customer with latest POS data
        await this.updateFromLegacy(existingCustomer.id, legacyCustomer);
      } else {
        // Create new customer from POS data with stable customer code
        await this.createFromLegacy(legacyCustomer);
      }
    }
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
      if (!customer.legacy_pos_customer_id) {
        // Create in backoffice.customers for POS compatibility
        const legacyId = await this.createInPOS(customer);
        await this.linkToLegacy(customer.id, legacyId);
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

## Future Improvements

After the MVP migration is complete, the following enhancements can be considered for future development phases:

### Phase 3: Enhanced Customer Management Features

#### Advanced Customer Analytics

**Migration Priorities:**
1. **Week 13-14**: Staff Customer Creation
   - All new customers created through new system
   - Auto-sync to legacy POS for transactions
   - Staff training on new customer management UI

2. **Week 15-16**: Booking System Migration
   - Booking system uses new customer lookup
   - Customer selection from new system
   - Maintain booking-to-POS customer linking

3. **Week 17-18**: Package System Migration
   - Package creation uses new customer management
   - Package-customer associations through new system
   - Sync package data to legacy POS

4. **Week 19-20**: Transaction Integration
   - Begin linking transactions to new customer IDs
   - Maintain dual linking during transition
   - Prepare for POS replacement

**Feature Flag Implementation:**
```typescript
// Feature flags for gradual rollout
const FeatureFlags = {
  USE_NEW_CUSTOMER_SEARCH: 'new-customer-search',
  USE_NEW_CUSTOMER_CREATION: 'new-customer-creation',
  USE_NEW_BOOKING_INTEGRATION: 'new-booking-integration',
  USE_NEW_PACKAGE_INTEGRATION: 'new-package-integration',
  ENABLE_POS_TRANSITION: 'pos-transition'
};

// Component that adapts based on feature flags
const CustomerSearch = () => {
  const useNewSystem = useFeatureFlag(FeatureFlags.USE_NEW_CUSTOMER_SEARCH);
  
  if (useNewSystem) {
    return <NewCustomerSearchComponent />;
  }
  
  return <LegacyCustomerSearchComponent />;
};
```

#### Phase 3: POS System Transition (Weeks 21-28)
**Goal**: Replace legacy POS with new POS system integrated with customer management

**New POS Integration Architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    New Integrated System                         │
├─────────────────────────────────────────────────────────────────┤
│  New POS System           │  Customer Management  │  Website     │
│  ┌─────────────────────┐  │  ┌─────────────────┐  │  System      │
│  │ POS UI              │──┤  │ public.         │  │              │
│  │ - Customer Lookup   │  │  │ customers       │◀─┤              │
│  │ - Transaction Entry │  │  │ (single source) │  │              │
│  │ - Payment Process   │  │  └─────────────────┘  │              │
│  └─────────────────────┘  │          │            │              │
│           │               │          ▼            │              │
│           ▼               │  ┌─────────────────┐  │              │
│  ┌─────────────────────┐  │  │ Analytics &     │  │              │
│  │ pos.transactions    │  │  │ Reporting       │  │              │
│  │ (linked to          │  │  └─────────────────┘  │              │
│  │ customer.id)        │  │                       │              │
│  └─────────────────────┘  │                       │              │
└─────────────────────────────────────────────────────────────────┘
```

**New POS Requirements:**
```typescript
// Customer lookup interface for new POS
interface POSCustomerLookup {
  searchCustomers(query: string): Promise<POSCustomerResult[]>;
  getCustomerById(customerId: string): Promise<POSCustomerDetail>;
  createQuickCustomer(basicInfo: QuickCustomerInfo): Promise<string>;
  updateCustomerSpending(customerId: string, amount: number): Promise<void>;
}

interface POSCustomerResult {
  customerId: string;
  customerCode: string;
  displayName: string;
  primaryPhone?: string;
  availableCredit: number;
  loyaltyPoints: number;
  vipTier?: string;
  lastVisit?: string;
}

interface POSCustomerDetail extends POSCustomerResult {
  email?: string;
  address?: string;
  preferences: {
    smsReceipts: boolean;
    emailReceipts: boolean;
  };
  recentTransactions: TransactionSummary[];
}
```

### Data Synchronization Strategy

#### Real-Time Sync During Parallel Operation

1. **Database Triggers for Legacy System**
```sql
-- Trigger on legacy customer changes
CREATE OR REPLACE FUNCTION sync_legacy_customer_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert sync job for processing
  INSERT INTO customer_sync_queue (
    legacy_customer_id,
    operation_type,
    data_payload,
    created_at
  ) VALUES (
    NEW.id,
    TG_OP,
    row_to_json(NEW),
    now()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_legacy_changes
  AFTER INSERT OR UPDATE OR DELETE ON backoffice.customers
  FOR EACH ROW
  EXECUTE FUNCTION sync_legacy_customer_changes();
```

2. **Sync Queue Processing**
```typescript
class CustomerSyncProcessor {
  async processSync() {
    const syncJobs = await this.getSyncQueue();
    
    for (const job of syncJobs) {
      try {
        await this.processSyncJob(job);
        await this.markJobCompleted(job.id);
      } catch (error) {
        await this.markJobFailed(job.id, error);
        // Retry logic or manual intervention
      }
    }
  }

  async processSyncJob(job: SyncJob) {
    switch (job.operationType) {
      case 'INSERT':
        await this.syncNewLegacyCustomer(job.dataPayload);
        break;
      case 'UPDATE':
        await this.syncUpdatedLegacyCustomer(job.dataPayload);
        break;
      case 'DELETE':
        await this.handleLegacyCustomerDeletion(job.legacyCustomerId);
        break;
    }
  }
}
```

#### Batch Reconciliation

```typescript
// Daily reconciliation process
class CustomerReconciliationService {
  async performDailyReconciliation() {
    const discrepancies = await this.findDiscrepancies();
    
    const report = {
      timestamp: new Date(),
      totalCustomers: {
        legacy: await this.countLegacyCustomers(),
        new: await this.countNewCustomers()
      },
      discrepancies: discrepancies.map(d => ({
        customerId: d.customerId,
        field: d.field,
        legacyValue: d.legacyValue,
        newValue: d.newValue,
        lastSync: d.lastSync
      })),
      autoResolved: 0,
      manualReviewRequired: 0
    };

    // Auto-resolve simple discrepancies
    for (const discrepancy of discrepancies) {
      if (this.canAutoResolve(discrepancy)) {
        await this.resolveDiscrepancy(discrepancy);
        report.autoResolved++;
      } else {
        report.manualReviewRequired++;
      }
    }

    await this.generateReconciliationReport(report);
    return report;
  }
}
```

### Legacy POS Integration Points

#### Customer Creation Flow
```typescript
// When POS creates a customer
app.post('/api/pos/customers', async (req, res) => {
  const posCustomerData = req.body;
  
  // 1. Check if customer exists in new system
  const existingCustomer = await findCustomerByContactInfo(posCustomerData);
  
  if (existingCustomer) {
    // 2. Link existing customer to POS record
    await linkPOSCustomer(existingCustomer.id, posCustomerData.id);
    res.json({ customerId: existingCustomer.id, linked: true });
  } else {
    // 3. Create customer in new system
    const newCustomer = await createCustomerFromPOS(posCustomerData);
    res.json({ customerId: newCustomer.id, created: true });
  }
});
```

#### Transaction Recording Flow
```typescript
// When POS records a transaction
app.post('/api/pos/transactions', async (req, res) => {
  const transaction = req.body;
  
  // 1. Resolve customer ID from POS customer ID
  const customerId = await resolveCustomerFromPOS(transaction.posCustomerId);
  
  // 2. Record transaction with stable customer ID
  const transactionRecord = await createTransaction({
    ...transaction,
    customerId: customerId,
    legacyPosCustomerId: transaction.posCustomerId
  });
  
  // 3. Update customer statistics
  await updateCustomerStats(customerId, {
    lastVisit: transaction.date,
    lifetimeValue: transaction.amount,
    visitCount: 1
  });
  
  res.json({ transactionId: transactionRecord.id });
});
```

### Staff Training & Change Management

#### Training Phases

1. **Phase 1: Core Staff Training (Week 8)**
   - Customer management system overview
   - Basic customer creation and editing
   - Understanding customer codes and linking
   - Duplicate detection and handling

2. **Phase 2: Advanced Features (Week 12)**
   - Customer analytics and reporting
   - Merge customer functionality
   - Profile linking and management
   - Customer communication tools

3. **Phase 3: POS Integration (Week 20)**
   - New POS customer lookup procedures
   - Transaction processing with stable IDs
   - Troubleshooting integration issues

#### Change Management Strategy

```typescript
// Staff notification system for changes
interface SystemChangeNotification {
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionRequired: boolean;
  trainingMaterials?: string[];
  effectiveDate: Date;
}

// Example notifications
const changeNotifications: SystemChangeNotification[] = [
  {
    title: "New Customer Management System Available",
    description: "Staff can now create and edit customers using the new system",
    impact: "medium",
    actionRequired: true,
    trainingMaterials: ["/docs/customer-management-basics"],
    effectiveDate: new Date("2025-02-01")
  },
  {
    title: "Booking System Customer Lookup Updated",
    description: "Booking system now uses new customer search",
    impact: "low",
    actionRequired: false,
    effectiveDate: new Date("2025-02-15")
  }
];
```

### Monitoring & Rollback Strategy

#### System Health Monitoring

```typescript
// Health check system for parallel operation
class SystemHealthMonitor {
  async checkSystemHealth() {
    const health = {
      timestamp: new Date(),
      systems: {
        legacyPOS: await this.checkLegacyPOSHealth(),
        newCustomerManagement: await this.checkNewSystemHealth(),
        syncService: await this.checkSyncServiceHealth()
      },
      syncMetrics: {
        queueLength: await this.getSyncQueueLength(),
        averageProcessingTime: await this.getAverageProcessingTime(),
        failureRate: await this.getSyncFailureRate(),
        lastSuccessfulSync: await this.getLastSuccessfulSync()
      },
      dataIntegrity: {
        totalDiscrepancies: await this.getTotalDiscrepancies(),
        criticalDiscrepancies: await this.getCriticalDiscrepancies(),
        lastReconciliation: await this.getLastReconciliation()
      }
    };

    // Alert if critical thresholds exceeded
    if (health.syncMetrics.failureRate > 0.05) {
      await this.alertSystemAdministrators('High sync failure rate detected');
    }

    if (health.dataIntegrity.criticalDiscrepancies > 10) {
      await this.alertSystemAdministrators('Critical data discrepancies detected');
    }

    return health;
  }
}
```

#### Rollback Procedures

```typescript
// Emergency rollback procedures
class EmergencyRollback {
  async rollbackToLegacyOnly() {
    console.log('🚨 EMERGENCY ROLLBACK: Reverting to legacy POS only');
    
    // 1. Disable new system features
    await this.disableFeatureFlags([
      'new-customer-search',
      'new-customer-creation',
      'new-booking-integration'
    ]);
    
    // 2. Restore legacy customer lookup in booking system
    await this.restoreLegacyCustomerLookup();
    
    // 3. Stop sync services
    await this.stopSyncServices();
    
    // 4. Generate rollback report
    await this.generateRollbackReport();
    
    console.log('✅ Rollback completed - system running on legacy POS only');
  }

  async partialRollback(feature: string) {
    console.log(`🔄 PARTIAL ROLLBACK: Disabling ${feature}`);
    
    switch (feature) {
      case 'customer-creation':
        await this.disableFeatureFlag('new-customer-creation');
        await this.restoreLegacyCustomerCreation();
        break;
      case 'booking-integration':
        await this.disableFeatureFlag('new-booking-integration');
        await this.restoreLegacyBookingCustomerLookup();
        break;
    }
  }
}
```

### Success Metrics & KPIs

#### Transition Success Metrics

```typescript
interface TransitionMetrics {
  // Data Quality
  duplicateCustomerReduction: number; // Percentage reduction in duplicates
  dataIntegrityScore: number; // 0-100 score
  syncAccuracy: number; // Percentage of successful syncs
  
  // Operational Efficiency
  customerLookupSpeed: number; // Average lookup time in ms
  customerCreationTime: number; // Average creation time in seconds
  staffAdoptionRate: number; // Percentage of staff using new system
  
  // Business Impact
  customerSatisfaction: number; // Survey score
  staffProductivity: number; // Relative to baseline
  systemDowntime: number; // Minutes of downtime during transition
}
```

This comprehensive parallel operation strategy ensures:
- ✅ **Zero Disruption**: Old POS continues working throughout transition
- ✅ **Data Integrity**: Robust sync and reconciliation processes
- ✅ **Gradual Migration**: Feature-by-feature rollout with rollback capability
- ✅ **Staff Support**: Training and change management procedures
- ✅ **Future Ready**: Architecture prepared for new POS integration

### Data Migration Script

```sql
-- Migration script for existing customer data
INSERT INTO public.customers (
  full_name,
  primary_phone,
  email,
  date_of_birth,
  address_line_1,
  customer_source,
  registration_date,
  available_credit,
  loyalty_points,
  legacy_pos_ids,
  stable_hash_id,
  migration_batch_id,
  sms_consent,
  email_consent,
  created_at,
  updated_at
)
SELECT 
  bc.customer_name,
  bc.contact_number,
  bc.email,
  bc.date_of_birth,
  bc.address,
  bc.source::customer_source_enum,
  bc.date_joined,
  bc.available_credit,
  bc.available_point,
  jsonb_build_array(bc.id),
  bc.stable_hash_id,
  'MIGRATION_2025_01',
  bc.sms_pdpa,
  bc.email_pdpa,
  bc.created_at,
  bc.update_time
FROM backoffice.customers bc
WHERE bc.customer_name IS NOT NULL
  AND bc.customer_name != ''
ORDER BY bc.created_at;

-- Update VIP information from existing VIP data
UPDATE public.customers 
SET 
  vip_tier_id = vcd.vip_tier_id,
  vip_status_date = vcd.created_at::date
FROM public.vip_customer_data vcd
WHERE public.customers.stable_hash_id = vcd.stable_hash_id
  AND vcd.vip_tier_id IS NOT NULL;

-- Link to existing profiles
UPDATE public.customers 
SET 
  linked_profile_id = cpl.profile_id,
  profile_link_confidence = cpl.match_confidence,
  profile_link_method = cpl.match_method,
  profile_linked_at = cpl.linked_at
FROM public.crm_profile_links cpl
WHERE public.customers.stable_hash_id = cpl.stable_hash_id;
```

### Backward Compatibility

#### Legacy API Support
```typescript
// Maintain existing customer API for transition period
// /api/customers (legacy) -> /api/customers/legacy
app.get('/api/customers/legacy', async (req, res) => {
  // Map new customer data to old format
  const customers = await getCustomersFromNew();
  const legacyFormat = customers.map(customer => ({
    id: customer.legacyPosIds[0] || customer.id,
    customer_name: customer.fullName,
    contact_number: customer.primaryPhone,
    stable_hash_id: customer.stableHashId
  }));
  res.json(legacyFormat);
});
```

#### Component Migration
```typescript
// Gradual component replacement
const CustomerSearch = () => {
  const useNewCustomerSystem = useFeatureFlag('new-customer-system');
  
  if (useNewCustomerSystem) {
    return <NewCustomerSearch />;
  }
  
  return <LegacyCustomerSearch />;
};
```

## Technical Specifications

### Technology Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Components**: Radix UI, TanStack Table
- **Forms**: react-hook-form, yup validation
- **Data Fetching**: SWR for caching and state management
- **Database**: Supabase PostgreSQL
- **Authentication**: Existing NextAuth.js system

### Performance Requirements
- **Page Load Time**: < 2 seconds for customer list
- **Search Response**: < 500ms for customer search
- **Form Submission**: < 1 second for customer create/update
- **Data Refresh**: < 3 seconds for full data reload
- **Concurrent Users**: Support 20+ staff members simultaneously

### Code Organization

#### Hooks Structure
```typescript
// src/hooks/use-customers.ts
export const useCustomers = (options: CustomerListOptions) => {
  // Customer list with filtering, pagination, sorting
};

// src/hooks/use-customer.ts
export const useCustomer = (customerId: string) => {
  // Individual customer details
};

// src/hooks/use-customer-form.ts
export const useCustomerForm = (customerId?: string) => {
  // Form management for create/edit
};

// src/hooks/use-customer-analytics.ts
export const useCustomerAnalytics = () => {
  // Customer KPIs and analytics
};
```

#### Component Structure
```typescript
// src/components/admin/customers/
├── customer-list.tsx           # Main list component
├── customer-table.tsx          # Data table
├── customer-columns.tsx        # Table column definitions
├── customer-kpis.tsx          # KPI dashboard
├── customer-filters.tsx       # Filtering interface
├── customer-search.tsx        # Search component
├── customer-detail-modal.tsx  # Quick view modal
├── customer-form-modal.tsx    # Create/edit form
├── customer-merge-modal.tsx   # Merge functionality
└── customer-analytics.tsx     # Analytics widgets
```

### Error Handling

#### API Error Responses
```typescript
interface APIError {
  error: string;
  message: string;
  code: string;
  details?: any;
  timestamp: string;
}

// Standard error codes
enum CustomerErrorCodes {
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  DUPLICATE_CUSTOMER = 'DUPLICATE_CUSTOMER',
  INVALID_PHONE_FORMAT = 'INVALID_PHONE_FORMAT',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  PROFILE_LINK_FAILED = 'PROFILE_LINK_FAILED',
  MERGE_CONFLICT = 'MERGE_CONFLICT'
}
```

#### Frontend Error Handling
```typescript
// Global error handling for customer operations
const handleCustomerError = (error: APIError) => {
  switch (error.code) {
    case CustomerErrorCodes.DUPLICATE_CUSTOMER:
      showDuplicateWarning(error.details.duplicates);
      break;
    case CustomerErrorCodes.CUSTOMER_NOT_FOUND:
      showNotFoundError();
      break;
    default:
      showGenericError(error.message);
  }
};
```

### Security Considerations

#### Data Protection
- **PII Encryption**: Sensitive data encrypted at rest
- **Access Control**: Role-based access to customer data
- **Audit Trail**: Complete logging of all customer data changes
- **Data Retention**: Configurable retention policies

#### API Security
- **Authentication**: All endpoints require valid session
- **Authorization**: Staff-level access required for customer management
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Comprehensive validation on all inputs

## Future Considerations

### POS Integration Preparation
- **Customer Lookup API**: Standardized customer search for POS
- **Real-time Sync**: Live customer data updates
- **Transaction Linking**: Automatic customer association
- **Loyalty Integration**: Points and rewards management

### Advanced Features Roadmap
1. **Customer Communication Hub**
   - SMS/Email campaign management
   - Automated marketing sequences
   - Communication history tracking

2. **Advanced Analytics**
   - Customer lifetime value prediction
   - Churn risk analysis
   - Personalized recommendations

3. **Mobile App Integration**
   - Customer profile management
   - Self-service updates
   - Loyalty program integration

4. **AI-Powered Features**
   - Intelligent duplicate detection
   - Customer segmentation automation
   - Predictive analytics

### Scalability Considerations
- **Database Optimization**: Query optimization for large datasets
- **Caching Strategy**: Redis caching for frequently accessed data
- **Search Enhancement**: Elasticsearch for advanced search capabilities
- **API Performance**: GraphQL for flexible data fetching

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Document Owner**: Development Team  
**Review Date**: March 2025