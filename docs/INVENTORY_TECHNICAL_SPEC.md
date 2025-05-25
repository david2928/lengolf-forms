# Technical Specification Document
## Inventory Management System for LenGolf

**Document Version:** 1.0  
**Date:** December 2024  
**Project:** LenGolf Inventory Management System

---

## 1. System Architecture

### 1.1 Technology Stack

The inventory management system will be built using the existing LenGolf technology stack:

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI Components**: Radix UI, Tailwind CSS, Shadcn/UI
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Supabase
- **Authentication**: Simple staff dropdown (no complex auth for Phase 1)
- **State Management**: React Hook Form, SWR
- **Target Device**: Tablet-optimized design
- **Deployment**: Vercel

### 1.2 Integration Architecture

The system will follow the existing application patterns:
- App Router structure: `app/inventory/`
- Component architecture: `src/components/inventory/`
- Type definitions: `src/types/inventory.ts`
- API routes: `app/api/inventory/`
- Custom hooks: `src/hooks/useInventory*.ts`

---

## 2. Database Schema

### 2.1 inventory_categories Table

```sql
CREATE TABLE inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 inventory_products Table

```sql
CREATE TABLE inventory_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES inventory_categories(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  unit VARCHAR(50), -- 'bottles', 'pieces', 'packs', etc.
  input_type VARCHAR(50) NOT NULL, -- 'number', 'checkbox', 'textarea', 'select'
  input_options JSONB, -- For checkbox/select options
  reorder_threshold DECIMAL(10,2),
  supplier VARCHAR(200),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Example input_options for checkbox:**
```json
{
  "options": ["Plenty of stock", "Enough for this week", "Need to order"],
  "type": "single_select"
}
```

### 2.3 inventory_submissions Table

```sql
CREATE TABLE inventory_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name VARCHAR(100) NOT NULL,
  submission_date DATE NOT NULL,
  inventory_data JSONB NOT NULL, -- { "product_id": "value", ... }
  reorder_alerts JSONB, -- Generated alerts for low stock
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- Reference to user if using user management
  UNIQUE(submission_date, staff_name) -- One submission per staff per day
);
```

**Example inventory_data:**
```json
{
  "uuid-beer-asahi": "89",
  "uuid-ice": "Enough for this week",
  "uuid-gloves": "Size breakdown: 18=6, 19=5, 20=39...",
  "uuid-cash": "11797"
}
```

### 2.4 Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_inventory_submissions_date ON inventory_submissions(submission_date);
CREATE INDEX idx_inventory_submissions_staff ON inventory_submissions(staff_name);
CREATE INDEX idx_inventory_products_category ON inventory_products(category_id);
CREATE INDEX idx_inventory_products_active ON inventory_products(is_active);
```

---

## 3. API Design

### 3.1 Products Management

#### GET `/api/inventory/products`
```typescript
// Returns all active products grouped by category
interface ProductsResponse {
  categories: {
    id: string;
    name: string;
    display_order: number;
    products: InventoryProduct[];
  }[];
}
```

#### POST `/api/inventory/products` (Admin only)
```typescript
interface CreateProductRequest {
  category_id: string;
  name: string;
  unit?: string;
  input_type: 'number' | 'checkbox' | 'textarea' | 'select';
  input_options?: any;
  reorder_threshold?: number;
  supplier?: string;
  is_required?: boolean;
}
```

### 3.2 Inventory Submissions

#### GET `/api/inventory/submissions`
```typescript
interface SubmissionsRequest {
  date?: string; // YYYY-MM-DD format
  staff_name?: string;
  start_date?: string;
  end_date?: string;
}

interface SubmissionsResponse {
  submissions: InventorySubmission[];
  reorder_alerts: ReorderAlert[];
}
```

#### POST `/api/inventory/submissions`
```typescript
interface SubmissionRequest {
  staff_name: string;
  submission_date: string; // YYYY-MM-DD
  inventory_data: Record<string, string | number>;
  notes?: string;
}
```

#### GET `/api/inventory/submissions/latest`
```typescript
// Returns the most recent submission for pre-filling forms
interface LatestSubmissionResponse {
  submission: InventorySubmission | null;
  date: string;
}
```

### 3.3 Reports and Analytics

#### GET `/api/inventory/reports/dashboard`
```typescript
interface DashboardData {
  today_completion: boolean;
  pending_reorders: ReorderAlert[];
  recent_submissions: InventorySubmission[];
  low_stock_trends: StockTrend[];
}
```

#### GET `/api/inventory/reports/export`
```typescript
// Query parameters: start_date, end_date, format (csv|json)
// Returns downloadable file
```

---

## 4. Component Architecture

### 4.1 Page Components

```
app/inventory/
├── page.tsx                 # Main inventory form (Phase 1)
└── submit/page.tsx          # Daily inventory submission form
```

### 4.2 Component Structure

```
src/components/inventory/
├── submission-form/
│   ├── index.tsx           # Main form component
│   ├── category-section.tsx # Form section per category
│   ├── product-input.tsx   # Individual product input
│   └── form-navigation.tsx # Previous/Next section buttons
└── shared/
    ├── inventory-layout.tsx
    ├── staff-selector.tsx   # Simple dropdown: Net, Dolly, May
    └── date-selector.tsx
```

### 4.3 Type Definitions

```typescript
// src/types/inventory.ts

export interface InventoryCategory {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryProduct {
  id: string;
  category_id: string;
  name: string;
  unit?: string;
  input_type: 'number' | 'checkbox' | 'textarea' | 'select';
  input_options?: {
    options?: string[];
    type?: 'single_select' | 'multi_select';
    min?: number;
    max?: number;
  };
  reorder_threshold?: number;
  supplier?: string;
  display_order: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventorySubmission {
  id: string;
  staff_name: string;
  submission_date: string;
  inventory_data: Record<string, any>;
  reorder_alerts?: ReorderAlert[];
  notes?: string;
  submitted_at: string;
  created_by?: string;
}

export interface ReorderAlert {
  product_id: string;
  product_name: string;
  current_value: string | number;
  threshold: number;
  supplier?: string;
  category: string;
}

export interface InventoryFormData {
  staff_name: string;
  submission_date: string;
  products: Record<string, any>;
  notes?: string;
}
```

---

## 5. Custom Hooks

### 5.1 useInventorySubmission

```typescript
// src/hooks/useInventorySubmission.ts
export function useInventorySubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const submitInventory = async (data: InventoryFormData) => {
    // Form submission logic
    // Validation
    // API call
    // Success/error handling
  };

  const getLatestSubmission = async (date?: string) => {
    // Fetch latest submission for pre-filling
  };

  return {
    submitInventory,
    getLatestSubmission,
    isSubmitting
  };
}
```

### 5.2 useInventoryProducts

```typescript
// src/hooks/useInventoryProducts.ts
export function useInventoryProducts() {
  const { data, error, mutate } = useSWR('/api/inventory/products', fetcher);

  return {
    products: data?.categories || [],
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
}
```

---

## 6. Form Implementation Details

### 6.1 Dynamic Form Generation

The form will be generated dynamically based on product metadata:

```typescript
// Render product input based on type
const renderProductInput = (product: InventoryProduct, value: any) => {
  switch (product.input_type) {
    case 'number':
      return (
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => updateValue(product.id, e.target.value)}
          placeholder={`Enter ${product.unit || 'quantity'}`}
          required={product.is_required}
        />
      );
    
    case 'checkbox':
      return (
        <RadioGroup
          value={value || ''}
          onValueChange={(val) => updateValue(product.id, val)}
        >
          {product.input_options?.options?.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={option} />
              <Label htmlFor={option}>{option}</Label>
            </div>
          ))}
        </RadioGroup>
      );
    
    case 'textarea':
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => updateValue(product.id, e.target.value)}
          placeholder={`Enter details for ${product.name}`}
          rows={3}
        />
      );
    
    default:
      return null;
  }
};
```

### 6.2 Form Validation

```typescript
// Validation schema using react-hook-form with zod
const inventorySchema = z.object({
  staff_name: z.string().min(1, 'Staff name is required'),
  submission_date: z.string().refine(isValidDate, 'Invalid date'),
  products: z.record(z.any()),
  notes: z.string().optional()
});
```

### 6.3 Auto-save and Prefill

- Form data will be stored in localStorage for auto-save
- Previous day's submission will be used to prefill form
- Clear indication when values are pre-filled vs. newly entered

---

## 7. Data Migration Plan

### 7.1 Product Migration

1. Parse existing Google Form structure
2. Create categories and products based on current structure
3. Map input types and validation rules
4. Set initial reorder thresholds based on CSV data

### 7.2 Historical Data (Optional)

- Import recent Google Form responses as historical submissions
- Maintain data integrity and staff attribution
- Create baseline for trending and analytics

---

## 8. Authentication & Authorization

### 8.1 Simple Staff Selection (Phase 1)

```typescript
// Simple staff dropdown - no complex authentication needed
export const STAFF_OPTIONS = [
  { value: 'Net', label: 'Net' },
  { value: 'Dolly', label: 'Dolly' },
  { value: 'May', label: 'May' }
];
```

### 8.2 Route Protection

No special route protection needed for Phase 1 - inventory form will be accessible to anyone with access to the main application.

---

## 9. Performance Considerations

### 9.1 Optimization Strategies

- Use SWR for client-side caching
- Implement pagination for large datasets
- Lazy load admin features
- Optimize database queries with proper indexing

### 9.2 Tablet Optimization

- Touch-friendly form controls optimized for tablet use
- Larger buttons and input fields for tablet interaction
- Responsive design focused on tablet screen sizes
- Fast form navigation between categories

---

## 10. Testing Strategy

### 10.1 Testing Approach

- Unit tests for utility functions and hooks
- Integration tests for API routes
- End-to-end tests for critical user flows
- Mobile device testing on various screen sizes

### 10.2 Test Cases

1. **Form Submission**: Complete inventory submission flow
2. **Data Validation**: Form validation and error handling
3. **Prefill Logic**: Auto-filling from previous submissions
4. **Reorder Alerts**: Threshold-based alert generation
5. **Admin Functions**: Product and category management

---

## 11. Deployment & Environment

### 11.1 Environment Variables

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=existing
NEXT_PUBLIC_SUPABASE_ANON_KEY=existing

# Feature Flags
NEXT_PUBLIC_INVENTORY_MODULE_ENABLED=true
INVENTORY_ADMIN_EMAILS=admin@lengolf.com

# Data Migration
GOOGLE_FORMS_IMPORT_ENABLED=false
```

### 11.2 Deployment Process

1. Database migrations via Supabase dashboard
2. Environment variables configuration
3. Vercel deployment with feature flags
4. Staff training and rollout

---

**End of Technical Specification** 