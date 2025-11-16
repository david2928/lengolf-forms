# Supabase Local Development Workflow

**Last Updated:** November 16, 2025

## Overview

This guide shows how to work with a **persistent development branch** for local testing before deploying to production. This workflow allows you to:

1. ✅ Create a dev branch with production schema (no data)
2. ✅ Connect locally to the dev branch (not production)
3. ✅ Make and test schema changes safely
4. ✅ Generate migration files from changes
5. ✅ Deploy migrations to production via GitHub

## Workflow Diagram

```
Production Database
       │
       ├─ Create persistent "develop" branch
       │  (copies schema, NOT data)
       │
       ▼
Development Branch
       │
       ├─ Link local environment to dev branch
       │  npx supabase link --project-ref <dev-branch-id>
       │
       ├─ Make schema changes
       │  (via Dashboard or local SQL)
       │
       ├─ Generate migration file
       │  npm run db:diff migration_name
       │
       ├─ Test locally against dev branch
       │
       ├─ Commit migration to git
       │
       ├─ Open PR (creates preview branch)
       │
       ├─ Test on preview branch
       │
       └─ Merge PR → Auto-deploy to production
```

## Step 1: Create Persistent Development Branch

### Option A: Via Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: `lengolf-forms`
3. Click the **branch dropdown** (top left, next to project name)
4. Click **"New branch"**
5. Configure:
   - **Branch name:** `develop`
   - **Type:** **Persistent** ✅
   - **Git branch:** Leave empty (not tied to git)
6. Click **"Create branch"**

The branch will:
- Copy the production schema
- **NOT copy production data** (for security)
- Get its own project ref/API keys
- Stay active indefinitely (persistent)

### Option B: Via CLI (Alternative)

```bash
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
npx supabase --experimental branches create --persistent develop
```

## Step 2: Get Development Branch Project ID

### Via Dashboard:
1. Switch to the `develop` branch (branch dropdown)
2. Go to **Project Settings** → **General**
3. Copy the **Project ID** (different from production!)
   - Production: `bisimqmtxjsptehhqpeg`
   - Develop: `<new-branch-project-id>`

### Via CLI:
```bash
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
npx supabase branches list
```

Output shows:
```
BRANCH NAME | BRANCH PROJECT ID           | STATUS
develop     | xyzabc123...                | ACTIVE_HEALTHY
```

Copy the **BRANCH PROJECT ID** for the `develop` branch.

## Step 3: Configure Local Environment for Development Branch

### Update `.env.local` for Development

Create or update `.env.local` to point to the **develop branch**:

```bash
# Development Branch Configuration
NEXT_PUBLIC_REFAC_SUPABASE_URL=https://<dev-branch-project-id>.supabase.co
REFAC_SUPABASE_SERVICE_ROLE_KEY=<dev-branch-service-role-key>

# Keep authentication bypass for local dev
SKIP_AUTH=true
```

**Get the dev branch keys:**
1. Switch to `develop` branch in Supabase Dashboard
2. Go to **Project Settings** → **API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_REFAC_SUPABASE_URL`
   - **service_role secret** → `REFAC_SUPABASE_SERVICE_ROLE_KEY`

### Link Supabase CLI to Development Branch

```bash
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"

# Unlink from production first
npx supabase unlink

# Link to development branch
npx supabase link --project-ref <dev-branch-project-id>
```

## Step 4: Make Schema Changes

### Option A: Via Supabase Dashboard

1. Switch to `develop` branch in dashboard
2. Go to **Table Editor** or **SQL Editor**
3. Make your schema changes:
   ```sql
   -- Example: Add a new column
   ALTER TABLE backoffice.customers
   ADD COLUMN tags TEXT[];
   ```

### Option B: Write SQL Migration Manually

Create a migration file manually:

```bash
npm run db:migration add_customer_tags
```

This creates: `supabase/migrations/<timestamp>_add_customer_tags.sql`

Edit the file:
```sql
-- Add tags column to customers
ALTER TABLE backoffice.customers
ADD COLUMN tags TEXT[];

-- Create index for tags
CREATE INDEX idx_customers_tags ON backoffice.customers USING GIN(tags);
```

Apply to dev branch:
```bash
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
npx supabase db push
```

## Step 5: Generate Migration from Changes (If Using Dashboard)

If you made changes via the Dashboard, generate a migration file:

```bash
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"

# Generate migration from schema diff
npm run db:diff add_customer_tags
```

This compares your dev branch against your local migration files and generates a new migration file with the differences.

## Step 6: Test Locally Against Development Branch

Your Next.js app is now connected to the **develop branch** (via `.env.local`).

### Run your app:
```bash
npm run dev
```

### Test your changes:
- Create test customers
- Add tags to customers
- Verify the new column works
- Test API endpoints that use the new field

**Important:** All data you create is in the **develop branch** database, not production!

## Step 7: Seed Development Branch with Test Data

Update `supabase/seed.sql` with test data for the develop branch:

```sql
-- Seed data for development branch testing
INSERT INTO backoffice.customers (full_name, phone_number, email, tags)
VALUES
  ('Test Customer 1', '0812345678', 'test1@example.com', ARRAY['vip', 'premium']),
  ('Test Customer 2', '0823456789', 'test2@example.com', ARRAY['regular']);
