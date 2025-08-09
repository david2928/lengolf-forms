# POS System Migration: Minimal Impact Plan
**Created**: August 9, 2025  
**Objective**: Migrate to 3-table architecture with zero downstream disruption  
**Strategy**: Create parallel infrastructure, seamless switchover, maintain backward compatibility

## Executive Summary

This migration plan implements a **3-table architecture** that separates legacy POS (`lengolf_sales_old_pos`) and new POS (`lengolf_sales_new_pos`) data sources while maintaining a unified interface (`lengolf_sales_unified`). The key innovation is creating a backward-compatible view that ensures **zero changes required** in downstream applications.

### Key Benefits
- ✅ **Zero Downtime**: Applications continue working throughout migration
- ✅ **Zero Code Changes**: Existing queries work unchanged  
- ✅ **Easy Cutoff Management**: Change cutoff date with single function call
- ✅ **Enhanced Tracking**: Full audit trail of data sources
- ✅ **Future-Proof**: Extensible architecture for additional POS systems

---

## Architecture Overview

### Current Architecture (Before Migration)
```
External POS API → pos.lengolf_sales_staging → pos.lengolf_sales ← Applications
                                    ↑
                              [pg_cron ETL Jobs]
```

### Target Architecture (After Migration)
```
Legacy POS API → pos.lengolf_sales_staging → pos.lengolf_sales_old_pos ←┐
                           ↑                                             │
                    [Updated ETL Jobs]                                   │
                                                                         │
New POS System → pos.transactions → pos.lengolf_sales_new_pos ←─────────┤
                       ↑                                                 │
               [New ETL Functions]                                       │
                                                                         │
                        pos.lengolf_sales_unified ←─────────────────────┤
                                   ↓                                     │
                        pos.lengolf_sales (VIEW) ←───────────────────────┘
                                   ↓
                            Applications (UNCHANGED)
```

---

## Implementation Plan

### Phase 1: Infrastructure Setup (30 minutes)
**Risk Level**: Low | **Downtime**: None | **Rollback**: Easy

#### 1.1 Create New Tables and Functions
```bash
# Execute complete setup script
psql -d your_database -f POS_MIGRATION_STEP_BY_STEP.sql
```

**What gets created**:
- `pos.lengolf_sales_old_pos` (legacy data storage)
- `pos.lengolf_sales_new_pos` (new POS data storage)  
- `pos.lengolf_sales_unified` (materialized view combining both)
- `pos.migration_cutoff_config` (cutoff date management)
- ETL functions: `pos.sync_all_sales_data()`, `pos.populate_new_pos_sales()`
- Helper functions: `pos.get_active_cutoff_date()`, `pos.refresh_unified_sales()`

#### 1.2 Validate Setup
```sql
-- Check all tables created successfully
SELECT 
    'Tables Created Successfully' as status,
    (SELECT COUNT(*) FROM pos.lengolf_sales_old_pos) as old_pos_records,
    (SELECT COUNT(*) FROM pos.lengolf_sales_new_pos) as new_pos_records,
    (SELECT COUNT(*) FROM pos.lengolf_sales_unified) as unified_records,
    pos.get_active_cutoff_date() as active_cutoff_date;
```

**Success Criteria**:
- All tables exist and are populated
- `old_pos_records` = existing `lengolf_sales` count
- `new_pos_records` > 0 (if new POS data exists after cutoff)
- `unified_records` = `old_pos_records` + `new_pos_records`

**Rollback** (if needed):
```sql
-- Clean up new objects
DROP TABLE IF EXISTS pos.lengolf_sales_old_pos CASCADE;
DROP TABLE IF EXISTS pos.lengolf_sales_new_pos CASCADE;
DROP MATERIALIZED VIEW IF EXISTS pos.lengolf_sales_unified CASCADE;
DROP TABLE IF EXISTS pos.migration_cutoff_config CASCADE;
```

---

### Phase 2: ETL Integration Testing (1 hour)
**Risk Level**: Medium | **Downtime**: None | **Rollback**: Moderate

#### 2.1 Test New ETL Function
```sql
-- Test the unified ETL function manually
SELECT pos.sync_all_sales_data();
```

