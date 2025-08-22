# Finance Dashboard System

**Category**: Admin Features > Analytics  
**Access Level**: Administrative  
**Version**: 2.0  
**Last Updated**: August 2025

## Overview

The Finance Dashboard provides comprehensive financial reporting with automated P&L statement generation, integrating real-time data from POS transactions, marketing campaigns, and manual entries. The system features a sophisticated expense management framework with hierarchical categorization and supports both historical analysis and run-rate projections.

### Key Features

- **Automated P&L Generation**: Real-time profit & loss statements with intelligent data sourcing
- **Hierarchical Expense Management**: Three-tier categorization (Category → Subcategory → Expense Type)
- **Multi-Source Integration**: POS sales, Google/Meta Ads API, manual revenue/expense entries
- **Historical Data Integration**: 17+ months of imported financial history from CSV
- **Run-Rate Projections**: Intelligent extrapolation based on current month performance
- **Dynamic Calculations**: Real-time EBITDA, gross profit, and margin calculations
- **Sort Order Management**: Customizable display ordering for expense presentation
- **Cost Type Classification**: One-time vs recurring expense categorization
- **Thai Baht Native**: Native THB formatting and calculations throughout

## System Architecture

### Database Schema

The Finance Dashboard uses a dedicated `finance` schema with the following tables:

#### Core Expense Management Tables

```sql
-- Expense Categories (Top Level: Operating Expenses, Marketing Expenses)
finance.expense_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Expense Subcategories (Fixed Cost, Variable Cost, Salaries, Online Marketing, etc.)
finance.expense_subcategories (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES finance.expense_categories(id),
  name VARCHAR NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Expense Types (Specific expense names: Rent, LINE, Video Content, etc.)
finance.expense_types (
  id SERIAL PRIMARY KEY,
  subcategory_id INTEGER REFERENCES finance.expense_subcategories(id),
  name VARCHAR NOT NULL,
  description TEXT,
  default_cost_type VARCHAR,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Operating Expenses (Actual expense instances with amounts and date ranges)
finance.operating_expenses (
  id SERIAL PRIMARY KEY,
  expense_type_id INTEGER REFERENCES finance.expense_types(id),
  amount NUMERIC(12,2) NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  cost_type VARCHAR CHECK (cost_type IN ('one_time', 'recurring')) DEFAULT 'recurring',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)
```

#### Manual Entry Tables

```sql
-- Manual Revenue Entries (Events, ClassPass, etc.)
finance.manual_revenue_entries (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  month DATE,
  category VARCHAR NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  created_by VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Manual Expense Entries (One-off expenses not in operating expenses)
finance.manual_expense_entries (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  month DATE,
  category VARCHAR NOT NULL,
  subcategory VARCHAR,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  created_by VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)
```

#### Historical and Snapshot Tables

```sql
-- Historical P&L Data (Imported from CSV files)
finance.historical_pl_data (
  id SERIAL PRIMARY KEY,
  month DATE NOT NULL,
  line_item VARCHAR NOT NULL,
  amount NUMERIC(12,2),
  is_actual BOOLEAN DEFAULT true,
  data_source VARCHAR DEFAULT 'csv_import',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Monthly P&L Snapshots (Saved monthly calculations)
finance.pl_monthly_snapshots (
  id SERIAL PRIMARY KEY,
  month DATE NOT NULL UNIQUE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

#### Database Views

```sql
-- Operating Expenses Detailed View
CREATE VIEW finance.operating_expenses_detailed AS 
SELECT 
  oe.id,
  oe.amount,
  oe.effective_date,
  oe.end_date,
  oe.notes,
  oe.created_at,
  oe.updated_at,
  oe.expense_type_id,
  oe.cost_type,
  et.name as expense_type_name,
  et.description as expense_type_description,
  et.default_cost_type,
  et.sort_order as expense_type_sort_order,
  esc.name as subcategory_name,
  esc.description as subcategory_description,
  ec.name as category_name,
  ec.description as category_description
