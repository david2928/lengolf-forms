# LINE Profile Image Caching

**Feature:** Server-side caching of LINE profile images to Supabase Storage
**Status:** Active
**Access Level:** Automatic (webhook-driven) + staff-triggered refresh
**Last Updated:** February 2026

---

## Overview

LINE CDN profile picture URLs (`sprofile.line-scdn.net`) expire over time, causing 404 errors when loading the unified chat page. With dozens of conversations visible at once, this produced a cascade of failed image requests on every page load.

This feature downloads LINE profile images and stores them permanently in Supabase Storage, replacing ephemeral CDN URLs with stable, self-hosted URLs.

---

## Architecture

### Three-Phase Approach

1. **Lazy Loading** -- `loading="lazy"` on profile `<img>` tags prevents off-screen images from loading eagerly
2. **Server-Side Caching** -- Webhook integration downloads and stores images in Supabase Storage on every incoming message
3. **Stale Image Refresh** -- On-demand refresh when staff selects a conversation with a cached image older than 7 days

### Data Flow

```
Incoming LINE Message
  --> Webhook processes message
  --> storeLineUserProfile() saves profile data to line_users
  --> Fire-and-forget: cacheLineProfileImage()
        downloads from LINE CDN --> uploads to Supabase Storage
  --> Updates line_users.cached_picture_url + picture_cached_at

Staff Opens Unified Chat
  --> unified_conversations view returns COALESCE(cached_picture_url, picture_url)
  --> Images load from Supabase Storage (permanent URLs)
  --> On conversation select: check staleness, refresh if > 7 days old
```

---

## Database Schema

### Columns Added to `line_users`

```sql
ALTER TABLE public.line_users
  ADD COLUMN cached_picture_url TEXT,
  ADD COLUMN picture_cached_at TIMESTAMPTZ;
```

| Column | Type | Description |
|--------|------|-------------|
| `cached_picture_url` | `TEXT` | Supabase Storage public URL of the cached profile image |
| `picture_cached_at` | `TIMESTAMPTZ` | When the profile image was last cached |

### View Update: `unified_conversations`

The view uses `COALESCE(lu.cached_picture_url, lu.picture_url)` in `channel_metadata.picture_url`, so cached images are preferred with a transparent fallback to the original LINE CDN URL. The `picture_cached_at` timestamp is also exposed in `channel_metadata` for client-side staleness checks.

**Migration:** `supabase/migrations/20260213120000_add_line_profile_image_cache.sql`

### Storage

Images are stored in the `line-messages` Supabase Storage bucket at path `profiles/{lineUserId}.{ext}`, using `upsert: true` so re-caching replaces old versions.

---

## Core Function

### `cacheLineProfileImage(lineUserId, pictureUrl)`

**File:** `src/lib/line/storage-handler.ts`

Downloads a profile image from LINE CDN and uploads it to Supabase Storage.

**Security validations:**
- LINE user ID must match `/^U[a-f0-9]{32}$/i` (prevents path traversal)
- URL hostname must be in allowlist: `profile.line-scdn.net`, `sprofile.line-scdn.net`, `obs.line-scdn.net` (prevents SSRF)

**Returns:** The permanent Supabase Storage public URL, or `null` on failure.

---

## Caching Triggers

### 1. Webhook (Automatic)

**File:** `src/lib/line/webhook-handler.ts` -- `storeLineUserProfile()`

On every incoming LINE message, after saving the user profile, the webhook fires a non-blocking call to `cacheLineProfileImage()`. Uses `.then()/.catch()` pattern so webhook response latency is unaffected. Active users automatically get fresh cached images.

### 2. On-Select Staleness Check

**File:** `app/staff/unified-chat/page.tsx` -- `handleConversationSelect()`

When staff selects a LINE conversation, the client checks `picture_cached_at` from `channel_metadata`. If the cached image is older than 7 days, a fire-and-forget `POST` is sent to the refresh endpoint. The updated image appears on the next page load.

### 3. Single-User Refresh API

**Endpoint:** `POST /api/line/users/:lineUserId/refresh-profile`
**File:** `app/api/line/users/[lineUserId]/refresh-profile/route.ts`

Auth-protected. Fetches a fresh profile from the LINE API and re-caches the image through `storeLineUserProfile()`.

**Response:**
```json
{
  "success": true,
  "profile": {
    "displayName": "John",
    "pictureUrl": "https://sprofile.line-scdn.net/..."
  }
}
```

### 4. Batch Backfill API

**Endpoint:** `POST /api/line/users/backfill-profiles`
**File:** `app/api/line/users/backfill-profiles/route.ts`

Auth-protected. Processes users in batches of 50, ordered by `last_seen_at DESC` (active users first). Fetches fresh profiles from the LINE API rather than using stored (potentially expired) CDN URLs. Marks failures with an updated `picture_cached_at` to prevent infinite retry loops.

**Response:**
```json
{
  "success": true,
  "processed": 50,
  "succeeded": 47,
  "failed": 3,
  "remaining": 120
}
```

Call repeatedly until `remaining` reaches 0.

---

## File Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/20260213120000_add_line_profile_image_cache.sql` | Database migration |
| `src/lib/line/storage-handler.ts` | `cacheLineProfileImage()` function |
| `src/lib/line/webhook-handler.ts` | Auto-cache on incoming messages |
| `app/api/line/users/[lineUserId]/refresh-profile/route.ts` | Single-user refresh endpoint |
| `app/api/line/users/backfill-profiles/route.ts` | Batch backfill endpoint |
| `app/staff/unified-chat/page.tsx` | Staleness check on conversation select |
| `app/staff/line-chat/components/ConversationSidebar.tsx` | Lazy loading on images |
| `app/staff/line-chat/components/ChatArea.tsx` | Lazy loading on images |

---

## Initial Backfill Results

| Outcome | Count |
|---------|-------|
| Successfully cached | 686 |
| No profile picture (NULL) | 68 |
| Unfollowed/blocked bot (LINE API 404) | 32 |

---

## Troubleshooting

**Images still showing 404s after deploying:**
Run the backfill endpoint repeatedly to cache existing users. New users are cached automatically via the webhook.

**Backfill endpoint returns high `failed` count:**
Users who unfollowed or blocked the bot will always fail (LINE API returns 404). These are marked with a `picture_cached_at` timestamp so they are not retried.

**Stale images not updating:**
The 7-day staleness check only triggers when staff selects a conversation. The refresh is fire-and-forget, so the updated image appears on the next page load, not immediately.