**Expected Result**:
```json
{
  "success": true,
  "batch_id": "uuid-generated", 
  "legacy_pos_processed": 0,    -- No new staging data expected
  "new_pos_processed": X,       -- Number of new transactions since cutoff
  "unified_view_refreshed": true,
  "active_cutoff_date": "2025-08-08"
}
```

#### 2.2 Parallel ETL Testing (Safe Approach)
```sql
-- Create test cron job (runs alongside existing job)
SELECT cron.schedule(
    'test-unified-etl',        
    '5 * * * *',               -- 5 minutes past hour (different from existing)
    'SELECT pos.sync_all_sales_data();'
);
```

**Monitor for 2-4 hours**:
- Check `pos.sales_sync_logs` for successful execution
- Compare data consistency between old and new approaches
- Verify performance metrics

#### 2.3 Switch ETL Jobs
```sql
-- Update existing job to use new function  
SELECT cron.alter_job(
    18,                               -- Job ID for 'hourly-sales-etl'
    command := 'SELECT pos.sync_all_sales_data();'
);

-- Remove test job
SELECT cron.unschedule('test-unified-etl');
```

**Rollback** (if issues):
```sql
-- Revert to original function
SELECT cron.alter_job(
    18,
    command := 'SELECT pos.sync_sales_data();'
);
```

---

### Phase 3: Application Integration (30 minutes) 
**Risk Level**: Low | **Downtime**: ~2 minutes | **Rollback**: Immediate

#### 3.1 Rename Original Table (Backup)
```sql
-- Rename original table as backup
ALTER TABLE pos.lengolf_sales RENAME TO pos.lengolf_sales_original;
```

#### 3.2 Create Backward-Compatible View
```sql
-- Create view with same name as original table
CREATE VIEW pos.lengolf_sales AS 
SELECT 
    -- All original columns (maintains 100% compatibility)
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
GRANT ALL ON pos.lengolf_sales TO service_role;
```

#### 3.3 Immediate Validation
```sql
-- Test critical application queries
SELECT COUNT(*) FROM pos.lengolf_sales;                    -- Should match previous count
SELECT COUNT(*) FROM pos.lengolf_sales WHERE date = CURRENT_DATE - 1;  -- Should include latest data
SELECT DISTINCT payment_method FROM pos.lengolf_sales WHERE date >= CURRENT_DATE - 7;  -- Check payment methods

-- Test specific dashboard queries (customize based on your applications)
SELECT 
    date,
    COUNT(DISTINCT receipt_number) as transactions,
    SUM(sales_total) as revenue
FROM pos.lengolf_sales 
WHERE date >= CURRENT_DATE - 7
GROUP BY date
ORDER BY date;
```

**Rollback** (immediate if issues):
```sql
-- Drop view and restore original table
DROP VIEW pos.lengolf_sales;
ALTER TABLE pos.lengolf_sales_original RENAME TO pos.lengolf_sales;
```

---

### Phase 4: Validation and Monitoring (2 hours)
**Risk Level**: Low | **Downtime**: None | **Rollback**: Not needed

#### 4.1 Data Integrity Validation
```sql
-- Compare record counts (should match)
WITH comparison AS (
    SELECT 
        'Original Table' as source,
        COUNT(*) as records,
        SUM(sales_total) as revenue,
        COUNT(DISTINCT receipt_number) as transactions
    FROM pos.lengolf_sales_original
    WHERE date >= '2024-01-01'  -- Reasonable date range
    
    UNION ALL
    
    SELECT 
        'Unified View' as source,
        COUNT(*) as records,
        SUM(sales_total) as revenue,  
        COUNT(DISTINCT receipt_number) as transactions
    FROM pos.lengolf_sales
    WHERE date >= '2024-01-01'
)
SELECT 
    *,
    CASE 
        WHEN records = LAG(records) OVER (ORDER BY source) THEN '✅ Match'
        ELSE '❌ Mismatch'
    END as validation_status
FROM comparison;
```