FROM finance.operating_expenses oe
JOIN finance.expense_types et ON (oe.expense_type_id = et.id)
JOIN finance.expense_subcategories esc ON (et.subcategory_id = esc.id)
JOIN finance.expense_category ec ON (esc.category_id = ec.id);
```

### Core Database Functions

#### Primary P&L Calculation Function

```sql
CREATE OR REPLACE FUNCTION finance.get_monthly_pl(
  p_month TEXT,
  p_include_runrate BOOLEAN DEFAULT false,
  p_calculation_date DATE DEFAULT NULL
) RETURNS JSON
```

**Features:**
- Integrates POS sales data from `pos.lengolf_sales`
- Includes marketing spend from Google Ads and Meta Ads API data
- Calculates prorated operating expenses for current month
- Provides detailed expense breakdowns by category and subcategory
- Returns structured JSON with run-rate projections when enabled
- Handles manual revenue and expense entries
- Processes historical data integration

**Key Calculations:**
- **Revenue**: Total Sales, Net Sales (excluding Events), Manual Revenue additions
- **COGS**: Calculated from POS data and historical imports
- **Operating Expenses**: Prorated for current month, full amount for past months
- **Marketing Expenses**: Google Ads + Meta Ads API + Marketing category operating expenses
- **EBITDA**: Gross Profit - Operating Expenses - Marketing Expenses

#### Supporting Functions

```sql
-- P&L Comparison (Current vs Previous Month)
CREATE OR REPLACE FUNCTION finance.get_pl_comparison(
  p_current_month TEXT,
  p_previous_month TEXT
) RETURNS JSON

-- Financial Trends (Multi-month analysis)
CREATE OR REPLACE FUNCTION finance.get_finance_trends() RETURNS JSON

-- Monthly Snapshot Saving
CREATE OR REPLACE FUNCTION finance.save_monthly_snapshot(
  p_month TEXT
) RETURNS JSON
```

## API Endpoints

### Core P&L API

**`GET /api/finance/pl-statement`**

Primary endpoint for P&L data retrieval.

**Query Parameters:**
- `month` (required): Month in YYYY-MM-DD or YYYY-MM format
- `includeRunRate` (optional): Enable run-rate projections (boolean)
- `comparison` (optional): Set to 'previous' for month-over-month comparison
- `calculationDate` (optional): Custom calculation cutoff date (YYYY-MM-DD)

**Response Structure:**
```typescript
{
  "month": "2025-08-01",
  "is_current_month": true,
  "days_elapsed": 21,
  "days_in_month": 31,
  "data_sources": {
    "has_historical_data": true,
    "has_pos_data": true,
    "has_marketing_data": true
  },
  "revenue": {
    "total_sales": 462077.99,
    "net_sales": 431848.92,
    "manual_revenue": 19700,
    "combined_total": 481777.99,
    "combined_net": 451548.92,
    "historical_total_sales": 130197,
    "historical_net_sales": 121679
  },
  "cogs": {
    "pos_cogs": 82801.23,
    "total_cogs": 82801.23,
    "historical_cogs": 17675
  },
  "gross_profit": {
    "calculated": 368747.69,
    "pos_gross_profit": 314003.72,
    "historical_gross_profit": 116004
  },
  "operating_expenses": {
    "calculated_total": 149182.65,
    "historical_total": 48044,
    "by_category": {
      "Operating Expenses": [
        {
          "expense_type_name": "Rent",
          "subcategory_name": "Fixed Cost",
          "amount": 84677.42,
          "full_monthly_amount": 125000,
          "display_order": 1
        }
      ],
      "Marketing Expenses": [
        {
          "expense_type_name": "LINE",
          "subcategory_name": "Online Marketing",
          "amount": 1205.81,
          "full_monthly_amount": 1780,
          "display_order": 0
        }
      ]
    }
  },
  "marketing_expenses": {
    "google_ads": 12736.93,
    "meta_ads": 13623.38,
    "manual_expenses": 0,
    "calculated_total": 26360.31,
    "historical_total": 9369
  },
  "ebitda": {
    "calculated": 193204.73,
    "historical_ebitda": 58591
  },
  "run_rate_projections": {
    "total_sales": 682115.13,
    "net_sales": 637491.26,
    "combined_total": 701815.13,
    "combined_net": 657191.26,
    "gross_profit": 534960.88,
    "operating_expenses": 220222,
    "ebitda": 275826.04
  }
}
```

### Operating Expenses Management

**`GET/POST/PUT/DELETE /api/finance/operating-expenses`**

Full CRUD operations for operating expense management.

**GET Query Parameters:**
- `effectiveDate` (optional): Filter expenses active on specific date

**POST/PUT Request Body:**
```typescript
{
  "expense_type_id": 123,
  "amount": 125000,
  "effective_date": "2025-01-01",
  "end_date": null, // Optional
  "cost_type": "recurring", // or "one_time"
  "notes": "Monthly office rent"
}
```

**Creating New Expense Types (POST only):**
```typescript
{
  "expense_type_name": "New Expense",
  "subcategory_id": 5,
  "sort_order": 10,
  "amount": 5000,
  "effective_date": "2025-08-01",
  "cost_type": "recurring"
}
```

### Expense Type Management

**`GET /api/finance/expense-types`**
Returns all expense types with full hierarchy.

**`POST /api/finance/expense-types/reorder`**
Updates sort order for expense types.

```typescript
{
  "expense1": { "id": 123, "sort_order": 5 },
  "expense2": { "id": 124, "sort_order": 10 }
}
```

### Manual Entries Management

**`GET/POST/PUT/DELETE /api/finance/manual-entries`**

**POST/PUT Request Body:**
```typescript
{
  "type": "revenue", // or "expense"
  "date": "2025-08-15",
  "month": "2025-08-01",
  "category": "Net Sales (Events)",
  "description": "Corporate event bookings",
  "amount": 24958.50
}
```

### Additional Endpoints

**`GET /api/finance/trends`** - Multi-month financial trends
**`GET /api/finance/kpis`** - Key performance indicators for specified month
**`GET /api/finance/expense-categories`** - Expense category hierarchy

## Frontend Components

### Main Dashboard Components

#### PLStatement Component
**Location**: `src/components/finance-dashboard/PLStatement.tsx`

The primary P&L display component featuring:

- **Intelligent Data Source Labels**: Shows "API", "Calc", or "Projected" based on data source
- **Run-Rate Toggle**: Switch between actual and projected values for current month
- **Hierarchical Expense Display**: 
  - Marketing Expenses → Online/Offline Marketing → Individual expenses (LINE, Video Content)
  - Operating Expenses → Fixed Cost/Variable Cost/Salaries → Individual expenses (Rent, Utilities, etc.)
- **Interactive Manual Entries**: Edit/delete buttons for manual revenue and expense entries
- **Real-time Calculations**: EBITDA = Gross Profit - Operating Expenses - Marketing Expenses
- **Currency Formatting**: Native Thai Baht display with proper number formatting

**Key Calculation Logic:**
```typescript
// Current values (non-runrate)
const marketingTotal = 
  (data.marketing_expenses.google_ads || 0) + 
  (data.marketing_expenses.meta_ads || 0) + 
  (data.operating_expenses.by_category["Marketing Expenses"]?.reduce(sum) || 0);

