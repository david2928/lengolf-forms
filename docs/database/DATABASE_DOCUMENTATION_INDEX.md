# 🗄️ Database Documentation Index

## Overview
This directory contains comprehensive documentation for the Lengolf Forms database, covering all schemas, tables, relationships, and dependencies. The database uses PostgreSQL 15+ hosted on Supabase with multi-schema organization for operational efficiency.

## 📁 Documentation Structure

### Active Documentation
Current, maintained documentation reflecting the live database state:

### 📋 **[DATABASE_CLEANUP_OPPORTUNITIES.md](./DATABASE_CLEANUP_OPPORTUNITIES.md)** - **NEW**
**Action Required** - Comprehensive cleanup plan for 12+ unused tables and 15MB+ storage optimization.

**Key Findings**:
- 12 unused public schema tables (safe to drop)
- 76K+ historical POS backup records (archive candidates)
- Multiple empty migration tables (immediate cleanup)
- Performance optimization opportunities

**Estimated Impact**: 15MB+ storage savings, improved query performance, simplified maintenance

### Archived Documentation 
📂 **[archived/](./archived/)** - Legacy and migration documents:
- `LEGACY_DATABASE_SCHEMA.md` - Original schema documentation (superseded)
- `APPLICATION_CODE_UPDATES_NEEDED.md` - Completed migration guide (archived)

## 📊 Schema Documentation

**Quick Reference**: 4 schemas, 102 tables, 245+ functions, 10+ scheduled jobs

### 1. [Database Overview and Relationships](./DATABASE_OVERVIEW_AND_RELATIONSHIPS.md)
**Start here** - High-level architecture, cross-schema relationships, and integration points.

**Contents**:
- Schema architecture overview
- Cross-schema relationship diagrams
- Key integration points
- Data flow sequences
- Performance considerations

---

### 2. [Public Schema Documentation](./PUBLIC_SCHEMA_DOCUMENTATION.md)
Core application tables for bookings, customers, and user-facing features.

**Status**: **Mixed** - 10 active tables, 12 cleanup candidates

**🔥 Highly Active Tables**:
- `customers` - **26.9M+ operations** - Core business entity
- `processed_leads` - **7.2K operations** - Active lead management

**✅ Active Tables**:
- `bookings` - Customer bookings and reservations
- `profiles` - User authentication profiles  
- `crm_packages` - Customer package holdings
- `cash_checks` - Staff cash recording system
- `lead_feedback` - B2C lead management
- `coach_weekly_schedules` - Coach availability

**❌ Cleanup Candidates (12 tables)**:
- VIP system tables (never implemented)
- CRM integration tables (abandoned)
- Migration logs (completed)
- Unused features (bay cache, ads spend, tournaments)

**Usage**: Customer-facing features, booking system, staff operations

---

### 3. [Backoffice Schema Documentation](./BACKOFFICE_SCHEMA_DOCUMENTATION.md)  
Administrative and operational tables for staff, payroll, and business management.

**Status**: **EXCELLENT** - All 22 tables active and well-utilized

**🔥 Highly Active Tables**:
- `staff` - Daily time-clock operations, PIN validations
- `packages` - Package creation, usage tracking, expiration monitoring
- `package_usage` - High-volume usage tracking with signatures
- `time_entries` - Multiple daily entries per staff member
- `audit_logs` - Comprehensive admin action logging

**✅ All Tables Active**:
- Complete staff management system
- Full package lifecycle tracking
- Comprehensive financial management
- Real-time payroll calculations
- Complete audit trail

**Usage**: Admin operations, staff management, payroll, financial tracking

---

### 4. [POS Schema Documentation](./POS_SCHEMA_DOCUMENTATION.md)
Point of sale transactions, table management, and sales analytics.

**Status**: **High Activity** with significant cleanup opportunities

**🔥 Massively Active Tables**:
- `lengolf_sales` - **1.2M+ records** - Largest table in database
- `orders` - **13K+ records** - High-volume F&B operations  
- `transactions` - **48K+ records** - Major transaction volume

**✅ Active Operational Tables**:
- `table_sessions` - Live table operations
- `order_items` - Line item management
- `transaction_items` - Transaction details
- `zones` & `tables` - Table management
- ETL pipeline tables (staging, mappings, sync logs)

**⚠️ Archive Candidates**:
- `lengolf_sales_backup_pre_bigquery_fix` - **62,511 records, ~13MB**
- `lengolf_sales_backup` - **13,400 records, ~2.7MB**

**❌ Empty Migration Tables (8 tables)**: All safe to drop

**Usage**: POS system integration, sales analytics, table management

---

### 5. [Auth Schema Documentation](./AUTH_SCHEMA_DOCUMENTATION.md)
Supabase-managed authentication tables (reference only).

**Status**: **EXCELLENT** - Comprehensive security with full feature utilization

**🔥 Highly Active Tables**:
- `users` - Core authentication system
- `sessions` - Continuous session validation
- `identities` - OAuth provider linking (Google, LINE)
- `audit_log_entries` - Complete auth audit trail

