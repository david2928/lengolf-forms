# Finance Dashboard System

**Category**: Admin Features > Analytics  
**Access Level**: Administrative  
**Version**: 2.0  
**Last Updated**: August 2025

## Overview

The Finance Dashboard provides comprehensive financial reporting with automated P&L statement generation, integrating real-time data from POS transactions, marketing campaigns, and manual entries. The system features a sophisticated expense management framework with hierarchical categorization and supports both historical analysis and run-rate projections.

### Key Features

- **Automated P&L Generation**: Real-time profit & loss statements with intelligent data sourcing
- **Comprehensive POS Data Integration**: Complete historical POS data from March 2024 onwards (16,000+ transactions)
- **Hierarchical Expense Management**: Three-tier categorization (Category → Subcategory → Expense Type)
- **Multi-Source Integration**: POS sales, Google/Meta Ads API, manual revenue/expense entries
- **Historical Data Fallback**: Imported CSV data for months with missing POS/API data
- **Run-Rate Projections**: Intelligent extrapolation based on current month performance
- **Fixed EBITDA Calculations**: Corrected run-rate EBITDA calculation using proper component alignment
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
- **Fixed POS Data Integration**: Queries POS sales data from `pos.lengolf_sales` for ALL months (removed August 2025+ restriction)
- **Comprehensive Data Coverage**: Handles 16,000+ POS transactions from March 2024 onwards
- **Intelligent Historical Fallback**: Uses `finance.historical_pl_data` only when POS data is genuinely unavailable
- **Fixed COGS Calculation**: Properly uses `pos.lengolf_sales.sales_cost` for all available months
- **Marketing API Integration**: Includes Google Ads and Meta Ads spend from marketing schema
- **Prorated Operating Expenses**: Accurate current month proration based on days elapsed
- **Hierarchical Expense Organization**: Detailed breakdown by category and subcategory with proper sort ordering
- **Run-Rate Projections**: Intelligent extrapolation with component-aligned calculations
- **Manual Entry Integration**: Handles manual revenue and expense entries
- **Data Source Indicators**: Returns flags showing which data sources are available for each month

## Critical Data Availability Update (August 2025)

**IMPORTANT CORRECTION**: POS data is available from **March 2024 onwards**, not August 2025+ as previously documented. The `pos.lengolf_sales` table contains comprehensive historical data with 16,000+ transactions dating back to March 16, 2024.

### Data Source Priority by Month

**March 2024 - Present**: Primary POS data from `pos.lengolf_sales` 
**Pre-March 2024**: Historical CSV data fallback from `finance.historical_pl_data`
**All Months**: Marketing API data and manual entries supplement POS data

### Key P&L Line Items and Data Sources (Based on Actual Database Implementation)

| P&L Line Item | Primary Data Source | Exact Calculation Method | Historical Fallback | Run-Rate Logic |
|---------------|-------------|-------------------------|-------------------|----------------|
| **Total Sales** | POS (Mar 2024+) | `SUM(pos.lengolf_sales.sales_total)` - gross before discounts | `historical_data."Total Sales"` | `actual × (days_in_month ÷ days_elapsed)` |
| **Net Sales** | POS (Mar 2024+) | `SUM(pos.lengolf_sales.sales_net)` - after discounts, before VAT | `historical_data."Net Sales"` | `actual × (days_in_month ÷ days_elapsed)` |
| **Manual Revenue** | Manual Entries | `SUM(finance.manual_revenue_entries.amount)` by month | N/A | **No run-rate scaling** (fixed amounts) |
| **Combined Total Sales** | Calculated | `total_sales + manual_revenue` | `historical_total_sales + manual_revenue` | `(total_sales × run-rate) + manual_revenue` |
| **Combined Net Sales** | Calculated | `net_sales + manual_revenue` | `historical_net_sales + manual_revenue` | `(net_sales × run-rate) + manual_revenue` |
| **Total COGS** | POS (Mar 2024+) | `SUM(pos.lengolf_sales.sales_cost)` | `historical_data."COGS"` | `actual × (days_in_month ÷ days_elapsed)` |
| **Gross Profit** | Calculated | `combined_net_sales - total_cogs` | `historical_gross_profit` | `run_rate_combined_net - run_rate_total_cogs` |
| **Operating Expenses** | Finance DB | Complex hierarchical system (detailed below) | `historical_data."Total Operating Expenses"` | Mixed logic by cost_type |
| **Google Ads** | Marketing API | `SUM(marketing.google_ads_campaign_performance.cost_micros ÷ 1,000,000)` | `historical_data."Total Marketing Expenses"` (partial) | `actual × (days_in_month ÷ days_elapsed)` |
| **Meta Ads** | Marketing API | `SUM(marketing.meta_ads_campaign_performance.spend_cents ÷ 100)` | `historical_data."Total Marketing Expenses"` (partial) | `actual × (days_in_month ÷ days_elapsed)` |
| **Manual Marketing** | Manual Entries | `SUM(finance.manual_expense_entries.amount)` for Marketing category | N/A | **No run-rate scaling** (fixed amounts) |
| **Total Marketing** | Calculated | `google_ads + meta_ads + manual_marketing_expenses` | `historical_marketing_expenses` | Sum of individual run-rates |
| **EBITDA** | Calculated | `gross_profit - operating_expenses - marketing_expenses` | `historical_ebitda` | Uses run-rate values for ALL components |

