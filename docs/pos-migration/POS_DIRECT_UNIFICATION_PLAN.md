# POS Direct Unification Migration Plan
**Created**: August 9, 2025  
**Strategy**: Make `lengolf_sales` the unified table directly - no views, no downstream changes  
**Objective**: Zero impact on applications while gaining unified data management

## Executive Summary

This migration makes `pos.lengolf_sales` itself the unified table containing both legacy and new POS data, separated by a configurable cutoff date. Applications continue using the same table name with zero changes required.

### Key Architecture Changes
```
BEFORE: Applications → pos.lengolf_sales (legacy POS only)

AFTER:  Applications → pos.lengolf_sales (unified: legacy + new POS)
                             ↑
                    pos.sync_unified_sales()
                         ↙        ↘
        Legacy POS Staging    New POS Staging
           (≤ cutoff)          (> cutoff)
```

### Benefits
- ✅ **Zero Application Changes**: Same table name, same structure
- ✅ **Direct Data Access**: No views or joins needed
- ✅ **Easy Cutoff Management**: Single function call to change dates
- ✅ **Full Audit Trail**: Source tracking built into main table
- ✅ **Cartesian Product Fix**: Payment method handling corrected

---

## Implementation Steps

### Step 1: Backup and Setup (15 minutes)
**Risk**: Low | **Rollback**: Easy

#### 1.1 Create Backup
```sql
-- Create backup of current lengolf_sales
CREATE TABLE pos.lengolf_sales_backup AS 
SELECT *, now() as backup_created_at 
FROM pos.lengolf_sales;

-- Verify backup
SELECT COUNT(*) as backup_count, 
       MAX(backup_created_at) as backup_time 
FROM pos.lengolf_sales_backup;
```

#### 1.2 Execute Setup Script
```bash
# Run the direct unification setup
psql -d your_database -f POS_DIRECT_UNIFICATION_STRATEGY.sql
```

**What this creates**:
- Adds tracking columns to existing `pos.lengolf_sales` table
- Creates staging tables: `lengolf_sales_old_pos_staging`, `lengolf_sales_new_pos_staging`
- Creates unified ETL function: `pos.sync_unified_sales()`
- Sets up cutoff date management

#### 1.3 Validate Setup
```sql
-- Check that lengolf_sales structure was enhanced
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'pos' 
  AND table_name = 'lengolf_sales'
  AND column_name IN ('etl_source', 'etl_batch_id', 'transaction_id');

-- Should show 3 new columns added
```

### Step 2: Test New ETL Function (30 minutes)
**Risk**: Medium | **Rollback**: Restore from backup

#### 2.1 Test Unified ETL
```sql
-- Test the new unified ETL function
SELECT pos.sync_unified_sales();
```

**Expected Result**:
```json
{
  "success": true,
  "cutoff_date": "2025-08-08",
  "old_pos_processed": 0,     -- No new legacy data expected
  "new_pos_processed": 15,    -- New transactions since cutoff
  "total_processed": 15
}
```

#### 2.2 Validate Data Integration
```sql
-- Check that both data sources are in main table
SELECT 
    etl_source,
    COUNT(*) as records,
    COUNT(DISTINCT date) as unique_dates,
    MIN(date) as earliest,
    MAX(date) as latest,
    ROUND(SUM(sales_total), 2) as revenue
FROM pos.lengolf_sales
GROUP BY etl_source
ORDER BY etl_source;

-- Check cutoff date logic
SELECT 
    date,
    etl_source,
    COUNT(*) as records
FROM pos.lengolf_sales
WHERE date BETWEEN pos.get_active_cutoff_date() - 1 
                AND pos.get_active_cutoff_date() + 1
GROUP BY date, etl_source
ORDER BY date;
```

**Success Criteria**:
- Legacy POS data: dates ≤ cutoff, `etl_source = 'legacy_pos'`
- New POS data: dates > cutoff, `etl_source = 'new_pos'`
- No data gaps or overlaps at cutoff transition
- Total revenue matches previous totals

