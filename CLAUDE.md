# Lengolf Forms - Developer Guide

Essential instructions for working with the Lengolf Forms codebase.

## Quick Start

### Setup
```bash
git clone [repository-url]
cd lengolf-forms
npm install
cp .env.example .env.local  # Configure with your credentials

# Enable development authentication bypass
echo "SKIP_AUTH=true" >> .env.local

npm run dev
```

### Key Commands
```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript validation
```

## Architecture

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase, NextAuth.js

**Directory Structure:**
```
app/                 # Pages & API routes
├── api/            # API endpoints
├── admin/          # Admin pages
└── [feature]/      # Feature pages
src/
├── components/     # React components
├── hooks/          # Custom hooks
├── lib/            # Utilities & services
└── types/          # TypeScript definitions
```

**Database Schemas:**
- `public`: Core booking tables
- `backoffice`: Customer, package, admin tables
- `pos`: POS transaction data

## Development Authentication Bypass

This project includes a comprehensive authentication bypass system for development that works for:
- **Frontend Pages**: Complete bypass of Google login for Puppeteer/browser testing
- **API Endpoints**: Bearer token authentication for curl/fetch testing
- **Admin Pages**: Full admin access without database role checks

### Setup
```bash
# Add to .env.local
SKIP_AUTH=true

# Restart development server
npm run dev
```

### How It Works

**Frontend Bypass:**
- Middleware completely bypasses NextAuth when `SKIP_AUTH=true`
- Admin layouts skip session checks in development
- All protected pages accessible without login

**API Bypass:**
- All API routes support both session cookies and Bearer tokens
- Development tokens available via `/api/dev-token`
- Admin APIs bypass database role verification

### Testing Methods

**Browser/Puppeteer Testing:**
```bash
# Direct navigation (no login required)
open http://localhost:3000
open http://localhost:3000/admin
open http://localhost:3000/admin/sales-dashboard
```

**API Testing:**
```bash
# Get development token
TOKEN=$(curl -s http://localhost:3000/api/dev-token | jq -r '.token')

# Test API endpoints
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/customers
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/dashboard/summary
```

### Current Status
✅ **Working**: All pages accessible without authentication
✅ **Working**: Admin pages load and display layouts
✅ **Working**: Sales dashboard renders with data
✅ **Working**: Bearer token API authentication
⚠️ **Partial**: Some client-side API calls may need session context

### Security
- Multiple environment checks prevent accidental production deployment
- Only active when `NODE_ENV=development` AND `SKIP_AUTH=true`
- Production maintains full authentication requirements

## Development

### Creating API Endpoints

Use the development-enhanced authentication pattern:

```typescript
// app/api/[feature]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Your logic here
  return NextResponse.json({ data: result });
}
```

### Adding Pages

1. Create `app/[feature]/page.tsx`
2. Add to `src/config/menu-items.ts`
3. Update `middleware.ts` if auth needed

### Database Operations

```typescript
// Common patterns
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('field', value);

// Stored procedures
const { data, error } = await supabase
  .rpc('function_name', { param: value });
```

## Testing & Development

### Development Authentication Bypass

**Complete bypass available** when `SKIP_AUTH=true` in `.env.local`:

**Frontend Access:**
- All pages accessible without Google login
- Admin pages work automatically
- Package monitoring, booking creation, etc.

**API Access:**
- All endpoints work without authentication
- Bearer tokens still supported for compatibility
- No login required for any API calls

### Quick Testing

```bash
# Frontend - Direct navigation (no login needed)
http://localhost:3000                    # Main dashboard
http://localhost:3000/create-booking     # Booking form
http://localhost:3000/package-monitor    # Package tracking
http://localhost:3000/admin             # Admin panel

# API - No authentication required
curl http://localhost:3000/api/customers
curl http://localhost:3000/api/packages/monitor

# API - Bearer tokens still work (optional)
TOKEN=$(curl -s http://localhost:3000/api/dev-token | jq -r '.token')
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/customers
```