**Operating Expenses Calculation Logic (Exact Database Implementation):**
```sql
-- Source: finance.operating_expenses_detailed view
-- Filters: effective_date <= calculation_cutoff AND (end_date IS NULL OR end_date >= month_start)
-- Category Filter: ONLY category_name = 'Operating Expenses' (excludes Marketing Expenses)

-- Current Month Calculation (Actual Values):
SELECT SUM(
  CASE 
    WHEN cost_type = 'one_time' THEN amount  -- One-time: full amount regardless of timing
    ELSE amount * days_elapsed / days_in_month  -- Recurring: prorated by days elapsed
  END
) FROM finance.operating_expenses_detailed
WHERE effective_date <= calculation_cutoff
  AND (end_date IS NULL OR end_date >= month_start)
  AND category_name = 'Operating Expenses';  -- CRITICAL: Only Operating Expenses

-- Run-Rate Calculation (Full Monthly Projections):
SELECT SUM(amount)  -- Always use full monthly amounts for run-rate
FROM finance.operating_expenses_detailed
WHERE effective_date <= calculation_cutoff
  AND (end_date IS NULL OR end_date >= month_start)
  AND category_name = 'Operating Expenses';

-- Hierarchical Structure:
-- Category: "Operating Expenses" 
--   ├── Subcategory: "Fixed Cost" → Rent, Insurance, Building Tax, Golf Balls, Bay Material
--   ├── Subcategory: "Variable Cost" → Utilities
--   └── Subcategory: "Salaries" → Staff Salaries, Operational Support, Service Tax

-- Marketing expenses in Operating system (category_name = 'Marketing Expenses'):
--   ├── Subcategory: "Online Marketing" → LINE
--   └── Subcategory: "Offline Marketing" → Video Content
```

**Marketing Expenses Components (Total = Google + Meta + Manual):**
```sql
-- Component 1: Google Ads (API Source)
SELECT SUM(cost_micros / 1000000.0) as google_ads_spend
FROM marketing.google_ads_campaign_performance
WHERE date >= month_start AND date <= calculation_cutoff;

-- Component 2: Meta Ads (API Source)  
SELECT SUM(spend_cents / 100.0) as meta_ads_spend
FROM marketing.meta_ads_campaign_performance  
WHERE date >= month_start AND date <= calculation_cutoff;

-- Component 3: Manual Marketing Expenses (Manual Entry Source)
SELECT SUM(amount) as manual_marketing_expenses
FROM finance.manual_expense_entries
WHERE DATE_TRUNC('month', date) = month_start;

-- Total Marketing Expenses:
total_marketing = google_ads + meta_ads + manual_marketing_expenses

-- Run-Rate Logic:
-- Google/Meta Ads: actual × (days_in_month ÷ days_elapsed)
-- Manual Marketing: No scaling (fixed amounts)
```

**Important Note on Marketing Expenses in Operating System:**
The database function does NOT include Operating Expenses with category = 'Marketing Expenses' (like LINE, Video Content) in the main marketing_expenses calculation. These appear separately in the operating_expenses.by_category structure and are handled by the frontend for display purposes only.

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