### Step 3: Update ETL Automation (20 minutes)
**Risk**: Low | **Rollback**: Revert cron job

#### 3.1 Update Existing Cron Job
```sql
-- Current: Job 18 calls pos.sync_sales_data()
-- Update to call pos.sync_unified_sales()

SELECT cron.alter_job(
    18,  -- Job ID for 'hourly-sales-etl'
    command := 'SELECT pos.sync_unified_sales();'
);

-- Verify job updated
SELECT jobid, jobname, command 
FROM cron.job 
WHERE jobid = 18;
```

#### 3.2 Monitor Job Execution
```sql
-- Check recent ETL logs
SELECT 
    batch_id,
    process_type,
    status,
    start_time,
    end_time,
    records_processed,
    metadata
FROM pos.sales_sync_logs
WHERE start_time > now() - interval '24 hours'
ORDER BY start_time DESC
LIMIT 5;
```

### Step 4: Application Validation (1 hour)
**Risk**: Low | **Rollback**: Not needed (same table name)

#### 4.1 Test Critical Queries
```sql
-- Test typical dashboard queries
SELECT 
    date,
    COUNT(DISTINCT receipt_number) as transactions,
    SUM(sales_total) as daily_revenue,
    COUNT(DISTINCT customer_id) as unique_customers
FROM pos.lengolf_sales 
WHERE date >= CURRENT_DATE - 30
GROUP BY date
ORDER BY date DESC
LIMIT 10;

-- Test product analysis
SELECT 
    product_category,
    COUNT(*) as items_sold,
    SUM(sales_total) as category_revenue,
    AVG(sales_total) as avg_transaction
FROM pos.lengolf_sales 
WHERE date >= CURRENT_DATE - 7
  AND sales_total > 0
GROUP BY product_category
ORDER BY category_revenue DESC;

-- Test customer analysis
SELECT 
    customer_name,
    COUNT(DISTINCT receipt_number) as visits,
    SUM(sales_total) as total_spent
FROM pos.lengolf_sales 
WHERE date >= CURRENT_DATE - 30
  AND customer_id IS NOT NULL
GROUP BY customer_name, customer_id
ORDER BY total_spent DESC
LIMIT 20;
```

#### 4.2 New Features Available (Optional)
Applications can now optionally access enhanced data:

```sql
-- Check data source distribution
SELECT etl_source, COUNT(*) as records 
FROM pos.lengolf_sales 
WHERE date = CURRENT_DATE - 1
GROUP BY etl_source;

-- Access new POS payment details  
SELECT 
    receipt_number,
    payment_method,
    payment_method_details->0->>'method' as primary_method,
    payment_method_details->0->>'amount' as primary_amount
FROM pos.lengolf_sales
WHERE etl_source = 'new_pos' 
  AND date = CURRENT_DATE - 1
  AND payment_method_details IS NOT NULL;

-- Reference original transaction data
SELECT 
    ls.receipt_number,
    ls.sales_total,
    t.transaction_date,
    t.table_number
FROM pos.lengolf_sales ls
JOIN pos.transactions t ON ls.transaction_id = t.id
WHERE ls.etl_source = 'new_pos'
  AND ls.date = CURRENT_DATE - 1;
```

### Step 5: Monitoring Setup (15 minutes)
**Risk**: None | **Rollback**: Not needed

