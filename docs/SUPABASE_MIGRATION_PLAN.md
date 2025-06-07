# Supabase Project Migration Plan

## 🔄 Migration Overview

**Migration Type**: Cross-project data and schema migration  
**Source Project**: Package (dujqvigihnlfnvmcdrko)  
**Target Project**: bisimqmtxjsptehhqpeg  
**Target Schema**: `backoffice` (not `public`)  
**Key Change**: Transition from Anonymous Key → Service Role Key

---

## 📋 Current State Analysis

### Source Project Structure
- **Project Name**: Package
- **Project ID**: `dujqvigihnlfnvmcdrko`
- **Account ID**: `vktjlwhrzddeoljssfuf`
- **Region**: ap-southeast-1
- **Current Schema**: `public`

### Tables to Migrate
1. `allowed_users` - User access control (7 rows)
2. `bookings` - Booking records (~1,521 rows)
3. `customers` - Customer database (~1,908 rows)  
4. `package_types` - Package definitions (13 rows)
5. `package_usage` - Usage tracking (~1,162 rows)
6. `packages` - Package instances (312 rows)

### Codebase Analysis

#### 📍 **DIRECT IMPORTS from `@/lib/supabase`** (Need Migration)
1. `src/lib/auth.ts` - User authentication check
2. `src/hooks/usePackageForm.ts` - Package creation form
3. `src/hooks/useCustomerPackages.ts` - Customer package data fetching  
4. `src/components/package-form/index.tsx` - Package form component
5. `app/api/packages/usage/route.ts` - Package usage API
6. `app/api/test-db/route.ts` - Database test endpoint
7. `app/api/debug/route.ts` - Debug endpoint
8. `app/api/customers/route.ts` - Customer API

#### 🔗 **AUTH HELPERS** (Need Migration Strategy)
1. `src/hooks/useCustomers.ts` - Uses `createClientComponentClient()`
2. `app/api/packages/available/route.ts` - Uses `createRouteHandlerClient()`
3. `app/api/packages/[id]/route.ts` - Uses `createRouteHandlerClient()`
4. `app/api/packages/[id]/usage-history/route.ts` - Uses `createRouteHandlerClient()`
5. `app/api/packages/inactive/route.ts` - Uses `createRouteHandlerClient()`
6. `app/api/packages/monitor/route.ts` - Uses `createRouteHandlerClient()`
7. `app/api/packages/customer/[id]/route.ts` - Uses `createRouteHandlerClient()`
8. `app/api/packages/by-customer/[customerId]/route.ts` - Uses `createRouteHandlerClient()`
9. `app/api/packages/activate/route.ts` - Uses `createRouteHandlerClient()`
10. `app/api/customers/with-packages/route.ts` - Uses `createRouteHandlerClient()`

#### ✅ **Already using new client** (`src/lib/refac-supabase.ts`):
- `app/api/special-events/us-open/route.ts` & `upload/route.ts`
- `app/api/inventory/*` - All inventory management APIs  
- `app/api/bookings/*` - All booking APIs
- `scripts/import-historical-inventory.js`

---

## 🎯 Target State

### Target Project Structure
- **Project Name**: LENGOLF
- **Project ID**: `bisimqmtxjsptehhqpeg`
- **Account ID**: `psfjzjfrkzleuzipeefb`
- **Region**: ap-southeast-1
- **Target Schema**: `backoffice` (currently empty - will be created)
- **Authentication**: Service Role Key (server-side) + Anonymous Key (client-side)

#### Current Target Project Tables (Public Schema)
The target project already has a sophisticated booking system with:
- `bookings` (1,205 rows) - Main booking system
- `profiles` (715 rows) - User profiles  
- `crm_customer_mapping` (250 rows) - CRM integration
- `crm_packages` (52 rows) - Package tracking
- `inventory_*` tables - Full inventory management system
- `vip_*` tables - VIP customer system
- Plus supporting tables for history, logs, caching

✅ **Key Insight**: Target project has mature infrastructure but NO conflicts with `backoffice` schema

### Environment Variables
```bash
# New variables to add
NEXT_PUBLIC_REFAC_SUPABASE_URL=https://bisimqmtxjsptehhqpeg.supabase.co
NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY=<anon_key>
REFAC_SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# Old variables (to be phased out)
NEXT_PUBLIC_SUPABASE_URL=https://dujqvigihnlfnvmcdrko.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<old_anon_key>
```

