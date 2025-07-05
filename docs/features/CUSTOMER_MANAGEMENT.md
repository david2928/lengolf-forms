# Customer Management Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Customer Data Model](#customer-data-model)
4. [CRM Integration](#crm-integration)
5. [Profile Linking System](#profile-linking-system)
6. [VIP Customer System](#vip-customer-system)
7. [Data Synchronization](#data-synchronization)
8. [Customer Search & Selection](#customer-search--selection)
9. [API Endpoints](#api-endpoints)
10. [Database Schema](#database-schema)
11. [Business Logic](#business-logic)
12. [User Interface](#user-interface)
13. [Performance & Caching](#performance--caching)
14. [Troubleshooting](#troubleshooting)

## Overview

The Customer Management system is a comprehensive CRM integration solution that manages customer data from external systems, provides customer search and selection functionality throughout the application, and maintains profile linking between authenticated users and CRM customer records.

### Key Capabilities
- **Automated CRM Synchronization**: Real-time data sync with external CRM via Google Cloud Run
- **Intelligent Customer Matching**: Automated and manual customer profile linking
- **VIP Customer Management**: Enhanced customer data with tier-based benefits
- **Multi-Source Data Integration**: Combines CRM data, profile data, and VIP preferences
- **Advanced Search & Selection**: Fast, intelligent customer search across the application
- **Package Integration**: Links customers to their active packages and usage history

### System Components
- **CRM Customer Mapping**: Central customer data from external CRM
- **Profile Linking**: Links authenticated user profiles to CRM customers  
- **VIP Customer Data**: Enhanced customer profiles with editable preferences
- **Customer Search Interface**: Unified search component used across features
- **Data Synchronization Pipeline**: Automated refresh and matching logic

## Architecture

### Data Flow Overview
```
External CRM → Google Cloud Run → Customer Mapping Tables → Profile Linking → VIP Enhancement → Application UI
```

### Core Components
```
Customer Management System
├── CRM Integration Layer
│   ├── Google Cloud Run Service
│   ├── Customer Data Synchronization
│   └── Automated Matching Pipeline
├── Data Storage Layer
│   ├── crm_customer_mapping
│   ├── crm_profile_links  
│   ├── vip_customer_data
│   └── profiles (auth users)
├── Business Logic Layer
│   ├── Customer Search & Filtering
│   ├── Profile Matching Algorithms
│   ├── VIP Tier Management
│   └── Package Association
└── User Interface Layer
    ├── Customer Search Components
    ├── Customer Selection Dialogs
    └── VIP Profile Management
```

## Customer Data Model

### Core Customer Interface
```typescript
interface Customer {
  id: number;                          // CRM customer ID
  store: string;                       // Store/location identifier
  customer_name: string;               // Full customer name
  contact_number: string | null;       // Primary phone number
  address: string | null;              // Customer address
  email: string | null;                // Email address
  date_of_birth: string | null;        // Birth date (YYYY-MM-DD)
  date_joined: string | null;          // Registration date
  available_credit: number | null;     // Account credit balance
  available_point: number | null;      // Loyalty points balance
  source: string | null;               // Customer acquisition source
  sms_pdpa: boolean | null;           // SMS consent
  email_pdpa: boolean | null;         // Email consent
  batch_id: string;                   // Data sync batch identifier
  update_time: string;                // Last update timestamp
  created_at: string | null;         // Record creation time
  stable_hash_id: string | null;     // Unique hash identifier
  displayName?: string;               // UI display format
}
```

### Enhanced Customer Display
```typescript
// UI-optimized customer display
const formatCustomerDisplay = (customer: Customer) => {
  return customer.contact_number 
    ? `${customer.customer_name} (${customer.contact_number})`
    : customer.customer_name;
};
```

## CRM Integration

### Google Cloud Run Service
The system integrates with an external CRM through a dedicated Google Cloud Run service:

**Service URL**: `https://lengolf-crm-1071951248692.asia-southeast1.run.app/`

**Authentication**: Google ID Token authentication using service account credentials

### Data Synchronization Process
1. **Trigger Sync**: Manual trigger via admin dashboard or scheduled
2. **Authentication**: Service account obtains ID token for Cloud Run
3. **Data Processing**: Cloud Run service processes CRM data
4. **Batch Update**: Customer data updated with batch tracking
5. **Cache Invalidation**: Local cache cleared for fresh data
6. **Status Reporting**: Sync results returned with statistics

### Sync Implementation
```typescript
// Trigger customer data sync
const response = await fetch('/api/crm/update-customers', {
  method: 'GET',
  headers: { 'Accept': 'application/json' }
});

// Response format
interface CloudRunResponse {
  batch_id: string;
  records_processed: number;
  status: string;
  timestamp: string;
}
```

### Data Processing Pipeline
```typescript
// Cloud Run service processes and returns:
{
  success: true,
  batch_id: "BATCH_20250201_143522",
  records_processed: 1247,
  status: "completed",
  timestamp: "2025-02-01T14:35:22Z"
}
```

## Profile Linking System

### Automated Profile Matching
The system automatically links authenticated user profiles to CRM customer records using:

1. **Phone Number Matching**: Primary matching mechanism
2. **Email Address Matching**: Secondary matching option
3. **Name Similarity**: Fuzzy matching for name variations
4. **Manual Override**: Staff can manually link profiles

### Profile Links Table Structure
```sql
CREATE TABLE crm_profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  stable_hash_id TEXT NOT NULL,
  match_confidence REAL NOT NULL DEFAULT 0,
  match_method TEXT,
  linked_at TIMESTAMPTZ DEFAULT now(),
  last_verified TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(profile_id)  -- One-to-one profile linking
);
```

### Matching Algorithm
```typescript
interface CustomerMatchResult {
  profile_id: string;
  stable_hash_id: string;
  confidence: number;      // 0.0 to 1.0
  method: 'phone_match' | 'email_match' | 'name_match' | 'manual';
}

// High confidence phone matching
if (profile.phone === customer.contact_number) {
  return { confidence: 0.95, method: 'phone_match' };
}

// Medium confidence email matching  
if (profile.email === customer.email) {
  return { confidence: 0.80, method: 'email_match' };
}

// Lower confidence name matching
const nameSimilarity = calculateNameSimilarity(profile.name, customer.name);
if (nameSimilarity > 0.85) {
  return { confidence: 0.60, method: 'name_match' };
}
```

## VIP Customer System

### VIP Customer Data Model
```typescript
interface VipCustomerData {
  id: string;                          // UUID primary key
  vip_display_name: string | null;     // Customer preferred name
  vip_email: string | null;            // Customer preferred email
  vip_phone_number: string | null;     // Customer preferred phone
  vip_marketing_preference: boolean;    // Marketing consent
  stable_hash_id: string | null;       // Link to CRM customer
  vip_tier_id: number | null;         // VIP tier reference
  created_at: string;
  updated_at: string;
}
```

### VIP Tier System
```sql
CREATE TABLE vip_tiers (
  id SERIAL PRIMARY KEY,
  tier_name TEXT NOT NULL UNIQUE,    -- "Bogey", "Eagle", "Masters"
  description TEXT,                   -- Tier benefits description
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER,                 -- Display ordering
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Profile to VIP Linking
```sql
-- Enhanced profiles table with VIP linking
ALTER TABLE profiles ADD COLUMN vip_customer_data_id UUID REFERENCES vip_customer_data(id);
```

## Data Synchronization

### Customer Data Refresh Workflow
1. **Manual Trigger**: Staff initiates refresh from dashboard
2. **Authentication**: System authenticates with Google Cloud Run
3. **Data Processing**: Cloud Run processes external CRM data
4. **Batch Processing**: Data updated in configurable batches
5. **Cache Management**: Application cache invalidated
6. **Notification**: Staff notified of completion status

### Caching Strategy
```typescript
import NodeCache from 'node-cache';

// 24-hour TTL cache for customer data
const cache = new NodeCache({ stdTTL: 86400 });

// Cache management
let customers = cache.get('customers_list');
if (!customers || forceRefresh) {
  customers = await fetchCustomersFromDatabase();
  cache.set('customers_list', customers);
}
```

### Data Freshness Indicators
```typescript
interface CustomerDataStatus {
  lastSync: string;           // ISO timestamp of last sync
  recordsProcessed: number;   // Number of records in last sync
  batchId: string;           // Unique batch identifier
  isStale: boolean;          // Data older than 24 hours
}
```

## Customer Search & Selection

### Search Interface Components
The customer search system provides consistent search functionality across:
- **Package Creation**: Customer selection for new packages
- **Booking Creation**: Customer details for new bookings
- **Package Monitor**: Customer filtering and selection
- **Usage Tracking**: Customer identification for package usage

### Search Component Architecture
```typescript
interface CustomerSearchProps {
  customers: Customer[];
  selectedCustomerId?: string;
  showCustomerDialog: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onCustomerSelect: (customer: Customer) => void;
  onDialogOpenChange: (open: boolean) => void;
  getSelectedCustomerDisplay: () => string;
}
```

### Search Functionality
```typescript
// Multi-field search implementation
const filteredCustomers = customers.filter(customer => 
  customer.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  (customer.contact_number?.includes(searchQuery) ?? false)
);

// Mobile-optimized search interface
const isMobile = useMediaQuery('(max-width: 768px)');
```

### Mobile Optimization
- **Full-Screen Modal**: Mobile devices show full-screen customer selection
- **Touch-Friendly Interface**: Large touch targets for selection
- **Optimized Search**: Real-time search with debouncing
- **Keyboard Support**: Proper keyboard navigation support

## API Endpoints

### Customer Data Management

#### `GET /api/crm/update-customers`
Triggers customer data synchronization with external CRM.

**Authentication**: Protected route requiring valid session

**Response**:
```typescript
{
  success: boolean;
  batch_id: string;
  records_processed: number;
  status: string;
  timestamp: string;
}
```

**Implementation**:
```typescript
export async function GET() {
  try {
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID
      }
    });

    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);
    const response = await client.request<CloudRunResponse>({
      url: CLOUD_RUN_URL,
      method: 'GET',
      responseType: 'json'
    });

    return NextResponse.json({
      success: true,
      ...response.data
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update customers',
      details: error.message
    }, { status: 500 });
  }
}
```

### Customer Lookup Services

#### Customer Search by Package
```typescript
// Used by package forms and booking system
const response = await fetch(`/api/packages/by-customer/${encodeURIComponent(customerName)}`);
```

#### Customer Profile Integration
```typescript
// Links customer data to authenticated profiles
const customerProfile = await fetchCustomerByProfileId(profileId);
```

## Database Schema

### Core Customer Tables

#### `crm_customer_mapping`
```sql
CREATE TABLE crm_customer_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES profiles(id),
  crm_customer_id TEXT NOT NULL,
  crm_customer_data JSONB NOT NULL DEFAULT '{}',
  is_matched BOOLEAN NOT NULL DEFAULT false,
  match_method TEXT DEFAULT 'auto',
  match_confidence REAL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  stable_hash_id TEXT
);
```

#### `crm_profile_links`
```sql
CREATE TABLE crm_profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id),
  stable_hash_id TEXT NOT NULL,
  match_confidence REAL NOT NULL DEFAULT 0,
  match_method TEXT,
  linked_at TIMESTAMPTZ DEFAULT now(),
  last_verified TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `vip_customer_data`
```sql
CREATE TABLE vip_customer_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_display_name TEXT,
  vip_email TEXT,
  vip_marketing_preference BOOLEAN DEFAULT true,
  stable_hash_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  vip_phone_number TEXT,
  vip_tier_id INTEGER REFERENCES vip_tiers(id)
);
```

#### `vip_tiers`
```sql
CREATE TABLE vip_tiers (
  id SERIAL PRIMARY KEY,
  tier_name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Relationships and Constraints
```sql
-- Profile to VIP data linking
ALTER TABLE profiles ADD COLUMN vip_customer_data_id UUID REFERENCES vip_customer_data(id);

-- Booking customer tracking
ALTER TABLE bookings ADD COLUMN stable_hash_id TEXT;

-- Indexes for performance
CREATE INDEX idx_crm_customer_mapping_stable_hash ON crm_customer_mapping(stable_hash_id);
CREATE INDEX idx_crm_profile_links_stable_hash ON crm_profile_links(stable_hash_id);
CREATE INDEX idx_vip_customer_stable_hash ON vip_customer_data(stable_hash_id);
CREATE INDEX idx_bookings_stable_hash ON bookings(stable_hash_id);
```

## Business Logic

### Customer Data Transformation
```typescript
function transformCustomer(rawCustomer: any): Customer {
  return {
    id: rawCustomer.id,
    store: rawCustomer.store,
    customer_name: rawCustomer.customer_name,
    contact_number: rawCustomer.contact_number,
    address: rawCustomer.address,
    email: rawCustomer.email,
    date_of_birth: rawCustomer.date_of_birth,
    date_joined: rawCustomer.date_joined,
    available_credit: rawCustomer.available_credit,
    available_point: rawCustomer.available_point,
    source: rawCustomer.source,
    sms_pdpa: rawCustomer.sms_pdpa,
    email_pdpa: rawCustomer.email_pdpa,
    batch_id: rawCustomer.batch_id,
    update_time: rawCustomer.update_time,
    created_at: rawCustomer.created_at,
    stable_hash_id: rawCustomer.stable_hash_id,
    displayName: rawCustomer.contact_number 
      ? `${rawCustomer.customer_name} (${rawCustomer.contact_number})`
      : rawCustomer.customer_name
  };
}
```

### Customer Matching Rules
1. **Exact Phone Match**: 95% confidence
2. **Exact Email Match**: 80% confidence  
3. **Name Similarity**: 60% confidence (requires >85% string similarity)
4. **Manual Linking**: 100% confidence

### Package Association Logic
```typescript
// Link customers to their packages
const customerPackages = await fetch(`/api/packages/by-customer/${encodeURIComponent(customerName)}`);

// Format for display
const packages = customerPackages.map(pkg => ({
  id: pkg.id,
  label: pkg.package_type_name,
  details: {
    customerName: pkg.customer_name,
    packageTypeName: pkg.package_type_name,
    firstUseDate: pkg.first_use_date || 'Not activated',
    expirationDate: pkg.expiration_date || 'No expiry',
    remainingHours: pkg.package_type === 'Unlimited' ? null : pkg.remaining_hours
  }
}));
```

## User Interface

### Customer Search Component
**Location**: `src/components/package-form/customer-search.tsx`

**Features**:
- Real-time search across name and phone number
- Mobile-responsive design with full-screen modal
- Touch-friendly selection interface
- Keyboard navigation support
- Selected customer display with clear formatting

### Desktop Experience
```typescript
// Combobox-style dropdown with search
<Button variant="outline" role="combobox">
  <span>{getSelectedCustomerDisplay()}</span>
  <ChevronsUpDown className="ml-2 h-4 w-4" />
</Button>
```

### Mobile Experience
```typescript
// Full-screen modal for better touch experience
{showCustomerDialog && isMobile && (
  <div className="fixed inset-0 bg-background z-50 flex flex-col">
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <h2>Select Customer</h2>
      <Button onClick={() => onDialogOpenChange(false)}>
        <X className="h-5 w-5" />
      </Button>
    </div>
    {/* Search and results */}
  </div>
)}
```

### Customer Selection Workflow
1. **Initial State**: Shows "Select customer" placeholder
2. **Search Activation**: Opens search dialog/dropdown
3. **Real-time Search**: Filters as user types
4. **Selection**: Customer chosen from filtered results
5. **Confirmation**: Selected customer displayed with formatted name

## Performance & Caching

### Caching Strategy
```typescript
// Node cache with 24-hour TTL
const cache = new NodeCache({ stdTTL: 86400 });

// Cache keys
const CACHE_KEYS = {
  CUSTOMERS_LIST: 'customers_list',
  CUSTOMER_PACKAGES: (customerId: string) => `customer_packages_${customerId}`,
  VIP_TIERS: 'vip_tiers'
};
```

### Cache Management
```typescript
// Force refresh on data updates
const refreshCustomerCache = async () => {
  cache.del(CACHE_KEYS.CUSTOMERS_LIST);
  // Trigger immediate refresh
  await fetchCustomersFromDatabase();
};

// Automatic cache warming
const warmCustomerCache = async () => {
  if (!cache.has(CACHE_KEYS.CUSTOMERS_LIST)) {
    await fetchCustomersFromDatabase();
  }
};
```

### Performance Optimizations
- **Lazy Loading**: Customer data loaded on demand
- **Debounced Search**: Search input debounced to reduce API calls
- **Memoized Results**: Search results memoized for repeated queries
- **Indexed Searches**: Database indexes on frequently searched fields

## Troubleshooting

### Common Issues

#### Customer Data Not Syncing
**Symptoms**: Old or missing customer data
**Solutions**:
1. Check Google Cloud Run service status
2. Verify service account credentials
3. Manually trigger sync from admin dashboard
4. Check network connectivity to Cloud Run service

#### Customer Search Not Working
**Symptoms**: No results or incorrect filtering
**Solutions**:
1. Clear browser cache and refresh
2. Check for JavaScript errors in console
3. Verify customer data is loaded properly
4. Test search with known customer names

#### Profile Linking Issues
**Symptoms**: Customers not linked to user profiles
**Solutions**:
1. Check profile linking confidence scores
2. Verify matching criteria (phone/email)
3. Manually link profiles through admin interface
4. Review customer data for inconsistencies

### Debug Information
```typescript
// Enable debug logging for customer operations
console.log('Customer search results:', filteredCustomers);
console.log('Selected customer:', selectedCustomer);
console.log('Cache status:', cache.keys());
```

### Data Validation
```typescript
// Validate customer data integrity
const validateCustomerData = (customer: Customer) => {
  const issues = [];
  
  if (!customer.customer_name) issues.push('Missing customer name');
  if (!customer.stable_hash_id) issues.push('Missing stable hash ID');
  if (!customer.contact_number && !customer.email) {
    issues.push('Missing contact information');
  }
  
  return issues;
};
```

### Monitoring
- **Sync Success Rate**: Track successful vs failed syncs
- **Cache Hit Rate**: Monitor cache effectiveness
- **Search Performance**: Track search response times
- **Profile Linking Accuracy**: Monitor matching confidence scores

---

**Last Updated**: February 2025  
**Version**: 2.0  
**Maintainer**: Lengolf Development Team 