#### PLComparisonView Component
**Location**: `src/components/finance-dashboard/PLComparisonView.tsx`

The monthly P&L comparison component featuring:

- **Side-by-side Monthly Comparison**: Shows up to 6 months of P&L data in tabular format
- **Unified Run-Rate Control**: Controlled by header toggle, no duplicate controls
- **Historical Data Integration**: Automatically falls back to historical data when POS/API data is unavailable
- **Expandable Sections**: Net Sales, Operating Expenses, and Marketing Expenses can be expanded to show detail
- **Manual Revenue Integration**: Events, ClassPass, and Gowabi revenue displayed as expandable subsections under Net Sales
- **Intelligent COGS Handling**: Uses `cogs.total_cogs` with fallback to `cogs.historical_cogs` for historical months
- **Variance Calculations**: Month-over-month percentage changes with color-coded indicators

**Key Implementation Features:**
```typescript
// Historical Data Fallback Logic
const getValue = (data: PLData, path: string, historicalPath?: string): number => {
  // Try regular path first
  const value = getNestedValue(data, path);
  
  // If value is 0 or null and historical path exists, use historical
  if ((typeof value !== 'number' || value === 0) && historicalPath) {
    const historicalValue = getNestedValue(data, historicalPath);
    if (typeof historicalValue === 'number') {
      return historicalValue; // Use historical data
    }
  }
  
  return typeof value === 'number' ? value : 0;
};

// Run-Rate EBITDA Calculation (in comparison view)
if (monthData.is_current_month && showRunRate && monthData.run_rate_projections?.gross_profit) {
  grossProfit = monthData.run_rate_projections.gross_profit; // Use run-rate gross profit
} else {
  grossProfit = monthData.gross_profit?.calculated || monthData.gross_profit?.historical_gross_profit || 0;
}
const ebitda = grossProfit - operatingExpenses - marketingExpenses;
```

**Data Source Integration in Comparison:**
- **Current Month**: Uses live POS + API data with run-rate projections
- **Historical Months**: Falls back to imported historical data when POS shows ฿0
- **Mixed Data Sources**: Combines POS, API, manual entries, and historical data seamlessly
- **Variance Indicators**: Shows month-over-month changes with trending arrows

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

**Complete Historical Coverage**: POS data available from March 16, 2024 onwards with 16,000+ transactions.

```sql
-- CORRECTED: POS data queries work for ALL months from March 2024+
-- Total Sales (gross before discounts)
SELECT COALESCE(SUM(sales_total), 0) as total_sales
FROM pos.lengolf_sales 
WHERE date >= v_month_start 
  AND date <= v_calculation_cutoff
  AND is_voided = false;

-- Net Sales (after discounts, before VAT)
SELECT COALESCE(SUM(sales_net), 0) as net_sales
FROM pos.lengolf_sales
WHERE date >= v_month_start 
  AND date <= v_calculation_cutoff
  AND is_voided = false;

-- COGS (Cost of Goods Sold)
SELECT COALESCE(SUM(sales_cost), 0) as pos_cogs
FROM pos.lengolf_sales
WHERE date >= v_month_start 
  AND date <= v_calculation_cutoff
  AND is_voided = false;
```

**Key Database Function Fixes (August 2025):**
- **Removed August 2025+ restriction**: POS queries now work for all months with available data
- **Fixed column references**: Uses correct `date` column instead of `order_date`
- **Proper sales categorization**: Separates `sales_total` (gross) and `sales_net` (after discounts)
- **Complete COGS integration**: Uses `sales_cost` from POS data for accurate gross profit calculations

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

Run-rate calculations use "days elapsed through yesterday" logic with different approaches per line item:

```typescript
// Base calculation date (database-side)
const calculationDate = new Date();
calculationDate.setDate(calculationDate.getDate() - 1); // Yesterday
const daysElapsed = calculationDate.getDate();
const daysInMonth = new Date(year, month, 0).getDate();
const runRateMultiplier = daysInMonth / Math.max(daysElapsed, 1);
```

**Run-Rate Calculation by Line Item (Exact Database Implementation):**