---

## 👥 Role Assignments

### 🤖 **AI Assistant (MCP CLI Access)**
- ✅ Schema creation in target project
- ✅ Data migration via MCP CLI  
- ✅ Function and trigger migration
- ✅ RLS policy setup
- ✅ Permission configuration
- ✅ Validation queries and testing
- ✅ Code file updates (imports/references)

### 👤 **You (Manual Tasks)**  
- 🔧 Environment variable management
- 🔧 Manual pg_dump/psql commands (if MCP limitations)
- 🔧 Application testing and verification
- 🔧 Production deployment coordination
- 🔧 Rollback execution if needed
- 🔧 Final go/no-go decisions

### 🔄 **Hybrid (Coordinated)**
- 🤝 Schema modification review and approval
- 🤝 Data integrity verification
- 🤝 Performance testing
- 🤝 End-to-end application testing

---

## 📝 Step-by-Step Migration Plan

### Phase 1: Pre-Migration Setup (1-2 hours)

#### 1.1 Environment Preparation 👤 **[YOU]**
```bash
# 1. Backup current environment variables  
cp .env.local .env.local.backup

# 2. Verify new environment variables are already set
# ✅ ALREADY DONE - You have provided all keys:
# NEXT_PUBLIC_REFAC_SUPABASE_URL="https://bisimqmtxjsptehhqpeg.supabase.co"
# NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# REFAC_SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 1.2 Schema Preparation 🤖 **[AI - MCP]**  
```sql
-- Create backoffice schema in target project
CREATE SCHEMA IF NOT EXISTS backoffice;

-- Set search path for session  
SET search_path TO backoffice, public;
```

#### 1.3 Extensions and Functions Setup 🤖 **[AI - MCP]**
```sql
-- Enable required extensions in target project
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types in backoffice schema
CREATE TYPE backoffice.customer_source AS ENUM ('Walk In', 'Digital', 'Others', 'N.A.');
CREATE TYPE backoffice.package_type AS ENUM ('Monthly', 'Coaching', 'Unlimited');
```

### Phase 2: Schema Migration (2-3 hours)

#### 2.1 Export Current Schema 🔄 **[MCP SWITCHING REQUIRED]**
```bash
# Step 1: Switch to SOURCE MCP (forms - dujqvigihnlfnvmcdrko)
🤖 AI: Extract all table structures, constraints, types

# Step 2: Manual Schema Export (Backup Option)
👤 YOU: pg_dump -h db.dujqvigihnlfnvmcdrko.supabase.co \
        -U postgres -d postgres \
        --schema-only --no-owner --no-privileges \
        -f source_schema_backup.sql

# Step 3: Switch to TARGET MCP (booking - bisimqmtxjsptehhqpeg)  
🤖 AI: Create backoffice schema and recreate tables
```

#### 2.2 Schema Recreation 🤖 **[AI - TARGET MCP]**
Process (with MCP switching):
1. **🔄 SOURCE MCP**: Extract complete schema structure
2. **📝 Document**: Table definitions, constraints, enums
3. **🔄 TARGET MCP**: Create `backoffice` schema  
4. **🔨 TARGET MCP**: Recreate all tables with proper structure

#### 2.3 Verification 🤝 **[HYBRID]**
```sql
-- AI will verify table creation
SELECT table_name FROM information_schema.tables WHERE table_schema = 'backoffice';

-- You verify the output looks correct
```

### Phase 3: Data Migration (3-4 hours)

#### 3.1 Data Export & Import 🔄 **[MCP SWITCHING REQUIRED]**
Process with MCP limitations:
1. **🔄 SOURCE MCP**: Extract all data table by table (~5,000 rows)
2. **📝 Store locally**: Transform data for `backoffice` schema  
3. **🔄 TARGET MCP**: Import data maintaining referential integrity
4. **🔄 Alternative**: Manual pg_dump/psql if MCP row limits hit

**Critical**: Cannot access both databases simultaneously

#### 3.2 Data Transformation Logic 🤖 **[AI - MCP]**
```typescript
// AI will handle:
// 1. Preserve UUIDs for packages/customers
// 2. Maintain foreign key relationships
// 3. Handle enum type mapping
// 4. Process ~5,000 rows total:
//    - allowed_users (7 rows)
//    - bookings (1,521 rows)  
//    - customers (1,908 rows)
//    - package_types (13 rows)
//    - package_usage (1,162 rows)
//    - packages (312 rows)
```

#### 3.3 Data Verification 🤝 **[HYBRID]**
```sql
-- AI will run verification queries
🤖 SELECT COUNT(*) FROM backoffice.packages;
🤖 SELECT COUNT(*) FROM backoffice.customers;