#### 5.1 Create Health Check Dashboard
```sql
-- Create monitoring view
CREATE OR REPLACE VIEW pos.unified_health_dashboard AS
SELECT 
    'Unified Sales Health Check' as dashboard_title,
    pos.get_active_cutoff_date() as active_cutoff_date,
    
    -- Record counts by source
    (SELECT COUNT(*) FROM pos.lengolf_sales WHERE etl_source = 'legacy_pos') as legacy_pos_records,
    (SELECT COUNT(*) FROM pos.lengolf_sales WHERE etl_source = 'new_pos') as new_pos_records,
    (SELECT COUNT(*) FROM pos.lengolf_sales WHERE etl_source IS NULL) as untracked_records,
    (SELECT COUNT(*) FROM pos.lengolf_sales) as total_records,
    
    -- Latest data dates
    (SELECT MAX(date) FROM pos.lengolf_sales WHERE etl_source = 'legacy_pos') as legacy_pos_latest_date,
    (SELECT MAX(date) FROM pos.lengolf_sales WHERE etl_source = 'new_pos') as new_pos_latest_date,
    (SELECT MAX(etl_processed_at) FROM pos.lengolf_sales WHERE etl_source = 'new_pos') as last_new_pos_etl,
    
    -- Health indicators  
    CASE 
        WHEN (SELECT MAX(date) FROM pos.lengolf_sales WHERE etl_source = 'new_pos') >= CURRENT_DATE - 1
        THEN '✅ New POS Data Current'
        ELSE '⚠️ New POS Data Missing'
    END as new_pos_status,
    
    CASE 
        WHEN (SELECT MAX(etl_processed_at) FROM pos.lengolf_sales WHERE etl_source = 'new_pos') > now() - interval '2 hours'
        THEN '✅ ETL Current'
        ELSE '❌ ETL Stale'
    END as etl_status,
    
    -- Revenue comparison
    (SELECT SUM(sales_total) FROM pos.lengolf_sales WHERE etl_source = 'legacy_pos' AND date = CURRENT_DATE - 1) as yesterday_legacy_revenue,
    (SELECT SUM(sales_total) FROM pos.lengolf_sales WHERE etl_source = 'new_pos' AND date = CURRENT_DATE - 1) as yesterday_new_pos_revenue,
    
    now() as dashboard_timestamp;
```

#### 5.2 Daily Monitoring
```sql
-- Run daily health check
SELECT * FROM pos.unified_health_dashboard;

-- Alert conditions:
-- 1. untracked_records > 0 (data without source tracking)
-- 2. new_pos_status != '✅ New POS Data Current' (missing recent data)
-- 3. etl_status != '✅ ETL Current' (ETL not running)
```

---

## Cutoff Date Management

### Changing Cutoff Date
```sql
-- Example: Stop legacy POS from today (move cutoff to yesterday)
SELECT pos.update_cutoff_date(
    CURRENT_DATE - INTERVAL '1 day',
    'Stopped legacy POS operation - all data from new POS starting today'
);

-- The function automatically refreshes the data after updating cutoff
```

### Cutoff Date Effects
- **Data ≤ cutoff date**: Sourced from legacy POS (`etl_source = 'legacy_pos'`)
- **Data > cutoff date**: Sourced from new POS (`etl_source = 'new_pos'`)
- **Changing cutoff**: Automatically rebuilds entire `lengolf_sales` table with new logic

---

## Rollback Procedures

### Immediate Rollback (if issues detected)
```sql
-- 1. Restore original table
DROP TABLE pos.lengolf_sales CASCADE;
ALTER TABLE pos.lengolf_sales_backup RENAME TO pos.lengolf_sales;

-- 2. Revert cron job  
SELECT cron.alter_job(18, command := 'SELECT pos.sync_sales_data();');

-- 3. Clean up (optional)
DROP TABLE pos.lengolf_sales_old_pos_staging CASCADE;
DROP TABLE pos.lengolf_sales_new_pos_staging CASCADE;
DROP TABLE pos.migration_cutoff_config CASCADE;
```

**Rollback Time**: < 2 minutes

### Partial Rollback Options
```sql
-- Option 1: Keep enhanced table but revert ETL
SELECT cron.alter_job(18, command := 'SELECT pos.sync_sales_data();');

-- Option 2: Reset all data to legacy POS only  
SELECT pos.update_cutoff_date('2030-12-31', 'Rollback to legacy POS only');
```

