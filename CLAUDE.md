# Lengolf Forms - Developer Guide

Essential instructions for working with the Lengolf Forms codebase.

## 🏢 Business Context (CRITICAL - Read First)

**Lengolf is a golf simulator/bay rental business in Bangkok, Thailand.**

### Revenue Model - IMPORTANT
- **Primary Revenue**: Bay bookings (hourly rental of golf simulator bays)
- **Secondary Revenue**: Coaching sessions (paid instruction with golf pros)
- **Other Revenue**: POS transactions (food, drinks, accessories), packages
- **⚠️ Club Rentals are FREE** - Golf club rentals are complimentary with bay bookings, NOT a separate revenue line item

### Before Analyzing Pricing or Revenue Data
1. **ASK clarifying questions** about the business model rather than making assumptions
2. Club rentals = FREE with bay bookings (do not analyze as revenue)
3. Bay bookings = PRIMARY revenue source
4. Coaching = SEPARATE revenue stream (not included in bay booking price)
5. Packages = Pre-paid bundles of bay hours or coaching sessions

### Key Business Rules
- Operating hours: Typically 10:00 AM - 10:00 PM (varies by day)
- Bay types: Standard bays, VIP bays (premium pricing)
- Customer types: Walk-in, members, package holders
- Booking durations: 1 hour minimum, typically 1-3 hours

## 📊 Data Analysis Guidelines

### Before Starting Any Analysis
1. **Verify assumptions** - Query the schema first to understand table relationships
2. **Ask clarifying questions** - If pricing model or business rules are unclear
3. **Use TodoWrite** - Break complex analyses into tracked steps for resumability
4. **Cross-validate results** - Check findings against at least 2 data points before presenting

### Common Analysis Pitfalls to Avoid
- ❌ Assuming club rentals generate revenue (they are FREE)
- ❌ Conflating bay booking revenue with coaching revenue
- ❌ Making pricing recommendations without understanding bundling
- ❌ Analyzing partial data without noting limitations

### Multi-Step Analysis Pattern
For complex business analyses, always:
1. Create a TodoWrite checklist of steps
2. Query and document relevant table schemas first
3. Validate assumptions with test queries
4. Present findings with confidence levels
5. Flag anomalies for human review rather than making assumptions

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
npm run dev          # Development server + logs to dev.log (Claude CLI can read)
npm run dev:nolog    # Development server without log file
npm run dev:local    # Development server with LOCAL Docker Supabase (for testing migrations)
npm run dev:mobile   # Development server with mobile testing info and QR code
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript validation
```

**Environment Switching:**
- `npm run dev` - Uses production Supabase (from `.env`)
- `npm run dev:local` - Uses local Docker Supabase (copies `.env.local.docker` → `.env.local`)

## Architecture

**Tech Stack:** Next.js 15.5, React 19.1, TypeScript, Tailwind CSS, Supabase 2.57, NextAuth.js

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

**Querying Data:**
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

**Schema Migrations:**

⚠️ **IMPORTANT:** Always use the Supabase branching workflow for schema changes.

**Recommended Workflow (Local Development with Dev Branch):**
1. Create persistent `develop` branch in Supabase Dashboard
2. Link locally to dev branch: `npx supabase link --project-ref <dev-branch-id>`
3. Make schema changes and test locally against dev branch
4. Generate migration: `npm run db:diff migration_name`
5. Commit migration to git
6. Open PR → Preview branch auto-created → Test → Merge → Production

See complete guide: [Local Development Workflow](docs/SUPABASE_LOCAL_DEVELOPMENT_WORKFLOW.md)

**Quick Workflow (Direct to PR):**
```bash
# Create migration file (use your personal access token from Supabase Dashboard)
export SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN"  # Set in your shell profile or .env.local
npm run db:diff migration_name

# Commit and push to GitHub
git add supabase/migrations/
git commit -m "feat: Add migration description"
git push