-- You verify row counts match expectations
👤 Total rows should be ~5,000 across all tables
```

### Phase 4: Functions and Triggers Migration (2-3 hours)

#### 4.1 Export Functions
```sql
-- Export all custom functions and triggers
\df+ -- List functions
\dy+ -- List triggers
```

#### 4.2 Update Function Schema References
```sql
-- Example function update
CREATE OR REPLACE FUNCTION backoffice.get_available_packages(customer_name_param text)
RETURNS TABLE(...) AS $$
BEGIN
  -- Update all table references from public to backoffice
  RETURN QUERY SELECT ... FROM backoffice.packages WHERE ...;
END;
$$ LANGUAGE plpgsql;
```

#### 4.3 Update Triggers
```sql
-- Recreate triggers pointing to backoffice schema
DROP TRIGGER IF EXISTS update_package_expiry ON backoffice.packages;
CREATE TRIGGER update_package_expiry 
  BEFORE INSERT OR UPDATE ON backoffice.packages 
  FOR EACH ROW EXECUTE FUNCTION backoffice.set_expiry_date();
```

### Phase 5: RLS and Security Migration (1-2 hours)

#### 5.1 Migrate RLS Policies
```sql
-- Update RLS policies for backoffice schema
ALTER TABLE backoffice.allowed_users ENABLE ROW LEVEL SECURITY;

-- Recreate policies with proper schema references
CREATE POLICY "Enable read access for authenticated users" ON backoffice.allowed_users
  FOR SELECT USING (auth.role() = 'authenticated');
```

#### 5.2 Grant Permissions
```sql
-- Grant necessary permissions for service role
GRANT USAGE ON SCHEMA backoffice TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA backoffice TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA backoffice TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA backoffice TO service_role;

-- Grant read permissions for anon role where needed
GRANT USAGE ON SCHEMA backoffice TO anon;
GRANT SELECT ON backoffice.package_types TO anon;
```

### Phase 6: Code Migration (4-6 hours)

#### 6.1 Update Direct Imports 🤖 **[AI]**
```typescript
// AI will update these 8 files with direct imports:
// ✅ src/lib/auth.ts
// ✅ src/hooks/usePackageForm.ts  
// ✅ src/hooks/useCustomerPackages.ts
// ✅ src/components/package-form/index.tsx
// ✅ app/api/packages/usage/route.ts
// ✅ app/api/test-db/route.ts
// ✅ app/api/debug/route.ts
// ✅ app/api/customers/route.ts

// OLD: import { supabase } from '@/lib/supabase'
// NEW: import { refacSupabase, refacSupabaseAdmin } from '@/lib/refac-supabase'
```

#### 6.2 Update Auth Helper Files 🤖 **[AI]** 
```typescript
// AI will update these 10 files using auth helpers:
// ✅ src/hooks/useCustomers.ts
// ✅ app/api/packages/available/route.ts
// ✅ app/api/packages/[id]/route.ts  
// ✅ app/api/packages/[id]/usage-history/route.ts
// ✅ app/api/packages/inactive/route.ts
// ✅ app/api/packages/monitor/route.ts
// ✅ app/api/packages/customer/[id]/route.ts
// ✅ app/api/packages/by-customer/[customerId]/route.ts
// ✅ app/api/packages/activate/route.ts
// ✅ app/api/customers/with-packages/route.ts

// Strategy: Replace createRouteHandlerClient with refacSupabaseAdmin
// Replace createClientComponentClient with refacSupabase
```

#### 6.3 Update Table References 🤖 **[AI]**
```typescript
// AI will update ALL table references to use backoffice schema:
// OLD: .from('packages')
// NEW: .from('backoffice.packages')

// All affected tables:
// - backoffice.allowed_users
// - backoffice.bookings  
// - backoffice.customers
// - backoffice.package_types
// - backoffice.package_usage
// - backoffice.packages
```

#### 6.4 Testing After Migration 👤 **[YOU]**
```bash
# After AI completes code migration, you test:
npm run dev

