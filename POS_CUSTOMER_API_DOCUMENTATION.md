# POS Customer Management API Documentation

## Overview
Documentation for existing customer API endpoints that will be leveraged by the POS Customer Management feature. All endpoints support both session-based and Bearer token authentication for POS integration.

## Base URL
```
/api/customers
```

## Authentication
All endpoints require authentication via:
- **Session cookies** (for web app use)
- **Bearer token** (for POS system integration)

```bash
# Get development token for testing
TOKEN=$(curl -s http://localhost:3000/api/dev-token | jq -r '.token')

# Use Bearer token in requests
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/customers
```

## Core Customer Endpoints

### 1. List/Search Customers
**Endpoint:** `GET /api/customers`

**Purpose:** Main customer search and listing with advanced filtering for POS use.

**Query Parameters:**
```typescript
interface CustomerFilters {
  search?: string;                    // Search name, phone, email, customer_code
  isActive?: boolean;                 // Filter by active status (default: true)
  registrationDateFrom?: string;      // YYYY-MM-DD format
  registrationDateTo?: string;        // YYYY-MM-DD format
  lastVisitFrom?: string;            // YYYY-MM-DD format
  lastVisitTo?: string;              // YYYY-MM-DD format
  preferredContactMethod?: 'Phone' | 'LINE' | 'Email' | 'all';
  sortBy?: 'fullName' | 'customerCode' | 'registrationDate' | 'lastVisit' | 'lifetimeValue';
  sortOrder?: 'asc' | 'desc';
  page?: number;                     // Default: 1
  limit?: number;                    // Default: 50, Max: 100
}
```

**Response:**
```typescript
{
  customers: CustomerAnalytics[];
  pagination: {
    total: number;
    pages: number;
    current: number;
    limit: number;
  };
  kpis: {
    totalCustomers: number;
    activeCustomers: number;
    newThisMonth: number;
    averageLifetimeValue: number;
  };
}
```

**Example Usage:**
```bash
# Search for customers by name/phone
curl -H "Authorization: Bearer $TOKEN" \
  "/api/customers?search=john&limit=10"

# Get active customers only
curl -H "Authorization: Bearer $TOKEN" \
  "/api/customers?isActive=true&limit=20"
```

### 2. Create New Customer
**Endpoint:** `POST /api/customers`

**Purpose:** Create new customer with duplicate detection for POS checkout flow.

**Request Body:**
```typescript
interface CreateCustomerRequest {
  fullName: string;                    // Required
  primaryPhone: string;                // Required
  email?: string;
  dateOfBirth?: string;               // YYYY-MM-DD format
  address?: string;
  notes?: string;
  preferredContactMethod?: 'Phone' | 'LINE' | 'Email';
  linkedProfileIds?: string[];
}
```

**Response:**
```typescript
// Success (201)
{
  customer: Customer;
  message: "Customer created successfully";
}

// Duplicate Detection (409)
{
  error: "Potential duplicates found";
  duplicates: DuplicateCustomer[];
  suggestion: "Please review potential duplicates before creating";
}
```

**Duplicate Detection Logic:**
- **Exact phone match** - Blocks creation
- **Exact email match** - Blocks creation  
- **Name similarity >95% + same phone** - Blocks creation
- Lower similarity matches - Returns warnings but allows creation

**Example Usage:**
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Smith",
    "primaryPhone": "0812345678",
    "email": "john@example.com",
    "preferredContactMethod": "Phone"
  }' \
  /api/customers