#### 4.2 Performance Testing
```sql
-- Test key queries used by applications
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    date_trunc('month', date) as month,
    SUM(sales_total) as monthly_revenue
FROM pos.lengolf_sales 
WHERE date >= CURRENT_DATE - 365
GROUP BY date_trunc('month', date)
ORDER BY month;

-- Compare with original table performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    date_trunc('month', date) as month,
    SUM(sales_total) as monthly_revenue
FROM pos.lengolf_sales_original
WHERE date >= CURRENT_DATE - 365
GROUP BY date_trunc('month', date)
ORDER BY month;
```

#### 4.3 Set Up Monitoring
```sql
-- Create comprehensive health check
CREATE OR REPLACE VIEW pos.migration_health_dashboard AS
SELECT 
    'Migration Health Dashboard' as title,
    pos.get_active_cutoff_date() as cutoff_date,
    
    -- Record counts
    (SELECT COUNT(*) FROM pos.lengolf_sales_old_pos) as old_pos_records,
    (SELECT COUNT(*) FROM pos.lengolf_sales_new_pos) as new_pos_records,
    (SELECT COUNT(*) FROM pos.lengolf_sales_unified) as unified_total,
    (SELECT COUNT(*) FROM pos.lengolf_sales) as application_view_total,
    
    -- Latest data timestamps  
    (SELECT MAX(date) FROM pos.lengolf_sales_old_pos) as old_pos_latest_date,
    (SELECT MAX(date) FROM pos.lengolf_sales_new_pos) as new_pos_latest_date,
    (SELECT MAX(etl_processed_at) FROM pos.lengolf_sales_new_pos) as last_etl_run,
    
    -- Data source breakdown
    (SELECT COUNT(*) FROM pos.lengolf_sales_unified WHERE etl_source = 'legacy_pos') as legacy_count,
    (SELECT COUNT(*) FROM pos.lengolf_sales_unified WHERE etl_source = 'new_pos') as new_pos_count,
    
    -- Health indicators
    CASE 
        WHEN (SELECT MAX(date) FROM pos.lengolf_sales_new_pos) = CURRENT_DATE - 1
        THEN '✅ New POS Data Current'
        WHEN (SELECT MAX(date) FROM pos.lengolf_sales_new_pos) < CURRENT_DATE - 1  
        THEN '⚠️ New POS Data Stale'
        ELSE '❓ Check New POS Data'
    END as new_pos_status,
    
    CASE 
        WHEN (SELECT MAX(etl_processed_at) FROM pos.lengolf_sales_new_pos) > now() - interval '2 hours'
        THEN '✅ ETL Running'
        ELSE '❌ ETL Stale'
    END as etl_status,
    
    now() as dashboard_generated_at;
```

**Daily Monitoring Query**:
```sql
-- Run this daily to monitor health
SELECT * FROM pos.migration_health_dashboard;
```

---

### Phase 5: Cleanup and Optimization (30 minutes)
**Risk Level**: Low | **Downtime**: None | **Rollback**: Optional

#### 5.1 Performance Optimization
```sql
-- Refresh materialized view to ensure latest data
SELECT pos.refresh_unified_sales();

-- Update table statistics
ANALYZE pos.lengolf_sales_old_pos;
ANALYZE pos.lengolf_sales_new_pos;
ANALYZE pos.lengolf_sales_unified;
```

#### 5.2 Documentation Update
- Update internal documentation with new table structure
- Document cutoff date change procedures
- Update application documentation (optional - no code changes needed)

#### 5.3 Optional Cleanup (after 30 days)
```sql
-- After migration is stable, optionally remove original table
-- CAUTION: Only do this after thorough validation
-- DROP TABLE pos.lengolf_sales_original;
```

---

## Cutoff Date Management

### Changing the Cutoff Date
```sql
-- Update cutoff date (e.g., to stop legacy POS from tomorrow)
SELECT pos.update_cutoff_date(
    CURRENT_DATE,  -- New cutoff date
    'Stopping legacy POS operation - switch to new POS from tomorrow'
);

-- Refresh unified view to apply new cutoff
SELECT pos.refresh_unified_sales();
```

### Automated Cutoff Updates
```sql
-- Schedule automatic cutoff date advancement (optional)
SELECT cron.schedule(
    'advance-cutoff-weekly',
    '0 2 * * 1',  -- Every Monday at 2 AM
    $$
    SELECT pos.update_cutoff_date(
        CURRENT_DATE - INTERVAL '1 day',
        'Weekly cutoff advancement - automated'
    );
    SELECT pos.refresh_unified_sales();
    $$
);
```