const ebitda = 
  (data.gross_profit.calculated || 0) - 
  (data.operating_expenses.calculated_total || 0) - 
  marketingTotal;

// Run-rate values
const runRateMarketing = 
  (projections.google_ads || 0) + 
  (projections.meta_ads || 0) + 
  (projections.operating_expenses_by_category["Marketing Expenses"]?.reduce(sum) || 0);
```

#### OperatingExpensesManager Component
**Location**: `src/components/finance-dashboard/OperatingExpensesManager.tsx`

Comprehensive expense management interface featuring:

- **Hierarchical Filtering**: Single dropdown with category/subcategory tree structure
- **Period-Based Filtering**: View expenses active during specific months
- **Cost Type Filtering**: Filter by one-time vs recurring expenses
- **Sort Order Management**: Drag-and-drop reordering with real-time updates
- **Quick Actions**: Create increase (10% bump), edit, delete operations
- **Professional Styling**: Matches admin panel design standards

**Component Structure:**
```typescript
interface OperatingExpense {
  id: number;
  amount: number;
  effective_date: string;
  end_date: string | null;
  cost_type: 'one_time' | 'recurring';
  expense_type: {
    id: number;
    name: string;
    sort_order: number;
    expense_subcategory: {
      name: string;
      expense_category: {
        name: string;
      };
    };
  };
}
```

#### Supporting Components

**ExpenseModal** (`components/ExpenseModal.tsx`):
- Create/edit individual operating expenses
- Dynamic expense type creation with category/subcategory selection
- Sort order suggestion based on existing expenses in subcategory
- Validation and error handling

**ExpenseTable** (`components/ExpenseTable.tsx`):
- Tabular display of operating expenses with sorting
- Inline actions (edit, delete, create increase)
- Sort order display and reorder buttons
- Responsive design for various screen sizes

**ManualEntryModal** (`src/components/finance-dashboard/ManualEntryModal.tsx`):
- Add/edit manual revenue and expense entries
- Category-based entry system
- Date and month-based organization
- Upsert logic (one entry per category per month)

### Custom Hooks

#### useFinanceDashboard Hook
**Location**: `src/hooks/useFinanceDashboard.ts`

Primary data management hook with comprehensive TypeScript interfaces:

```typescript
export interface PLData {
  month: string;
  is_current_month: boolean;
  days_elapsed: number;
  days_in_month: number;
  data_sources: {
    has_historical_data: boolean;
    has_pos_data: boolean;
    has_marketing_data: boolean;
  };
  revenue: {
    total_sales: number;
    net_sales: number;
    manual_revenue: number;
    combined_total: number;
    combined_net: number;
    historical_total_sales: number;
    historical_net_sales: number;
  };
  // ... complete interface definition
  run_rate_projections?: {
    total_sales: number;
    net_sales: number;
    combined_total: number;
    combined_net: number;
    total_cogs: number;
    gross_profit: number;
    google_ads: number;
    meta_ads: number;
    operating_expenses: number;
    operating_expenses_by_category?: Record<string, Array<ExpenseItem>>;
    ebitda: number;
  };
}
```

**Features:**
- SWR-based data fetching with automatic revalidation
- Error handling and retry logic
- Refresh functionality for manual data updates
- TypeScript-first design with comprehensive interfaces

## Data Integration

### POS Sales Integration

Real-time sales data integration from the existing POS system:

```sql
-- Total Sales (all transactions)
SELECT COALESCE(SUM(total_amount), 0) as total_sales
FROM pos.lengolf_sales 
WHERE DATE_TRUNC('month', order_date) = p_month_date;

