# POS ETL Redirection Guide
**Created**: August 9, 2025  
**Purpose**: Guide for updating existing ETL automations to use the new 3-table architecture  
**Current ETL Status**: Found 2 automated jobs requiring updates

## Current ETL Architecture Analysis

### Existing pg_cron Jobs
```sql
-- Job ID 15: External API Sync (hourly-sales-sync)
-- Schedule: "0 * * * *" (every hour)
-- Command: Calls external API at lengolf-sales-api-1071951248692.asia-southeast1.run.app/sync/daily
-- Status: Active

-- Job ID 18: Internal ETL (hourly-sales-etl)  
-- Schedule: "2 * * * *" (every hour at 2 minutes past)
-- Command: SELECT pos.sync_sales_data();
-- Status: Active
```

### Current ETL Flow
```
External POS System
        ↓
[Job 15] External API Call (lengolf-sales-api-1071951248692.asia-southeast1.run.app)
        ↓
pos.lengolf_sales_staging (populated by external API)
        ↓
[Job 18] pos.sync_sales_data() → pos.transform_sales_data()
        ↓
pos.lengolf_sales (single unified table)
```

### Current Functions Called
- `pos.sync_sales_data()` - Main orchestration function
- `pos.transform_sales_data()` - Core ETL transformation logic
- `pos.update_sales_customer_ids()` - Customer matching
- `public.apply_product_mappings()` - Product mapping

## New 3-Table Architecture

### Target ETL Flow
```
External POS System (Legacy)              New POS System (pos.transactions)
        ↓                                         ↓
[Job 15] External API Call                   [Existing transactions]
        ↓                                         ↓
pos.lengolf_sales_staging                pos.lengolf_sales_new_pos
        ↓                                         ↓
[Updated Job 18] pos.sync_all_sales_data()
        ↓
pos.lengolf_sales_old_pos ← [cutoff date] → pos.lengolf_sales_new_pos
        ↓                                         ↓
               pos.lengolf_sales_unified (materialized view)
                                ↓
                    Applications (no changes required)
```

## Migration Steps

### Phase 1: Set Up New Tables ✅
**Status**: Ready to execute  
**Command**: Run `POS_MIGRATION_STEP_BY_STEP.sql`

```bash
# Execute the complete setup
psql -d your_database -f POS_MIGRATION_STEP_BY_STEP.sql
```

**What this creates**:
- `pos.lengolf_sales_old_pos` (legacy POS data)
- `pos.lengolf_sales_new_pos` (new POS data) 
- `pos.lengolf_sales_unified` (materialized view combining both)
- `pos.migration_cutoff_config` (cutoff date management)
- Helper functions for ETL management

### Phase 2: Update Existing ETL Jobs 🔧
**Status**: Requires manual execution

#### Step 2.1: Test New ETL Function
```sql
-- Test the new unified ETL function
SELECT pos.sync_all_sales_data();
```

**Expected Result**:
```json
{
  "success": true,
  "batch_id": "uuid-here",
  "legacy_pos_processed": 0,  -- (no new staging data)
  "legacy_pos_inserted": 0,
  "new_pos_processed": 5,     -- (example: 5 new transactions)
  "new_pos_inserted": 5,
  "unified_view_refreshed": true,
  "active_cutoff_date": "2025-08-08"
}
```

#### Step 2.2: Update pg_cron Job
```sql
-- Update existing cron job to use new function
-- Job ID 18: hourly-sales-etl

-- Option A: Update existing job
SELECT cron.alter_job(
    18, 
    schedule := '2 * * * *',  -- Keep same schedule
    command := 'SELECT pos.sync_all_sales_data();'
);

-- Option B: Create new job and disable old one (safer)
SELECT cron.schedule(
    'unified-sales-etl',           -- New job name
    '2 * * * *',                   -- Same schedule  
    'SELECT pos.sync_all_sales_data();'  -- New function
);

-- Disable old job (after testing new one)
SELECT cron.unschedule(18);
```

### Phase 3: Downstream Application Updates 📱

