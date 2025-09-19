# Staff Panel System

The Staff Panel is a dedicated operational interface for staff members to access communication tools and daily operational systems. It provides a clear separation between administrative functions (Admin Panel) and operational functions (Staff Panel).

## Overview

The Staff Panel system was implemented to create a proper role-based access control structure, separating staff operational tools from administrative business management tools. This ensures that staff members have access to the tools they need for daily operations without exposure to sensitive administrative functions.

## System Architecture

### Access Control Model
```
User Roles:
├── Admin (is_admin = true, is_staff = true)
│   ├── Full access to Admin Panel
│   └── Full access to Staff Panel
└── Staff (is_admin = false, is_staff = true)
    ├── No access to Admin Panel
    └── Full access to Staff Panel
```

### Route Structure
```
/staff/                    # Staff Panel dashboard
├── line-chat/            # LINE customer communication
└── line-templates/       # Message template management
```

## Features

### 1. Staff Dashboard
- **Location**: `/staff`
- **Description**: Main landing page with categorized access to staff tools
- **Layout**: Matches Admin Panel design for consistency
- **Sections**:
  - Communication & Messaging

### 2. Communication Tools
- **[LINE Chat System](./STAFF_LINE_CHAT.md)**: Customer conversation management
- **[Message Templates](./STAFF_MESSAGE_TEMPLATES.md)**: Standard reply management

## Authentication & Security

### Permission Requirements
- **Database Column**: `backoffice.allowed_users.is_staff = true`
- **Session Property**: `session.user.isStaff = true`
- **Middleware Protection**: All `/staff` routes protected
- **API Security**: All staff APIs require staff-level access

### Initial Setup
- Only users with `is_admin = true` initially have `is_staff = true`
- Future staff members can be granted staff access without admin privileges

## Technical Implementation

### Database Schema
```sql
-- Added to existing allowed_users table
ALTER TABLE backoffice.allowed_users
ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT false;

-- Set all admins as staff initially
UPDATE backoffice.allowed_users
SET is_staff = true
WHERE is_admin = true;
```

### Authentication Flow
```typescript
// JWT Token includes staff status
interface JWT {
  email?: string
  isAdmin?: boolean
  isCoach?: boolean
  isStaff?: boolean  // Added for staff panel
}

// Session includes staff status
interface Session {
  user: {
    email: string
    isAdmin?: boolean
    isCoach?: boolean
    isStaff?: boolean  // Added for staff panel
  }
}
```

### Route Protection
```typescript
// Middleware protection for /staff routes
if (req.nextUrl.pathname.startsWith('/staff')) {
  const { data: user } = await supabase
    .schema('backoffice')
    .from('allowed_users')
    .select('is_staff')
    .eq('email', req.nextauth.token?.email)
    .single();

  if (!user?.is_staff) {
    return NextResponse.redirect(new URL('/', req.url));
  }
}
```

### API Security
```typescript
// Example API endpoint protection
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);

  // Check staff access
  const { data: user } = await refacSupabaseAdmin
    .schema('backoffice')
    .from('allowed_users')
    .select('is_admin, is_staff')
    .eq('email', session.user.email)
    .single();

  if (!user?.is_admin && !user?.is_staff) {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
}
```

## Navigation Integration

### Main Navigation
- **Desktop**: Staff Panel dropdown in main navigation bar
- **Mobile**: Staff Panel button in mobile navigation
- **Visibility**: Only shown to users with `isStaff = true`

### Staff Panel Dropdown
```
Staff Panel ▼
├── Staff Dashboard
├── ── (separator) ──
├── Communication
│   ├── LINE Chat
│   └── Message Templates
```

## Development Notes

### Development Authentication Bypass
When `SKIP_AUTH=true` in development:
- All users automatically have `isStaff = true`
- Staff Panel accessible without authentication
- Maintains development productivity

### Layout Consistency
The Staff Panel uses the exact same layout structure as the Admin Panel:
- Responsive mobile/desktop layouts
- Consistent styling and spacing
- Same navigation patterns
- Unified user experience

## Migration from Admin Panel

### Moved Features
The following features were migrated from Admin Panel to Staff Panel:
- **LINE Chat**: `/admin/line-chat` → `/staff/line-chat`
- **Message Templates**: `/admin/line-templates` → `/staff/line-templates`

### Retained in Admin Panel
- **LINE Testing**: `/admin/line-messages` (debugging tool for admins)

### API Updates
All LINE communication APIs updated to require staff access:
- `/api/line/conversations` - Staff or Admin required
- `/api/line/send-message` - Staff or Admin required
- `/api/line/templates/*` - Staff or Admin required

## Future Expansion

The Staff Panel architecture supports easy addition of new operational tools:

### Planned Categories
- **Inventory Management**: Daily stock checks and reporting
- **Customer Service**: Additional communication tools
- **Operations**: Daily operational workflows

### Adding New Features
1. Add new items to `communicationItems` array in `/app/staff/page.tsx`
2. Create new pages under `/app/staff/`
3. Add API routes with staff-level protection
4. Update navigation and menu items

## File Structure

```
app/staff/
├── layout.tsx              # Staff authentication layout
├── page.tsx                # Staff dashboard with categorized sections
├── line-chat/
│   └── page.tsx            # LINE customer communication interface
└── line-templates/
    └── page.tsx            # Message template management interface

api/line/
├── conversations/          # Protected with staff access
├── send-message/          # Protected with staff access
├── send-rich-message/     # Protected with staff access
└── templates/            # Protected with staff access

src/components/nav.tsx      # Updated with Staff Panel dropdown
middleware.ts              # Staff route protection
```

## Related Documentation

- **[Staff LINE Chat System](./STAFF_LINE_CHAT.md)**: Customer conversation management
- **[Staff Message Templates](./STAFF_MESSAGE_TEMPLATES.md)**: Template creation and management
- **[LINE Messaging Integration](../../../integrations/LINE_MESSAGING_INTEGRATION.md)**: Technical LINE API integration
- **[Authentication System](../../../technical/AUTHENTICATION_SYSTEM.md)**: Role-based access control