**Revenue Items:**
```sql
-- POS Sales (Variable - scale with time)
'total_sales': v_total_sales * v_days_in_month / v_days_elapsed,
'net_sales': v_net_sales * v_days_in_month / v_days_elapsed,

-- Manual Revenue (Fixed - no scaling)
-- Manual revenue is added to run-rate sales WITHOUT scaling
'combined_total': (v_total_sales * v_days_in_month / v_days_elapsed) + v_manual_revenue,
'combined_net': (v_net_sales * v_days_in_month / v_days_elapsed) + v_manual_revenue,
```

**Cost Items:**
```sql
-- COGS (Variable - scales with sales)
'total_cogs': v_pos_cogs * v_days_in_month / v_days_elapsed,

-- Gross Profit
'gross_profit': ((v_net_sales * v_days_in_month / v_days_elapsed) + v_manual_revenue) - 
                (v_pos_cogs * v_days_in_month / v_days_elapsed),

-- Operating Expenses (Always full monthly amounts for run-rate)
'operating_expenses': (SELECT SUM(amount) FROM finance.operating_expenses_detailed 
                      WHERE effective_date <= calculation_cutoff 
                      AND (end_date IS NULL OR end_date >= month_start)
                      AND category_name = 'Operating Expenses'),

-- Marketing API Expenses (Variable - scale with time)
'google_ads': v_google_spend * v_days_in_month / v_days_elapsed,
'meta_ads': v_meta_spend * v_days_in_month / v_days_elapsed,
```

**Final EBITDA Calculation (Database vs Frontend Implementation):**

**Database Implementation:**
```sql
-- Database calculates run-rate EBITDA as:
'ebitda': (
    ((v_net_sales * v_days_in_month / v_days_elapsed) + v_manual_revenue) - 
    (v_pos_cogs * v_days_in_month / v_days_elapsed) - 
    (SELECT SUM(amount) FROM finance.operating_expenses_detailed 
     WHERE effective_date <= calculation_cutoff 
     AND (end_date IS NULL OR end_date >= month_start)
     AND category_name = 'Operating Expenses') - 
    ((v_google_spend + v_meta_spend) * v_days_in_month / v_days_elapsed + v_manual_expenses)
)
```

**Frontend Implementation (OVERRIDES Database EBITDA):**
```typescript
// Frontend recalculates EBITDA for component alignment
// CRITICAL FIX: Always uses run-rate gross profit when run-rate is enabled
let grossProfit;
if (monthData.is_current_month && showRunRate && monthData.run_rate_projections?.gross_profit) {
  grossProfit = monthData.run_rate_projections.gross_profit; // ฿534,961 for run-rate
} else {
  grossProfit = monthData.gross_profit?.calculated || monthData.gross_profit?.historical_gross_profit || 0;
}

const ebitda = grossProfit - operatingExpenses - marketingExpenses;
```

**Critical Fix Result (August 2025):**
- **Before Fix**: EBITDA showed ฿101,833 (using actual gross profit ฿368,748)
- **After Fix**: EBITDA shows ฿268,046 (using run-rate gross profit ฿534,961)
- **Formula Validation**: ฿534,961 - ฿220,222 - ฿46,693 = ฿268,046 ✅

**Data Source Labels in Frontend:**
- **"POS"**: Direct from pos.lengolf_sales table
- **"API"**: Google Ads/Meta Ads from marketing schema tables
- **"Manual"**: User-entered manual revenue/expense entries
- **"Calc"**: Calculated values (EBITDA, Gross Profit, totals)
- **"Projected"**: Run-rate extrapolations (only current month)

#### EBITDA Calculation

EBITDA uses direct subtraction methodology with intelligent component selection:

