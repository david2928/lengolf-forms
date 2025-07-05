# Admin Framework Architecture

## Overview

This document outlines the framework for implementing a comprehensive admin section within the Lengolf Forms backoffice system. The admin section will provide role-based access control, hierarchical page organization, and scalable architecture for advanced administrative tools and analytics.

## Current State Analysis

### Existing Structure Limitations
- **Flat Page Hierarchy**: All pages exist at the same level (`/create-booking`, `/package-monitor`, etc.)
- **Binary Access Control**: Users either have full access or no access via email whitelist
- **No Role Differentiation**: All authenticated users have identical permissions
- **Mixed Responsibilities**: Administrative and operational tools exist in the same namespace

### Proposed Solution
Implement a hierarchical, role-based system that cleanly separates:
- **Staff Level**: Operational tools for daily tasks
- **Admin Level**: Administrative tools, settings, and analytics
- **Super Admin Level**: System-wide configuration and user management

## Architecture Overview

### Hierarchical Structure
```
/
├── staff/                    # Staff-level operational tools
│   ├── bookings/
│   ├── packages/
│   └── customers/
├── admin/                    # Admin-level management tools
│   ├── dashboard/           # Admin analytics & overview
│   ├── inventory/           # Inventory management
│   ├── settings/            # Application settings
│   ├── analytics/           # Advanced reporting
│   └── staff-management/    # Staff user management
└── super-admin/             # Super admin system tools
    ├── system-config/
    ├── role-management/
    └── audit-logs/
```

### Role-Based Access Control

#### Role Hierarchy
1. **Staff** (Current default level)
   - Create/manage bookings
   - Monitor packages
   - Basic customer operations
   - View operational reports

2. **Admin** (New level)
   - All staff permissions
   - Inventory management
   - Advanced analytics
   - Staff user management
   - Application settings
   - Export capabilities

3. **Super Admin** (New level)
   - All admin permissions
   - System configuration
   - Role assignment
   - Audit log access
   - Database maintenance tools

## Database Schema Changes

### User Roles Table
```sql
-- New table for role management
CREATE TABLE backoffice.user_roles (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL REFERENCES backoffice.allowed_users(email),
  role TEXT NOT NULL CHECK (role IN ('staff', 'admin', 'super_admin')),
  granted_by TEXT REFERENCES backoffice.allowed_users(email),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(email, role)
);

-- Update allowed_users to include default role
ALTER TABLE backoffice.allowed_users 
ADD COLUMN default_role TEXT DEFAULT 'staff' CHECK (default_role IN ('staff', 'admin', 'super_admin'));

-- Audit table for role changes
CREATE TABLE backoffice.role_audit_log (
  id SERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL, -- 'granted', 'revoked', 'modified'
  role TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  additional_data JSONB
);
```

### Permission System
```sql
-- Granular permissions table (future expansion)
CREATE TABLE backoffice.permissions (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT, -- 'booking', 'package', 'inventory', 'analytics', 'system'
  is_active BOOLEAN DEFAULT true
);

-- Role-permission mapping
CREATE TABLE backoffice.role_permissions (
  role TEXT NOT NULL,
  permission_id INTEGER REFERENCES backoffice.permissions(id),
  granted_by TEXT,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (role, permission_id)
);
```

## File Structure Organization

### App Directory Structure
```
app/
├── (public)/               # Public pages (auth, etc.)
│   ├── auth/
│   └── page.tsx           # Landing page with role-based navigation
├── staff/                 # Staff-level pages
│   ├── layout.tsx         # Staff layout with navigation
│   ├── bookings/
│   │   ├── create/
│   │   ├── calendar/
│   │   └── manage/
│   ├── packages/
│   │   ├── create/
│   │   ├── monitor/
│   │   └── usage/
│   └── customers/
├── admin/                 # Admin-level pages
│   ├── layout.tsx         # Admin layout with advanced navigation
│   ├── dashboard/
│   │   └── page.tsx       # Admin analytics dashboard
│   ├── inventory/
│   │   ├── products/
│   │   ├── categories/
│   │   └── settings/
│   ├── analytics/
│   │   ├── revenue/
│   │   ├── usage/
│   │   └── trends/
│   ├── settings/
│   │   ├── application/
│   │   ├── integrations/
│   │   └── notifications/
│   └── staff-management/
│       ├── users/
│       └── permissions/
└── super-admin/           # Super admin pages
    ├── layout.tsx
    ├── system-config/
    ├── role-management/
    └── audit-logs/
```

