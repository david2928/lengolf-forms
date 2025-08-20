# Finance Dashboard System

**Category**: Admin Features > Analytics  
**Access Level**: Administrative  
**Version**: 1.0  
**Last Updated**: August 2025

## Overview

The Finance Dashboard provides comprehensive financial reporting and P&L statement management, integrating data from multiple sources including POS transactions, marketing campaigns, and manual entries. Built from historical CSV data spanning April 2024 to August 2025, it offers both historical analysis and real-time run-rate projections.

### Key Features

- **Monthly P&L Statements**: Detailed profit & loss reporting with automated calculations
- **Multi-Source Integration**: POS sales, Google/Meta Ads, manual entries
- **Historical Data**: 17+ months of imported financial history  
- **Run-Rate Projections**: Real-time projections based on current month performance
- **Operating Expenses Management**: Dynamic expense categorization and tracking
- **Manual Entry System**: Single editable value per category per month
- **Thai Baht Currency**: Native THB formatting throughout the system

## System Architecture

### Database Schema

The Finance Dashboard uses a dedicated `finance` schema with the following core tables:

```sql
-- Historical data imported from CSV
finance.historical_data (
  id SERIAL PRIMARY KEY,
  month INTEGER,
  year INTEGER,
  category TEXT,
  value NUMERIC(12,2),
  created_at TIMESTAMP DEFAULT NOW()
)

-- Manual monthly entries (one per category per month)
finance.manual_entries (
  id SERIAL PRIMARY KEY,
  month INTEGER,
  year INTEGER,
  category TEXT,
  value NUMERIC(12,2),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(month, year, category)
)

-- Operating expenses with date ranges
finance.operating_expenses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_amount NUMERIC(12,2) NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  display_category TEXT,
  display_order INTEGER,
  show_in_pl BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

### Core Database Function

The main P&L calculation is handled by `finance.get_monthly_pl()`:

```sql
CREATE OR REPLACE FUNCTION finance.get_monthly_pl(
  p_month INTEGER,
  p_year INTEGER,
  p_calculation_date DATE DEFAULT (CURRENT_DATE - INTERVAL '1 day')::DATE
) RETURNS JSON
```

**Features:**
- Integrates POS sales data from `pos.lengolf_sales`
- Includes marketing spend from Google Ads and Meta Ads campaigns
- Calculates run-rate projections based on elapsed days
- Provides detailed operating expense breakdowns
- Returns structured JSON for frontend consumption

## Data Integration

### POS Sales Integration

Sales data is automatically pulled from the existing POS system:

```sql
-- Total Sales (all transactions)
SELECT COALESCE(SUM(total_amount), 0) as sales_total
FROM pos.lengolf_sales 
WHERE EXTRACT(YEAR FROM order_date) = p_year 
  AND EXTRACT(MONTH FROM order_date) = p_month;

-- Net Sales (excluding events/special categories) 
SELECT COALESCE(SUM(total_amount), 0) as sales_net
FROM pos.lengolf_sales s
LEFT JOIN pos.products p ON s.product_id = p.id
WHERE EXTRACT(YEAR FROM s.order_date) = p_year 
  AND EXTRACT(MONTH FROM s.order_date) = p_month
  AND (p.category_name != 'Events' OR p.category_name IS NULL);
```

### Marketing Campaign Integration

Marketing spend is integrated from the existing marketing analytics system:

```sql
-- Google Ads spend
SELECT COALESCE(SUM(cost_micros / 1000000.0), 0) as google_ads_spend
FROM marketing.google_ads_campaign_performance
WHERE EXTRACT(YEAR FROM date) = p_year 
  AND EXTRACT(MONTH FROM date) = p_month;

-- Meta Ads spend  
SELECT COALESCE(SUM(spend_cents / 100.0), 0) as meta_ads_spend
FROM marketing.meta_ads_campaign_performance
WHERE EXTRACT(YEAR FROM date_start) = p_year 
  AND EXTRACT(MONTH FROM date_start) = p_month;