# Open PR → Preview branch created automatically
# Test on preview branch → Merge → Auto-deploys to production
```

See setup guide: [Supabase Branching Setup](docs/SUPABASE_BRANCHING_SETUP.md)

**Do NOT:**
- ❌ Use MCP `apply_migration` for schema changes (only for emergency fixes)
- ❌ Make schema changes directly in production Supabase Dashboard
- ❌ Apply migrations without testing on dev/preview branch

## Testing & Development

### Mobile Testing (Same WiFi Network) - FREE & FASTEST

Test your app on real mobile devices without deploying to production!

**Quick Start:**
```bash
# Option 1: Use the helper script (recommended)
npm run dev:mobile

# Option 2: Standard dev server (also works)
npm run dev
```

**How It Works:**
1. Your PC and phone are on the same WiFi network
2. The dev server is accessible at your PC's IP address
3. Open the displayed URL on your mobile browser
4. Test real keyboard behavior instantly!

**Your Setup:**
- **PC IP Address:** `192.168.1.196`
- **Mobile URL:** `http://192.168.1.196:3000`

**Instructions:**
1. Make sure your phone is on the SAME WiFi as your PC
2. Run `npm run dev:mobile` (or `npm run dev`)
3. On your phone, open Safari/Chrome
4. Navigate to: `http://192.168.1.196:3000`
5. Bookmark this URL for quick access!

**Features:**
- ✅ Real device, real keyboard behavior
- ✅ Hot reload works instantly
- ✅ No deployment needed
- ✅ Completely free
- ✅ Test keyboard overlay, viewport resize, input behavior

**Troubleshooting:**
- **Can't connect?** Verify both devices on same WiFi
- **Connection refused?** Make sure dev server is running
- **IP changed?** Re-run `ipconfig` to get new IP address

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
- [ ] `npm run lint` passes (no warnings)
- [ ] `npm run typecheck` passes
- [ ] Manual testing of features
- [ ] Check console for errors

## ⚠️ Common Errors to Avoid

### React Hooks - ESLint exhaustive-deps

**Problem:** `React Hook useEffect has missing dependencies`

**Bad:**
```typescript
const fetchData = async () => {
  const response = await fetch(`/api/data/${id}`);
  // ...
};

useEffect(() => {
  fetchData();
}, [id]); // ❌ Warning: fetchData is missing
```

**Good:**
```typescript
// Import useCallback
import { useState, useEffect, useCallback } from 'react';

// Wrap function in useCallback with proper dependencies
const fetchData = useCallback(async () => {
  const response = await fetch(`/api/data/${id}`);
  // ...
}, [id]); // ✅ Dependencies specified

// Define callback BEFORE useEffect
useEffect(() => {
  fetchData();
}, [fetchData]); // ✅ No warning
```

**Key Rules:**
1. Always import `useCallback` when creating functions used in `useEffect`
2. Declare `useCallback` functions **before** the `useEffect` that uses them
3. Include all external dependencies in the `useCallback` dependency array
4. Use the callback function itself in the `useEffect` dependency array

### React - Unescaped Entities

**Problem:** `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`

**Bad:**
```tsx
<p>I'll be there</p>  // ❌ Warning
<p>"User's name"</p>   // ❌ Warning
```

**Good:**
```tsx
<p>I&apos;ll be there</p>      // ✅ Escaped apostrophe
<p>&ldquo;User&rsquo;s name&rdquo;</p>  // ✅ Escaped quotes
```

### TypeScript - Function Hoisting with useCallback

**Problem:** `Block-scoped variable used before its declaration`

**Bad:**
```typescript
useEffect(() => {
  fetchData();
}, [fetchData]);

const fetchData = useCallback(async () => {
  // ❌ Error: used before declaration
}, []);
```

**Good:**
```typescript
// Declare useCallback FIRST
const fetchData = useCallback(async () => {
  // ✅ Correct order
}, []);

// Then use in useEffect
useEffect(() => {
  fetchData();
}, [fetchData]);
```

### Customer Creation - Field Requirements

**Remember:**
- Full name is **required**, minimum 2 characters
- Phone number is **required**, 9-10 digits
- Email is **optional** but must be valid format if provided
- Always validate on both client and server side
- Handle duplicate phone numbers gracefully

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