### API Route Organization
```
app/api/
├── auth/                  # Public auth endpoints
├── staff/                 # Staff-level API endpoints
│   ├── bookings/
│   ├── packages/
│   └── customers/
├── admin/                 # Admin-level API endpoints
│   ├── inventory/
│   ├── analytics/
│   ├── settings/
│   └── staff-management/
└── super-admin/           # Super admin API endpoints
    ├── system-config/
    ├── role-management/
    └── audit-logs/
```

### Component Organization
```
src/components/
├── common/                # Shared components across all levels
│   ├── ui/
│   └── navigation/
├── staff/                 # Staff-specific components
│   ├── booking-form/
│   ├── package-monitor/
│   └── customer-search/
├── admin/                 # Admin-specific components
│   ├── analytics/
│   ├── inventory/
│   ├── settings/
│   └── staff-management/
└── super-admin/           # Super admin components
    ├── system-config/
    ├── role-management/
    └── audit-viewer/
```

## Authentication & Authorization

### Enhanced Auth Configuration
```typescript
// src/lib/auth-config.ts (enhanced)
export interface UserSession {
  user: {
    email: string;
    name: string;
    image: string;
  };
  roles: string[];
  permissions: string[];
  defaultRole: string;
}

export const authOptions: NextAuthOptions = {
  callbacks: {
    async signIn({ user }) {
      return await isUserAllowed(user.email);
    },
    async session({ session, token }) {
      const userRoles = await getUserRoles(session.user.email);
      const permissions = await getUserPermissions(userRoles);
      
      return {
        ...session,
        roles: userRoles,
        permissions: permissions,
        defaultRole: userRoles[0] || 'staff'
      };
    }
  }
};
```

### Role-Based Middleware
```typescript
// middleware.ts (enhanced)
import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const userRoles = req.nextauth.token?.roles || [];
    
    // Admin routes require admin or super_admin role
    if (pathname.startsWith('/admin') && !hasAdminAccess(userRoles)) {
      return NextResponse.redirect(new URL('/staff', req.url));
    }
    
    // Super admin routes require super_admin role
    if (pathname.startsWith('/super-admin') && !hasRole(userRoles, 'super_admin')) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
);

export const config = {
  matcher: ['/staff/:path*', '/admin/:path*', '/super-admin/:path*']
};
```

### Authorization Utilities
```typescript
// src/lib/authorization.ts
export function hasRole(userRoles: string[], requiredRole: string): boolean {
  return userRoles.includes(requiredRole);
}

export function hasAdminAccess(userRoles: string[]): boolean {
  return userRoles.some(role => ['admin', 'super_admin'].includes(role));
}

export function hasPermission(userPermissions: string[], permission: string): boolean {
  return userPermissions.includes(permission);
}

export async function requireRole(req: NextRequest, requiredRole: string) {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes(requiredRole)) {
    throw new Error('Insufficient permissions');
  }
}
```

## Navigation System

### Role-Based Navigation
```typescript
// src/components/navigation/role-based-nav.tsx
interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType;
  requiredRole?: string;
  requiredPermission?: string;
  children?: NavigationItem[];
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Staff Tools',
    href: '/staff',
    icon: Users,
    children: [
      { title: 'Bookings', href: '/staff/bookings', icon: Calendar },
      { title: 'Packages', href: '/staff/packages', icon: Package },
      { title: 'Customers', href: '/staff/customers', icon: UserCheck }
    ]
  },
  {
    title: 'Admin Tools',
    href: '/admin',
    icon: Settings,
    requiredRole: 'admin',
    children: [
      { title: 'Dashboard', href: '/admin/dashboard', icon: BarChart },
      { title: 'Inventory', href: '/admin/inventory', icon: Archive },
      { title: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
      { title: 'Settings', href: '/admin/settings', icon: Cog }
    ]
  },
  {
    title: 'System Admin',
    href: '/super-admin',
    icon: Shield,
    requiredRole: 'super_admin',
    children: [
      { title: 'System Config', href: '/super-admin/system-config', icon: Server },
      { title: 'User Management', href: '/super-admin/role-management', icon: UserCog },
      { title: 'Audit Logs', href: '/super-admin/audit-logs', icon: FileText }
    ]
  }
];
```

