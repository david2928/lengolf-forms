# Lengolf Forms - Developer Guide

Essential instructions for working with the Lengolf Forms codebase.

## 📖 Documentation-First Development

**IMPORTANT:** This project has comprehensive, organized documentation. Always check the documentation before implementing features or making changes.

### Documentation Structure
The documentation is now organized by user access patterns:
- **📋 [Main Index](docs/DOCUMENTATION_INDEX.md)** - Start here for everything
- **🌟 Public Features** - Staff-accessible features (`docs/features/public/`)
- **🔧 Admin Features** - Administrative features (`docs/features/admin/`)
- **🗄️ Database** - Complete database documentation (`docs/database/`)
- **⚙️ Technical** - System architecture and integration (`docs/technical/`)

### Before Any Development Work
1. **Read the relevant documentation** - Find your feature area in the organized structure
2. **Validate current implementation** - Check if code matches documented patterns
3. **Update docs if needed** - Keep documentation current with changes

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

**Database Schemas:** (4 total - see [Database Documentation](docs/database/DATABASE_DOCUMENTATION_INDEX.md))
- `public`: Core booking tables (25+ tables, 100+ functions)
- `backoffice`: Customer, package, admin tables (20+ tables, 25+ functions)
- `pos`: POS transaction data (15+ tables, 20+ functions)
- `auth`: Supabase authentication (16 tables, managed)

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

## Scraper Service Architecture

The social media competitor scraping functionality has been moved to a separate service for better scalability and reliability:

### Architecture
```
Main App (Vercel) → Scraper Service (Cloud Run) → Supabase Database
```

### Local Development
The scraper service is located in `./scraper-service/` directory and runs independently:

```bash
# Start scraper service
cd scraper-service
npm install
npm run dev  # Runs on port 8080

# Main app calls scraper service
SCRAPER_SERVICE_URL=http://localhost:8080
SCRAPER_API_KEY=your_api_key
```

### API Integration
- `POST /api/competitors/sync` - Triggers full competitor sync via Cloud Run
- `POST /api/competitors/test` - Tests individual platform scraping

### Deployment
- **Main App**: Deployed to Vercel (no Playwright dependencies)
- **Scraper Service**: Deployed to Google Cloud Run with Playwright

## Memories & Notes

### Development Workflow
- `npm run dev` is usually running and skip auth is already set to true when local
- Scraper service runs separately on port 8080 for local testing

### Custom Product Feature (Added Jan 2025)
- **Location**: POS Product Catalog - subtle "Add Custom Product" button at bottom of views
- **Implementation**: Uses existing `products.products` table with `is_custom_product = true`
- **Database Fields**: `is_custom_product`, `custom_created_by`, `show_in_staff_ui = false`
- **Modal**: Full-screen tablet-friendly interface (`CustomProductModal.tsx`)
- **API**: `/api/pos/products/custom` - creates product and returns immediately for order
- **Integration**: Custom products work identically to regular products in orders/transactions
- **Note**: `profit_margin` is a generated column - don't try to insert values into it

## Key Features

### Booking System
- **Files:** `app/create-booking/`, `src/components/booking-form/`
- **Flow:** Select customer → Choose type → Pick time → Submit
- **Creates:** DB record + Calendar event + LINE notification

### Package Management
- **Files:** `app/package-monitor/`, `src/hooks/use-package-monitor.ts`
- **Lifecycle:** Create → First use (auto-activate) → Track usage → Monitor expiration

### Coaching Assistant
- **Files:** `app/coaching-assist/`, `src/components/admin/coaching/`
- **Access:** All authenticated staff (no admin role required)

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

## 📚 Documentation Resources

### Primary Entry Points
- **📋 Main Documentation Index:** `/docs/DOCUMENTATION_INDEX.md` - Start here for all documentation
- **🔧 API Reference:** `/docs/api/API_REFERENCE.md` - Complete API endpoint documentation
- **🗄️ Database Documentation:** `/docs/database/DATABASE_DOCUMENTATION_INDEX.md` - Complete database schemas and functions
- **🏗️ Project Structure:** `/docs/PROJECT_STRUCTURE.md` - Codebase organization
- **🎨 Frontend Documentation:** `/docs/frontend/FRONTEND_OVERVIEW.md` - Component architecture

### Feature Documentation (Organized Structure)
- **🌟 Public/Staff Features:** `/docs/features/public/` - Features accessible to staff
  - `booking-scheduling/` - Booking system, calendar integration
  - `customer-packages/` - Customer management, packages
  - `coaching/` - Coaching system
  - `pos/` - Point of sale system (13 detailed docs)
  - `staff-operations/` - Time clock, scheduling, inventory
- **🔧 Admin Features:** `/docs/features/admin/` - Administrative features
  - `analytics/` - Sales dashboard, referral analytics
  - `system-management/` - Admin panel, staff management
  - `data-management/` - ETL pipeline, product mapping

### Technical Documentation
- **🔐 Authentication:** `/docs/technical/AUTHENTICATION_SYSTEM.md`
- **⚡ Development Auth Bypass:** `/docs/technical/DEVELOPMENT_AUTHENTICATION.md`
- **🔗 Integrations:** `/docs/integrations/LINE_MESSAGING_INTEGRATION.md`

### External Resources
- **Supabase Dashboard:** [Project link]
- **Vercel Dashboard:** [Deployment monitoring]

## 📖 Documentation Usage Guidelines

### Before Working on Any Task
1. **Always check the documentation first** - Use `/docs/DOCUMENTATION_INDEX.md` as your starting point
2. **Read relevant feature documentation** - Find the appropriate section in the organized structure
3. **Validate implementation against docs** - Ensure your changes align with documented patterns
4. **Update documentation if needed** - Keep docs current with any changes made

### Finding Information Quickly
- **By Role:** Use the role-based navigation in the main documentation index
- **By Feature:** Navigate to appropriate subfolder in `/docs/features/`
- **Database Questions:** Start with `/docs/database/DATABASE_DOCUMENTATION_INDEX.md`
- **API Integration:** Check `/docs/api/API_REFERENCE.md` and `/docs/api/COACHING_API_REFERENCE.md`

### Documentation Validation
When implementing features:
1. **Read the existing documentation** for the feature area
2. **Verify current implementation** matches documented patterns
3. **Check database schema** if working with data
4. **Review API patterns** if creating endpoints
5. **Update docs** if implementation differs from documentation

**Important:** The codebase is the source of truth. If documentation conflicts with implementation, validate against the code and update docs accordingly.

---

**Remember:** Prioritize code clarity and maintainability over clever solutions.