# Product Management System Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Features](#features)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [User Interface](#user-interface)
7. [Business Logic](#business-logic)
8. [Security & Permissions](#security--permissions)
9. [Performance](#performance)
10. [Troubleshooting](#troubleshooting)
11. [Implementation Guide](#implementation-guide)

## Overview

The Product Management System is a comprehensive administrative module within the Lengolf Forms application that provides complete CRUD operations for managing the product catalog, category hierarchies, and pricing structures used throughout the business operations.

### Key Characteristics
- **Hierarchical Categories**: Two-level category structure (Tab → Category → Product)
- **Real-time Analytics**: Live profit margin calculations and product analytics
- **Mobile Optimized**: Responsive design for mobile admin management
- **Bulk Operations**: Mass updates for efficiency
- **Data Migration**: Support for legacy Qashier POS data migration
- **Integration Ready**: Designed to work with existing inventory and POS systems

### Business Context
This system manages the complete product catalog used across:
- **POS Transactions**: Products available for sale at the golf facility
- **Inventory Management**: Stock tracking and reorder points
- **Pricing Strategy**: Cost analysis and profit margin optimization
- **Reporting**: Sales analytics and performance metrics

## System Architecture

### Technology Stack
- **Frontend**: React 18, Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Supabase PostgreSQL
- **State Management**: React hooks, SWR for data fetching
- **Form Management**: React Hook Form with validation
- **UI Components**: Shadcn/ui component library

### Directory Structure
```
app/admin/products/              # Product management pages
├── page.tsx                     # Main products listing page
└── components/                  # Product-specific components

src/components/admin/products/   # React components
├── product-list-table.tsx       # Main product table with mobile support
├── product-form.tsx             # Create/edit product form
├── category-form.tsx            # Category management form
├── bulk-operations.tsx          # Mass update operations
├── product-analytics.tsx        # Analytics dashboard
└── filters/                     # Search and filter components

src/hooks/                       # Custom hooks
├── use-products.ts              # Product data management
├── use-categories.ts            # Category data management
└── use-product-analytics.ts     # Analytics data

app/api/admin/products/          # API endpoints
├── route.ts                     # CRUD operations
├── categories/route.ts          # Category management
├── bulk/update/route.ts         # Bulk operations
├── export/route.ts              # CSV export
└── import/route.ts              # Data import

src/types/product-management.ts  # TypeScript definitions
```

### Data Flow Architecture
```
User Interface → React Components → Custom Hooks → API Routes → Supabase Database
     ↓              ↓                    ↓            ↓              ↓
   Actions    State Management    HTTP Requests   Business Logic   Data Storage
```

## Features

### 1. Product Management
#### Core CRUD Operations
- **Create Products**: Full product creation with validation
- **Edit Products**: In-place editing with real-time preview
- **Delete Products**: Soft delete with confirmation
- **Duplicate Products**: Clone existing products for efficiency

#### Product Information
- **Basic Details**: Name, description, category assignment
- **Pricing**: Price, cost, automatic profit margin calculation
- **Identifiers**: SKU, external codes, barcode support
- **Classification**: Unit types, simulator usage flags
- **Display**: POS colors, display order, active status

### 2. Category Management
#### Hierarchical Structure
```
Tab Level (Parent Categories)
├── Food & Beverage
│   ├── Beverages
│   ├── Snacks
│   └── Meals
├── Golf Equipment
│   ├── Clubs
│   ├── Balls
│   └── Accessories
└── Simulator Services
    ├── Bay Rentals
    └── Coaching
```

#### Category Features
- **Two-level hierarchy**: Tab → Category structure
- **Visual organization**: Color coding and icons
- **Flexible display**: Custom ordering and active status
- **Bulk reassignment**: Move products between categories

### 3. Search & Filtering
#### Advanced Search
- **Text Search**: Name, SKU, description full-text search
- **Category Filtering**: Filter by tab or specific category
- **Status Filtering**: Active/inactive products
- **Special Filters**: Simulator usage, custom products

#### Smart Filtering
- **Real-time Results**: Instant search as you type
- **Combined Filters**: Multiple filter criteria
- **Quick Actions**: Rapid status changes from search results

### 4. Analytics Dashboard
#### Overview Metrics
- **Product Count**: Total active products by category
- **Pricing Analysis**: Average prices, cost distribution
- **Profit Margins**: Category-wise margin analysis
- **Recent Activity**: Latest product changes

#### Detailed Analytics
- **Category Distribution**: Product count per category
- **Price Ranges**: Price distribution across categories
- **Margin Analysis**: Profit margin trends and outliers
- **Performance Metrics**: Top-performing product categories

### 5. Bulk Operations
#### Mass Updates
- **Status Changes**: Activate/deactivate multiple products
- **Category Updates**: Move products between categories
- **Pricing Adjustments**: Percentage-based price updates
- **Field Updates**: Update specific fields across selections

#### Data Management
- **CSV Export**: Complete product catalog export
- **CSV Import**: Bulk product creation and updates
- **Data Validation**: Import validation and error reporting
- **Backup Operations**: Export before major changes

### 6. Mobile Optimization
#### Responsive Design
- **Card Layout**: Mobile-friendly product cards
- **Touch Interactions**: Optimized for touchscreen navigation
- **Condensed Information**: Essential data prioritization
- **Fast Loading**: Optimized for mobile network conditions

#### Mobile Features
- **Quick Actions**: Rapid product status changes
- **Search Optimization**: Mobile-friendly search interface
- **Form Adaptation**: Mobile-optimized input forms
- **Gesture Support**: Swipe actions for common operations

## Database Schema

### Products Schema (`products.products`)
```sql
-- Main products table
id              UUID PRIMARY KEY                    -- Unique identifier
category_id     UUID NOT NULL                      -- Foreign key to categories
name            VARCHAR(200) NOT NULL              -- Product name
slug            VARCHAR(200) NOT NULL UNIQUE       -- URL-friendly identifier
description     TEXT                               -- Product description

-- Pricing & Cost Analysis
price           DECIMAL(10,2) NOT NULL DEFAULT 0   -- Selling price in THB
cost            DECIMAL(10,2) DEFAULT 0            -- Cost price in THB
profit_margin   DECIMAL(5,2) GENERATED ALWAYS AS   -- Auto-calculated margin %
                ((price - cost) / price * 100)

-- Product Identifiers
sku             VARCHAR(100) UNIQUE                -- Stock Keeping Unit
external_code   VARCHAR(100)                       -- External system reference
barcode         VARCHAR(100)                       -- Barcode for scanning

-- Product Properties
unit            VARCHAR(50)                        -- Unit type (pieces, hours, etc.)
is_sim_usage    BOOLEAN DEFAULT false              -- Golf simulator usage flag
is_custom_product BOOLEAN DEFAULT false            -- Custom/special product flag
show_in_staff_ui BOOLEAN DEFAULT true              -- Visibility in staff interface

-- Display & Status
is_active       BOOLEAN DEFAULT true               -- Active status
display_order   INTEGER DEFAULT 0                  -- Sort order
pos_display_color VARCHAR(7)                       -- POS background color

-- Legacy Migration Support
legacy_qashier_id VARCHAR(100)                     -- Original Qashier ID
legacy_pos_name   VARCHAR(200)                     -- Original POS name

-- Audit Fields
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
created_by      VARCHAR(100)                       -- User email
updated_by      VARCHAR(100)                       -- User email
```

### Categories Schema (`products.categories`)
```sql
-- Category hierarchy table
id              UUID PRIMARY KEY                    -- Unique identifier
parent_id       UUID REFERENCES categories(id)     -- Parent category (null for tabs)
name            VARCHAR(100) NOT NULL              -- Category name
slug            VARCHAR(100) NOT NULL UNIQUE       -- URL-friendly identifier
description     TEXT                               -- Category description

-- Display Properties
display_order   INTEGER NOT NULL DEFAULT 0         -- Sort order
color_code      VARCHAR(7)                         -- UI theme color
icon            VARCHAR(50)                        -- Icon identifier
is_active       BOOLEAN DEFAULT true               -- Active status

-- Audit Fields
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### Key Relationships
```sql
-- Category hierarchy (self-referencing)
categories.parent_id → categories.id

-- Product categorization
products.category_id → categories.id

-- Indexes for performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_categories_parent ON categories(parent_id);
```

## API Reference

### Product Endpoints

#### GET /api/admin/products
Retrieve products with filtering and pagination
```typescript
// Query Parameters
interface ProductQuery {
  search?: string;           // Text search across name, sku, description
  category?: string;         // Filter by category ID
  tab?: string;             // Filter by parent category ID
  status?: 'active' | 'inactive' | 'all';
  sim_usage?: boolean;      // Filter simulator usage products
  limit?: number;           // Results per page (default: 50)
  offset?: number;          // Pagination offset
}

// Response
interface ProductResponse {
  products: Product[];
  total: number;
  categories: Category[];
}
```

#### POST /api/admin/products
Create new product
```typescript
interface ProductCreateRequest {
  name: string;
  category_id: string;
  price: number;
  cost?: number;
  description?: string;
  sku?: string;
  external_code?: string;
  unit?: ProductUnit;
  is_sim_usage?: boolean;
  is_active?: boolean;
  display_order?: number;
  pos_display_color?: string;
}
```

#### PUT /api/admin/products/[id]
Update existing product
```typescript
interface ProductUpdateRequest extends Partial<ProductCreateRequest> {
  id: string;
}
```

#### DELETE /api/admin/products/[id]
Soft delete product (sets is_active = false)

### Category Endpoints

#### GET /api/admin/products/categories
Retrieve category hierarchy
```typescript
interface CategoryResponse {
  categories: Category[];
  hierarchy: {
    tabs: Category[];
    subcategories: Record<string, Category[]>;
  };
}
```

#### POST /api/admin/products/categories
Create new category
```typescript
interface CategoryCreateRequest {
  name: string;
  parent_id?: string;        // null for tab-level categories
  description?: string;
  color_code?: string;
  icon?: string;
  display_order?: number;
}
```

### Bulk Operations

#### POST /api/admin/products/bulk/update
Perform bulk operations on multiple products
```typescript
interface BulkUpdateRequest {
  product_ids: string[];
  operation: 'status' | 'category' | 'pricing' | 'field_update';
  data: {
    // Status operation
    is_active?: boolean;
    
    // Category operation
    category_id?: string;
    
    // Pricing operation
    price_adjustment?: {
      type: 'percentage' | 'fixed';
      value: number;
    };
    
    // Field update operation
    field_updates?: Record<string, any>;
  };
}
```

### Analytics Endpoints

#### GET /api/admin/products/analytics
Retrieve product analytics data
```typescript
interface AnalyticsResponse {
  overview: {
    total_products: number;
    active_products: number;
    categories_count: number;
    average_price: number;
    average_margin: number;
  };
  by_category: Array<{
    category_id: string;
    category_name: string;
    product_count: number;
    average_price: number;
    average_margin: number;
  }>;
  price_distribution: Array<{
    range: string;
    count: number;
  }>;
  recent_changes: Array<{
    product_id: string;
    product_name: string;
    change_type: string;
    changed_at: string;
  }>;
}
```

### Export/Import Endpoints

#### GET /api/admin/products/export
Export products to CSV format
```typescript
// Response: CSV file download
// Headers: All product fields including category names
// Format: UTF-8 encoded CSV with proper escaping
```

#### POST /api/admin/products/import
Import products from CSV
```typescript
interface ImportRequest {
  file: File;               // CSV file
  options: {
    update_existing: boolean;   // Update products with matching SKU
    create_categories: boolean; // Auto-create missing categories
    dry_run: boolean;          // Validate without saving
  };
}

interface ImportResponse {
  success: boolean;
  created: number;
  updated: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}
```

## User Interface

### Main Products Page (`/admin/products`)

#### Layout Structure
```tsx
<ProductsLayout>
  <PageHeader>
    <Title>Product Management</Title>
    <ActionButtons>
      <CreateProductButton />
      <BulkOperationsButton />
      <ExportButton />
    </ActionButtons>
  </PageHeader>
  
  <AnalyticsSection>
    <OverviewCards />
    <QuickStats />
  </AnalyticsSection>
  
  <FiltersSection>
    <SearchInput />
    <CategoryFilter />
    <StatusFilter />
    <AdvancedFilters />
  </FiltersSection>
  
  <ProductTable>
    <MobileCardView />  {/* Mobile responsive */}
    <DesktopTableView />
  </ProductTable>
  
  <Pagination />
</ProductsLayout>
```

#### Overview Cards
Display key metrics with loading states:
- **Total Products**: Count of all products
- **Active Products**: Currently available products  
- **Categories**: Number of product categories
- **Average Margin**: Profit margin across all products

#### Product Table Features
- **Sortable Columns**: Name, category, price, status, created date
- **Inline Actions**: Quick edit, duplicate, delete buttons
- **Bulk Selection**: Checkbox selection for mass operations
- **Status Indicators**: Visual active/inactive status
- **Mobile Cards**: Responsive card layout for mobile devices

### Product Form Modal

#### Form Sections
1. **Product Information**
   - Name (required)
   - Category selection (required)
   - Description
   - SKU and external codes

2. **Pricing & Cost**
   - Selling price (required)
   - Cost price
   - Real-time profit margin calculation
   - Profit analysis preview

3. **Settings**
   - Active status toggle
   - Simulator usage flag
   - Display order
   - POS display color picker

4. **Product Info** (Edit mode only)
   - Creation/update timestamps
   - Creator information
   - Special product badges

#### Real-time Features
- **Profit Calculation**: Automatic margin calculation as prices change
- **Validation**: Real-time form validation with error messages
- **Preview**: Live preview of profit margins with color coding
- **Save State**: Tracks unsaved changes with confirmation dialogs

### Category Management

#### Category Form
- **Hierarchical Selection**: Parent category dropdown
- **Visual Customization**: Color and icon selection
- **Order Management**: Display order configuration
- **Validation**: Duplicate name prevention

#### Category Tree View
- **Expandable Tree**: Collapsible category hierarchy
- **Drag & Drop**: Reorder categories (future feature)
- **Product Counts**: Show product count per category
- **Quick Actions**: Edit, delete, add subcategory

### Mobile Optimization

#### Responsive Breakpoints
- **Mobile (sm)**: Card-based layout, stacked forms
- **Tablet (md)**: Adaptive grid, collapsible sidebar
- **Desktop (lg)**: Full table view, expanded forms

#### Mobile-Specific Features
- **Touch Gestures**: Swipe actions for quick operations
- **Simplified Forms**: Condensed input fields
- **Quick Actions**: Prominent action buttons
- **Fast Loading**: Optimized data loading for mobile networks

## Business Logic

### Product Lifecycle

#### Creation Workflow
1. **Validation**: Name uniqueness, required fields
2. **Category Assignment**: Must belong to subcategory (not tab)
3. **SKU Generation**: Auto-generate if not provided
4. **Slug Creation**: URL-friendly identifier
5. **Audit Trail**: Record creator and timestamp

#### Update Workflow
1. **Change Detection**: Track modified fields
2. **Validation**: Business rule enforcement
3. **Audit Logging**: Record changes and modifier
4. **Cache Invalidation**: Update cached data

#### Deletion Workflow
1. **Soft Delete**: Set is_active = false
2. **Dependency Check**: Verify no active sales/inventory
3. **Audit Trail**: Record deletion reason and user

### Pricing Logic

#### Profit Margin Calculation
```typescript
// Automatic calculation stored in database
profit_margin = cost > 0 ? ((price - cost) / price * 100) : null

// Color coding for UI
const getMarginColor = (margin: number) => {
  if (margin >= 70) return 'text-green-600';      // Excellent
  if (margin >= 50) return 'text-green-500';      // Good
  if (margin >= 30) return 'text-yellow-600';     // Acceptable
  return 'text-red-600';                          // Poor
};
```

#### Pricing Rules
- **Minimum Price**: Must be non-negative
- **Cost Tracking**: Optional but recommended for analysis
- **Margin Alerts**: Visual indicators for low margins
- **Price History**: Track price changes over time (future feature)

### Category Hierarchy Rules

#### Structure Validation
- **Two Levels Only**: Tab (parent) → Category (child)
- **No Orphans**: All products must belong to subcategories
- **Unique Names**: Category names unique within parent scope
- **Active Inheritance**: Inactive parent hides children

#### Assignment Logic
- **Product Assignment**: Only to leaf categories (subcategories)
- **Bulk Reassignment**: Move products between categories
- **Category Deletion**: Must be empty or reassign products

### Search & Filtering Logic

#### Full-Text Search
```sql
-- PostgreSQL full-text search across multiple fields
SELECT * FROM products.products 
WHERE to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(sku, '')) 
@@ plainto_tsquery('english', $search_term);
```

#### Filter Combinations
- **Additive Filters**: Multiple filters combine with AND logic
- **Default Sorting**: By display_order ASC, name ASC
- **Status Filtering**: Active by default, option for all/inactive

## Security & Permissions

### Access Control

#### Admin Role Requirement
```typescript
// Route protection at multiple levels
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Additional admin check for product management
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
}
```

#### Development Bypass
- **Environment Check**: Only active in development
- **Skip Auth Flag**: `SKIP_AUTH=true` in `.env.local`
- **Safety Guards**: Multiple checks prevent production bypass

### Data Security

#### Input Validation
- **Server-Side Validation**: All inputs validated on backend
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Protection**: Input sanitization and output encoding
- **File Upload Security**: CSV validation and size limits

#### Audit Trail
- **Change Tracking**: Record all product modifications
- **User Attribution**: Track who made changes
- **Timestamp Recording**: When changes occurred
- **Action Logging**: What type of changes were made

### Permission Levels

#### Current Implementation
- **Binary System**: Admin/Non-Admin
- **Full Access**: Admins have complete product management access
- **No Granular Permissions**: All-or-nothing approach

#### Future Enhancements
- **Role-Based Access**: Product Manager, Viewer, Editor roles
- **Feature Permissions**: Granular access to specific features
- **Department Restrictions**: Limit access by product categories

## Performance

### Database Optimization

#### Indexing Strategy
```sql
-- Primary performance indexes
CREATE INDEX idx_products_category ON products.products(category_id);
CREATE INDEX idx_products_active ON products.products(is_active);
CREATE INDEX idx_products_search ON products.products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Composite indexes for common queries
CREATE INDEX idx_products_active_category ON products.products(is_active, category_id);
CREATE INDEX idx_products_display_order ON products.products(display_order, name);
```

#### Query Optimization
- **Selective Queries**: Only fetch required fields
- **Pagination**: Limit results with offset/limit
- **Eager Loading**: Include category data in product queries
- **Caching**: SWR for client-side caching

### Frontend Performance

#### Code Splitting
```typescript
// Lazy load heavy components
const ProductForm = lazy(() => import('./product-form'));
const BulkOperations = lazy(() => import('./bulk-operations'));
const Analytics = lazy(() => import('./product-analytics'));
```

#### Data Loading Strategies
- **Progressive Loading**: Load overview first, details on demand
- **Skeleton States**: Show loading placeholders
- **Error Boundaries**: Graceful error handling
- **Debounced Search**: Reduce API calls during typing

#### Mobile Optimization
- **Reduced Payloads**: Smaller data sets for mobile
- **Image Optimization**: Compressed and responsive images
- **Touch Optimization**: Larger touch targets
- **Offline Graceful**: Handle network interruptions

### Monitoring & Metrics

#### Performance Tracking
- **API Response Times**: Monitor endpoint performance
- **Database Query Performance**: Track slow queries
- **Client-Side Metrics**: Track component render times
- **User Experience**: Monitor interaction latency

#### Alerting
- **Slow Query Alerts**: Database performance monitoring
- **Error Rate Monitoring**: Track API failure rates
- **User Experience**: Monitor core web vitals

## Troubleshooting

### Common Issues

#### 1. Products Not Loading
**Symptoms**: Empty product list, loading spinner persists
**Causes & Solutions**:
```typescript
// Check network connectivity
if (!products && !error && !isLoading) {
  console.error('SWR cache issue - try clearing cache');
  mutate(); // Force refresh
}

// Verify API endpoint
fetch('/api/admin/products')
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);

// Check admin permissions
const session = await getServerSession();
console.log('Admin status:', session?.user?.isAdmin);
```

#### 2. Form Validation Errors
**Symptoms**: Form won't submit, validation errors persist
**Debugging Steps**:
```typescript
// Check form state
const { formState: { errors, isValid } } = useForm();
console.log('Form errors:', errors);
console.log('Form valid:', isValid);

// Verify required fields
const requiredFields = ['name', 'category_id', 'price'];
requiredFields.forEach(field => {
  if (!watch(field)) console.error(`Missing required field: ${field}`);
});
```

#### 3. Category Assignment Issues
**Symptoms**: Categories not showing, assignment fails
**Solutions**:
```typescript
// Verify category hierarchy
const subCategories = categories.filter(c => c.parent_id);
if (subCategories.length === 0) {
  console.error('No subcategories available for product assignment');
}

// Check category loading
if (!categories.length) {
  console.error('Categories not loaded - check API endpoint');
}
```

#### 4. Search Not Working
**Symptoms**: Search returns no results
**Debugging**:
```sql
-- Test database search
SELECT * FROM products.products 
WHERE to_tsvector('english', name) @@ plainto_tsquery('english', 'search_term');

-- Check index exists
SELECT indexname FROM pg_indexes WHERE tablename = 'products';
```

### Error Handling

#### API Error Responses
```typescript
// Standard error format
interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

// Client-side error handling
const handleError = (error: any) => {
  if (error.response?.data?.error) {
    toast({
      title: "Operation Failed",
      description: error.response.data.error,
      variant: "destructive"
    });
  } else {
    toast({
      title: "Unexpected Error",
      description: "Please try again later",
      variant: "destructive"
    });
  }
};
```

#### Form Error Recovery
```typescript
// Reset form on error
const onError = (errors: any) => {
  console.error('Form validation errors:', errors);
  
  // Focus first error field
  const firstError = Object.keys(errors)[0];
  if (firstError) {
    const element = document.getElementById(firstError);
    element?.focus();
  }
};
```

### Performance Issues

#### Slow Loading
**Symptoms**: Long initial load times
**Solutions**:
1. **Check Database**: Verify indexes are in place
2. **Reduce Data**: Implement pagination
3. **Optimize Queries**: Use selective field loading
4. **Add Caching**: Implement Redis caching

#### Memory Leaks
**Symptoms**: Increasing memory usage over time
**Prevention**:
```typescript
// Cleanup subscriptions
useEffect(() => {
  const subscription = someSubscription();
  return () => subscription.unsubscribe();
}, []);

// Abort fetch requests
useEffect(() => {
  const controller = new AbortController();
  fetch('/api/data', { signal: controller.signal });
  return () => controller.abort();
}, []);
```

### Data Integrity Issues

#### Orphaned Products
**Detection**:
```sql
-- Find products with invalid categories
SELECT p.* FROM products.products p
LEFT JOIN products.categories c ON p.category_id = c.id
WHERE c.id IS NULL;
```

**Resolution**:
```sql
-- Create default category if needed
INSERT INTO products.categories (name, slug) 
VALUES ('Uncategorized', 'uncategorized')
ON CONFLICT (slug) DO NOTHING;

-- Reassign orphaned products
UPDATE products.products 
SET category_id = (SELECT id FROM products.categories WHERE slug = 'uncategorized')
WHERE category_id NOT IN (SELECT id FROM products.categories);
```

#### Duplicate SKUs
**Detection & Resolution**:
```sql
-- Find duplicate SKUs
SELECT sku, COUNT(*) FROM products.products 
WHERE sku IS NOT NULL 
GROUP BY sku HAVING COUNT(*) > 1;

-- Auto-fix duplicates
UPDATE products.products 
SET sku = sku || '-' || id::text 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY sku ORDER BY created_at) as rn
    FROM products.products 
    WHERE sku IS NOT NULL
  ) t WHERE rn > 1
);
```

## Implementation Guide

### Quick Setup

#### 1. Database Migration
```bash
# Apply product management schema
npm run db:migrate

