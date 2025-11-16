# Supabase Branching & GitHub Integration Setup Guide

**Last Updated:** November 16, 2025

## Overview

This guide walks you through setting up Supabase's GitHub integration to enable automatic database branching for pull requests. This replaces the old workflow of applying migrations directly to production via MCP.

## Prerequisites

- [x] Supabase CLI installed as dev dependency
- [x] `supabase/config.toml` created
- [x] Project linked to production (`bisimqmtxjsptehhqpeg`)
- [x] Migration history table cleaned and synced
- [x] `supabase/seed.sql` created

## GitHub Integration Setup

### Step 1: Navigate to Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: `lengolf-forms` (Project ID: `bisimqmtxjsptehhqpeg`)
3. Navigate to **Project Settings** → **Integrations**

### Step 2: Configure GitHub Integration

1. Under "GitHub Integration", click **Authorize GitHub**
2. Complete GitHub's authorization flow
3. Select repository: `david2928/lengolf-forms`
4. Configure the following settings:

**Supabase Directory:**
```
.
```
*(Use `.` since the `supabase/` folder is at project root)*

**Deploy to Production:** ✅ **ENABLED**
- Deploys changes to production on push to master branch
- Applies migrations automatically when PRs are merged

**Production Branch Name:**
```
master
```

**Automatic Branching:** ✅ **ENABLED**
- Creates preview branches for every pull request
- Isolated database for each PR

**Supabase Changes Only:** ✅ **ENABLED** (Recommended)
- Only creates branches when `supabase/` files change
- Saves resources by not creating unnecessary branches

**Branch Limit:**
```
50
```

### Step 3: Enable Integration

Click **Enable Integration** to activate the setup.

## How It Works

### Workflow

```
┌─────────────────┐
│  Create Feature │
│   Git Branch    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Make Schema    │
│    Changes      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate        │
│ Migration File  │
│ (npx supabase   │
│  db diff -f)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Commit & Push   │
│   to GitHub     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Open Pull      │
│    Request      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 🎉 GitHub Integration Automatically: │
│  • Creates Supabase preview branch   │
│  • Applies all migrations            │
│  • Seeds with supabase/seed.sql      │
│  • Comments on PR with preview URL   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Test Changes   │
│  on Preview     │
│    Branch       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Merge PR to   │
│     Master      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 🚀 Automatic Production Deployment:  │
│  • Applies migrations to production  │
│  • Validates migration success       │
│  • Sends failure notifications       │
└─────────────────────────────────────┘
```

### Preview Branches

Each preview branch provides:
- **Isolated database** - Separate instance for testing
- **API credentials** - Unique project ref and API keys
- **Fresh seed data** - Populated from `supabase/seed.sql`
- **No production data** - Never copies production data for security

### Migration Management

**Before GitHub Integration (OLD - Don't do this):**
```bash
# ❌ Bad: Direct production writes via MCP
mcp__supabase__apply_migration(...)
```

**With GitHub Integration (NEW - Recommended):**
```bash
# ✅ Good: Tracked migrations via git
npx supabase db diff -f add_new_column
git add supabase/migrations/
git commit -m "feat: Add new column to customers table"
git push
# Open PR → Preview branch auto-created → Test → Merge → Auto-deploy
```

## Development Workflow

### Creating a New Migration

1. **Create feature branch:**
   ```bash
   git checkout -b feature/add-customer-tags
   ```

2. **Make schema changes** in Supabase Dashboard (optional):
   - Go to your preview branch in Supabase Dashboard
   - Use Table Editor or SQL Editor to make changes

3. **Generate migration file:**
   ```bash
   export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
   npx supabase db diff -f add_customer_tags
   ```

4. **Review the generated migration:**
   ```bash
   cat supabase/migrations/20251116******_add_customer_tags.sql
   ```

5. **Commit and push:**
   ```bash
   git add supabase/migrations/
   git commit -m "feat: Add tags column to customers table"
   git push origin feature/add-customer-tags
   ```

6. **Open pull request:**
   - GitHub automatically creates Supabase preview branch
   - Comment appears on PR with preview branch URL
   - Test your changes on the preview branch

7. **Merge to master:**
   - Migrations automatically deploy to production
   - Production database updated safely

## Environment Variables

The Supabase access token is already configured in `.mcp.json`. For CLI usage, you can export it:

```bash
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
```

Or add it to your shell profile for persistence.

## Seed Data

The `supabase/seed.sql` file is used to populate preview branches with test data. Update this file as needed:

```sql
-- Example: Add test customers for preview branches
INSERT INTO backoffice.customers (full_name, phone_number, email)
VALUES
  ('Test Customer 1', '0812345678', 'test1@example.com'),
  ('Test Customer 2', '0823456789', 'test2@example.com');
```

**Important Notes:**
- Seed data is applied **only once** when preview branch is created
- To re-seed, delete the preview branch and recreate it
- Production data is **never** copied to preview branches
- Keep seed data minimal but sufficient for testing

## Best Practices

### ✅ Do

- Create migrations through `npx supabase db diff`
- Test migrations on preview branches before merging
- Write meaningful migration names
- Include seed data for common test scenarios
- Review migration SQL before committing
- Use pull requests for all schema changes

### ❌ Don't

- Apply migrations directly to production via MCP
- Make schema changes directly in production dashboard
- Commit without testing on preview branch
- Skip code review for schema changes
- Delete migrations after they've been deployed
- Edit migration files after they've been applied

## Troubleshooting

### Preview branch not created

**Check:**
- Is "Automatic branching" enabled?
- Did you modify files in `supabase/` directory?
- Is "Supabase changes only" enabled? (only creates branches for supabase/ changes)

### Migration fails on preview branch

**Check:**
- Review the migration SQL for errors
- Check PR comments for error details
- Verify migration dependencies are correct
- Test migration locally with `supabase db reset`

### Can't access preview branch

**Check:**
- Wait for preview branch creation (can take 1-2 minutes)
- Check PR comments for preview branch URL
- Verify you have access to Supabase project

## Reference Links

- [Supabase Branching Documentation](https://supabase.com/docs/guides/deployment/branching)
- [GitHub Integration Guide](https://supabase.com/docs/guides/deployment/branching/github-integration)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

## Migration History Reset

**Date:** November 16, 2025
**Action:** Reset production migration history from 1015 migrations to 20 tracked migrations

The production migration history table was cleaned to match the migrations in git. All 20 migrations in `supabase/migrations/` are now properly tracked. Future migrations will be tracked automatically through GitHub integration.