```typescript
// EBITDA Formula (Always):
// EBITDA = Gross Profit - Operating Expenses - Marketing Expenses

// Component Selection Logic:
// 1. Historical Months: Use historical values
// 2. Current Month (Actual): Use actual/calculated values  
// 3. Current Month (Run-Rate): Use run-rate projections

// Gross Profit Selection:
let grossProfit;
if (monthData.is_current_month && showRunRate && monthData.run_rate_projections?.gross_profit) {
  grossProfit = monthData.run_rate_projections.gross_profit; // Run-rate value
} else {
  grossProfit = monthData.gross_profit?.calculated || monthData.gross_profit?.historical_gross_profit || 0;
}

// Operating Expenses:
const operatingExpenses = getOperatingExpensesTotalByMonth(month, showRunRate);
// This function returns:
// - showRunRate=false: Prorated amounts for current month
// - showRunRate=true: Full monthly amounts (run-rate)
// - Historical months: Full historical amounts

// Marketing Expenses:
const marketingExpenses = getMarketingExpensesTotalByMonth(month, showRunRate);  
// Components: googleAds + metaAds + operatingMarketingExpenses
// - Google/Meta Ads: API projections when run-rate enabled
// - Operating Marketing: Full monthly amounts when run-rate enabled

// Final Calculation:
const ebitda = grossProfit - operatingExpenses - marketingExpenses;
```

**Critical EBITDA Implementation Details (Frontend vs Database):**

**Frontend Implementation (PLComparisonView.tsx) - CRITICAL FIX:**
- **Always recalculates EBITDA**: Never uses database run-rate EBITDA projection
- **Fixed Component Alignment**: Ensures all components use matching run-rate/actual states
- **Run-Rate Logic Fix**: 
  ```typescript
  // FIXED: Now correctly uses run-rate gross profit when run-rate enabled
  if (monthData.is_current_month && showRunRate && monthData.run_rate_projections?.gross_profit) {
    grossProfit = monthData.run_rate_projections.gross_profit; // ฿534,961 for Aug 2025 run-rate
  } else {
    grossProfit = monthData.gross_profit?.calculated || monthData.gross_profit?.historical_gross_profit || 0;
  }
  
  const ebitda = grossProfit - operatingExpenses - marketingExpenses;
  ```
- **Historical Fallback**: Uses `historical_ebitda` only for months with no POS/API data
- **Universal Application**: Same calculation method in both P&L statement and comparison views

**Database Implementation (get_monthly_pl function):**
- **Still calculates run-rate EBITDA**: Database returns calculated run-rate EBITDA in API response
- **Frontend override necessary**: Frontend recalculates to ensure component alignment consistency
- **Reason for override**: Prevents component state mismatches between actual/run-rate modes

**August 2025 EBITDA Fix Results:**
- **Before Fix**: ฿101,833 (incorrectly used actual gross profit ฿368,748 in run-rate mode)
- **After Fix**: ฿268,046 (correctly uses run-rate gross profit ฿534,961 in run-rate mode)
- **Component Alignment**: All components (Gross Profit, Operating, Marketing) now consistently use run-rate values
- **Formula Verification**: ฿534,961 - ฿220,222 - ฿46,693 = ฿268,046 ✅

**Impact on User Experience:**
- **Accurate Projections**: Run-rate EBITDA now provides realistic monthly projection
- **Consistent UI**: No more component state mismatches between P&L views
- **Reliable Decision Making**: Management can trust run-rate figures for planning

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

## Recent Critical Fixes (August 2025)

### Major Database Function Corrections

**1. POS Data Availability Correction (CRITICAL):**
- **Issue**: Database function incorrectly assumed POS data only available from August 2025+
- **Reality**: POS data available from March 16, 2024 with 16,000+ transactions
- **Fix**: Removed conditional logic restricting POS queries to August 2025+
- **Impact**: Historical months now show actual POS sales instead of ฿0

**2. EBITDA Run-Rate Calculation Fix:**
- **Issue**: EBITDA showing ฿101,833 instead of expected ~฿268,000 for run-rate
- **Root Cause**: Frontend using actual gross profit (฿368,748) instead of run-rate gross profit (฿534,961)
- **Fix**: Component alignment ensures all EBITDA components use matching run-rate/actual states
- **Result**: Run-rate EBITDA now correctly shows ฿268,046

**3. Historical Data Fallback Implementation:**
- **Issue**: Historical months showing ฿0 for COGS, marketing expenses
- **Fix**: Added `getValue()` function with intelligent historical fallback logic
- **Implementation**: Uses POS/API data when available, falls back to historical CSV data when needed

### P&L Comparison View Improvements