### Responsive Navigation Layout
```typescript
// src/components/navigation/main-nav.tsx
export function MainNavigation() {
  const { data: session } = useSession();
  const userRoles = session?.roles || [];
  
  const visibleItems = navigationItems.filter(item => 
    !item.requiredRole || userRoles.includes(item.requiredRole)
  );
  
  return (
    <nav className="space-y-2">
      {visibleItems.map(item => (
        <NavigationSection key={item.href} item={item} userRoles={userRoles} />
      ))}
    </nav>
  );
}
```

## Admin Features Specification

### Admin Dashboard
- **Real-time Analytics**: Revenue, bookings, package usage
- **Key Performance Indicators**: Daily/weekly/monthly metrics
- **Alert System**: Low inventory, expiring packages, system issues
- **Quick Actions**: Emergency booking changes, system maintenance

### Inventory Management
- **Product Catalog**: Golf equipment, lesson packages, merchandise
- **Stock Tracking**: Automated inventory levels, reorder points
- **Supplier Management**: Vendor information, purchase orders
- **Cost Analysis**: Profit margins, cost tracking

### Advanced Analytics
- **Revenue Analytics**: Detailed financial reporting, trend analysis
- **Customer Analytics**: Behavior patterns, lifetime value, retention
- **Operational Analytics**: Bay utilization, staff performance, peak times
- **Predictive Analytics**: Demand forecasting, capacity planning

### Staff Management
- **User Administration**: Role assignment, permission management
- **Performance Tracking**: Booking success rates, customer feedback
- **Schedule Management**: Staff availability, shift planning
- **Training Records**: Certification tracking, skill development

### System Settings
- **Application Configuration**: Feature toggles, system parameters
- **Integration Settings**: API keys, external service configurations
- **Notification Rules**: Alert thresholds, messaging templates
- **Backup & Recovery**: Database maintenance, system health

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
1. Database schema implementation
2. Enhanced authentication system
3. Basic role-based routing
4. Admin layout structure

### Phase 2: Core Admin Features (Weeks 3-4)
1. Admin dashboard with basic analytics
2. Inventory management system
3. Staff user management
4. Settings configuration panel

### Phase 3: Advanced Features (Weeks 5-6)
1. Advanced analytics and reporting
2. Audit logging system
3. Notification management
4. System configuration tools

### Phase 4: Polish & Testing (Weeks 7-8)
1. UI/UX refinements
2. Comprehensive testing
3. Performance optimization
4. Documentation completion

## Security Considerations

### Access Control
- **Principle of Least Privilege**: Users receive minimal necessary permissions
- **Role Inheritance**: Clear hierarchy with permission escalation
- **Session Management**: Enhanced session security for admin roles
- **API Route Protection**: Middleware-based route protection

### Audit & Compliance
- **Action Logging**: All administrative actions logged
- **Change Tracking**: Database changes with attribution
- **Access Monitoring**: Login attempts, role usage tracking
- **Data Protection**: Sensitive information encryption

### Error Handling
- **Graceful Degradation**: Fallback to lower privilege levels
- **Security-First Errors**: No sensitive information in error messages
- **Logging Strategy**: Comprehensive error logging for admin actions

## Migration Strategy

### Backward Compatibility
1. Existing pages remain functional during transition
2. Gradual migration of pages to new structure
3. Legacy route redirects to new hierarchy
4. User education and training materials

### Data Migration
1. Create new role tables with default assignments
2. Migrate existing users to 'staff' role
3. Preserve existing permissions and access patterns
4. Comprehensive testing of role assignments

### Deployment Strategy
1. Feature flags for gradual rollout
2. A/B testing for new navigation structure
3. Monitoring and rollback capabilities
4. User feedback collection and iteration

## Future Scalability

### Extension Points
- **Plugin Architecture**: Modular admin tool development
- **Custom Dashboards**: User-configurable admin interfaces
- **Multi-tenant Support**: Organization-level role management
- **API Gateway**: Centralized admin API management

### Integration Opportunities
- **Third-party Tools**: CRM, accounting, inventory systems
- **Mobile Admin App**: Dedicated mobile interface for admin functions
- **Real-time Notifications**: WebSocket-based admin alerts
- **Business Intelligence**: Advanced reporting and data visualization

This framework provides a comprehensive foundation for implementing a scalable, secure, and maintainable admin section that can grow with the organization's needs while maintaining clean separation of concerns and user experience. 