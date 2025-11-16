# Local Docker Development with Supabase

**Last Updated:** November 16, 2025

## Overview

This guide shows how to develop and test database migrations locally using Docker, then apply them to production. **This approach costs $0** (no cloud branches needed).

## Workflow Summary

```
┌─────────────────────────────────────────────┐
│ 1. Start Local Supabase (Docker)            │
│    npx supabase start                       │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│ 2. Make Schema Changes                      │
│    - Via local Studio Dashboard             │
│    - Or write SQL migration files           │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│ 3. Test Locally                             │
│    npm run dev (points to local DB)         │
│    Create test data, verify changes work    │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│ 4. Generate Migration File                  │
│    npm run db:diff migration_name           │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│ 5. Reset Local DB & Re-test                │
│    npx supabase db reset                    │
│    Applies ALL migrations from scratch      │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│ 6. Commit Migration to Git                  │
│    git add supabase/migrations/             │
│    git commit -m "feat: Add migration"      │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│ 7. Apply to Production                      │
│    npx supabase db push --linked            │
│    (applies new migrations to production)   │
└─────────────────────────────────────────────┘
```

**Cost: $0** (everything runs locally except final production push)

---

## Prerequisites

### 1. Docker Desktop

**Check if installed:**
```bash
docker --version
```

**If not installed:**
- Download from: https://www.docker.com/products/docker-desktop
- Install and start Docker Desktop
- Verify it's running (Docker icon in system tray)

### 2. Supabase CLI

Already installed! (from earlier setup)

```bash
npx supabase --version
# Should show: 2.58.5 or similar
```

---

## One-Time Setup

### 1. Initialize Supabase Locally

Already done! You have:
- ✅ `supabase/config.toml`
- ✅ `supabase/migrations/` (with existing migrations)
- ✅ `supabase/seed.sql`

### 2. Update config.toml for Local Development

The default config.toml is already set up for local development. No changes needed!

### 3. Create Local Environment File

Create `.env.local.docker`:

```bash
# Local Docker Supabase
NEXT_PUBLIC_REFAC_SUPABASE_URL=http://localhost:54321
REFAC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
SKIP_AUTH=true
```

**Note:** The service role key is the default local Supabase key (safe for local development only).

---

## Daily Development Workflow

### Step 1: Start Local Supabase

```bash
# Start all Supabase services in Docker
npx supabase start
```

**First time:** This will download Docker images (~2-3 minutes)

**Output:**
```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Studio Dashboard:** Open http://localhost:54323 in your browser

### Step 2: Configure Your App to Use Local Supabase

```bash
# Use local Docker Supabase
cp .env.local.docker .env.local

# Restart dev server
npm run dev
```

Your app now connects to the **local Docker database** (not production)!

### Step 3: Make Schema Changes

#### Option A: Via Local Studio Dashboard

1. Open http://localhost:54323
2. Go to **SQL Editor**
3. Run your schema changes:
   ```sql
   ALTER TABLE backoffice.customers
   ADD COLUMN tags TEXT[];
   ```

#### Option B: Create Migration File Manually

```bash
# Create new migration file
npm run db:migration add_customer_tags
```

Edit `supabase/migrations/<timestamp>_add_customer_tags.sql`:
```sql
-- Add tags column to customers
ALTER TABLE backoffice.customers
ADD COLUMN tags TEXT[];

-- Create index
CREATE INDEX idx_customers_tags ON backoffice.customers USING GIN(tags);
```

Apply to local DB:
```bash
npx supabase db reset
```

### Step 4: Test Changes Locally

```bash
# Your app is already running against local Docker DB
npm run dev

# Open http://localhost:3000
# Test your changes with the new schema
```

**Create test data in local DB:**
- Via your app's UI
- Via Studio Dashboard (http://localhost:54323)
- Via SQL Editor

### Step 5: Generate Migration File (If Using Studio)

If you made changes via Studio Dashboard, generate a migration:

```bash
# Generate migration from local schema changes
npx supabase db diff -f add_customer_tags
```

This creates: `supabase/migrations/<timestamp>_add_customer_tags.sql`

### Step 6: Test Migration from Scratch

**Important:** Test that your migration works when applied to a fresh database:

```bash
# Reset local DB (drops everything, reapplies all migrations)
npx supabase db reset

# Verify all migrations applied successfully
# Check your app still works: npm run dev
```

This ensures your migration file is complete and doesn't depend on manual steps.

### Step 7: Commit Migration to Git

```bash
# Review the migration
cat supabase/migrations/<timestamp>_add_customer_tags.sql

# Commit
git add supabase/migrations/
git commit -m "feat: Add tags column to customers table"
git push
```

### Step 8: Apply to Production

**Now push to production:**

```bash
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"

# Link to production (if not already linked)
npx supabase link --project-ref bisimqmtxjsptehhqpeg

# Push migration to production
npx supabase db push
```

**This will:**
- Show you which migrations will be applied
- Ask for confirmation
- Apply only the new migrations to production
- Update production's migration history table

**Done!** ✅ Production now has your changes.

---

## Useful Commands

### Start/Stop Local Supabase

```bash
# Start
npx supabase start