```

Apply seed data to develop branch:
```bash
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"

# Note: Seeding persistent branches requires enabling in config.toml
# For now, run the SQL manually in SQL Editor
```

## Step 8: Commit Migration to Git

Once you've tested locally against the dev branch:

```bash
# Review the migration file
cat supabase/migrations/<timestamp>_add_customer_tags.sql

# Add and commit
git add supabase/migrations/
git commit -m "feat: Add tags column to customers table"
git push origin feature/customer-tags
```

## Step 9: Deploy via GitHub Integration

### Open Pull Request

1. Open PR on GitHub: `feature/customer-tags` → `master`
2. GitHub integration automatically:
   - Creates a **preview branch** (separate from your `develop` branch)
   - Applies all migrations to preview branch
   - Seeds with `supabase/seed.sql`
   - Comments on PR with preview URL

### Test on Preview Branch

- The preview branch is ephemeral (auto-deleted after merge)
- Your persistent `develop` branch remains for future work

### Merge to Production

When PR is approved:
1. Merge to `master`
2. GitHub integration automatically:
   - Applies migration to **production** database
   - Validates migration success
   - Sends notifications if deployment fails

## Step 10: Clean Up (Optional)

### Keep Persistent Develop Branch

Your `develop` branch can stay active for future work. It costs ~$0.32/day.

### Delete After Testing (If Needed)

If you want to save costs:
```bash
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
npx supabase branches delete develop
```

## Switching Between Production and Development

### Work on Development Branch

```bash
# Link to dev branch
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
npx supabase link --project-ref <dev-branch-project-id>

# Update .env.local to dev branch credentials
# Restart dev server
npm run dev
```

### Work on Production (Read-Only)

```bash
# Link back to production
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
npx supabase link --project-ref bisimqmtxjsptehhqpeg

# Update .env.local to production credentials
# Restart dev server
npm run dev
```

**⚠️ WARNING:** Never write to production directly! Always use the dev branch workflow.

## Environment Configuration

### .env.local Templates

**Development Branch:**
```bash
# Development Branch
NEXT_PUBLIC_REFAC_SUPABASE_URL=https://<dev-branch-id>.supabase.co
REFAC_SUPABASE_SERVICE_ROLE_KEY=<dev-branch-service-role-key>
SKIP_AUTH=true
```

**Production (Read-Only):**
```bash
# Production (Read-Only - Don't write!)
NEXT_PUBLIC_REFAC_SUPABASE_URL=https://bisimqmtxjsptehhqpeg.supabase.co
REFAC_SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>
SKIP_AUTH=true
```

### Update config.toml for Multiple Remotes (Optional)

```toml
# Default is production
project_id = "bisimqmtxjsptehhqpeg"

# Add development branch as remote
[remotes.develop]
project_id = "<dev-branch-project-id>"
```

Switch between them:
```bash
# Use development branch
npx supabase link --project-ref <dev-branch-project-id>

# Use production
npx supabase link --project-ref bisimqmtxjsptehhqpeg
```

## Best Practices

### ✅ Do

- Use persistent `develop` branch for all schema development
- Test locally against `develop` branch before committing
- Keep production credentials in `.env.local.production` (separate file)
- Use `develop` branch for experimenting with schema changes
- Commit migration files after testing on dev branch
- Use GitHub integration for production deployment

### ❌ Don't

- Connect local environment directly to production
- Write test data to production database
- Skip testing on dev branch before deployment
- Make schema changes directly in production
- Commit untested migrations

## Troubleshooting

### "Already linked to a project"

```bash
npx supabase unlink
npx supabase link --project-ref <dev-branch-project-id>
```

### Migration fails on dev branch

```bash
# Check migration status
npx supabase migration list

# View migration history
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
npx supabase db remote commit
```

### Dev branch schema out of sync

```bash
# Pull latest schema from dev branch
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
npx supabase db pull
```

### Want to start fresh

Delete and recreate the dev branch:
```bash
# Delete
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
npx supabase branches delete develop

# Recreate (copies current production schema)
npx supabase --experimental branches create --persistent develop
```

## Cost Considerations

- **Persistent Branch:** ~$0.32/day (~$10/month)
- **Preview Branches:** Free (auto-deleted after merge)
- **Production:** Your normal subscription cost

For a single developer or small team, one persistent `develop` branch is usually sufficient.

## Summary

This workflow provides:
- ✅ **Safe testing** against isolated dev branch
- ✅ **Production-like environment** (same schema, no prod data)
- ✅ **Local development** with real database
- ✅ **Migration tracking** in version control
- ✅ **Automatic deployment** via GitHub integration
- ✅ **No production risk** during development

All schema changes go through: `develop branch → PR preview branch → production`
