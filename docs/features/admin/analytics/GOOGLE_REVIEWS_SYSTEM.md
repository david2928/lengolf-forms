# Google Reviews Management System

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [OAuth Setup Flow](#oauth-setup-flow)
5. [Review Sync Process](#review-sync-process)
6. [AI Draft Generation](#ai-draft-generation)
7. [Reply Workflow](#reply-workflow)
8. [API Endpoints](#api-endpoints)
9. [Database Schema](#database-schema)
10. [Component Structure](#component-structure)
11. [Environment Variables](#environment-variables)
12. [Troubleshooting](#troubleshooting)

## Overview

The Google Reviews Management System provides a centralized admin interface for monitoring and responding to Google Business Profile reviews for LENGOLF. It syncs reviews from the Google Business Profile API into Supabase, generates AI-powered draft replies using OpenAI, and allows admins to approve, edit, or manually compose replies that are posted directly back to Google.

### Key Capabilities
- **Review Sync**: Automated (cron) and manual sync of reviews from Google Business Profile API
- **AI Draft Replies**: GPT-4o-mini generates tone-matched draft replies in English, Thai, or the reviewer's language
- **Reply Posting**: Post replies directly to Google through the admin interface
- **Draft Review Workflow**: Approve, edit, or reject AI-generated drafts before posting
- **OAuth Integration**: Dedicated Google Business Profile OAuth flow (separate from user auth)
- **Statistics Dashboard**: Real-time counts, average rating, and reply coverage metrics

### Access
- **URL**: `/admin/google-reviews`
- **Access Level**: Admin only (requires `isUserAdmin` check)
- **Authentication**: Google Business account must be connected via OAuth

## Features

### Core Features
1. **Review List**: Filterable table showing all synced Google reviews with star ratings, comments, and reply status
2. **Statistics Cards**: Total reviews, replied count, needs-reply count, pending drafts count, and average rating
3. **Filter Tabs**: All, Has Reply, Needs Reply, Has Draft
4. **Review Detail Modal**: Full review details with reply composition or draft review interface
5. **Keyboard Navigation**: Previous/Next review navigation within the filtered list

### Reply Capabilities
- **Manual Reply**: Compose and post a custom reply directly
- **AI Draft Review**: View AI-generated draft, edit if needed, then approve to post
- **Draft Rejection**: Reject unsuitable drafts, returning the review to "needs reply" status
- **Auto-navigation**: After approving a draft, automatically moves to the next unreplied review

### Connection Management
- **OAuth Status Check**: Real-time display of connection status and connected account email
- **Connect/Disconnect**: One-click OAuth flow to connect or revoke the Google Business account

## Architecture

### Technology Stack
- **Frontend**: React (client component) with Tailwind CSS
- **API Layer**: Next.js API routes with admin authentication
- **Sync Engine**: Supabase Edge Function (`google-reviews-sync`) called via REST
- **AI Generation**: OpenAI GPT-4o-mini for draft reply generation
- **OAuth**: Google OAuth2 via `googleapis` library
- **Database**: Supabase (backoffice schema)
- **Scheduling**: pg_cron for automated sync every 6 hours

### Data Flow
```
Google Business Profile API
        |
        v
Supabase Edge Function (sync)
        |
        v
backoffice.google_reviews (Supabase DB)
        |
        v
Next.js API Routes (/api/google-reviews/*)
        |
        v
Admin UI (/admin/google-reviews)
        |
        v (reply)
Next.js API -> Google Business Profile API
```

### Component Hierarchy
```
GoogleReviewsPage
├── Connection Status Banner
│   ├── Connect Button (OAuth redirect)
│   └── Disconnect Button
├── Statistics Cards (total, replied, needs reply, drafts, avg rating)
├── Action Bar
│   ├── Generate Drafts Button
│   ├── Sync Button
│   └── Filter Tabs
├── Reviews Table
│   └── Review Rows (star rating, name, comment, status, date)
├── Review Detail Dialog
│   ├── Review Content
│   ├── Draft Section (view/edit/approve/reject)
│   ├── Manual Reply Textarea
│   └── Navigation (prev/next)
├── Confirm Reply AlertDialog
└── Confirm Approve AlertDialog
```

## OAuth Setup Flow

The system uses a dedicated OAuth flow separate from NextAuth user authentication. This connects the LENGOLF Google Business account (`info@len.golf`) to enable API access.

### Initial Connection

1. Admin clicks "Connect Google Business" on the reviews page
2. Browser redirects to `GET /api/google-reviews/oauth/connect`
3. Server generates Google OAuth URL with scopes:
   - `openid`, `email`, `profile`
   - `https://www.googleapis.com/auth/business.manage`
4. Browser redirects to Google consent screen (with `login_hint: info@len.golf`)
5. User grants access, Google redirects to `GET /api/google-reviews/oauth/callback`
6. Server exchanges authorization code for access + refresh tokens
7. Tokens stored in `backoffice.google_business_oauth` table
8. Browser redirected to `/admin/google-reviews?success=connected`

### Token Management
- **Access tokens** expire after ~1 hour; automatically refreshed using the stored refresh token
- **Refresh tokens** are long-lived and stored securely in the database
- `getValidAccessToken()` in `src/lib/google-business-oauth.ts` handles automatic refresh
- `last_used_at` is updated on each token use for audit purposes

### Disconnection
- Admin clicks "Disconnect" on the reviews page
- `POST /api/google-reviews/oauth/disconnect` removes tokens from the database
- Sync and reply features become unavailable until reconnected

## Review Sync Process

### How Sync Works

1. **Trigger**: Manual (admin clicks "Sync") or automated (pg_cron every 6 hours)
2. **Execution**: `POST /api/google-reviews/sync` calls the Supabase Edge Function `google-reviews-sync`
3. **Edge Function** fetches all reviews from Google Business Profile API with pagination
4. **Upsert**: Reviews are upserted into `backoffice.google_reviews` using `google_review_name` as the unique key
5. **Language Detection**: Each review comment is classified as EN, TH, or OTHER using Unicode range detection
6. **Result**: Returns counts of new, updated, and total synced reviews

### Automated Sync (Cron)
- **Schedule**: Every 6 hours (`0 */6 * * *`)
- **Job Name**: `google-reviews-sync-6h`
- **Mechanism**: pg_cron calls the Edge Function via `pg_net.http_post`
- **Timeout**: 30 seconds

### Why an Edge Function?
The sync is delegated to a Supabase Edge Function rather than running in the Vercel API route to avoid Vercel's execution timeout limits. The Edge Function can run for up to 60 seconds and handles pagination through all Google reviews.

## AI Draft Generation

### Process Overview

1. Admin clicks "Generate Drafts" on the reviews page
2. `POST /api/google-reviews/generate-drafts` is called
3. System fetches all unreplied reviews that do not already have a draft
4. System fetches up to 15 existing replied reviews (both EN and TH) as style examples
5. A system prompt is built with LENGOLF brand guidelines and style examples
6. Reviews are processed in batches of 5, with 1-second delays between batches
7. Each review receives an individual OpenAI API call (GPT-4o-mini, temperature 0.8)
8. Generated drafts are saved to the database with `draft_status: 'pending'`

### System Prompt Rules
The AI is instructed to follow LENGOLF's brand voice:
- **Tone**: Casual, warm, friendly; 1-3 sentences max
- **Addressing**: First name; "K'" prefix for Thai names (e.g., "K'Thanapat")
- **Staff mentions**: Shout-outs when staff are mentioned (Dolly, Net, Min, May, etc.)
- **Emojis**: Golf emojis sparingly (~30% of replies)
- **4-star reviews**: Thank + ask what could earn the 5th star
- **3-star or lower**: Thank + acknowledge feedback + invite back
- **Rating-only (no comment)**: Very short, just thank and invite back
- **Language matching**: Reply in the reviewer's language; for non-EN/TH, also provide English translation

### Translation Handling
For reviews in languages other than English or Thai, the AI generates the reply in the original language and appends an English translation separated by `---EN_TRANSLATION---`. The system parses this and stores the translation in `draft_reply_en_translation`.

## Reply Workflow

### Manual Reply
1. Admin selects an unreplied review from the list
2. Types a reply in the textarea (10-4096 characters)
3. Clicks "Post Reply" and confirms in the alert dialog
4. `POST /api/google-reviews/[id]/reply` posts the reply to Google via the Business Profile API
5. Database is updated: `has_reply = true`, `reply_text`, `replied_by`, `replied_at_local`
6. Review list refreshes automatically

### Draft Approve Flow
1. Admin views a review with a pending draft
2. Optionally edits the draft text (inline editing)
3. Clicks "Approve & Post" and confirms
4. If edited, the draft is saved first via `PUT /api/google-reviews/[id]/draft`
5. `POST /api/google-reviews/[id]/draft/approve` posts the draft to Google
6. Database updated: `draft_status: 'approved'`, `draft_reviewed_at`, `draft_reviewed_by`
7. Auto-navigates to the next unreplied review

### Draft Reject Flow
1. Admin views a review with a pending draft
2. Clicks "Reject" (thumbs-down icon)
3. `POST /api/google-reviews/[id]/draft/reject` clears the draft
4. Database updated: `draft_reply = null`, `draft_status: 'rejected'`
5. Review returns to "needs reply" state for manual reply or re-generation

## API Endpoints

### Review Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/google-reviews` | List reviews with filtering and pagination |
| `POST` | `/api/google-reviews/sync` | Trigger review sync from Google |
| `POST` | `/api/google-reviews/generate-drafts` | Generate AI drafts for unreplied reviews |

### Reply Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/google-reviews/[id]/reply` | Post a manual reply to Google |
| `PUT` | `/api/google-reviews/[id]/draft` | Edit a draft reply |
| `POST` | `/api/google-reviews/[id]/draft/approve` | Approve and post a draft reply |
| `POST` | `/api/google-reviews/[id]/draft/reject` | Reject and clear a draft reply |

### OAuth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/google-reviews/oauth/connect` | Initiate OAuth flow (redirects to Google) |
| `GET` | `/api/google-reviews/oauth/callback` | OAuth callback (exchanges code for tokens) |
| `GET` | `/api/google-reviews/oauth/status` | Check connection status |
| `POST` | `/api/google-reviews/oauth/disconnect` | Disconnect Google Business account |

### Endpoint Details

#### GET /api/google-reviews
```
Query params:
  hasReply: boolean (optional) - Filter by reply status
  limit: number (optional, default: 50) - Results per page
  offset: number (optional, default: 0) - Pagination offset

Response: { reviews: GoogleReviewDB[], count: number }
```

#### POST /api/google-reviews/sync
```
No request body required.

Response: { success: boolean, synced: number, new: number, updated: number }
```

#### POST /api/google-reviews/generate-drafts
```
No request body required.

Response: { success: boolean, generated: number, failed: number, total: number, errors?: string[] }
```

#### POST /api/google-reviews/[id]/reply
```
Body: { reply_text: string }
  - Minimum 10 characters
  - Maximum 4096 characters

Response: { success: boolean, reply_text: string, replied_by: string, replied_at: string, warning?: string }
```

#### PUT /api/google-reviews/[id]/draft
```
Body: { draft_reply: string }
  - Minimum 10 characters
  - Maximum 4096 characters

Response: { success: boolean, draft_reply: string }
```

## Database Schema

All tables reside in the `backoffice` schema.

### backoffice.google_reviews

Stores synced Google Business Profile reviews and their reply state.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated primary key |
| `google_review_name` | TEXT (UNIQUE) | Full Google resource path (e.g., `accounts/X/locations/Y/reviews/Z`) |
| `reviewer_name` | TEXT | Display name of the reviewer |
| `star_rating` | TEXT | Rating: ONE, TWO, THREE, FOUR, or FIVE |
| `comment` | TEXT | Review comment (nullable for rating-only reviews) |
| `language` | TEXT | Detected language: EN, TH, or OTHER |
| `review_created_at` | TIMESTAMPTZ | When the review was written on Google |
| `review_updated_at` | TIMESTAMPTZ | When the review was last updated on Google |
| `has_reply` | BOOLEAN | Whether the review has a reply |
| `reply_text` | TEXT | The reply content |
| `reply_updated_at` | TIMESTAMPTZ | When the reply was last updated on Google |
| `replied_by` | TEXT | First name of admin who posted the reply from our system |
| `replied_at_local` | TIMESTAMPTZ | When the reply was posted from our system |
| `draft_reply` | TEXT | AI-generated draft reply text |
| `draft_reply_en_translation` | TEXT | English translation for non-EN/TH drafts |
| `draft_status` | TEXT | Draft state: pending, approved, or rejected |
| `draft_generated_at` | TIMESTAMPTZ | When the draft was generated |
| `draft_reviewed_at` | TIMESTAMPTZ | When the draft was reviewed (approved/rejected) |
| `draft_reviewed_by` | TEXT | First name of admin who reviewed the draft |
| `synced_at` | TIMESTAMPTZ | Last sync timestamp |
| `created_at` | TIMESTAMPTZ | Row creation time |
| `updated_at` | TIMESTAMPTZ | Row last update time (auto-updated via trigger) |

**Indexes:**
- `idx_google_reviews_has_reply` -- Filter by reply status
- `idx_google_reviews_created` -- Sort by review date (DESC)
- `idx_google_reviews_rating` -- Filter by star rating
- `idx_google_reviews_language` -- Filter by language
- `idx_google_reviews_replied_by` -- Audit: filter by who replied (partial index, WHERE NOT NULL)

### backoffice.google_business_oauth

Stores OAuth tokens for the Google Business Profile API connection.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated primary key |
| `email` | TEXT (UNIQUE) | Google account email (info@len.golf) |
| `access_token` | TEXT | Current OAuth access token |
| `refresh_token` | TEXT | Long-lived refresh token |
| `token_expires_at` | TIMESTAMPTZ | When the current access token expires |
| `scope` | TEXT | Granted OAuth scopes |
| `created_at` | TIMESTAMPTZ | When the connection was first established |
| `updated_at` | TIMESTAMPTZ | Last token update time (auto-trigger) |
| `last_used_at` | TIMESTAMPTZ | Last time a token was used for an API call |

### Migrations

| File | Description |
|------|-------------|
| `20260105120000_create_google_reviews_table.sql` | Creates `google_reviews` table with indexes and update trigger |
| `20260105130000_create_google_business_oauth_table.sql` | Creates `google_business_oauth` table for OAuth tokens |
| `20260115000000_add_google_reviews_reply_audit_columns.sql` | Adds `replied_by` and `replied_at_local` audit columns |
| `20260213070000_add_google_reviews_sync_cron.sql` | Schedules automated sync cron job (every 6 hours) |

## Component Structure

### Files

| File | Description |
|------|-------------|
| `app/admin/google-reviews/page.tsx` | Main page component (client-side) |
| `src/lib/google-business-profile.ts` | Google Business Profile API service (fetch, sync, reply) |
| `src/lib/google-business-oauth.ts` | OAuth service (token management, connect/disconnect) |
| `src/types/google-reviews.ts` | TypeScript type definitions |

### UI Components Used
- `Card`, `CardHeader`, `CardTitle`, `CardContent` -- Layout cards
- `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` -- Review list
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` -- Review detail modal
- `AlertDialog` -- Confirmation dialogs for posting replies
- `Badge` -- Status indicators (rating, language, draft status)
- `Textarea` -- Reply composition
- `Button` -- Actions (sync, generate, post, approve, reject)
- `Alert` -- Error/warning messages
- Toast notifications via `sonner`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (shared with NextAuth) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (shared with NextAuth) |
| `GOOGLE_BUSINESS_ACCOUNT_ID` | Google Business Profile account ID |
| `GOOGLE_BUSINESS_LOCATION_ID` | Google Business Profile location ID |
| `NEXTAUTH_URL` | Base URL for OAuth callback construction |
| `OPENAI_API_KEY` | OpenAI API key for draft generation |
| `NEXT_PUBLIC_REFAC_SUPABASE_URL` | Supabase project URL (for Edge Function calls) |
| `REFAC_SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for Edge Function auth) |

## Troubleshooting

### OAuth Connection Issues
- **"Google Business account not connected"**: Navigate to `/admin/google-reviews` and click "Connect Google Business" to initiate the OAuth flow.
- **Token refresh failures**: If the refresh token has been revoked, disconnect and reconnect the account.
- **Wrong account**: The OAuth flow uses `login_hint: info@len.golf` -- ensure the correct Google account is selected during consent.

### Sync Issues
- **Sync returns 0 reviews**: Verify `GOOGLE_BUSINESS_ACCOUNT_ID` and `GOOGLE_BUSINESS_LOCATION_ID` are correct.
- **Edge Function timeout**: The sync has a 30-second timeout via pg_cron. For very large review volumes, trigger manual sync from the UI (60-second timeout).
- **Cron not running**: Check cron status with `SELECT * FROM cron.job WHERE jobname = 'google-reviews-sync-6h'`.

### Draft Generation Issues
- **"No unreplied reviews without drafts found"**: All unreplied reviews already have pending drafts, or all reviews have replies.
- **Batch failures**: The system processes 5 reviews per batch with 1-second delays. Partial failures are reported in the response. Failed reviews can be retried by running generation again.
- **Low-quality drafts**: The AI uses existing replied reviews as style examples. Having more diverse, high-quality example replies improves generation quality.

### Reply Posting Issues
- **"Review already has a reply"**: The review was replied to outside our system (e.g., directly on Google). Sync to get the latest state.
- **"Reply must be at least 10 characters"**: Minimum reply length is enforced to prevent accidental submissions.
- **Google API errors**: These typically indicate OAuth token issues. Check connection status and reconnect if needed.