#### Step 3.1: Update Database Views (Zero Downtime)
```sql
-- Create backward-compatible view
DROP VIEW IF EXISTS pos.lengolf_sales CASCADE;

CREATE VIEW pos.lengolf_sales AS 
SELECT 
    -- All original columns (maintains compatibility)
    id, date, receipt_number, invoice_number, invoice_payment_type, payment_method,
    order_type, staff_name, customer_name, customer_phone_number, is_voided, voided_reason,
    item_notes, product_name, product_category, product_tab, product_parent_category,
    is_sim_usage, sku_number, item_cnt, item_price_before_discount, item_discount,
    item_vat, item_price_excl_vat, item_price_incl_vat, item_price, item_cost,
    sales_total, sales_vat, sales_gross, sales_discount, sales_net, sales_cost,
    gross_profit, sales_timestamp, update_time, created_at, updated_at, customer_id, product_id
FROM pos.lengolf_sales_unified;

-- Grant same permissions as original table
GRANT SELECT ON pos.lengolf_sales TO authenticated;
GRANT ALL ON pos.lengolf_sales TO postgres;
```

#### Step 3.2: Application Code Changes
**Zero changes required** - Applications continue using `pos.lengolf_sales` view

#### Step 3.3: Advanced Features (Optional)
Applications can optionally use new features:
```sql
-- Access source information
SELECT etl_source FROM pos.lengolf_sales_unified WHERE date = CURRENT_DATE;

-- Access new POS payment details  
SELECT payment_method_details FROM pos.lengolf_sales_unified 
WHERE etl_source = 'new_pos' AND date = CURRENT_DATE;

-- Access transaction references
SELECT transaction_id, transaction_item_id FROM pos.lengolf_sales_unified
WHERE etl_source = 'new_pos';
```

### Phase 4: Testing and Validation 🧪

#### Step 4.1: Data Integrity Tests
```sql
-- Test 1: Check record counts
SELECT 
    'Original lengolf_sales' as source,
    COUNT(*) as records,
    SUM(sales_total) as revenue
FROM pos.lengolf_sales

UNION ALL

SELECT 
    'Unified view' as source, 
    COUNT(*) as records,
    SUM(sales_total) as revenue
FROM pos.lengolf_sales_unified;

-- Test 2: Check cutoff date logic
SELECT 
    date,
    etl_source,
    COUNT(*) as records
FROM pos.lengolf_sales_unified 
WHERE date BETWEEN pos.get_active_cutoff_date() - 1 
                AND pos.get_active_cutoff_date() + 1
GROUP BY date, etl_source
ORDER BY date;

-- Test 3: Verify new POS data
SELECT COUNT(*) as new_pos_records
FROM pos.lengolf_sales_unified 
WHERE etl_source = 'new_pos' 
  AND date > pos.get_active_cutoff_date();
```

#### Step 4.2: Performance Tests
```sql
-- Test query performance on unified view vs original table
EXPLAIN (ANALYZE, BUFFERS) 
SELECT COUNT(*), SUM(sales_total) 
FROM pos.lengolf_sales 
WHERE date >= CURRENT_DATE - 30;

EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*), SUM(sales_total) 
FROM pos.lengolf_sales_unified 
WHERE date >= CURRENT_DATE - 30;
```

### Phase 5: Monitoring and Maintenance 📊

#### Step 5.1: Set Up Automated Monitoring
```sql
-- Create monitoring view
CREATE OR REPLACE VIEW pos.etl_health_check AS
SELECT 
    'ETL Health Check' as status,
    pos.get_active_cutoff_date() as active_cutoff,
    (SELECT COUNT(*) FROM pos.lengolf_sales_old_pos) as old_pos_records,
    (SELECT COUNT(*) FROM pos.lengolf_sales_new_pos) as new_pos_records,
    (SELECT COUNT(*) FROM pos.lengolf_sales_unified) as unified_records,
    (SELECT MAX(date) FROM pos.lengolf_sales_old_pos) as old_pos_latest_date,
    (SELECT MAX(date) FROM pos.lengolf_sales_new_pos) as new_pos_latest_date,
    (SELECT MAX(etl_processed_at) FROM pos.lengolf_sales_new_pos) as last_new_pos_etl,
    now() as check_timestamp;
```