-- Net Sales (excluding Events category)
SELECT COALESCE(SUM(s.total_amount), 0) as net_sales
FROM pos.lengolf_sales s
LEFT JOIN pos.products p ON s.product_id = p.id
WHERE DATE_TRUNC('month', s.order_date) = p_month_date
  AND (p.category_name != 'Events' OR p.category_name IS NULL);
```

### Marketing Campaign Integration

Direct API integration with marketing analytics system:

```sql
-- Google Ads spend from marketing schema
SELECT COALESCE(SUM(cost_micros / 1000000.0), 0) as google_ads_spend
FROM marketing.google_ads_campaign_performance
WHERE DATE_TRUNC('month', date) = p_month_date;

-- Meta Ads spend from marketing schema
SELECT COALESCE(SUM(spend_cents / 100.0), 0) as meta_ads_spend
FROM marketing.meta_ads_campaign_performance
WHERE DATE_TRUNC('month', date_start) = p_month_date;
```

### Operating Expenses Calculation

Sophisticated proration logic for current month expenses:

```sql
-- Current month proration example
SELECT 
  et.name,
  CASE 
    WHEN p_month_date = DATE_TRUNC('month', CURRENT_DATE) THEN
      -- Prorate for current month based on days elapsed
      oe.amount * (p_days_elapsed::NUMERIC / p_days_in_month::NUMERIC)
    ELSE 
      -- Full amount for historical months
      oe.amount
  END as calculated_amount,
  oe.amount as full_monthly_amount,
  ec.name as category_name,
  esc.name as subcategory_name
FROM finance.operating_expenses oe
JOIN finance.expense_types et ON oe.expense_type_id = et.id
JOIN finance.expense_subcategories esc ON et.subcategory_id = esc.id
JOIN finance.expense_categories ec ON esc.category_id = ec.id
WHERE oe.effective_date <= p_month_date
  AND (oe.end_date IS NULL OR oe.end_date >= p_month_date)
ORDER BY et.sort_order, et.name;
```

## Business Logic

### Calculation Methodologies

#### Run-Rate Projections

Run-rate calculations use "days elapsed through yesterday" logic:

```typescript
// Frontend calculation logic
const today = new Date();
const cutoffDate = new Date(today);
cutoffDate.setDate(today.getDate() - 1); // Yesterday

