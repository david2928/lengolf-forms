# Admin Panel Documentation

## Table of Contents
1. [Overview](#overview)
2. [Access Control](#access-control)
3. [Admin Dashboard](#admin-dashboard)
4. [Sales Dashboard](#sales-dashboard)
5. [Current Features](#current-features)
6. [Planned Features](#planned-features)
7. [User Interface](#user-interface)
8. [Technical Implementation](#technical-implementation)
9. [Security](#security)
10. [Future Roadmap](#future-roadmap)

## Overview

The Admin Panel is a dedicated administrative interface within the Lengolf Forms system that provides enhanced management capabilities for privileged users. It operates alongside the standard staff functionality, offering additional tools for business intelligence, system management, and administrative oversight.

### Key Characteristics
- **Role-Based Access**: Binary admin flag system (user/admin)
- **Non-Disruptive**: Existing staff functionality remains unchanged
- **Expandable Framework**: Foundation for future administrative features
- **Secure Access**: Middleware-protected routes with admin verification

## Access Control

### Admin Role System
The system currently implements a binary admin role system:

```typescript
// Admin check in session
const isAdmin = session?.user?.isAdmin || false;

// Middleware protection
if (pathname.startsWith('/admin') && !session?.user?.isAdmin) {
  return NextResponse.redirect(new URL('/', request.url));
}
```

### Authentication Flow
1. **User Authentication**: Standard Google OAuth login
2. **Email Verification**: Check against `backoffice.allowed_users` table
3. **Admin Flag Assignment**: Set `isAdmin` flag during session creation
4. **Route Protection**: Middleware enforces admin-only access

### Admin User Management
Currently managed through direct database access to the `backoffice.allowed_users` table with an `is_admin` flag. Future implementations will include UI-based user management.

## Admin Dashboard

### Main Dashboard (`/admin`)
The central hub for administrative tools and system overview, designed as a comprehensive landing page similar to the main staff interface.

#### Current Interface
```tsx
// Admin Dashboard Structure
- Analytics & Reporting
  - Sales Dashboard (Active)
  - Reconciliation (Active)
  - Competitor Tracking (Active)
- Inventory & Operations
  - Inventory Dashboard (Active)
  - Product Management (Active)
- Financial & Operations
  - Finance Dashboard (Active)
```

#### Features
- **Home-Page Style Layout**: Mirrors the main application's navigation design
- **Mobile & Desktop Responsive**: Optimized layouts for all screen sizes
- **Categorized Sections**: Organized by functional areas (Analytics, Inventory)
- **Active Feature Focus**: Shows only implemented features, no "coming soon" placeholders
- **Clean Interface**: Consistent styling with the main LENGOLF application

### Navigation Integration
The admin panel integrates seamlessly with the main navigation, providing different entry points for mobile and desktop users:

#### Desktop Navigation
```tsx
// Admin Dropdown Menu
{isAdmin && (
  <DropdownMenu>
    <DropdownMenuTrigger>Admin</DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem href="/admin">Admin Dashboard</DropdownMenuItem>
      <DropdownMenuItem href="/admin/sales-dashboard">Sales Dashboard</DropdownMenuItem>
      <DropdownMenuItem href="/admin/reconciliation">Reconciliation</DropdownMenuItem>
      <DropdownMenuItem href="/admin/inventory">Inventory</DropdownMenuItem>
      <DropdownMenuItem href="/admin/products">Product Management</DropdownMenuItem>
      <DropdownMenuItem href="/admin/competitors">Competitor Tracking</DropdownMenuItem>
      <DropdownMenuItem href="/admin/finance-dashboard">Finance Dashboard</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

#### Mobile Navigation
- **Admin Button**: Settings icon in mobile navigation bar
- **Direct Link**: Points to `/admin` (admin landing page) instead of specific dashboard
- **Landing Page**: Users access the admin dashboard first, then navigate to specific tools

## Sales Dashboard

### Overview
The Sales Dashboard is the first fully implemented admin feature, providing comprehensive business intelligence and analytics.

#### Key Features
- **Real-time KPIs**: Revenue, bookings, and customer metrics
- **Interactive Charts**: Revenue trends, bay utilization, category breakdowns
- **Flexible Filtering**: Date range selection and comparison periods
- **Export Capabilities**: Data export for reporting
- **Mobile Responsive**: Optimized for all devices

#### Access
- **URL**: `/admin/sales-dashboard`
- **Requirements**: Admin privileges
- **Navigation**: Admin menu → Sales Dashboard

### Data Visualization
```typescript
// Chart Types Available
- Revenue Trends (Line Chart)
- Bay Utilization (Bar Chart)
- Category Breakdown (Pie Chart)
- Customer Growth (Area Chart)
- Payment Methods (Bar Chart)
```

### Performance Metrics
- **Revenue KPIs**: Total revenue, growth, average booking value
- **Booking KPIs**: Total bookings, growth, cancellation rates
- **Customer KPIs**: New customers, retention, acquisition

## Current Features

### 1. Admin Landing Page (`/admin`)
- **Status**: Fully implemented and active
- **Purpose**: Central administrative hub and navigation
- **Features**: 
  - Home-page style layout design
  - Mobile and desktop responsive layouts
  - Categorized feature sections
  - Clean, focused interface showing only active features
  - Consistent styling with main application

### 2. Sales Dashboard (`/admin/sales-dashboard`)
- **Status**: Fully implemented and active
- **Purpose**: Business intelligence and analytics
- **Features**: KPIs, charts, filtering, export capabilities

### 3. Marketing Dashboard (`/admin/marketing-dashboard`)
- **Status**: Fully implemented and active
- **Purpose**: Cross-platform marketing analytics with ROAS tracking and website traffic integration
- **Features**: 
  - Unified Google Ads and Meta Ads performance analytics with real-time KPIs
  - Customer acquisition cost (CAC) and return on ad spend (ROAS) calculations
  - Website traffic analysis with channel breakdown (Total, Paid, Paid Social, Paid Search, Organic, Direct)
  - Weekly and monthly performance tables with 4-week rolling averages
  - Platform-specific breakdowns (CPM, CPC, CTR by Google vs Meta)
  - Export capabilities and manual refresh functionality
  - Mobile-responsive design with caching system (5-minute TTL)

### 4. Reconciliation (`/admin/reconciliation`)
- **Status**: Fully implemented and active
- **Purpose**: Transaction and payment reconciliation
- **Features**: File upload, data processing, comparison tools

### 5. Inventory Dashboard (`/admin/inventory`)
- **Status**: Fully implemented and active
- **Purpose**: Stock level monitoring and product management
- **Features**: Real-time inventory tracking, reorder alerts, trend analysis

### 6. Product Management (`/admin/products`)
- **Status**: Fully implemented and active
- **Purpose**: Comprehensive product catalog management system
- **Features**: 
  - Product CRUD operations with modern React components
  - Category hierarchy management (Tab → Category → Product structure)
  - Pricing and cost management with real-time profit margin calculations
  - Advanced search and filtering capabilities
  - Bulk operations for mass updates
  - Product analytics dashboard
  - CSV import/export functionality
  - Mobile-optimized interface for quick admin management
  - Integration with existing inventory system
  - Qashier POS data migration support

### 7. Competitor Tracking (`/admin/competitors`)
- **Status**: Fully implemented and active
- **Purpose**: Monitor competitor social media metrics and growth trends
- **Features**: 
  - Automated daily scraping via Google Cloud Run service
  - Multi-platform support (Instagram, Facebook, LINE, Google Reviews)
  - Manual metrics submission for failed scrapes
  - Historical metrics tracking and trend analysis
  - Real-time sync capabilities with manual trigger
  - Comprehensive logging and audit trail
  - Mobile-optimized interface for quick competitor monitoring
  - PgCron automated scheduling (3 AM Bangkok time daily)
  - API integration with scraper service authentication

### 8. Finance Dashboard (`/admin/finance-dashboard`)
- **Status**: Fully implemented and active
- **Purpose**: Comprehensive P&L analysis and financial KPIs
- **Features**: 
  - Monthly P&L statement with revenue, COGS, and expenses breakdown
  - Real-time KPI cards (Net Sales, Gross Profit, Marketing Expenses, EBITDA)
  - Month-over-Month and Year-over-Year comparison indicators
  - Run-rate projections for current month analysis
  - Monthly comparison view with side-by-side P&L analysis
  - Operating expenses management with categorized expense tracking
  - Visual section headers for clear P&L structure (Revenue → COGS → Gross Profit → OpEx → Marketing → EBITDA)
  - Data export capabilities for reporting
  - Integration with POS data, marketing costs, and manual entries
  - Mobile-responsive design for tablet and desktop use

### 9. Customer Outreach (`/admin/customer-outreach`)
- **Status**: Fully implemented and active
- **Purpose**: Customer audience building and OB sales call list management
- **Features**: 
  - Advanced audience filtering by last visit, packages, LINE status, and customer value
  - Live customer preview with pagination and ranking
  - Saved audience snapshots for reuse
  - OB Sales integration for lead feedback workflow
  - Customer data export capabilities
  - Mobile-responsive interface optimized for call center operations
  - Integration with Lead Feedback system for outbound sales tracking
  - Audience selection for targeted outreach campaigns

### 10. Navigation Integration
- **Status**: Implemented
- **Purpose**: Seamless access to admin features
- **Features**: 
  - Desktop dropdown menu with all admin tools (including Marketing Dashboard)
  - Mobile button linking to admin landing page
  - Conditional display based on admin privileges

### 11. Access Control
- **Status**: Implemented
- **Purpose**: Secure admin-only access
- **Features**: Route protection, session verification, middleware enforcement

### 12. Infrastructure Monitoring
- **Status**: Planned/Partially Implemented
- **Purpose**: Monitor and optimize Supabase infrastructure usage, focusing on egress tracking
- **Features**:
  - Comprehensive egress breakdown and cost analysis
  - Real-time infrastructure usage monitoring
  - Cost optimization recommendations
  - Historical usage trending and projections
  - Service-level egress tracking (Storage, Database, Auth, Edge Functions)
  - Automated alerts for usage thresholds

## Planned Features

### Phase 1 (Immediate)
1. **System Settings**
   - Application configuration
   - Integration settings
   - Feature toggles
   - Environment management

2. **Enhanced Product Management**
   - Advanced product analytics
   - Supplier integration
   - Price history reporting
   - Enhanced bulk operations

### Phase 2 (Short Term)
1. **Advanced Analytics**
   - Custom report builder
   - Scheduled reports
   - Advanced filtering
   - Data export options

2. **User Management**
   - Staff user management
   - Permission management
   - Activity logging
   - Role assignment

### Phase 3 (Long Term)
1. **Database Tools**
   - Database maintenance
   - Data backup/restore
   - Query interface
   - Performance monitoring

2. **Enhanced Security**
   - Audit logging
   - Security monitoring
   - Access controls
   - Compliance tools

## User Interface

### Design Principles
- **Consistency**: Matches existing application design
- **Accessibility**: WCAG AA compliant
- **Responsiveness**: Mobile-first design approach
- **Performance**: Optimized loading and interactions

### Layout Structure
```tsx
// Admin Layout
<AdminLayout>
  <AdminNavigation />
  <AdminContent>
    <PageHeader />
    <MainContent />
    <Footer />
  </AdminContent>
</AdminLayout>
```

### Component Architecture
```
admin/
├── layout.tsx              # Admin-specific layout
├── page.tsx                # Main admin dashboard
├── sales-dashboard/        # Sales analytics
│   └── page.tsx
├── reconciliation/         # Transaction reconciliation
│   └── page.tsx
├── inventory/             # Inventory management
│   └── page.tsx
├── products/              # Product management system
│   └── page.tsx
├── competitors/           # Competitor tracking system
│   └── page.tsx
├── customer-outreach/     # Customer audience building and OB sales
│   └── page.tsx
└── [future-features]/      # Planned admin features
```

## Technical Implementation

### Route Structure
```
/admin/                     # Main admin dashboard
/admin/sales-dashboard      # Business intelligence
/admin/marketing-dashboard  # Marketing analytics with ROAS and traffic data
/admin/reconciliation       # Transaction reconciliation
/admin/inventory           # Inventory management
/admin/products            # Product management system
/admin/competitors         # Competitor tracking system
/admin/customer-outreach   # Customer audience building and OB sales
/admin/finance-dashboard   # Finance dashboard and P&L analysis
/admin/infrastructure      # Infrastructure monitoring and egress management
/admin/settings            # System settings (planned)
```

### Middleware Protection
```typescript
// Admin route protection
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  if (pathname.startsWith('/admin')) {
    const token = request.nextUrl.searchParams.get('token');
    const session = getServerSession(token);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
}
```

### State Management
- **Local State**: React hooks for component state
- **Global State**: Context API for admin-specific state
- **Server State**: SWR for data fetching and caching
- **Form State**: React Hook Form for complex forms

### API Integration
```typescript
// Admin-specific API endpoints
/api/dashboard/summary              # Dashboard KPIs
/api/dashboard/charts               # Chart data
/api/sales/flexible-analytics       # Advanced analytics
/api/admin/products                 # Product management
/api/admin/products/categories      # Category management
/api/admin/products/bulk/update     # Bulk operations
/api/admin/products/export          # Data export
/api/admin/products/import          # Data import
/api/admin/competitors              # Competitor management
/api/admin/competitors/[id]/manual-metrics  # Manual metrics submission
/api/competitors/sync               # Trigger scraper sync
/api/finance/pl                     # P&L statement data
/api/finance/kpis                   # Finance KPI metrics
/api/finance/pl-comparison          # Multi-month P&L comparison
/api/finance/operating-expenses     # Operating expenses management
/api/finance/manual-entries         # Manual revenue/COGS entries
/api/admin/infrastructure/egress    # Current egress usage and breakdown
/api/admin/infrastructure/egress/breakdown  # Detailed egress by service
/api/admin/infrastructure/egress/trends     # Historical egress data
/api/admin/infrastructure/optimize  # Egress optimization suggestions
/api/admin/infrastructure/costs     # Cost analysis and projections
/api/admin/infrastructure/alerts    # Usage threshold alerts
```

## Security

### Access Control Measures
1. **Route Protection**: Middleware-level access control
2. **Session Verification**: JWT token validation
3. **Role Verification**: Admin flag checking
4. **API Protection**: Backend admin verification

### Data Security
- **Sensitive Data**: Proper handling of business metrics
- **User Privacy**: Compliance with privacy regulations
- **Audit Trails**: Logging of admin actions
- **Secure Communications**: HTTPS enforcement

### Best Practices
- **Principle of Least Privilege**: Minimal required access
- **Regular Reviews**: Periodic access audits
- **Strong Authentication**: Multi-factor authentication (future)
- **Session Management**: Secure session handling

## Future Roadmap

### Immediate Goals (Q3 2025)
- [x] Complete product management implementation
- [ ] Add system settings interface
- [ ] Implement basic user management
- [ ] Enhanced security logging

### Short-term Goals (Q4 2025)
- [ ] Advanced analytics features
- [ ] Custom dashboard builder
- [ ] Automated reporting system
- [ ] Mobile admin app

### Long-term Vision (2026)
- [ ] Machine learning insights
- [ ] Predictive analytics
- [ ] Advanced workflow automation
- [ ] Third-party integrations

### Technical Debt Resolution
- [ ] Migrate to hierarchical role system
- [ ] Implement granular permissions
- [ ] Add comprehensive testing
- [ ] Performance optimizations

## Infrastructure Monitoring and Egress Management

### Overview
The Infrastructure Monitoring system provides comprehensive visibility into Supabase usage patterns, with a focus on egress tracking and cost optimization. Based on analysis of a 5.25 GB monthly egress baseline, the system identifies key sources and provides actionable optimization strategies.

### Egress Breakdown Analysis

#### Complete Usage Breakdown (5.25 GB/month)
```
┌─ Storage: 4.338 GB (82.63%) ─────────────────────────────┐
│  ├─ Time Clock Photos: 2.832 GB (53.94%)                │
│  │   594 photos × 500KB × 10 views/month                 │
│  ├─ LINE Image Library: 0.977 GB (18.61%)               │
│  │   Curated images sent via LINE messaging              │
│  └─ Transaction Signatures: 0.529 GB (10.08%)           │
│      555 digital signatures × 200KB × 5 views/month     │
├─ Development/Testing: 0.488 GB (9.30%)                   │
│   Local development, CI/CD, testing traffic             │
├─ Database Queries: 0.355 GB (6.76%)                      │
│  ├─ Admin Dashboards: 0.286 GB                          │
│  └─ Marketing Data ETL: 0.069 GB                        │
├─ Other Services: 0.033 GB (0.63%)                        │
│   Auth, POS API, External integrations                  │
└─ Unidentified Gap: 0.036 GB (0.69%)                     │
    Minor untracked sources                                │
└──────────────────────────────────────────────────────────┘
```

#### Cost Analysis
- **Current Monthly Cost (Uncached)**: $0.47 at $0.09/GB
- **Optimized Cost (Cached)**: $0.16 at $0.03/GB (66% savings)
- **Annual Impact**: $3.72 potential savings with caching optimization

### Service-Level Egress Details

#### 1. Storage Services (82.63% of total egress)
**Time Clock Photos (2.832 GB - 53.94%)**
- **Source**: 594 time clock photos in `time-clock-photos` bucket
- **Access Pattern**: Staff viewing clock-in/out records in admin dashboard
- **Optimization Potential**: High - implement CDN caching

**LINE Image Library (0.977 GB - 18.61%)**
- **Source**: Curated images sent to customers via LINE messaging
- **Access Pattern**: Images served when staff send messages to customers
- **Optimization Potential**: Medium - compress images before storage

**Transaction Signatures (0.529 GB - 10.08%)**
- **Source**: 555 digital signatures in `signature` bucket
- **Access Pattern**: Signatures viewed when reviewing transactions
- **Optimization Potential**: Low - infrequent access, already optimized size

#### 2. Database Services (6.76% of total egress)
**Admin Dashboards (0.286 GB)**
- **Source**: Sales, Marketing, Finance dashboard queries
- **Access Pattern**: Daily dashboard loads by admin users
- **Optimization Potential**: High - implement query result caching

**Marketing Data ETL (0.069 GB)**
- **Source**: Google Ads and Meta Ads data synchronization
- **Access Pattern**: Automated hourly data fetches
- **Optimization Potential**: Medium - optimize query efficiency

#### 3. Development and Testing (9.30% of total egress)
- **Source**: Local development, CI/CD pipelines, automated testing
- **Optimization Potential**: Medium - ensure dev environments use separate instances

### Monitoring Implementation

#### Database Schema
```sql
-- Create infrastructure monitoring schema
CREATE SCHEMA IF NOT EXISTS infrastructure;

-- Egress tracking table
CREATE TABLE infrastructure.egress_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    service_type TEXT NOT NULL, -- 'Storage', 'Database', 'Auth', 'Edge Functions', 'Realtime'
    endpoint TEXT,
    request_bytes INTEGER DEFAULT 0,
    response_bytes INTEGER NOT NULL,
    user_id UUID,
    session_id TEXT,
    cached BOOLEAN DEFAULT FALSE,
    source_ip INET,
    user_agent TEXT
);

-- Daily egress summary view
CREATE VIEW infrastructure.daily_egress_summary AS
SELECT
    DATE(timestamp) as date,
    service_type,
    COUNT(*) as request_count,
    SUM(response_bytes) as total_bytes,
    ROUND(SUM(response_bytes) / 1024.0 / 1024.0, 2) as mb,
    ROUND(SUM(response_bytes) / 1024.0 / 1024.0 / 1024.0, 3) as gb,
    ROUND(AVG(response_bytes), 0) as avg_response_size,
    COUNT(CASE WHEN cached THEN 1 END) as cached_requests,
    ROUND(COUNT(CASE WHEN cached THEN 1 END) * 100.0 / COUNT(*), 2) as cache_hit_rate
FROM infrastructure.egress_metrics
GROUP BY DATE(timestamp), service_type;

-- Monthly cost projection
CREATE VIEW infrastructure.monthly_cost_projection AS
SELECT
    service_type,
    SUM(gb) as monthly_gb,
    ROUND(SUM(gb) * 0.09, 3) as uncached_cost_usd,
    ROUND(SUM(gb) * 0.03, 3) as cached_cost_usd,
    ROUND((SUM(gb) * 0.09) - (SUM(gb) * 0.03), 3) as potential_savings_usd
FROM infrastructure.daily_egress_summary
WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY service_type;
```

#### Monitoring Queries

**Daily Egress by Service**
```sql
SELECT
    service_type,
    ROUND(SUM(response_bytes) / 1024.0 / 1024.0 / 1024.0, 3) as gb_today,
    COUNT(*) as requests_today,
    ROUND(AVG(response_bytes), 0) as avg_response_size
FROM infrastructure.egress_metrics
WHERE DATE(timestamp) = CURRENT_DATE
GROUP BY service_type
ORDER BY gb_today DESC;
```

**Top Egress Endpoints**
```sql
SELECT
    endpoint,
    service_type,
    COUNT(*) as request_count,
    ROUND(SUM(response_bytes) / 1024.0 / 1024.0, 2) as total_mb,
    ROUND(AVG(response_bytes), 0) as avg_size_bytes
FROM infrastructure.egress_metrics
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY endpoint, service_type
ORDER BY total_mb DESC
LIMIT 20;
```

**Cache Efficiency Analysis**
```sql
SELECT
    service_type,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN cached THEN 1 END) as cached_requests,
    ROUND(COUNT(CASE WHEN cached THEN 1 END) * 100.0 / COUNT(*), 2) as cache_hit_rate,
    ROUND(SUM(CASE WHEN cached THEN response_bytes ELSE 0 END) / 1024.0 / 1024.0, 2) as cached_mb,
    ROUND(SUM(CASE WHEN NOT cached THEN response_bytes ELSE 0 END) / 1024.0 / 1024.0, 2) as uncached_mb
FROM infrastructure.egress_metrics
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY service_type;
```

### Cost Optimization Strategies

#### 1. Storage Optimization (Potential: 2.2 GB savings)

**Cache Time Clock Photos**
- **Implementation**: Configure CDN caching for frequently viewed photos
- **Potential Savings**: ~1.4 GB/month (70% cache hit rate assumed)
- **Cost Impact**: $0.13/month → $0.04/month

**Optimize Image Sizes**
- **Implementation**: Compress images to 300KB (from 500KB average)
- **Potential Savings**: ~0.8 GB/month
- **Cost Impact**: Additional $0.07/month savings

#### 2. Database Query Optimization (Potential: 0.2 GB savings)

**Dashboard Query Caching**
- **Implementation**: Cache dashboard queries for 5-10 minutes
- **Potential Savings**: ~0.2 GB/month
- **Cost Impact**: $0.02/month savings

**Query Result Pagination**
- **Implementation**: Implement pagination for large dataset queries
- **Potential Savings**: ~0.1 GB/month

#### 3. Development Environment Optimization (Potential: 0.3 GB savings)

**Separate Development Instance**
- **Implementation**: Use dedicated Supabase project for development
- **Potential Savings**: ~0.3 GB/month (eliminate development traffic)
- **Cost Impact**: $0.03/month savings

#### 4. Smart Loading Strategies

**Lazy Loading for Images**
- **Implementation**: Load images only when visible in viewport
- **Potential Savings**: ~0.5 GB/month
- **Cost Impact**: $0.05/month savings

### Alert Configuration

#### Usage Threshold Alerts
```sql
-- Daily egress threshold check (run via cron)
SELECT
    service_type,
    ROUND(SUM(response_bytes) / 1024.0 / 1024.0 / 1024.0, 3) as gb_today
FROM infrastructure.egress_metrics
WHERE DATE(timestamp) = CURRENT_DATE
GROUP BY service_type
HAVING SUM(response_bytes) > 200 * 1024 * 1024 * 1024; -- Alert if > 200MB/day
```

#### Cost Projection Alerts
```sql
-- Monthly cost projection (run weekly)
WITH monthly_projection AS (
    SELECT
        SUM(gb) * (30.0 / EXTRACT(DAY FROM CURRENT_DATE)) as projected_monthly_gb
    FROM infrastructure.daily_egress_summary
    WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
)
SELECT
    projected_monthly_gb,
    ROUND(projected_monthly_gb * 0.09, 2) as projected_cost_usd
FROM monthly_projection
WHERE projected_monthly_gb > 6.0; -- Alert if projecting > 6GB/month
```

## Best Practices for Admin Development

### Code Organization
- Keep admin features in dedicated directories
- Maintain clear separation from staff functionality
- Use consistent naming conventions
- Document all admin-specific logic

### Security Considerations
- Always verify admin access at multiple levels
- Log all administrative actions
- Implement proper error handling
- Validate all inputs thoroughly

### User Experience
- Maintain consistency with existing UI
- Provide clear feedback for all actions
- Implement proper loading states
- Ensure mobile responsiveness

### Testing Strategy
- Unit tests for admin-specific functions
- Integration tests for admin workflows
- Security testing for access controls
- Performance testing for data-heavy features

---

For detailed sales dashboard documentation, see [Sales Dashboard](./SALES_DASHBOARD.md).  
For admin framework planning, see [Admin Framework](../legacy/ADMIN_FRAMEWORK.md).

**Last Updated**: June 2025  
**Version**: 2.0  
**Maintainer**: Lengolf Development Team 