#### Step 5.2: Daily Health Check Query
```sql
-- Run daily to monitor ETL health
SELECT * FROM pos.etl_health_check;

-- Alert conditions:
-- 1. new_pos_latest_date < CURRENT_DATE (no recent new POS data)
-- 2. last_new_pos_etl < now() - interval '2 hours' (ETL not running)
-- 3. unified_records != (old_pos_records + new_pos_records) (sync issues)
```

## Rollback Procedures 🔄

### Emergency Rollback (if issues discovered)

#### Step 1: Revert Cron Job
```sql
-- Revert to old ETL function
SELECT cron.alter_job(
    18,
    command := 'SELECT pos.sync_sales_data();'
);

-- Or re-enable old job if new one was created
SELECT cron.unschedule('unified-sales-etl');
-- Job 18 should still be there if not deleted
```

#### Step 2: Revert Application View
```sql
-- Point view back to original table
DROP VIEW pos.lengolf_sales CASCADE;

-- Recreate view pointing to original table (rename it back first)
ALTER TABLE pos.lengolf_sales_original RENAME TO pos.lengolf_sales;
```

#### Step 3: Clean Up (Optional)
```sql
-- Remove new tables if needed
DROP TABLE pos.lengolf_sales_old_pos CASCADE;
DROP TABLE pos.lengolf_sales_new_pos CASCADE; 
DROP MATERIALIZED VIEW pos.lengolf_sales_unified CASCADE;
DROP TABLE pos.migration_cutoff_config CASCADE;
```

## Migration Timeline 📅

### Recommended Implementation Schedule

| Phase | Duration | Description | Risk Level |
|-------|----------|-------------|------------|
| **Phase 1** | 30 minutes | Set up new tables and functions | Low |
| **Phase 2** | 1 hour | Test new ETL, update cron job | Medium |
| **Phase 3** | 30 minutes | Create backward-compatible view | Low |
| **Phase 4** | 2 hours | Testing and validation | Low |
| **Phase 5** | 30 minutes | Set up monitoring | Low |
| **Total** | **4.5 hours** | Complete migration | **Low** |

### Alternative Approaches

#### Conservative Approach (Parallel Running)
1. Keep existing ETL running unchanged
2. Set up new 3-table architecture in parallel
3. Compare results for 1 week
4. Switch over once confident

#### Aggressive Approach (Direct Switch)
1. Execute all phases in sequence during maintenance window
2. Total downtime: ~30 minutes (during view switch)
3. Complete migration in single session

## Success Criteria ✅

### Technical Success
- [ ] All 3 tables created and populated
- [ ] Unified view returns same data as original table
- [ ] ETL jobs running successfully with new functions
- [ ] Performance maintained or improved
- [ ] Zero data loss during migration

### Business Success
- [ ] All reports and dashboards continue working
- [ ] No interruption to daily operations  
- [ ] New POS data flowing correctly
- [ ] Legacy POS data preserved accurately
- [ ] Easy cutoff date management available

## Contacts and Resources 📞

### Key Files Created
- `POS_MIGRATION_STEP_BY_STEP.sql` - Complete setup script
- `POS_CUTOFF_MANAGEMENT_GUIDE.md` - Cutoff date management
- `POS_ETL_REDIRECTION_GUIDE.md` - This document

### Functions Created
- `pos.sync_all_sales_data()` - New unified ETL function
- `pos.populate_new_pos_sales()` - New POS data population
- `pos.refresh_unified_sales()` - Materialized view refresh
- `pos.get_active_cutoff_date()` - Get current cutoff
- `pos.update_cutoff_date()` - Update cutoff date

### Monitoring Queries
- `SELECT * FROM pos.etl_health_check;` - Daily health check
- `SELECT pos.sync_all_sales_data();` - Manual ETL run
- `SELECT pos.get_active_cutoff_date();` - Check cutoff date

---

**Document Version**: 1.0  
**Last Updated**: August 9, 2025  
**Next Review**: After Phase 2 completion