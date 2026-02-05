# Revenue Analysis Skill

Analyzes Lengolf business revenue data with proper context about the business model.

## Business Model Context (CRITICAL)

**Primary Revenue Sources:**
1. **Bay Bookings** - Hourly rental of golf simulator bays (MAIN REVENUE)
2. **Coaching Sessions** - Paid instruction with golf pros (SEPARATE REVENUE)
3. **POS Transactions** - Food, drinks, accessories
4. **Packages** - Pre-paid bundles of bay hours or coaching sessions

**NOT Revenue Sources:**
- Club Rentals - These are FREE with bay bookings, not a separate charge

## Analysis Workflow

When analyzing Lengolf revenue, follow this sequence:

### Step 1: Clarify Scope
Ask which date range and revenue streams to analyze:
- Date range (last week, month, quarter, year, custom)
- Revenue type (all, bay bookings only, coaching only, POS only)
- Comparison period (previous period, same period last year)

### Step 2: Query Relevant Tables

**Bay Booking Revenue:**
```sql
-- Schema: public
SELECT * FROM information_schema.columns
WHERE table_name IN ('bookings', 'booking_details', 'pricing');
```

**Coaching Revenue:**
```sql
-- Schema: backoffice or public - check coaching_sessions, coach_bookings
SELECT * FROM information_schema.tables
WHERE table_name LIKE '%coach%';
```

**POS Revenue:**
```sql
-- Schema: pos
SELECT * FROM pos.transactions
WHERE created_at BETWEEN 'start_date' AND 'end_date';
```

### Step 3: Validate Assumptions
Before presenting any analysis:
1. Confirm understanding of pricing structure
2. Verify no club rental charges are included in revenue calculations
3. Cross-check totals against multiple data sources if available

### Step 4: Present Findings
Include:
- Clear breakdown by revenue stream
- Comparison to previous period
- Confidence level in the data
- Any anomalies or data quality issues found

## Common Queries

### Total Bay Booking Revenue
```sql
SELECT
  date_trunc('month', created_at) as month,
  SUM(total_amount) as revenue,
  COUNT(*) as booking_count
FROM bookings
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY 1
ORDER BY 1;
```

### Revenue by Bay Type
```sql
SELECT
  bay_type,
  SUM(total_amount) as revenue,
  COUNT(*) as bookings,
  AVG(total_amount) as avg_booking_value
FROM bookings
GROUP BY bay_type;
```

## Remember
- Always use TodoWrite to track multi-step analyses
- Ask clarifying questions before making assumptions
- Club rentals are FREE - never include them in revenue calculations