**✅ Active Security Features**:
- MFA support (`mfa_factors`, `mfa_challenges`, `mfa_amr_claims`)
- JWT token management (`refresh_tokens`, `one_time_tokens`)
- OAuth PKCE flow (`flow_state`)

**⚠️ Enterprise Features Available**:
- SSO/SAML tables (minimal current usage)
- Available for future enterprise needs

**Security Status**: Comprehensive audit trail, MFA support, OAuth integration

**Usage**: User authentication, session management, security

---

### 6. [Database Functions and Automation](./DATABASE_FUNCTIONS_AND_AUTOMATION.md)
Comprehensive coverage of database functions, triggers, and scheduled jobs.

**Key Content**:
- **Functions**: 100+ custom functions across all schemas
- **Triggers**: Automated data processing and integrity
- **Cron Jobs**: 10 scheduled jobs for data sync and monitoring
- **ETL Pipeline**: Sales data processing and customer linking
- **Analytics Functions**: Dashboard and reporting calculations

**Usage**: System automation, data processing, scheduled maintenance

---

### 7. [POS Core Tables Documentation](./POS_CORE_TABLES_DOCUMENTATION.md)
Legacy POS system transition documentation (AS-IS state).

**Focus**: Migration from old POS staging to normalized POS tables

---

## Quick Reference

### Schema Summary
| Schema | Purpose | Tables | Functions | Status | Activity Level | Cleanup Opportunities |
|--------|---------|--------|-----------|--------|----------------|----------------------|
| `public` | Core application data | 35 | 182 | Mixed | 2 highly active, 8 active, 12 unused | 12 tables for cleanup |
| `backoffice` | Administrative operations | 22 | 27 | Excellent | All 22 tables active | No cleanup needed |
| `pos` | Point of sale system | 29 | 32 | High activity | 15 active, 14 archive/cleanup | 15MB+ storage savings |
| `auth` | Authentication (Supabase) | 16 | 4 | Excellent | 9 active, 7 enterprise features | Fully utilized |

### Critical Relationships
- `auth.users.id` ↔ `public.profiles.id` (1:1)
- `public.customers.id` ← `pos.lengolf_sales.customer_id` (1:many)
- `backoffice.packages.customer_id` → `public.customers.id` (many:1)
- `pos.table_sessions.id` ← `pos.orders.table_session_id` (1:many)

### Data Flow Patterns
1. **Authentication**: auth → public.profiles → application features
2. **Customer Journey**: booking → customer record → package purchase → usage tracking
3. **POS Integration**: External POS → CSV import → pos.lengolf_sales
4. **Table Management**: zone → table → session → orders → transactions

## Common Use Cases

### Customer Analytics
```sql
-- Customer with purchase history across all systems
SELECT c.customer_name, c.total_lifetime_value,
       COUNT(b.id) as total_bookings,
       COUNT(p.id) as active_packages,
       SUM(ls.sales_net) as pos_spending
FROM public.customers c
LEFT JOIN public.bookings b ON c.id = b.customer_id
LEFT JOIN backoffice.packages p ON c.id = p.customer_id AND p.expiration_date > CURRENT_DATE
LEFT JOIN pos.lengolf_sales ls ON c.id = ls.customer_id
GROUP BY c.id;
```

### Daily Sales Summary
```sql
-- Revenue across all systems for a date
SELECT 
    COALESCE(SUM(ls.sales_net), 0) as pos_revenue,
    COALESCE(SUM(t.total_amount), 0) as internal_pos_revenue,
    COUNT(DISTINCT b.id) as bookings_count
FROM pos.lengolf_sales ls
FULL OUTER JOIN pos.transactions t ON DATE(ls.date) = DATE(t.transaction_date)
FULL OUTER JOIN public.bookings b ON DATE(ls.date) = b.date
WHERE DATE(COALESCE(ls.date, t.transaction_date, b.date)) = CURRENT_DATE;
```

### Package Usage Tracking  
```sql
-- Active packages with usage
SELECT p.customer_name, pt.display_name,
       pt.hours as total_hours,
       COALESCE(SUM(pu.used_hours), 0) as used_hours,
       pt.hours - COALESCE(SUM(pu.used_hours), 0) as remaining_hours,
       p.expiration_date
FROM backoffice.packages p
JOIN backoffice.package_types pt ON p.package_type_id = pt.id
LEFT JOIN backoffice.package_usage pu ON p.id = pu.package_id
WHERE p.expiration_date > CURRENT_DATE
GROUP BY p.id, pt.display_name, pt.hours;
```

## Development Guidelines

### Schema Modification Rules
1. **auth**: Never modify - managed by Supabase
2. **public**: Core application - require careful migration planning
3. **backoffice**: Admin features - coordinate with staff workflows
4. **pos**: External integration - maintain import compatibility

### Cross-Schema Query Best Practices
1. Use materialized views for complex cross-schema analytics
2. Index foreign key columns for performance
3. Avoid deep joins across schemas in high-frequency queries
4. Consider denormalization for reporting tables