---

## Performance Considerations

### Expected Performance Impact
- **Query Performance**: ~5% slower due to additional columns (negligible)
- **ETL Performance**: ~10% slower due to staging process (acceptable)
- **Storage**: ~15% increase due to tracking columns (manageable)

### Performance Optimizations
```sql
-- Update statistics after migration
ANALYZE pos.lengolf_sales;

-- Consider partitioning for large tables (optional)
-- Based on date ranges or etl_source
```

### Performance Monitoring
```sql
-- Compare query performance before/after
EXPLAIN (ANALYZE, BUFFERS) 
SELECT COUNT(*), SUM(sales_total) 
FROM pos.lengolf_sales 
WHERE date >= CURRENT_DATE - 30;

-- Monitor ETL execution time
SELECT 
    batch_id,
    process_type,
    start_time,
    end_time,
    end_time - start_time as duration,
    records_processed
FROM pos.sales_sync_logs
WHERE process_type = 'unified_sync'
ORDER BY start_time DESC
LIMIT 10;
```

---

## Migration Timeline

### Recommended Implementation
| Step | Duration | Description | Risk | Can Rollback |
|------|----------|-------------|------|--------------|
| 1 | 15 min | Backup and setup | Low | ✅ Easy |
| 2 | 30 min | Test new ETL | Medium | ✅ Restore backup |
| 3 | 20 min | Update cron jobs | Low | ✅ Revert job |
| 4 | 60 min | Validate applications | Low | ✅ Not needed |
| 5 | 15 min | Setup monitoring | None | ✅ Not needed |
| **Total** | **2.3 hours** | Complete migration | **Low** | **✅ Easy** |

### Maintenance Window Option
- **Duration**: 1 hour during off-hours
- **Downtime**: None (same table name)
- **Risk**: Very low
- **Rollback**: < 2 minutes if needed

---

## Success Criteria

### Technical Validation
- [ ] `pos.lengolf_sales` contains both legacy and new POS data
- [ ] Cutoff date logic working correctly
- [ ] ETL jobs running successfully with new function
- [ ] All applications working without changes
- [ ] Performance within acceptable ranges (≤115% of original)

### Business Validation  
- [ ] All reports showing correct data
- [ ] No gaps in transaction history
- [ ] Payment methods displaying correctly (no more Cartesian products)
- [ ] Finance team can identify data sources if needed
- [ ] Easy cutoff date management for future transitions

### Data Quality Checks
```sql
-- Validate no data loss
SELECT 
    'Data Validation' as check,
    (SELECT COUNT(*) FROM pos.lengolf_sales_backup) as original_count,
    (SELECT COUNT(*) FROM pos.lengolf_sales) as unified_count,
    (SELECT COUNT(*) FROM pos.lengolf_sales WHERE etl_source IS NULL) as untracked_count;

-- Validate revenue consistency  
SELECT 
    'Revenue Validation' as check,
    (SELECT SUM(sales_total) FROM pos.lengolf_sales_backup) as original_revenue,
    (SELECT SUM(sales_total) FROM pos.lengolf_sales) as unified_revenue,
    ABS((SELECT SUM(sales_total) FROM pos.lengolf_sales_backup) - 
        (SELECT SUM(sales_total) FROM pos.lengolf_sales)) as variance;
```

---

## Next Steps After Migration

### Immediate (First Week)
1. Monitor daily health dashboard
2. Validate critical business reports
3. Document any application-specific optimizations

### Short Term (First Month)  
1. Analyze data source distribution patterns
2. Optimize cutoff date based on actual usage
3. Train staff on new data source indicators

### Long Term (Ongoing)
1. Gradually transition cutoff date to stop legacy POS
2. Leverage new POS payment details for enhanced reporting
3. Use transaction references for detailed analytics

---

**Document Status**: Ready for Implementation  
**Risk Level**: Low  
**Estimated Downtime**: None  
**Application Changes Required**: Zero