const daysElapsed = Math.min(cutoffDate.getDate(), totalDaysInMonth);
const runRateMultiplier = totalDaysInMonth / Math.max(daysElapsed, 1);

// Variable expenses (sales-based)
const projectedRevenue = currentRevenue * runRateMultiplier;

// Fixed expenses (no proration)
const projectedFixedExpenses = currentFixedExpenses * runRateMultiplier;

// Mixed calculation for combined values
const projectedCombinedRevenue = 
  (currentVariableRevenue * runRateMultiplier) + currentManualRevenue;
```

#### EBITDA Calculation

EBITDA uses direct subtraction methodology:

```typescript
// Current month EBITDA
const ebitda = grossProfit - operatingExpenses - marketingExpenses;

// Where:
const grossProfit = combinedNetRevenue - totalCOGS;
const operatingExpenses = expenses.by_category["Operating Expenses"].total;
const marketingExpenses = 
  googleAds + metaAds + 
  expenses.by_category["Marketing Expenses"].total;
```

#### Expense Categorization Logic

Three-tier hierarchical system:

1. **Categories**: Operating Expenses, Marketing Expenses
2. **Subcategories**: Fixed Cost, Variable Cost, Salaries, Online Marketing, Offline Marketing
3. **Expense Types**: Rent, LINE, Video Content, Staff Salaries, etc.

**Display Logic:**
```typescript
// Hierarchical display rendering
{data.operating_expenses.by_category["Marketing Expenses"]
  ?.filter(expense => expense.subcategory_name === "Online Marketing")
  .map(expense => (
    <PLLineItem
      key={expense.expense_type_name}
      label={expense.expense_type_name}
      value={expense.amount}
      runRateValue={expense.full_monthly_amount}
      level={2}
      dataSource="calculated"
    />
  ))
}
```

### Data Source Intelligence

The system intelligently labels data sources:

- **"API"**: Google Ads, Meta Ads from marketing schema
- **"POS"**: Sales data from pos.lengolf_sales  
- **"Calc"**: Calculated values (EBITDA, totals, prorated expenses)
- **"Projected"**: Run-rate extrapolations for current month

### Manual Entry Integration

Manual entries supplement automated data:

- **Revenue**: Events, ClassPass, special bookings
- **Expenses**: One-off costs not in operating expenses system
- **Upsert Logic**: One entry per category per month
- **Month-Based**: Entries organized by calendar month

## Security & Access Control

### Administrative Access

Finance Dashboard requires administrative privileges:

```typescript
// API Route Protection
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Finance dashboard access typically requires admin role
  // (specific role checking implementation varies)
}
```

### Development Authentication Bypass

Complete bypass available for development testing:

```typescript
// Development bypass in .env.local
SKIP_AUTH=true