### Data Integrity Guidelines
1. Maintain referential integrity within schemas
2. Use soft references (no FK) for cross-schema links
3. Implement application-level consistency checks
4. Regular reconciliation between related tables

## Automation & Monitoring

### Active Cron Jobs (10 total)
- **Every 5 min**: Review request processing
- **Every 15 min**: Calendar synchronization  
- **Hourly**: Sales sync, ETL, materialized view refresh
- **Daily**: Package sync (2 AM), competitor scraping (8 PM)
- **Weekly**: Inventory reports (Monday 2 AM)

### Key Functions by Type
- **Analytics**: `get_dashboard_summary_enhanced()`, `get_referral_distribution()`
- **ETL**: `sync_sales_data()`, `transform_sales_data()`, `update_sales_customer_ids()`
- **Customer**: `normalize_phone_number()`, `search_customers()`, `create_customer_with_code()`
- **Packages**: `calculate_expiration_date()`, `get_customer_packages()`

## Maintenance Tasks

### Daily
- Monitor cron job execution and ETL success rates
- Check for unlinked customer transactions
- Validate package expiration calculations
- Review function performance metrics

### Weekly  
- Reconcile sales data across systems
- Review and resolve customer duplicates
- Clean up expired sessions and tokens
- Update product mappings for new POS items

### Monthly
- Archive old audit logs and transaction history
- Update customer analytics and metrics
- Review and optimize slow-performing queries
- Analyze function usage patterns and optimize

## 🔧 Database Management

### Migration Files
📂 **[migrations/](./migrations/)** - SQL migration scripts:
- `01_normalize_pos_tables_phase1.sql` - POS table normalization (Phase 1)
- `02_normalize_pos_tables_phase2.sql` - POS relationships (Phase 2) 
- `03_normalize_pos_tables_phase3.sql` - Data migration (Phase 3)
- `04_normalize_pos_tables_phase4.sql` - Cleanup (Phase 4)
- `clean_pos_normalization.sql` - Cleanup utilities

### Best Practices
1. **Schema Changes**: Always update relevant documentation files
2. **Cross-Schema Queries**: Use indexed foreign keys and avoid deep joins
3. **Data Integrity**: Implement application-level consistency checks
4. **Performance**: Monitor function execution and optimize slow queries

---

## 📈 Database Statistics & Analysis

### Current State (2025-01-08)
- **Total Tables**: 102 (35 public, 22 backoffice, 29 pos, 16 auth)
- **Database Functions**: 245+ (182 public, 27 backoffice, 32 pos, 4 auth)
- **Scheduled Jobs**: 10+ (ETL, sync, monitoring, calendar, package sync)
- **Daily Transactions**: 1000+ (bookings + POS + coaching)
- **Data Volume**: 1.2M+ POS records, 26.9M+ customer operations

### Activity Analysis
- **🔥 Highly Active**: 9 tables with massive daily operations
- **✅ Active**: 54 tables with regular operational use
- **⚠️ Archive Candidates**: 6 large backup tables (76K+ records)
- **❌ Unused**: 20+ tables with zero activity (safe cleanup)

### Cleanup Opportunities
- **Storage Optimization**: 15MB+ potential savings from backup tables
- **Table Reduction**: 20+ unused tables identified for removal
- **Performance**: Customer table needs optimization (26.9M+ operations)
- **Implementation Status**: 5-week phased cleanup plan ready

### New Features (Recently Added)
- **Cash Checks**: Staff cash recording system
- **Lead Feedback**: B2C lead management workflow
- **Coach Schedules**: Weekly availability patterns
- **System Logs**: Centralized application logging
- **Translation System**: i18n infrastructure (unused)

---

## 🚨 Action Items

### Immediate (Week 1)
- [ ] Review DATABASE_CLEANUP_OPPORTUNITIES.md
- [ ] Execute cleanup verification queries
- [ ] Create full database backup before cleanup
- [ ] Begin Phase 1: Empty table cleanup

### Short-term (Month 1)
- [ ] Implement customer table performance optimization
- [ ] Archive large POS backup tables
- [ ] Execute unused table cleanup plan
- [ ] Monitor performance improvements

### Ongoing
- [ ] Monthly cleanup opportunity assessment
- [ ] Quarterly performance optimization review
- [ ] Maintain activity monitoring

**📝 Maintenance Note**: This documentation is maintained alongside code changes. When modifying database schema, please update the relevant documentation files and notify the development team.

**🔗 Related Documentation**:
- [DATABASE_CLEANUP_OPPORTUNITIES.md](./DATABASE_CLEANUP_OPPORTUNITIES.md) - **Action required** cleanup plan
- [API Reference](../api/API_REFERENCE.md) - Database integration patterns
- [Backend Documentation](../BACKEND_DOCUMENTATION.md) - Application data layer
- [Technical Documentation](../technical/) - System architecture

**📊 Analysis Methodology**: This comprehensive analysis used pg_stat_user_tables for activity metrics, code analysis for feature usage, and storage analysis for optimization opportunities. All findings verified against live production data as of 2025-01-08.