# Test these critical flows:
# 1. Package creation form
# 2. Customer management
# 3. Package usage tracking  
# 4. Authentication system
```

### Phase 7: Testing and Validation (2-3 hours)

#### 7.1 Data Integrity Checks
```sql
-- Verify row counts match
SELECT 'source' as project, count(*) FROM public.packages
UNION ALL
SELECT 'target' as project, count(*) FROM backoffice.packages;

-- Verify key relationships
SELECT count(*) FROM backoffice.package_usage pu
JOIN backoffice.packages p ON pu.package_id = p.id;
```

#### 7.2 Function Testing
```sql
-- Test all migrated functions
SELECT backoffice.get_available_packages('Test Customer');
SELECT * FROM backoffice.package_types ORDER BY display_order;
```

#### 7.3 Application Testing
```bash
# Run application in development mode
npm run dev

# Test key workflows:
# 1. Package creation
# 2. Customer management  
# 3. Package usage tracking
# 4. Booking system
# 5. Authentication
```

---

## ⚠️ Risk Assessment and Mitigation

### High-Risk Areas

#### 1. Data Loss Risk
- **Risk**: Data corruption during migration
- **Mitigation**: 
  - Full database backup before migration
  - Row-by-row validation scripts
  - Rollback procedures documented

#### 2. Permission Mismatches
- **Risk**: RLS policies may not work correctly in new schema
- **Mitigation**:
  - Test all user access patterns
  - Service role bypass for admin operations
  - Gradual permission testing

#### 3. Function Dependencies
- **Risk**: Functions may reference hardcoded schema names
- **Mitigation**:
  - Comprehensive function audit
  - Test all stored procedures
  - Search path configuration

#### 4. Downtime Risk
- **Risk**: Application unavailable during migration
- **Mitigation**:
  - Parallel environment setup
  - Blue-green deployment strategy
  - DNS-level switching capability

### Medium-Risk Areas

#### 5. Environment Variable Conflicts
- **Risk**: Mixed old/new configurations
- **Mitigation**: Clear variable naming conventions

#### 6. Client-Side Caching
- **Risk**: Browser caches old API responses
- **Mitigation**: Cache busting strategies

#### 7. Foreign Key Constraints
- **Risk**: Constraint violations during data import
- **Mitigation**: Ordered data import based on dependencies

---

## 🧪 Testing and Verification Checklist

### Pre-Migration Verification
- [ ] Source database backup completed
- [ ] Target environment setup verified
- [ ] All environment variables configured
- [ ] Schema creation scripts tested
- [ ] Function migration scripts prepared

### Data Migration Verification
- [ ] Row counts match between source and target
- [ ] Primary key integrity maintained
- [ ] Foreign key relationships preserved
- [ ] UUID references consistent
- [ ] Enum values correctly mapped
- [ ] Date/timestamp formats preserved

### Function and Logic Verification
- [ ] All stored functions working
- [ ] Triggers firing correctly
- [ ] RLS policies enforced properly
- [ ] Search paths configured correctly
- [ ] Custom types available

### Application Integration Verification
- [ ] Authentication working
- [ ] Package creation flow
- [ ] Customer management operations
- [ ] Package usage tracking
- [ ] Booking system integration
- [ ] Inventory management (if applicable)
- [ ] Report generation
- [ ] API endpoints responding correctly

### Performance Verification
- [ ] Query performance comparable
- [ ] Index usage optimized
- [ ] Connection pooling configured
- [ ] Memory usage acceptable
- [ ] Response times within SLA

---

## 🔄 Rollback Procedures

### Emergency Rollback (< 15 minutes)
```bash
# 1. Revert environment variables
cp .env.local.backup .env.local

# 2. Restart application
npm run dev