---

## Emergency Procedures

### Rollback Decision Matrix

| Issue | Severity | Rollback Action | Time to Rollback |
|-------|----------|----------------|------------------|
| Data missing in view | High | Immediate view rollback | 30 seconds |
| ETL job failing | Medium | Revert ETL function | 2 minutes |
| Performance issues | Medium | Analyze and optimize | 1 hour |
| Incorrect cutoff logic | Low | Fix cutoff function | 30 minutes |

### Complete Emergency Rollback
```sql
-- 1. Revert application view (immediate)
DROP VIEW pos.lengolf_sales CASCADE;
ALTER TABLE pos.lengolf_sales_original RENAME TO pos.lengolf_sales;

-- 2. Revert ETL jobs
SELECT cron.alter_job(18, command := 'SELECT pos.sync_sales_data();');

-- 3. Clean up (optional)
DROP TABLE pos.lengolf_sales_old_pos CASCADE;
DROP TABLE pos.lengolf_sales_new_pos CASCADE; 
DROP MATERIALIZED VIEW pos.lengolf_sales_unified CASCADE;
```

---

## Success Metrics

### Technical Success Criteria
- [ ] Zero data loss during migration
- [ ] All applications continue functioning without changes
- [ ] ETL jobs running successfully with new architecture  
- [ ] Query performance maintained or improved
- [ ] Cutoff date management working correctly
- [ ] New POS data flowing into unified view

### Business Success Criteria
- [ ] No disruption to daily operations
- [ ] All reports and dashboards showing correct data
- [ ] Finance team can access both legacy and new POS data
- [ ] Easy transition to new POS system when ready
- [ ] Complete audit trail of data sources

### Performance Benchmarks
- Query response time: ≤ 110% of original performance
- ETL processing time: ≤ 120% of original processing time  
- View refresh time: ≤ 30 seconds for typical daily data
- Dashboard load time: No noticeable change to end users

---

## Post-Migration Benefits

### Immediate Benefits
1. **Clean Data Separation**: Legacy vs new POS data clearly separated
2. **Enhanced Tracking**: Full audit trail of data sources and ETL batches
3. **Flexible Cutoff Management**: Easy to adjust transition dates
4. **Zero Application Impact**: Existing applications work unchanged
5. **Payment Method Details**: Rich payment information from new POS

### Long-Term Benefits  
1. **Easy POS Migration**: Simple cutoff date changes to transition systems
2. **Better Data Quality**: Separate ETL logic optimized for each POS system
3. **Enhanced Analytics**: Compare legacy vs new POS system performance
4. **Future-Proof**: Architecture supports additional POS systems
5. **Simplified Maintenance**: Clear separation of concerns

---

## Migration Schedule Template

### Option A: Conservative (Recommended)
| Day | Activity | Duration | Notes |
|-----|----------|----------|-------|
| Day 1 | Phase 1: Setup infrastructure | 30 min | Low risk |
| Day 2-3 | Phase 2: Test ETL integration | 2 hours | Monitor results |
| Day 4 | Phase 3: Switch application view | 30 min | Quick rollback available |
| Day 5-6 | Phase 4: Validation and monitoring | 4 hours | Spread over 2 days |
| Day 7 | Phase 5: Cleanup and docs | 30 min | Optional optimizations |

### Option B: Aggressive (Maintenance Window)
| Time | Activity | Duration | Notes |
|------|----------|----------|-------|
| 02:00 | Phase 1: Setup | 30 min | Off-hours |
| 02:30 | Phase 2: ETL testing | 1 hour | Accelerated testing |
| 03:30 | Phase 3: View switch | 30 min | Applications switch over |
| 04:00 | Phase 4: Validation | 1 hour | Critical tests |
| 05:00 | Complete | - | Resume normal operations |

---

**Document Version**: 1.0  
**Created**: August 9, 2025  
**Total Estimated Time**: 4.5 hours (Conservative) | 3 hours (Aggressive)  
**Risk Level**: Low  
**Rollback Complexity**: Simple