# Database Functions and Automation

## Overview
This document covers all database functions, triggers, and scheduled jobs (pg_cron) that automate business processes and maintain data integrity.

## Database Functions by Schema

### Public Schema Functions (182 functions)

#### **Core Business Functions**

**Customer Management**:
- `create_customer_with_code()` - Creates customer with auto-generated code
- `search_customers()` - Advanced customer search with filters
- `search_customers_fuzzy()` - Fuzzy name matching for customer lookup
- `find_customers_by_fuzzy_name()` - Similarity-based customer search
- `normalize_phone_number(text)` - Standardizes phone numbers (last 9 digits)

**Booking & Availability**:
- `check_availability()` - Checks bay availability for specific time/date
- `check_all_bays_availability()` - Returns availability for all 3 standard bays
- `get_available_slots()` - Gets available time slots for a bay
- `get_available_slots_with_max_hours()` - Enhanced slot generation with timezone handling
- `get_busy_times_gcal_format()` - Google Calendar format busy times

**Package Management**:
- `get_user_packages()` - Gets packages for authenticated user
- `get_customer_packages()` - Gets packages for specific customer
- `get_active_packages_by_customer()` - Active packages only
- `get_all_packages_by_customer()` - All packages including expired

**Analytics & Reporting**:
- `get_dashboard_summary_enhanced()` - Main dashboard data with comparisons
- `get_dashboard_charts()` - Chart data for dashboard
- `get_customer_kpis()` - Customer KPI calculations
- `get_referral_distribution()` - Referral source analysis
- `get_monthly_referral_analytics_*()` - Monthly referral breakdowns
- `get_weekly_referral_analytics_*()` - Weekly referral trends

**Data Integration**:
- `automated_daily_sync()` - Triggers daily data synchronization
- `automated_sales_refresh()` - Refreshes sales data
- `sync_sales_data_with_customers()` - Links sales to customers
- `update_sales_customer_ids()` - Batch updates customer links
- `apply_product_mappings()` - Maps POS products to catalog

#### **ETL & Data Processing**

**Sales Data Pipeline**:
- `process_staging_batch()` - Processes CSV import batches
- `transform_sales_data()` - Transforms staging to final sales data
- `rebuild_all_sales_data()` - Full rebuild of sales data
- `truncate_sales_data_for_date_range()` - Cleanup functions

**Customer Matching**:
- `migrate_customers_batch()` - Batch customer migration
- `migrate_profiles_to_customers()` - Links profiles to customers
- `migrate_vip_data_to_customers()` - VIP data integration

**Cache Management**:
- `refresh_customer_kpis_cache()` - Refreshes KPI cache
- `get_customer_kpis_cached()` - Gets cached KPI data

**Analytics & Reporting**:
- `get_monthly_referral_analytics_view()` - Monthly referral analytics with data source tracking
- `get_monthly_referral_analytics_cutoff()` - Referral analytics with date cutoffs
- `get_combined_referral_data()` - Unified referral data across all sources
- `get_dashboard_summary_enhanced_with_time()` - Enhanced dashboard with time processing
- `get_dashboard_charts()` - Chart data for dashboard visualizations
- `get_dashboard_calculations_documentation()` - Documentation of dashboard calculations
- `get_customer_kpis()` - Customer analytics and metrics
- `get_latest_data_timestamp()` - Latest data timestamps across systems
- `get_dashboard_new_customers_for_month()` - New customer count for month

#### **System Utilities**

**HTTP Integration**:
- `http_post()`, `http_get()` - HTTP request functions
- `http_post_calendar_sync()` - Calendar API integration
- `trigger_calendar_sync()` - Triggers calendar synchronization

**Triggers**:
- `handle_new_user()` - Creates profile on user signup
- `handle_booking_cancellation()` - Processes booking cancellations
- `update_customer_lifetime_spending()` - Updates spending totals
- `set_normalized_phone()` - Auto-normalizes phone numbers

---

### Backoffice Schema Functions (27 functions)

#### **Package Management**

**Package Operations**:
- `get_available_packages()` - Lists available packages
- `get_customer_packages()` - Customer package details
- `get_customer_packages_by_id()` - Package lookup by customer ID
- `get_package_usage_history()` - Usage history for package
- `calculate_expiration_date()` - Calculates package expiry (multiple overloads)

**Package Analytics**:
- `get_package_monitor_data()` - Dashboard package monitoring
- `get_diamond_package_count()` - Count of diamond packages
- `get_expiring_package_count()` - Count of expiring packages
- `get_inactive_packages()` - Lists unused packages

#### **Staff Management**

**Coach Functions**:
- `get_coach_availability()` - Coach schedule availability
- `get_coach_monthly_earnings()` - Coach commission calculations

**Triggers**:
- `generate_customer_stable_hash_id()` - Creates unique customer hash
- `generate_package_stable_hash_id()` - Creates package hash
- `normalize_customer_name()` - Standardizes customer names
- `set_expiration_date()` - Auto-sets package expiration