# 3. Verify old system operational
```

### Gradual Rollback (if issues found)
1. Identify problematic components
2. Revert specific files to old Supabase client
3. Test incrementally
4. Document issues for resolution

---

## 📝 Special Considerations

### Authentication Users
- **Current State**: Users managed in source project
- **Migration**: Export `auth.users` if needed
- **Consideration**: May need to recreate user accounts in target project

### Storage Files
- **Current State**: Files stored in source project storage
- **Migration**: 
  ```bash
  # Export storage bucket contents
  supabase storage export --bucket-name=<bucket> --output=storage_backup/
  
  # Import to target project
  supabase storage import --target-project=<target> storage_backup/
  ```

### Extensions
- **Required Extensions**:
  - `uuid-ossp` - For UUID generation
  - `pgcrypto` - For cryptographic functions
- **Action**: Verify all extensions enabled in target project

### Environment-Specific Configurations
- **Development**: Maintain both connections during transition
- **Staging**: Full migration testing environment
- **Production**: Scheduled maintenance window required

---

## 📅 Migration Timeline

| Phase | Duration | Who | Dependencies | Deliverables |
|-------|----------|-----|--------------|--------------|
| Pre-Migration Setup | 1-2 hours | 👤 YOU + 🤖 AI | Environment access | Schema ready, configs set |
| Schema Migration | 2-3 hours | 🤖 AI (MCP) | Target project ready | Schema deployed |
| Data Migration | 3-4 hours | 🤖 AI (MCP) | Schema complete | Data transferred |
| Functions Migration | 2-3 hours | 🤖 AI (MCP) | Data available | Functions working |
| RLS Migration | 1-2 hours | 🤖 AI (MCP) | Functions ready | Security configured |
| Code Migration | 4-6 hours | 🤖 AI | Backend ready | Application updated |
| Testing & Validation | 2-3 hours | 🤝 HYBRID | Code complete | System verified |
| **Total** | **15-23 hours** | **Mix** | | **Migration complete** |

### 🚀 **Execution Strategy** 
- **🔄 MCP Limitation**: Can only use ONE MCP server at a time
- **📋 Coordination required**: Switch between source/target MCPs
- **🔧 CLI Backup**: Manual pg_dump/psql for large data transfers
- **🤝 You control**: MCP switching and final go-live decision

---

## 🔧 Post-Migration Tasks

### Immediate (Day 1)
- [ ] Monitor application performance
- [ ] Verify all user workflows
- [ ] Check error logs
- [ ] Validate data consistency

### Short-term (Week 1)
- [ ] Performance optimization
- [ ] User feedback collection
- [ ] Documentation updates
- [ ] Team training on new structure

### Long-term (Month 1)
- [ ] Remove old environment variables
- [ ] Archive source project (if appropriate)
- [ ] Update deployment procedures
- [ ] Create new backup strategies

---

## 📚 Additional Resources

### Documentation References
- [Supabase Schema Management](https://supabase.com/docs/guides/database/schemas)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Service Role vs Anonymous Keys](https://supabase.com/docs/guides/database/api#the-service_role-key)

### Tools and Scripts
- Migration validation scripts
- Data comparison queries  
- Performance monitoring queries
- Rollback automation scripts

---

## ✅ Migration Success Criteria

The migration will be considered successful when:

1. **Data Integrity**: All data migrated without loss
2. **Functionality**: All application features working
3. **Performance**: Response times within acceptable range
4. **Security**: RLS and permissions properly configured  
5. **Stability**: No critical errors in 24-hour monitoring period
6. **User Experience**: No user-facing disruptions

---

## 🎯 **Next Steps & Quick Start**

### ✅ **Ready to Execute Immediately**
You have all required environment variables and API keys configured. The AI can begin migration immediately with:

1. **🤖 AI starts with**: Schema creation (Phase 1.2-1.3)
2. **🤖 AI continues**: Data migration via MCP CLI (Phases 2-5)  
3. **🤖 AI updates**: All 18 code files (Phase 6)
4. **🤝 Together**: Final testing and validation

### 📋 **Your Preparation Tasks**
- [ ] Backup `.env.local` file
- [ ] Confirm you have database access for manual verification
- [ ] Prepare testing checklist for post-migration
- [ ] Schedule time window for validation

### 🚨 **Critical Decision Points**
1. **After Phase 3**: Verify data integrity before proceeding
2. **After Phase 6**: Test application functionality before go-live
3. **Rollback trigger**: Any critical issues = immediate rollback to old system

### 🏁 **Success Metrics**
- ✅ All 5,000+ rows migrated successfully
- ✅ All 18 code files updated correctly  
- ✅ Package creation/management works
- ✅ Customer authentication works
- ✅ No data loss or corruption

---

*This migration plan should be reviewed and approved by the technical team before execution. With MCP CLI access to both projects, the AI can execute most phases automatically while you maintain oversight and control.* 