# Verify tables created
npm run db:verify
```

#### 2. Environment Setup
```bash
# Ensure admin permissions configured
echo "SKIP_AUTH=true" >> .env.local  # Development only

# Restart development server
npm run dev
```

#### 3. Access Product Management
```bash
# Navigate to product management
open http://localhost:3000/admin/products

# Or via admin panel
open http://localhost:3000/admin
```

### Development Workflow

#### Adding New Features
1. **Database Changes**: Update schema in migrations
2. **Type Definitions**: Add to `src/types/product-management.ts`
3. **API Endpoints**: Create/update in `app/api/admin/products/`
4. **Components**: Add/modify in `src/components/admin/products/`
5. **Testing**: Manual testing with development bypass

#### Testing Checklist
- [ ] CRUD operations work correctly
- [ ] Form validation prevents invalid data
- [ ] Mobile responsiveness verified
- [ ] Search and filtering functional
- [ ] Bulk operations complete successfully
- [ ] Export/import features working
- [ ] Error handling graceful

### Deployment Considerations

#### Production Setup
1. **Database Migrations**: Ensure all migrations applied
2. **Admin Users**: Configure admin permissions in database
3. **Performance**: Monitor query performance
4. **Security**: Verify auth bypass disabled

#### Monitoring
- Set up alerts for API errors
- Monitor database performance
- Track user adoption metrics
- Watch for data integrity issues

---

## Change Log

**Version 1.0** (July 2025)
- Initial product management system implementation
- Complete CRUD operations for products and categories
- Mobile-responsive interface
- Real-time analytics dashboard
- Bulk operations support
- CSV export/import functionality

**Future Roadmap**
- Advanced analytics and reporting
- Supplier management integration
- Price history tracking
- Automated reorder points
- Enhanced mobile app features

---

**Maintained by**: Lengolf Development Team  
**Last Updated**: July 14, 2025  
**Next Review**: August 2025