---

### POS Schema Functions (35+ functions)

#### **Sales Data Processing**

**✅ Active ETL Functions (Post-Migration)**:
- `sync_unified_sales_incremental()` - **Primary incremental ETL function** (99.8% more efficient)
- `populate_new_pos_staging()` - New POS data processor (processes only new transactions)
- `populate_old_pos_staging()` - Legacy POS data processor (rarely used, legacy data frozen)
- `get_active_cutoff_date()` - Returns current cutoff date for data source separation
- `update_cutoff_date()` - Updates cutoff date and refreshes unified data
- `update_sales_customer_ids()` - Links sales to customers (still used for customer matching)

**❌ Deprecated ETL Functions (No Longer Used)**:
- ~~`sync_sales_data()`~~ - Replaced by `sync_unified_sales_incremental()`
- ~~`transform_sales_data()`~~ - Legacy staging transformation (replaced by direct processing)
- ~~`api_sync_sales_data()`~~ - Old API wrapper (no longer needed)

**Analytics**:
- `get_dashboard_summary_enhanced_mv()` - Dashboard data with materialized views
- `get_monthly_reports_mv()` - Monthly reporting data
- `get_weekly_reports_mv()` - Weekly reporting data
- `get_customer_matching_stats()` - Customer linking statistics

**Table Management**:
- `get_table_summary()` - Current table status
- `generate_receipt_number()` - Creates unique receipt numbers

**Materialized View Management**:
- `refresh_all_mv()` - Refreshes all materialized views
- `manual_refresh_mv()` - Manually refresh specific views

---

## Triggers

### Public Schema Triggers

| Table | Trigger | Function | Purpose |
|-------|---------|----------|---------|
| bookings | `availability_change_trigger` | `notify_availability_change()` | Notifies of booking changes |
| bookings | `on_booking_cancelled` | `handle_booking_cancellation()` | Processes cancellations |
| bookings | `trigger_check_new_customer` | `check_new_customer()` | Flags new customers |
| customers | `trigger_set_customer_code` | `set_customer_code()` | Auto-generates customer codes |
| customers | `trigger_set_normalized_phone` | `set_normalized_phone()` | Normalizes phone numbers |
| customers | `trigger_update_customers_updated_at` | `update_customers_updated_at()` | Updates timestamps |

### Backoffice Schema Triggers

| Table | Trigger | Function | Purpose |
|-------|---------|----------|---------|
| customers | `before_customers_insert_update` | `generate_customer_stable_hash_id()` | Creates stable hash IDs |
| packages | `tr_set_expiration_date` | `set_expiration_date()` | Auto-calculates expiry |
| packages | `normalize_customer_name_trigger` | `normalize_customer_name()` | Standardizes names |

### POS Schema Triggers

| Table | Trigger | Function | Purpose |
|-------|---------|----------|---------|
| lengolf_sales | `trigger_update_customer_lifetime_spending` | `update_customer_lifetime_spending()` | Updates customer totals |
| transaction_items | `trigger_update_transaction_items_updated_at` | `update_transaction_items_updated_at()` | Timestamp maintenance |

---

## Scheduled Jobs (pg_cron)

### Active Cron Jobs (Updated Post-Migration)

| Job ID | Schedule | Job Name | Description | Status |
|--------|----------|----------|-------------|--------|
| 2 | `*/5 * * * *` | check review requests | Process review notifications (every 5 min) | ✅ **Active** |
| 6 | `0 2 * * 1` | weekly-inventory-report | Weekly inventory reports (Monday 2 AM) | ✅ **Active** |
| 10 | `0 2 * * *` | daily-package-sync | Daily CRM package sync (2 AM daily) | ✅ **Active** |
| **15** | `0 * * * *` | ~~hourly-sales-sync~~ | ~~Hourly sales API sync~~ | ❌ **DISABLED** |
| 17 | `0 */2 * * *` | data-freshness-email-alerts | Data freshness monitoring (every 2 hours) | ✅ **Active** |
| **18** | `*/15 * * * *` | **incremental-sales-etl** | **Incremental ETL processing** | ✅ **UPDATED** |
| 19 | `*/15 * * * *` | calendar-sync-15min | Calendar synchronization (every 15 min) | ✅ **Active** |
| 20 | `3 * * * *` | hourly-mv-refresh | Materialized view refresh (hourly) | ✅ **Active** |
| 21 | `0 */6 * * *` | customer-kpi-cache-refresh | Customer KPI cache update (every 6 hours) | ✅ **Active** |
| 23 | `0 20 * * *` | competitor-sync | Competitor data scraping (8 PM daily) | ✅ **Active** |

#### **🔄 Recent Changes (August 2025)**
- **Job #15**: **DISABLED** - Legacy sales API scraping no longer needed (old POS data frozen)
- **Job #18**: **UPDATED** - Now runs `SELECT pos.sync_unified_sales_incremental();` every 15 minutes instead of hourly
- **Performance**: 99.8% reduction in processing overhead through incremental approach