// Middleware bypass
if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
  // Full access granted without authentication checks
}
```

### Data Protection

- **SQL Injection Prevention**: All queries use parameterized statements
- **Input Validation**: Comprehensive validation on all API endpoints
- **Schema Isolation**: Finance data isolated in dedicated schema
- **Audit Trail**: Created/updated timestamps on all tables

## Performance Optimization

### Database Optimization

- **Indexed Queries**: All date-based and ID-based queries use proper indexes
- **Materialized Views**: `operating_expenses_detailed` for complex joins
- **Function Performance**: `get_monthly_pl()` optimized for single-month queries
- **Schema-Qualified Queries**: All queries specify schema to avoid conflicts

### Frontend Optimization

- **SWR Caching**: Automatic request caching with intelligent revalidation
- **Component Memoization**: Heavy calculations memoized using useMemo
- **Lazy Loading**: Modal components loaded on demand
- **Error Boundaries**: Comprehensive error handling prevents cascading failures

```typescript
// Memoized calculations example
const calculations = useMemo(() => {
  if (!data) return null;
  
  return {
    grossProfit: data.gross_profit.calculated,
    grossMargin: (data.gross_profit.calculated / data.revenue.combined_total) * 100,
    operatingMargin: ((data.gross_profit.calculated - data.operating_expenses.calculated_total) / data.revenue.combined_total) * 100,
    // ... other calculations
  };
}, [data]);
```

## Testing Strategy

### API Testing with Development Authentication

```bash
# Get development token (when SKIP_AUTH=true)
TOKEN=$(curl -s http://localhost:3000/api/dev-token | jq -r '.token')

# Test P&L endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/finance/pl-statement?month=2025-08&includeRunRate=true"

# Test operating expenses
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/finance/operating-expenses?effectiveDate=2025-08-22"

# Create new operating expense
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expense_type_id":123,"amount":5000,"effective_date":"2025-08-01","cost_type":"recurring"}' \
  http://localhost:3000/api/finance/operating-expenses
```

### Frontend Testing

```bash
# Access finance dashboard (with auth bypass)
http://localhost:3000/admin/finance-dashboard

# Operating expenses management
http://localhost:3000/admin/finance-dashboard/operating-expenses
```

### Database Testing

```sql
-- Test P&L function directly
SELECT finance.get_monthly_pl('2025-08-01', true, '2025-08-21');

-- Verify operating expenses calculation
SELECT 
  et.name,
  oe.amount,
  oe.amount * (21::numeric / 31::numeric) as prorated_amount,
  ec.name as category,
  esc.name as subcategory
FROM finance.operating_expenses oe
JOIN finance.expense_types et ON oe.expense_type_id = et.id
JOIN finance.expense_subcategories esc ON et.subcategory_id = esc.id
JOIN finance.expense_categories ec ON esc.category_id = ec.id
WHERE oe.effective_date <= '2025-08-01'
  AND (oe.end_date IS NULL OR oe.end_date >= '2025-08-01');

-- Check expense hierarchy
SELECT 
  ec.name as category,
  esc.name as subcategory,
  et.name as expense_type,
  et.sort_order
FROM finance.expense_categories ec
JOIN finance.expense_subcategories esc ON ec.id = esc.category_id
JOIN finance.expense_types et ON esc.id = et.subcategory_id
ORDER BY ec.sort_order, esc.sort_order, et.sort_order;
```

## Error Handling

### API Error Handling

```typescript
// Standard API error pattern
try {
  const { data, error } = await supabase
    .schema('finance')
    .rpc('get_monthly_pl', {
      p_month: monthDate,
      p_include_runrate: includeRunRate,
      p_calculation_date: calculationDate
    });

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: "Failed to fetch P&L data" }, 
      { status: 500 }
    );
  }

  return NextResponse.json(data);
} catch (error) {
  console.error('API error:', error);
  return NextResponse.json(
    { error: "Internal server error" }, 
    { status: 500 }
  );
}
```

### Frontend Error Handling

```typescript
// SWR error handling with user feedback
const { data, error, isLoading } = useSWR(
  enabled ? plUrl : null,
  fetchPLStatement,
  {
    refreshInterval,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    errorRetryCount: 3,
    errorRetryInterval: 1000,
    onError: (error) => {
      console.error('Failed to load P&L data:', error);
      toast.error('Failed to load financial data');
    }
  }
);

if (error) {
  return (
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        Failed to load financial data. Please try again.
      </AlertDescription>
    </Alert>
  );
}
```

## Maintenance & Updates

### Monthly Maintenance Tasks

1. **Data Verification**: Verify POS and marketing data accuracy
2. **Operating Expenses Review**: Update recurring expenses for rate changes
3. **Historical Data Validation**: Ensure imported data integrity
4. **Performance Monitoring**: Check database query performance
5. **Manual Entry Cleanup**: Review and organize manual entries

### Database Schema Updates

```sql
-- Adding new expense categories
INSERT INTO finance.expense_categories (name, description, sort_order) 
VALUES ('New Category', 'Description', 100);

-- Updating sort orders
UPDATE finance.expense_types 
SET sort_order = sort_order + 10 
WHERE subcategory_id = (
  SELECT id FROM finance.expense_subcategories 
  WHERE name = 'Fixed Cost'
);

-- Adding new expense subcategories
INSERT INTO finance.expense_subcategories (category_id, name, sort_order)
VALUES (
  (SELECT id FROM finance.expense_categories WHERE name = 'Operating Expenses'),
  'New Subcategory',
  50
);
```

### Code Deployment Checklist

Always run validation before deployment:

```bash
# TypeScript validation
npm run typecheck

