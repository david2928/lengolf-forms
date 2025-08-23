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

### 3. Reconciliation (`/admin/reconciliation`)
- **Status**: Fully implemented and active
- **Purpose**: Transaction and payment reconciliation
- **Features**: File upload, data processing, comparison tools

### 4. Inventory Dashboard (`/admin/inventory`)
- **Status**: Fully implemented and active
- **Purpose**: Stock level monitoring and product management
- **Features**: Real-time inventory tracking, reorder alerts, trend analysis

### 5. Product Management (`/admin/products`)
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

### 6. Competitor Tracking (`/admin/competitors`)
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

### 7. Finance Dashboard (`/admin/finance-dashboard`)
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

### 8. Navigation Integration
- **Status**: Implemented
- **Purpose**: Seamless access to admin features
- **Features**: 
  - Desktop dropdown menu with all admin tools
  - Mobile button linking to admin landing page
  - Conditional display based on admin privileges

### 9. Access Control
- **Status**: Implemented
- **Purpose**: Secure admin-only access
- **Features**: Route protection, session verification, middleware enforcement

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
└── [future-features]/      # Planned admin features
```

## Technical Implementation

### Route Structure
```
/admin/                     # Main admin dashboard
/admin/sales-dashboard      # Business intelligence
/admin/reconciliation       # Transaction reconciliation
/admin/inventory           # Inventory management
/admin/products            # Product management system
/admin/competitors         # Competitor tracking system
/admin/finance-dashboard   # Finance dashboard and P&L analysis
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