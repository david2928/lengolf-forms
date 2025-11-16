# Environment Switching Guide

**Quick Reference:** How to switch between production and local development environments.

## TL;DR

```bash
# Production (default) - Uses .env
npm run dev

# Local Docker - Automatically starts Supabase & uses .env.local
npm run dev:local
```

That's it!
- `npm run dev:local` automatically starts Supabase for you
- No manual Supabase startup
- No manual file copying

---

## How It Works

### npm run dev (Production)

**What it does:**
1. Deletes `.env.local` (if it exists)
2. Starts Next.js dev server
3. Next.js loads from `.env` (production credentials)

**Connects to:**
- ✅ Production Supabase: `https://bisimqmtxjsptehhqpeg.supabase.co`
- ✅ NextAuth URL: `https://lengolf-forms.vercel.app`
- ✅ All production APIs

**Use when:**
- Testing against production data (read-only!)
- Debugging production issues
- Default development mode

---

### npm run dev:local (Local Docker)

**What it does:**
1. **Automatically checks if Supabase is running**
2. **Starts Supabase if not running** (this may take a moment on first run)
3. Copies `.env.local.docker` → `.env.local`
4. Starts Next.js dev server
5. Next.js loads from `.env` + overrides from `.env.local`

**Connects to:**
- ✅ Local Docker Supabase: `http://127.0.0.1:54321`
- ✅ NextAuth URL: `http://localhost:3000`
- ✅ All production APIs (LINE, Google, etc. still work)

**Use when:**
- Testing database migrations
- Developing new features that need schema changes
- Want to work offline (except for external APIs)

**No preparation needed!**
- Just run `npm run dev:local` and everything starts automatically
- Supabase will start if it's not already running
- On subsequent runs, it detects Supabase is running and skips the startup

---

## Environment File Precedence

Next.js loads environment files in this order:

```
1. .env                  ← Base (production) - ALWAYS loaded
2. .env.local            ← Override (if exists) - loaded AFTER .env
```

**Result:**
- `.env.local` variables override `.env` variables
- Variables only in `.env` are still available
- This is why we only need to override Supabase URLs in `.env.local`

---

## What Gets Overridden

### When using `npm run dev:local`, only these change:

| Variable | Production (.env) | Local (.env.local) |
|----------|-------------------|-------------------|
| `NEXTAUTH_URL` | `https://lengolf-forms.vercel.app` | `http://localhost:3000` |
| `NEXT_PUBLIC_REFAC_SUPABASE_URL` | `https://bisimqmtxjsptehhqpeg.supabase.co` | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY` | Production key | Local Docker key |
| `REFAC_SUPABASE_SERVICE_ROLE_KEY` | Production key | Local Docker key |
| `SKIP_AUTH` | - | `true` (auth bypass) |

### Everything else stays the same:

- ✅ **Google Calendar API** - Works from anywhere
- ✅ **LINE Messaging API** - Works from anywhere
- ✅ **Meta/Facebook API** - Works from anywhere
- ✅ **OpenAI API** - Works from anywhere
- ✅ **All other API keys** - No changes needed

---

## Complete Local Development Workflow

### 1. Start Dev Server with Local DB

```bash
npm run dev:local
```

**Output (first run):**
```
🚀 Starting local development environment...
📦 Checking Supabase status...
⚠️  Supabase is not running
🔧 Starting Supabase (this may take a moment on first run)...
✅ Supabase started successfully
📝 Setting up local environment variables...
✅ Environment configured for local development
🌐 Starting Next.js development server...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ready - started server on 0.0.0.0:3000
```

**Output (subsequent runs):**
```
🚀 Starting local development environment...
📦 Checking Supabase status...
✅ Supabase is already running
📝 Setting up local environment variables...
✅ Environment configured for local development
🌐 Starting Next.js development server...
ready - started server on 0.0.0.0:3000
```

### 2. Make Schema Changes

Open http://127.0.0.1:54323 (Supabase Studio)
- Go to SQL Editor
- Run your schema changes:
  ```sql
  ALTER TABLE backoffice.staff ADD COLUMN tags TEXT[];
  ```

### 3. Generate Migration File

```bash
npm run db:diff add_staff_tags
```

Creates: `supabase/migrations/<timestamp>_add_staff_tags.sql`

### 4. Test Migration from Scratch

```bash
npm run supabase:reset
```

This:
- Drops local database
- Reapplies ALL migrations
- Ensures migration works from clean state

### 5. Commit and Deploy to Production

```bash
git add supabase/migrations/
git commit -m "feat: Add tags to staff table"
git push

# Apply to production
export SUPABASE_ACCESS_TOKEN="sbp_4a7b3363ee6de35786a1fff556286c59c47396e9"
npm run db:link  # Link to production
npx supabase db push  # Push migrations to production
```

### 6. Switch Back to Production

```bash
# Stop local server (Ctrl+C)
# Start with production
npm run dev
```

The `.env.local` file is automatically deleted, so Next.js reads from `.env` (production).

---

## Troubleshooting

### "My app is still using production/local!"

**Check which environment you're in:**
```bash
# Check if .env.local exists
ls .env.local

# If it exists, you're in LOCAL mode
# If it doesn't exist, you're in PRODUCTION mode
```

**Force production:**
```bash
rm .env.local
npm run dev
```

**Force local:**
```bash
npm run dev:local
```

### "Local Supabase isn't running"

```bash
# Check status
npm run supabase:status

# If not running, start it
npm run supabase:start
```

### "I need fresh production data in local"

```bash
# One command to sync everything
npm run db:sync
```

This automatically:
- Dumps production schema & data
- Resets local database
- Loads production data
- Ready to use!

**Note:** This overwrites your local database completely.

### "I want to see which environment I'm using"

Add this to your app (temporary debug):

```typescript
console.log('Supabase URL:', process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL);
console.log('NextAuth URL:', process.env.NEXTAUTH_URL);
```

**Production output:**
```
Supabase URL: https://bisimqmtxjsptehhqpeg.supabase.co
NextAuth URL: https://lengolf-forms.vercel.app
```

**Local output:**
```
Supabase URL: http://127.0.0.1:54321
NextAuth URL: http://localhost:3000
```

---

## Summary

✅ **Simple switching** - Just use `npm run dev` or `npm run dev:local`
✅ **Automatic** - No manual file copying
✅ **Safe** - `.env` (production) never modified
✅ **Clear** - Easy to see which environment you're in
✅ **Cost-effective** - Local Docker is free ($0/month)

**Default:** Production (`npm run dev`)
**Testing migrations:** Local (`npm run dev:local` + `npm run supabase:start`)