# Code quality check
npm run lint

# Production build test
npm run build

# Database migration verification (if applicable)
# Check stored procedure syntax
# Verify view definitions
```

## Troubleshooting

### Common Issues

**Q: Marketing expenses showing wrong total**
A: Verify that the calculation includes Google Ads + Meta Ads + operating expenses from "Marketing Expenses" category. Check that marketing schema tables have current month data.

**Q: Operating expenses not appearing in P&L**
A: Check that `effective_date` <= month date and `end_date` >= month date (or is NULL). Verify expense type is linked to correct subcategory and category.

**Q: Run-rate calculations seem incorrect**
A: Confirm `calculationDate` parameter uses yesterday's date, not today. Check `days_elapsed` calculation in stored procedure.

**Q: Sort order changes not reflecting in P&L**
A: Ensure sort order updates are applied to `expense_types` table and component is refreshing data. Check that expense hierarchical display uses correct sort order field.

**Q: Manual entries not saving**
A: Verify unique constraint on (month, category) for manual entries. Check that date formats are correct and category names match expected values.

### Database Debugging

```sql
-- Check monthly data sources
SELECT 
  'POS Sales' as source,
  COUNT(*) as records,
  SUM(total_amount) as total
FROM pos.lengolf_sales 
WHERE DATE_TRUNC('month', order_date) = '2025-08-01'
UNION ALL
SELECT 
  'Google Ads' as source,
  COUNT(*) as records,
  SUM(cost_micros / 1000000.0) as total
FROM marketing.google_ads_campaign_performance
WHERE DATE_TRUNC('month', date) = '2025-08-01'
UNION ALL
SELECT 
  'Meta Ads' as source,
  COUNT(*) as records,
  SUM(spend_cents / 100.0) as total
FROM marketing.meta_ads_campaign_performance
WHERE DATE_TRUNC('month', date_start) = '2025-08-01';

-- Verify operating expenses hierarchy
SELECT 
  ec.name as category,
  esc.name as subcategory,
  et.name as expense_type,
  COUNT(oe.id) as active_expenses,
  SUM(oe.amount) as total_amount
FROM finance.expense_categories ec
LEFT JOIN finance.expense_subcategories esc ON ec.id = esc.category_id
LEFT JOIN finance.expense_types et ON esc.id = et.subcategory_id
LEFT JOIN finance.operating_expenses oe ON et.id = oe.expense_type_id
  AND oe.effective_date <= '2025-08-01'
  AND (oe.end_date IS NULL OR oe.end_date >= '2025-08-01')
GROUP BY ec.name, esc.name, et.name
ORDER BY ec.sort_order, esc.sort_order, et.sort_order;
```

## Future Enhancements

### Planned Features

1. **Budget vs Actual Analysis**: Compare performance against monthly budgets
2. **Advanced Forecasting**: Machine learning-based projections
3. **Multi-Currency Support**: Handle international transactions
4. **Excel Export**: Generate downloadable P&L reports
5. **Automated Alerts**: Notifications for significant variances
6. **Expense Approval Workflow**: Multi-step approval for large expenses

### Technical Improvements

1. **Real-time Updates**: WebSocket integration for live data refresh
2. **Advanced Caching**: Redis caching for complex calculations
3. **Audit Trail**: Complete change tracking for all financial data
4. **API Rate Limiting**: Protect against excessive API usage
5. **Backup Integration**: Automated financial data backups
6. **Performance Monitoring**: APM integration for query optimization

## Related Documentation

- **[Sales Dashboard](./SALES_DASHBOARD.md)** - Revenue analytics and KPIs
- **[Database Documentation](../../../database/DATABASE_DOCUMENTATION_INDEX.md)** - Complete schema reference  
- **[API Reference](../../../api/API_REFERENCE.md)** - All API endpoint documentation
- **[POS System Implementation](../../public/pos/POS_SYSTEM_IMPLEMENTATION.md)** - POS data source details
- **[Marketing Analytics](./MARKETING_ANALYTICS.md)** - Marketing data integration
- **[Admin Panel](../system-management/ADMIN_PANEL.md)** - Administrative interface overview

---

**Last Updated**: August 2025  
**Document Version**: 2.0  
**Maintainer**: Development Team  
**Review Cycle**: Monthly