```

### Operating Expenses Calculation

Operating expenses are prorated based on days elapsed in the current month:

```sql
SELECT 
  name,
  CASE 
    WHEN p_month = EXTRACT(MONTH FROM CURRENT_DATE) 
     AND p_year = EXTRACT(YEAR FROM CURRENT_DATE) THEN
      monthly_amount * (EXTRACT(DAY FROM p_calculation_date)::NUMERIC / 
                       EXTRACT(DAY FROM (DATE_TRUNC('MONTH', p_calculation_date::DATE) 
                                       + INTERVAL '1 MONTH - 1 DAY'))::NUMERIC)
    ELSE monthly_amount
  END as amount,
  display_category,
  display_order
FROM finance.operating_expenses
WHERE show_in_pl = true
  AND effective_date <= DATE_TRUNC('MONTH', MAKE_DATE(p_year, p_month, 1))::DATE
  AND (end_date IS NULL OR end_date >= DATE_TRUNC('MONTH', MAKE_DATE(p_year, p_month, 1))::DATE)
ORDER BY display_order, name;
```

## API Endpoints

### Core P&L Endpoint

**`GET /api/finance/pl-statement`**

Query Parameters:
- `month` (optional): Month to display (1-12, defaults to current)
- `year` (optional): Year to display (defaults to current) 
- `runRate` (optional): Enable run-rate projections (boolean)
- `calculationDate` (optional): Specific date for run-rate calculations (YYYY-MM-DD)

```typescript
// Example Response
{
  "month": 8,
  "year": 2025,
  "revenue": {
    "combined_total": 381499,
    "combined_net": 356541,
    "manual_entries": {
      "Net Sales (Events)": 24958
    }
  },
  "expenses": {
    "cost_of_goods_sold": 165230,
    "marketing": {
      "google_ads": 45230,
      "meta_ads": 28940,
      "manual_entries": {
        "Offline Marketing KOL+Video Manual": 0
      }
    },
    "operating": {
      "total": 83673,
      "breakdown": [
        {
          "name": "Rent",
          "amount": 68548,
          "category": "Fixed Costs",
          "order": 1
        }
      ]
    }
  },
  "calculations": {
    "gross_profit": 191311,
    "gross_margin": 50.15,
    "net_profit": 33365,
    "net_margin": 8.75,
    "days_elapsed": 17,
    "total_days": 31,
    "run_rate_enabled": true
  }
}
```

### Manual Entries Management

**`GET/POST/PUT/DELETE /api/finance/manual-entries`**

```typescript
// POST/PUT Request Body
{
  "month": 8,
  "year": 2025,
  "category": "Net Sales (Events)",
  "value": 24958.50,
  "description": "Corporate event bookings" // Optional
}
```

### Operating Expenses Management

**`GET/POST/PUT/DELETE /api/finance/operating-expenses`**

```typescript
// POST Request Body
{
  "name": "Office Rent",
  "monthly_amount": 125000,
  "effective_date": "2025-01-01",
  "end_date": null, // Optional
  "display_category": "Fixed Costs",
  "display_order": 1,
  "show_in_pl": true
}
```

## Frontend Components

### PLStatement Component

**Location**: `src/components/finance-dashboard/PLStatement.tsx`

Main P&L display component featuring:

- **Monthly Navigation**: Switch between different months/years
- **Run-Rate Toggle**: Enable/disable projections for current month
- **Interactive Line Items**: Edit/delete buttons for existing manual entries
- **Dynamic Categories**: Loads expense categories from database
- **Currency Formatting**: Native THB display throughout

**Key Features:**
```typescript
interface PLData {
  month: number;
  year: number;
  revenue: {
    combined_total: number;
    combined_net: number;
    manual_entries: Record<string, number>;
  };
  expenses: {
    cost_of_goods_sold: number;
    marketing: {
      google_ads: number;
      meta_ads: number;
      manual_entries: Record<string, number>;
    };
    operating: {
      total: number;
      breakdown: Array<{
        name: string;
        amount: number;
        category: string;
        order: number;
      }>;
    };
  };
  calculations: {
    gross_profit: number;
    gross_margin: number;
    net_profit: number;
    net_margin: number;
    days_elapsed: number;
    total_days: number;
    run_rate_enabled: boolean;
  };
}
```

### ManualEntryModal Component

**Location**: `src/components/finance-dashboard/ManualEntryModal.tsx`

Modal interface for adding/editing manual entries:

- **Upsert Logic**: Single value per category per month
- **Optional Description**: Description field not required
- **THB Currency**: Native Thai Baht formatting
- **Validation**: Prevents duplicate entries per month/category

### OperatingExpensesManager Component

**Location**: `src/components/finance-dashboard/OperatingExpensesManager.tsx`

Administrative interface for managing recurring expenses:

- **Professional Styling**: Matches staff management page design
- **Categorization**: Group expenses by display category
- **Date Ranges**: Effective and end date management
- **Quick Actions**: Toggle show/hide in P&L statements
- **Historical Support**: Import and manage historical expenses

## Data Import Process

### Historical CSV Import

The system was populated with 17 months of historical data from "Budget Planning - P&L.csv":

```sql
-- Example import for April 2024 - August 2025
INSERT INTO finance.historical_data (month, year, category, value)
VALUES 
  (4, 2024, 'Total Sales', 287450.00),
  (4, 2024, 'Net Sales', 268200.00),
  (4, 2024, 'Cost of Goods Sold', 156800.00),
  -- ... 17 months of data