# Stop (keeps data)
npx supabase stop

# Stop and remove all data
npx supabase stop --no-backup

# Check status
npx supabase status
```

### Database Commands

```bash
# Reset DB (apply all migrations fresh)
npx supabase db reset

# List migrations
npx supabase migration list

# Create new migration
npm run db:migration migration_name

# Generate migration from schema diff
npm run db:diff migration_name

# Push to production
npx supabase db push
```

### Accessing Local Database

**Via Studio Dashboard:**
- Open http://localhost:54323
- Use Table Editor, SQL Editor, etc.

**Via psql:**
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres
```

**Via your app:**
```bash
# Use .env.local.docker
cp .env.local.docker .env.local
npm run dev
```

---

## Switching Between Local and Production

### Work Locally (Development):

```bash
# Use local Docker DB
cp .env.local.docker .env.local
npx supabase start
npm run dev
```

### Read from Production (Debugging):

```bash
# Use production DB (READ ONLY!)
cp .env.local.production .env.local
npm run dev
```

**⚠️ WARNING:** Never write to production directly! Only use for debugging.

### Apply Migrations to Production:

```bash
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
npx supabase link --project-ref bisimqmtxjsptehhqpeg
npx supabase db push
```

---

## Seeding Local Database

### Automatic Seeding

The `supabase/seed.sql` file runs automatically when you:
```bash
npx supabase db reset
```

### Manual Seeding

Run SQL in local Studio Dashboard or via psql.

### Copying Production Data (Optional)

If you want realistic production data locally:

```bash
# 1. Dump production data
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
npx supabase db dump \
  --linked \
  --data-only \
  --schema public \
  --schema backoffice \
  --schema pos \
  > prod_data.sql

# 2. Import to local Docker
psql postgresql://postgres:postgres@localhost:54322/postgres < prod_data.sql
```

**Security Note:** Be careful with production data! Consider anonymizing sensitive data.

---

## Troubleshooting

### Docker not running

```
Error: Cannot connect to the Docker daemon
```

**Solution:** Start Docker Desktop

### Port already in use

```
Error: port 54321 is already allocated
```

**Solution:**
```bash
# Stop conflicting services
npx supabase stop

# Or change ports in supabase/config.toml
```

### Migrations out of sync

```bash
# Reset local DB completely
npx supabase db reset

# This reapplies ALL migrations from scratch
```

### Can't connect to local DB

```bash
# Check Supabase status
npx supabase status

# Should show all services running
# If not, restart:
npx supabase stop
npx supabase start
```

### Want fresh start

```bash
# Remove all local data and restart
npx supabase stop --no-backup
npx supabase start
npx supabase db reset
```

---

## Production Deployment Checklist

Before `npx supabase db push`:

- [ ] Tested migration locally with `npx supabase db reset`
- [ ] Migration applies cleanly from scratch
- [ ] App works with new schema locally
- [ ] Migration file committed to git
- [ ] Reviewed migration SQL for errors
- [ ] Backed up production data (if making destructive changes)
- [ ] Ready to apply to production

---

## Refreshing Local Data from Production

Want to sync your local database with the latest production data?

### One-Command Sync

```bash
npm run db:sync
```

This command automatically:
1. ✅ Dumps production schema and data
2. ✅ Resets local Docker database
3. ✅ Loads production data into local
4. ✅ Keeps your local environment up-to-date

**When to use:**
- Need latest production data for testing
- Want realistic customer/booking data locally
- After major production data changes

**Note:** This overwrites your local database completely. Any local-only data will be lost.

---

## Advantages of This Workflow

✅ **Free** - No cloud branch costs ($0)
✅ **Fast** - Local development, no network latency
✅ **Safe** - Test migrations locally before production
✅ **Complete** - Full Supabase stack (Postgres, Auth, Storage, etc.)
✅ **Isolated** - Local changes don't affect production
✅ **Reproducible** - `db reset` ensures migrations work from scratch
✅ **Version controlled** - All migrations in git
✅ **Offline capable** - Work without internet (except production push)

---

## Comparison: Local Docker vs Cloud Branches

| Feature | Local Docker | Cloud Branch |
|---------|--------------|--------------|
| **Cost** | **$0** | ~$10/month (persistent) |
| **Speed** | Very fast (local) | Slower (network) |
| **Internet** | Not required | Required |
| **Sharing** | Can't share | Can share with team |
| **Environment** | 99% same as prod | 100% same as prod |
| **Data** | Create your own | Can copy from prod |
| **Setup** | Requires Docker | No Docker needed |

---

## Summary

**Your new workflow:**

1. **Local Development:** Use Docker Supabase (free, fast)
2. **Create Migrations:** Test locally, generate migration files
3. **Version Control:** Commit migrations to git
4. **Production Deploy:** `npx supabase db push` (applies migrations safely)

**Monthly cost: $0** 🎉

No branches needed, everything tested locally first, safe production deployment!