**Issues Resolved:**
1. **Duplicate Run-Rate Toggles**: Removed duplicate toggle, now controlled by single header toggle
2. **Manual Revenue Integration**: Added Events, ClassPass, Gowabi as expandable subsections under Net Sales
3. **Component State Consistency**: Fixed EBITDA component alignment between actual and run-rate modes
4. **Historical Data Integration**: Seamless combination of live POS/API data with historical CSV fallbacks
5. **Marketing Expense Calculation**: Proper aggregation of Google Ads + Meta Ads + manual entries

**Key Implementation Logic (Current Working Code):**

```typescript
// Historical Data Fallback Pattern (PLComparisonView.tsx)
const getValue = (data: PLData, path: string, historicalPath?: string): number => {
  if (!path) return 0;
  
  // First try to get the regular value
  const keys = path.split('.');
  let value: any = data;
  for (const key of keys) {
    value = value?.[key];
  }
  
  // If the value is 0 or null and we have a historical path, try historical
  if ((typeof value !== 'number' || value === 0) && historicalPath) {
    const historicalKeys = historicalPath.split('.');
    let historicalValue: any = data;
    for (const key of historicalKeys) {
      historicalValue = historicalValue?.[key];
    }
    
    if (typeof historicalValue === 'number') {
      return historicalValue; // Use historical when POS/API data is unavailable
    }
  }
  
  return typeof value === 'number' ? value : 0;
};

// FIXED EBITDA Calculation (Component Alignment)
const hasLiveData = monthData.data_sources?.has_pos_data || monthData.data_sources?.has_marketing_data;

if (hasLiveData || monthData.is_current_month) {
  // Calculate EBITDA = Gross Profit - Operating Expenses - Marketing Expenses
  
  // CRITICAL FIX: Use run-rate gross profit when run-rate enabled
  let grossProfit;
  if (monthData.is_current_month && showRunRate && monthData.run_rate_projections?.gross_profit) {
    grossProfit = monthData.run_rate_projections.gross_profit; // ฿534,961 for run-rate
  } else {
    grossProfit = monthData.gross_profit?.calculated || monthData.gross_profit?.historical_gross_profit || 0;
  }
  
  const operatingExpenses = getOperatingExpensesTotalByMonth(month, showRunRate);
  const marketingExpenses = getMarketingExpensesTotalByMonth(month, showRunRate);  
  
  const ebitda = grossProfit - operatingExpenses - marketingExpenses; // ฿268,046
  acc[month] = ebitda;
} else {
  // Use historical EBITDA for months with no live data
  acc[month] = monthData.ebitda?.historical_ebitda || 0;
}
```

**Database Function Corrections (get_monthly_pl):**
```sql
-- FIXED: POS data query works for ALL months (removed August 2025+ restriction)
SELECT 
  COALESCE(SUM(sales_total), 0),    -- Total Sales (gross)
  COALESCE(SUM(sales_net), 0),      -- Net Sales (after discounts)
  COALESCE(SUM(sales_cost), 0),     -- COGS
  COALESCE(SUM(gross_profit), 0)    -- POS calculated gross profit
INTO v_total_sales, v_net_sales, v_pos_cogs, v_pos_gross_profit
FROM pos.lengolf_sales
WHERE date >= v_month_start 
  AND date <= v_calculation_cutoff
  AND is_voided = false;
-- NOTE: No longer restricts to August 2025+ - works for all months with POS data
```

**Data Integration Architecture (Post-Fix):**
- **March 2024 - Present**: Primary POS data (16,000+ transactions) + Marketing API + Manual entries + Operating expenses
- **Pre-March 2024**: Historical CSV data from `finance.historical_pl_data`
- **Current Month**: Full feature set with run-rate projections and component-aligned EBITDA calculations
- **Historical Months**: Intelligent fallback system uses historical data only when POS/API data is genuinely unavailable
- **Mixed Sources**: Seamlessly combines live POS data, API data, manual entries, and historical fallback for complete P&L coverage

**Data Source Decision Matrix:**
```typescript
// For each P&L line item, system decides:
if (has_pos_data_for_month && line_item_available_in_pos) {
  return pos_data; // Primary: Use POS data (Mar 2024+)
} else if (has_api_data_for_month && line_item_available_in_api) {
  return api_data; // Secondary: Use Marketing API data
} else if (has_historical_data_for_month) {
  return historical_data; // Fallback: Use imported CSV data
} else {
  return 0; // No data available
}
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