# Quick Start: Local Development with Supabase Branch

**TL;DR:** Test database changes locally before production using a persistent development branch.

## One-Time Setup (5 minutes)

### 1. Create Development Branch

**Via Supabase Dashboard:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → `lengolf-forms` project
2. Click branch dropdown (top left) → **"New branch"**
3. Name: `develop` | Type: **Persistent** ✅
4. Click **"Create branch"**

### 2. Get Development Branch Credentials

1. Switch to `develop` branch (branch dropdown)
2. Go to **Project Settings** → **API**
3. Copy:
   - **Project URL**
   - **Project ID** (also called project-ref)
   - **service_role secret**

### 3. Configure Local Environment

Create `.env.local.develop`:

```bash
# Development Branch
NEXT_PUBLIC_REFAC_SUPABASE_URL=https://<dev-branch-project-id>.supabase.co
REFAC_SUPABASE_SERVICE_ROLE_KEY=<dev-branch-service-role-key>
SKIP_AUTH=true
```

Keep production in `.env.local.production`:
```bash
# Production (Read-Only)
NEXT_PUBLIC_REFAC_SUPABASE_URL=https://bisimqmtxjsptehhqpeg.supabase.co
REFAC_SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>
SKIP_AUTH=true
```

Use for development:
```bash
cp .env.local.develop .env.local
```

### 4. Link Supabase CLI to Dev Branch

```bash
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
npx supabase link --project-ref <dev-branch-project-id>
```

## Daily Workflow (2 minutes per change)

### Make a Schema Change

```bash
# 1. Ensure you're using dev branch
cp .env.local.develop .env.local

# 2. Start your app (connected to dev branch)
npm run dev

# 3. Make schema change via Dashboard SQL Editor
#    Switch to "develop" branch → SQL Editor → Run:
#    ALTER TABLE backoffice.customers ADD COLUMN tags TEXT[];

# 4. Generate migration file
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
npm run db:diff add_customer_tags

# 5. Test locally (your app is already connected to dev branch)
#    Create test data, verify new column works

# 6. Commit and deploy
git add supabase/migrations/
git commit -m "feat: Add tags column to customers"
git push

# 7. Open PR → Preview branch created → Test → Merge → Production ✅
```

## Switching Between Dev and Production

### Work on Development:
```bash
cp .env.local.develop .env.local
npx supabase link --project-ref <dev-branch-id>
npm run dev
```

### Read from Production (Read-Only):
```bash
cp .env.local.production .env.local
npx supabase link --project-ref bisimqmtxjsptehhqpeg
npm run dev
```

## Visual Workflow

```
┌─────────────────────────────────────────────────┐
│ 1. Make Schema Change                           │
│    (via Dashboard or SQL file)                  │
│    Connected to: develop branch                 │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│ 2. Generate Migration                           │
│    npm run db:diff migration_name               │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│ 3. Test Locally                                 │
│    npm run dev (points to develop branch)       │
│    Create test data, verify changes work        │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│ 4. Commit Migration                             │
│    git add + commit + push                      │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│ 5. Open PR                                      │
│    GitHub creates preview branch automatically  │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│ 6. Test on Preview Branch (Optional)            │
│    Use preview URL from PR comment              │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│ 7. Merge PR                                     │
│    → Migration deploys to production ✅          │
└─────────────────────────────────────────────────┘
```

## Cost

- **Persistent `develop` branch:** ~$0.32/day (~$10/month)
- **Preview branches (from PRs):** Free (auto-deleted)

## Troubleshooting

**"My app is still connected to production!"**
```bash
# Check which .env.local you're using
cat .env.local | grep SUPABASE_URL

# Should show dev branch URL
# If not, copy dev config:
cp .env.local.develop .env.local
npm run dev  # Restart dev server
```

**"Migration failed on dev branch"**
```bash
# Check what went wrong
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
npx supabase migration list

# Fix the SQL, then push again
npx supabase db push
```

**"Want to start fresh on dev branch"**
```bash
# Delete and recreate (copies latest production schema)
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
npx supabase branches delete develop
npx supabase --experimental branches create --persistent develop
```

## Full Documentation

- **Complete Guide:** [SUPABASE_LOCAL_DEVELOPMENT_WORKFLOW.md](./SUPABASE_LOCAL_DEVELOPMENT_WORKFLOW.md)
- **GitHub Integration:** [SUPABASE_BRANCHING_SETUP.md](./SUPABASE_BRANCHING_SETUP.md)
- **CLAUDE.md:** See "Database Operations" section

## Safety Checklist

Before deploying to production, verify:
- [ ] Tested schema change locally on `develop` branch
- [ ] Migration file generated and committed to git
- [ ] PR created and preview branch tested (optional)
- [ ] Migration SQL reviewed in PR
- [ ] No production data in migration file
- [ ] Ready to merge and auto-deploy to production

**Remember:** Never write to production directly! Always develop → test → commit → PR → merge → production.
