# Database Documentation Index

## Overview
This directory contains comprehensive documentation for the Lengolf Forms database, covering all schemas, tables, relationships, and dependencies.

## Documentation Files

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

**Key Tables**:
- `bookings` - Customer bookings and reservations
- `customers` - Unified customer master data
- `profiles` - User authentication profiles
- `crm_packages` - Customer package holdings
- `vip_customer_data` - VIP member information
- `inventory_*` - Inventory management
- `processed_leads` - Marketing leads

**Usage**: Customer-facing features, booking system, VIP portal

---

### 3. [Backoffice Schema Documentation](./BACKOFFICE_SCHEMA_DOCUMENTATION.md)  
Administrative and operational tables for staff, payroll, and business management.

**Key Tables**:
- `staff` - Staff member records
- `packages` - Package sales and tracking
- `time_entries` - Staff time tracking
- `invoices` - Supplier invoice management
- `reconciliation_*` - Financial reconciliation
- `audit_logs` - Admin action audit trail

**Usage**: Admin operations, staff management, payroll, financial tracking

---

### 4. [POS Schema Documentation](./POS_SCHEMA_DOCUMENTATION.md)
Point of sale transactions, table management, and sales analytics.

**Key Tables**:
- `lengolf_sales` - Main sales transaction data
- `table_sessions` - Active table/bay sessions
- `orders` - F&B orders within sessions
- `transactions` - Payment processing
- `dim_product` - Product master data
- `zones` & `tables` - Physical layout management

**Usage**: POS system integration, sales analytics, table management

---

### 5. [Auth Schema Documentation](./AUTH_SCHEMA_DOCUMENTATION.md)
Supabase-managed authentication tables (reference only).

**Key Tables**:
- `users` - Core authentication records
- `sessions` - Active user sessions  
- `identities` - OAuth provider links
- `mfa_*` - Multi-factor authentication
- `audit_log_entries` - Auth audit trail

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
Existing documentation focusing on core POS tables and relationships.

---

## Quick Reference

### Schema Summary
| Schema | Purpose | Tables | Functions | Key Features |
|--------|---------|--------|-----------|--------------|
| `public` | Core application data | 25+ | 100+ | Bookings, customers, CRM integration |
| `backoffice` | Administrative operations | 20+ | 25+ | Staff, packages, invoicing, payroll |
| `pos` | Point of sale system | 15+ | 20+ | Sales, transactions, table management |
| `auth` | Authentication (Supabase) | 16 | 0 | Users, sessions, MFA, OAuth |

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

---

**Note**: This documentation is maintained alongside code changes. When modifying database schema, please update the relevant documentation files.