### Job Categories

#### **High Frequency (Every 15 minutes or less)**
- **Calendar Sync** (15 min): Keeps availability up-to-date
- **Review Requests** (5 min): Timely customer follow-up

#### **High-Frequency Processing (Every 15 minutes)**
- **Incremental Sales ETL** (15 min): Process only new POS transactions (99.8% more efficient)
- **Calendar Sync** (15 min): Keeps availability up-to-date

#### **Hourly Processing**
- ~~**Sales Sync** (hourly): External POS data import~~ **[DISABLED]**
- **Materialized Views** (hourly): Refresh analytics data

#### **Daily Operations**  
- **Package Sync** (2 AM): CRM package data synchronization
- **Competitor Sync** (8 PM): Social media competitor analysis

#### **Weekly Reports**
- **Inventory Report** (Monday 2 AM): Weekly inventory summary

#### **Monitoring**
- **Data Freshness** (every 2 hours): Alerts for stale data
- **KPI Cache** (every 6 hours): Performance optimization

---

## Function Dependencies

### Critical Function Chains

#### **Customer Data Flow**
```
normalize_phone_number() → set_normalized_phone() → search_customers() → customer matching
```

#### **Sales Processing Pipeline (Updated)**

**🔄 New Incremental Pipeline (Post-Migration)**:
```
New POS Transaction → sync_unified_sales_incremental() → populate_new_pos_staging() → pos.lengolf_sales (unified)
```

**❄️ Legacy Data Pipeline (Frozen)**:
```
Legacy Data (≤ Aug 11, 2025) → [FROZEN - Never Reprocessed] → pos.lengolf_sales (preserved)
```

**🔗 Customer Linking Pipeline (Still Active)**:
```
Unified Sales Data → update_sales_customer_ids() → customer matching
```

#### **Package Lifecycle**
```
Package Purchase → calculate_expiration_date() → set_expiration_date() → get_customer_packages()
```

#### **Dashboard Data Flow**
```
Sales Data → get_dashboard_summary_enhanced() → get_dashboard_charts() → frontend display
```

### Function Performance Notes

#### **High-Impact Functions** (called frequently)
- `check_availability()` - Called on every booking attempt
- `normalize_phone_number()` - Called on every phone input
- `get_dashboard_summary_enhanced()` - Called for dashboard loads
- `sync_unified_sales_incremental()` - **Called every 15 minutes** (replaces hourly batch processing)
- `get_active_cutoff_date()` - Called by all ETL functions for data source determination

#### **Batch Processing Functions** (handle large datasets)
- `update_sales_customer_ids()` - Processes thousands of records
- `migrate_customers_batch()` - Batch customer operations
- ~~`transform_sales_data()`~~ - **Deprecated** (replaced by incremental processing)
- `populate_new_pos_staging()` - **Incremental processing** (processes 20-100 records vs thousands)
- `sync_unified_sales_incremental()` - **Smart batch processing** (skips legacy data, 99.8% more efficient)

#### **Cache-Enabled Functions**
- `get_customer_kpis_cached()` - Uses materialized cache
- `refresh_customer_kpis_cache()` - Updates cache data

---

## Error Handling & Monitoring

### Function Error Patterns

**Common Failure Points**:
1. **HTTP Functions**: Network timeouts, API rate limits
2. **ETL Functions**: Data format changes, constraint violations
3. **Customer Matching**: Phone number format variations

**Monitoring Functions**:
- `check_sales_sync_status()` - Monitors sync job health
- `get_latest_data_timestamp()` - Checks data freshness
- `get_customer_matching_stats()` - Customer linking success rates

### Debugging Tools

**Status Check Functions**:
- `check_cron_job()` - Cron job status
- `check_async_request_status()` - HTTP request status
- `get_product_mapping_stats()` - Product mapping completeness

---

## Maintenance & Optimization

### Regular Maintenance Tasks

**Daily**:
- Monitor cron job execution logs
- Check ETL function success rates
- Validate customer matching accuracy

**Weekly**:
- Review function performance metrics
- Update product mappings for new POS items
- Clean up old staging data

**Monthly**:
- Analyze function usage patterns
- Optimize slow-performing functions
- Review and update cron schedules

### Performance Optimization

**Function Optimization Strategies**:
1. **Batch Processing**: Use batch sizes for large operations
2. **Caching**: Leverage materialized views and cache functions
3. **Indexing**: Ensure proper indexes for function queries
4. **Async Processing**: Use HTTP functions for external API calls

**Resource Management**:
- Stagger cron jobs to avoid resource conflicts
- Use timeouts for HTTP functions
- Implement retry logic for critical functions

---

This comprehensive automation layer ensures data consistency, automates business processes, and maintains system performance across the entire Lengolf Forms ecosystem.