```

### Operating Expenses Import

Historical operating expenses were imported with appropriate date ranges:

```sql
INSERT INTO finance.operating_expenses 
  (name, monthly_amount, effective_date, display_category, display_order)
VALUES
  ('Rent', 125000.00, '2024-04-01', 'Fixed Costs', 1),
  ('Utilities', 8500.00, '2024-04-01', 'Fixed Costs', 2),
  ('Staff Salaries', 180000.00, '2024-04-01', 'Personnel', 3);
```

## Business Logic

### Run-Rate Calculations

Run-rate projections are calculated based on performance through yesterday (not today):

```typescript
// Frontend calculation example
const daysElapsed = Math.min(currentDay - 1, totalDaysInMonth);
const runRateMultiplier = totalDaysInMonth / Math.max(daysElapsed, 1);

const projectedRevenue = currentRevenue * runRateMultiplier;
const projectedExpenses = variableExpenses * runRateMultiplier + fixedExpenses;
```

### Unique Entry Constraint

The system enforces one manual entry per category per month:

```sql
-- Database constraint
ALTER TABLE finance.manual_entries 
ADD CONSTRAINT unique_category_month 
UNIQUE(month, year, category);
```

**Frontend Behavior:**
- **Add Mode**: Shows plus (+) button when no entry exists
- **Edit Mode**: Shows edit/delete buttons when entry exists
- **Upsert Logic**: PUT requests update existing entries instead of creating duplicates

### Operating Expense Proration

For the current month, operating expenses are prorated based on days elapsed:

```typescript
// Example: August 2025, Rent ฿125,000
// Days elapsed: 17, Total days: 31
const proratedRent = 125000 * (17 / 31) = ฿68,548
```

## Security & Access Control

### Administrative Access

Finance Dashboard requires administrative privileges:

```typescript
// Middleware protection
if (!session?.user?.email || !session.user.isAdmin) {
  return NextResponse.redirect('/unauthorized');
}
```

### Development Authentication Bypass

When `SKIP_AUTH=true` in development:

```typescript
// Development bypass
const session = await getDevSession(authOptions, request);
if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
  // Full access granted for development testing
}
```

## Error Handling

### Database Error Recovery

```typescript
// API error handling pattern
try {
  const { data, error } = await supabase.rpc('finance.get_monthly_pl', params);
  
  if (error) {
    console.error('P&L calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate P&L statement' }, 
      { status: 500 }
    );
  }
  
  return NextResponse.json(data);
} catch (error) {
  console.error('Unexpected error:', error);
  return NextResponse.json(
    { error: 'Internal server error' }, 
    { status: 500 }
  );
}
```

### Frontend Error Handling

```typescript
// SWR error handling
const { data, error, isLoading } = useSWR(
  `/api/finance/pl-statement?month=${month}&year=${year}`,
  fetcher,
  {
    onError: (error) => {
      console.error('Failed to load P&L data:', error);
      // Show user-friendly error message
    }
  }
);