### Enable/Disable Bypass

```bash
# Enable bypass (in .env.local)
SKIP_AUTH=true

# Disable bypass
SKIP_AUTH=false  # or remove the line
```

### Important Notes

**Server Restart Required**: After adding `SKIP_AUTH=true`, restart the development server:
```bash
# Stop server (Ctrl+C) then restart
npm run dev
```

**Frontend vs API**: 
- ✅ **Main pages**: Work immediately with bypass
- ✅ **API endpoints**: Work immediately with bypass  
- ✅ **Admin pages**: Bypass enabled in both middleware and layout

**Troubleshooting**: If admin pages still redirect after enabling bypass:
1. **Restart development server**: `npm run dev`
2. **Clear browser cache**: Hard refresh (Ctrl+Shift+R)
3. **Check server logs**: Look for `🔧 Development middleware: Complete auth bypass active`

**Production Safety**: Multiple checks prevent accidental deployment with bypass enabled:
- Only works in `NODE_ENV=development`
- Automatically disabled on Vercel production
- Requires explicit `SKIP_AUTH=true` setting

### Quality Checklist

Before committing:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Manual testing of features
- [ ] Check console for errors

## Memories & Notes

### Development Workflow
- `npm run dev` is usually running and skip auth is already set to true when local

## Key Features

### Booking System
- **Files:** `app/create-booking/`, `src/components/booking-form/`
- **Flow:** Select customer → Choose type → Pick time → Submit
- **Creates:** DB record + Calendar event + LINE notification

### Package Management
- **Files:** `app/package-monitor/`, `src/hooks/use-package-monitor.ts`
- **Lifecycle:** Create → First use (auto-activate) → Track usage → Monitor expiration

### Admin Dashboard
- **Files:** `app/admin/`, `src/lib/auth.ts`
- **Access:** Admin role required (automatically granted with `SKIP_AUTH=true`)

## Conventions

### Code Style
- **Components:** PascalCase, functional with TypeScript interfaces
- **Files:** kebab-case
- **Database:** snake_case tables/columns
- **No `any` types:** Use proper TypeScript typing

### Git Workflow
- Branch from `main`
- Prefix: `feature/`, `fix/`, `chore/`
- PR before merge

### Security
- Never commit secrets
- Validate all inputs
- Use parameterized queries
- Implement proper access control

## Environment Variables

Required (see `.env.example`):
```
NEXT_PUBLIC_REFAC_SUPABASE_URL=
REFAC_SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
```

## Deployment

```bash
git push origin main  # Auto-deploys to Vercel
```

**Pre-deployment:**
1. `npm run build` locally
2. `npm run typecheck` - Check TypeScript errors
3. Test critical paths

## Troubleshooting

### Common Issues

**Unauthorized errors:**
- Enable development bypass: `SKIP_AUTH=true` in `.env.local`
- Check browser session/cookies (production)
- Verify user in `allowed_users` table (production)

**Database issues:**
- Verify Supabase credentials
- Check RLS policies

**Calendar/LINE failures:**
- Verify API credentials
- Check environment variables

### Debug Mode
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Debug:', { data, params });
}
```

## MCP Tools Available

**Database:** `mcp__supabase__execute_sql`, `mcp__supabase__list_tables`
**Development:** `mcp__supabase__get_logs`, `mcp__supabase__generate_typescript_types`

Use `apply_migration` for DDL, `execute_sql` for DML operations.

## Resources

- **Docs:** `/docs/DOCUMENTATION_INDEX.md`
- **API Reference:** `/docs/api/API_REFERENCE.md`
- **Database Schema:** `/docs/technical/DATABASE_SCHEMA.md`
- **Supabase Dashboard:** [Project link]
- **Vercel Dashboard:** [Deployment monitoring]

---

**Remember:** Prioritize code clarity and maintainability over clever solutions.