### Dev Server Logs (Claude Code CLI Access)
- **Log File**: `dev.log` in project root - auto-generated when running `npm run dev`
- **How it works**: `npm run dev` pipes all server output to both console AND `dev.log`
- **Claude CLI can read logs**: Use `cat dev.log` or ask to "check the logs" / "read dev.log"
- **Use cases**: Debug runtime errors, check API responses, monitor compilation
- **Script**: `scripts/dev-with-logs.js` handles the dual output
- **Note**: `dev.log` is in `.gitignore` - not committed to repo
- **Alternative**: `npm run dev:nolog` runs without logging to file


### Custom Product Feature (Added Jan 2025)
- **Location**: POS Product Catalog - subtle "Add Custom Product" button at bottom of views
- **Implementation**: Uses existing `products.products` table with `is_custom_product = true`
- **Database Fields**: `is_custom_product`, `custom_created_by`, `show_in_staff_ui = false`
- **Modal**: Full-screen tablet-friendly interface (`CustomProductModal.tsx`)
- **API**: `/api/pos/products/custom` - creates product and returns immediately for order
- **Integration**: Custom products work identically to regular products in orders/transactions
- **Note**: `profit_margin` is a generated column - don't try to insert values into it

### Marketing Analytics (Aug 2025)
- **ETL Architecture**: Data populated by external Cloud Run service, not this application
- **Dashboard**: Read-only marketing dashboard at `/admin/marketing-dashboard`
- **Data Sources**: `marketing.google_ads_campaign_performance`, `marketing.meta_ads_campaign_performance`
- **API Endpoints**: `/api/marketing/overview`, `/api/marketing/performance`, `/api/marketing/charts`
- **⚠️ Critical**: All Supabase queries MUST use `.schema('marketing')` before `.from()` calls
- **Schema Tables**: All marketing data is in the `marketing` schema, not the default `public` schema

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

Required (see `.env` for complete list with 55+ variables):
```bash
# Database (Primary)
NEXT_PUBLIC_REFAC_SUPABASE_URL=
NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY=
REFAC_SUPABASE_SERVICE_ROLE_KEY=

# Authentication
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Messaging
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
LINE_GROUP_ID=

# AI Features
OPENAI_API_KEY=
AI_SUGGESTION_ENABLED=true

# Development Bypass
SKIP_AUTH=true  # Set in .env.local for local dev
```

See `README.md` for complete environment variable documentation including Google Calendar IDs, Meta/WhatsApp integration, push notifications (VAPID), and more.

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

### Database Access
**Primary Lengolf Database:** Use `mcp__supabase__execute_sql` for all Lengolf business data
- Schemas: `public`, `backoffice`, `pos`, `marketing`
- Bay bookings, customers, packages, coaching, POS transactions

**Wedding Database (if available):** Use `mcp__supabase_wedding__execute_sql` for wedding-related queries
- Separate Supabase instance for wedding planning/guest management

**Tool Reference:**
- `mcp__supabase__execute_sql` - Query Lengolf production data (READ-ONLY)
- `mcp__supabase__list_tables` - List tables in Lengolf database
- `mcp__supabase__get_logs` - Debug Supabase logs
- `mcp__supabase__generate_typescript_types` - Generate TypeScript types

**⚠️ Migration Policy:**
- Use `execute_sql` for **querying data only** (SELECT statements)
- Use `apply_migration` **only for emergency production fixes** (rare cases)
- For **all planned schema changes**, use the Supabase branching workflow (see [Supabase Branching Setup](docs/SUPABASE_BRANCHING_SETUP.md))
- This ensures all schema changes are:
  - ✅ Tested on preview branches before production
  - ✅ Tracked in version control (git)
  - ✅ Reviewed through pull requests
  - ✅ Automatically deployed on merge

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
- **🌿 Supabase Branching & GitHub Integration:** `/docs/SUPABASE_BRANCHING_SETUP.md` - Database migration workflow
- **💻 Local Development with Supabase Branches:** `/docs/SUPABASE_LOCAL_DEVELOPMENT_WORKFLOW.md` - Test locally with dev branch

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