if (error) {
  return <div className="text-red-600">Failed to load financial data</div>;
}
```

## Performance Considerations

### Database Optimization

- **Indexed Queries**: All date-based queries use indexed columns
- **Materialized Views**: Consider for frequently accessed historical data
- **Function Performance**: `get_monthly_pl()` optimized for single-month queries

### Frontend Optimization

- **SWR Caching**: Automatic caching with revalidation
- **Lazy Loading**: Components loaded on demand
- **Memo Optimization**: Heavy calculations memoized

```typescript
// Memoized calculations
const calculations = useMemo(() => {
  if (!data) return null;
  
  return {
    grossProfit: data.revenue.combined_total - data.expenses.cost_of_goods_sold,
    grossMargin: (grossProfit / data.revenue.combined_total) * 100,
    // ... other calculations
  };
}, [data]);
```

## Testing Strategy

### API Testing

```bash
# Get development token
TOKEN=$(curl -s http://localhost:3000/api/dev-token | jq -r '.token')

# Test P&L endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/finance/pl-statement?month=8&year=2025&runRate=true"

# Test manual entries
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"month":8,"year":2025,"category":"Test Category","value":1000}' \
  http://localhost:3000/api/finance/manual-entries
```

### Frontend Testing

```bash
# Navigate to finance dashboard (with auth bypass)
http://localhost:3000/admin/finance-dashboard

# Operating expenses management  
http://localhost:3000/admin/finance-dashboard/operating-expenses
```

## Maintenance & Updates

### Monthly Maintenance

1. **Verify Data Integration**: Check POS and marketing data accuracy
2. **Update Operating Expenses**: Add/modify recurring expenses
3. **Historical Data Validation**: Ensure imported data remains accurate

### Schema Updates

```sql
-- Add new expense categories
ALTER TABLE finance.operating_expenses 
ADD COLUMN subcategory TEXT;

-- Update display ordering
UPDATE finance.operating_expenses 
SET display_order = display_order + 10 
WHERE display_category = 'Marketing';
```

### Code Deployment

Always run validation before deployment:

```bash
npm run typecheck  # Verify TypeScript
npm run lint      # Check code quality  
npm run build     # Test production build
```

## Troubleshooting

### Common Issues

**Q: Manual entries not showing edit/delete buttons**
A: Check that `manual_entries` data includes the category in the response. Verify database constraint allows upserts.

**Q: Operating expenses showing ฿0 in P&L**  
A: Ensure `show_in_pl = true` and effective/end dates are configured correctly. Check proration calculation for current month.

**Q: Run-rate calculations incorrect**
A: Verify `calculationDate` parameter uses yesterday's date, not today. Check `days_elapsed` calculation in database function.

**Q: Currency showing USD instead of THB**
A: All currency formatting should use Thai Baht. Check `formatCurrency()` utility function configuration.

### Database Debugging

```sql
-- Check manual entries for specific month
SELECT * FROM finance.manual_entries 
WHERE month = 8 AND year = 2025;

-- Verify operating expenses calculation
SELECT name, monthly_amount, 
       monthly_amount * (17::numeric / 31::numeric) as prorated_amount
FROM finance.operating_expenses 
WHERE show_in_pl = true;

-- Test P&L function directly
SELECT finance.get_monthly_pl(8, 2025, '2025-08-17');
```

## Future Enhancements

### Planned Features

1. **Budget vs Actual**: Compare actual performance against budgets
2. **Year-over-Year Analysis**: Historical trend comparisons  
3. **Automated Alerts**: Notifications for significant variances
4. **Excel Export**: Generate downloadable P&L reports
5. **Multi-Currency Support**: Handle international transactions

### Technical Improvements

1. **Real-time Updates**: WebSocket integration for live data
2. **Advanced Caching**: Redis caching for complex calculations
3. **Audit Trail**: Track all manual entry changes
4. **Backup Integration**: Automated financial data backups

## Related Documentation

- **[Sales Dashboard](./SALES_DASHBOARD.md)** - Revenue analytics and KPIs
- **[Database Documentation](../../../database/DATABASE_DOCUMENTATION_INDEX.md)** - Complete schema reference
- **[API Reference](../../../api/API_REFERENCE.md)** - All API endpoint documentation
- **[POS System Implementation](../../public/pos/POS_SYSTEM_IMPLEMENTATION.md)** - POS data source details
- **[Admin Panel](../system-management/ADMIN_PANEL.md)** - Administrative interface overview

---

**Last Updated**: August 2025  
**Document Version**: 1.0  
**Maintainer**: Development Team  
**Review Cycle**: Quarterly