```

### 3. Get Customer Details
**Endpoint:** `GET /api/customers/[id]`

**Purpose:** Get comprehensive customer information for POS staff.

**Response:**
```typescript
{
  customer: {
    id: string;
    customer_code: string;
    customer_name: string;
    contact_number: string;
    email?: string;
    date_of_birth?: string;
    address?: string;
    notes?: string;
    preferred_contact_method: string;
    customer_profiles: Profile[];
    total_lifetime_value: number;
    total_visits: number;
    last_visit_date?: string;
    customer_create_date: string;
    is_active: boolean;
  };
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
```

**Example Usage:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  /api/customers/customer-uuid-here
```

### 4. Update Customer
**Endpoint:** `PUT /api/customers/[id]`

**Purpose:** Update customer information from POS interface.

**Request Body:**
```typescript
interface UpdateCustomerRequest {
  fullName?: string;
  primaryPhone?: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  notes?: string;
  preferredContactMethod?: 'Phone' | 'LINE' | 'Email';
  linkedProfileIds?: string[];
  updateReason?: string;              // Added to notes with timestamp
}
```

### 5. Deactivate Customer
**Endpoint:** `DELETE /api/customers/[id]`

**Purpose:** Soft delete customer (sets is_active = false).

**Request Body:**
```typescript
{
  reason: string;  // Required - reason for deactivation
}
```

## Supporting Endpoints

### 6. Search for Duplicates
**Endpoint:** `POST /api/customers/search-duplicates`

**Purpose:** Check for potential duplicates before customer creation.

**Request Body:**
```typescript
{
  fullName: string;
  primaryPhone?: string;
  email?: string;
  excludeCustomerId?: string;  // Exclude specific customer from results
}
```

**Response:**
```typescript
{
  potentialDuplicates: Array<{
    customer: CustomerSummary;
    matchScore: number;           // 0-1 similarity score
    matchReasons: string[];       // ["Phone number match", "Name similarity: 95%"]
  }>;
  duplicateCount: number;
  hasHighConfidenceMatches: boolean;  // >90% similarity
}
```

### 7. Customer Transactions
**Endpoint:** `GET /api/customers/[id]/transactions`

**Purpose:** Get detailed transaction history for customer.

### 8. Customer Packages
**Endpoint:** `GET /api/customers/[id]/packages`

**Purpose:** Get customer's golf packages and usage status.

### 9. Customer Bookings
**Endpoint:** `GET /api/customers/[id]/bookings`

**Purpose:** Get customer's booking history and upcoming bookings.

## Data Types

### CustomerAnalytics (from customer_analytics view)
```typescript
interface CustomerAnalytics {
  id: string;
  customer_code: string;
  customer_name: string;
  contact_number: string;
  email?: string;
  customer_create_date: string;
  last_visit_date?: string;
  total_visits: number;
  lifetime_spending: number;
  preferred_contact_method: string;
  is_active: boolean;
  normalized_phone?: string;
}
```

### POS Customer Display (optimized for POS interface)
```typescript
interface POSCustomer {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  email?: string;
  lifetimeValue: number;
  lastVisit?: string;
  totalVisits: number;
  activePackages: number;
  recentTransactions: number;
}
```

## POS Integration Patterns

### 1. Customer Search (Real-time)
```typescript
// Debounced search with instant results
const searchCustomers = async (query: string) => {
  const response = await fetch(
    `/api/customers?search=${encodeURIComponent(query)}&limit=10`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return response.json();
};
```

### 2. Quick Customer Creation
```typescript
// Streamlined creation for POS checkout
const createQuickCustomer = async (name: string, phone: string) => {
  const response = await fetch('/api/customers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fullName: name,
      primaryPhone: phone,
      preferredContactMethod: 'Phone'
    })
  });
  
  if (response.status === 409) {
    // Handle duplicates
    const { duplicates } = await response.json();
    return { isDuplicate: true, duplicates };
  }
  
  return response.json();
};
```

### 3. Customer Details for Transaction
```typescript
// Get essential customer info for POS transaction
const getCustomerForTransaction = async (customerId: string) => {
  const response = await fetch(`/api/customers/${customerId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  
  return {
    id: data.customer.id,
    name: data.customer.customer_name,
    code: data.customer.customer_code,
    phone: data.customer.contact_number,
    lifetimeValue: data.customer.total_lifetime_value,
    activePackages: data.packageSummary.activePackages
  };
};
```

## Performance Considerations

### Caching Strategy
- Customer search results cached for 30 seconds
- Customer details cached for 5 minutes
- KPIs cached for 15 minutes

### Search Optimization
- Uses `customer_analytics` view for optimized queries
- ILIKE search across name, phone, email, customer_code
- Pagination prevents large result sets
- Search limited to active customers by default

### Best Practices for POS
1. **Debounce search** - Wait 300ms after typing stops
2. **Limit results** - Show max 10-20 results for performance
3. **Cache recent searches** - Store last 5 searches locally
4. **Progressive loading** - Load basic info first, details on demand
5. **Offline fallback** - Cache recent customers for offline use

## Error Handling

### Common Error Responses
```typescript
// 401 Unauthorized
{ error: "Unauthorized" }

// 404 Not Found
{ error: "Customer not found" }

// 409 Conflict (Duplicates)
{
  error: "Potential duplicates found",
  duplicates: DuplicateCustomer[],
  suggestion: string
}

// 500 Server Error
{
  error: "Failed to fetch customers",
  details: string
}
```

### POS Error Handling
```typescript
const handleCustomerApiError = (error: any) => {
  if (error.status === 409) {
    // Show duplicate selection modal
    showDuplicateModal(error.duplicates);
  } else if (error.status === 404) {
    // Customer not found - offer to create new
    showCreateCustomerModal();
  } else {
    // General error - show retry option
    showErrorToast("Customer lookup failed. Please try again.");
  }
};
```

## Development Testing

### Setup Development Environment
```bash
# Enable auth bypass
echo "SKIP_AUTH=true" >> .env.local

# Start development server
npm run dev

# Get development token
TOKEN=$(curl -s http://localhost:3000/api/dev-token | jq -r '.token')
```

### Test Customer Operations
```bash
# Search customers
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/customers?search=john&limit=5"

# Create customer
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test Customer","primaryPhone":"0801234567"}' \
  http://localhost:3000/api/customers

# Get customer details
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/customers/customer-id-here
```

This API provides all the functionality needed for the POS Customer Management feature, including fast search, duplicate detection, and comprehensive customer information display.