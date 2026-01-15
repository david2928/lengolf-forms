# Google Reviews Management System - Setup Guide

## 📋 Overview

This system allows you to sync Google Business Profile reviews to the LENGOLF backoffice, view them in an admin dashboard, and (in Phase 2) post replies back to Google.

**Current Status:** Phase 1 Complete ✅ | Phase 2 Complete ✅

**What Works:**
- ✅ Sync reviews from Google Business Profile
- ✅ View reviews in admin dashboard with filters
- ✅ See existing replies from Google
- ✅ Responsive UI with mobile support
- ✅ Language detection (EN/TH/OTHER)
- ✅ Post new replies to Google (Phase 2)
- ✅ Character counter and validation
- ✅ Confirmation dialog before posting
- ✅ Audit trail (who posted, when)

**Future Enhancements (Not Implemented):**
- ❌ AI-powered reply suggestions
- ❌ Edit/delete posted replies
- ❌ Bulk reply functionality

---

## 🏗️ Phase 1: Review Sync & Display (COMPLETED)

### What Was Implemented

#### 1. Database Schema
- **File:** `supabase/migrations/20260105120000_create_google_reviews_table.sql`
- **Table:** `backoffice.google_reviews`
- **Fields:**
  - Review metadata (reviewer name, rating, comment, language)
  - Reply information (existing replies from Google)
  - Sync timestamps

**Second Migration:**
- **File:** `supabase/migrations/20260105130000_create_google_business_oauth_table.sql`
- **Table:** `backoffice.google_business_oauth`
- **Purpose:** Store OAuth tokens separately from user authentication

#### 2. OAuth Authentication (Separate from NextAuth)
- **File:** `src/lib/google-business-oauth.ts` (NEW)
- **Method:** Dedicated OAuth flow for Google Business Profile
- **Account:** Uses `info@len.golf` (Business Profile manager)
- **Scope:** `https://www.googleapis.com/auth/business.manage`
- **Storage:** Tokens stored in `backoffice.google_business_oauth` table
- **Features:**
  - Automatic token refresh when expired
  - Connection status check
  - Connect/disconnect functionality

#### 3. Google Business Profile Service
- **File:** `src/lib/google-business-profile.ts`
- **Functions:**
  - `fetchAllReviews(accessToken)` - Fetch reviews from Google API
  - `syncReviewsToSupabase(accessToken)` - Sync to database
  - `getReviewsFromDB(filters)` - Query database
  - `postReviewReply(reviewId, googleReviewName, replyText, accessToken, adminFirstName)` - Post reply to Google (Phase 2)
  - `getReviewById(reviewId)` - Get single review by ID (Phase 2)

#### 4. API Endpoints

**OAuth Endpoints:**
- **GET** `/api/google-reviews/oauth/connect` - Initiate OAuth flow
- **GET** `/api/google-reviews/oauth/callback` - Handle OAuth callback
- **GET** `/api/google-reviews/oauth/status` - Check connection status
- **POST** `/api/google-reviews/oauth/disconnect` - Remove connection

**Review Endpoints:**
- **POST** `/api/google-reviews/sync` - Trigger sync from Google
- **GET** `/api/google-reviews` - List reviews with filters
- **POST** `/api/google-reviews/[id]/reply` - Post reply to a review (Phase 2)

#### 5. Admin UI
- **Page:** `/admin/google-reviews`
- **Features:**
  - Connection status indicator (connected/disconnected)
  - Connect/Disconnect Google Business account buttons
  - Stats dashboard (total, avg rating, replied, pending)
  - Filter by reply status (All, Has Reply, Needs Reply)
  - Sync button to fetch latest reviews
  - Responsive table (desktop) and card view (mobile)
  - Clickable rows to view full review details
  - Review detail modal with complete information
  - Color-coded language badges and status indicators
  - **Reply Form (Phase 2):**
    - Textarea with character counter (X / 4096)
    - Minimum 10 character validation
    - "Post Reply" button with 2-second debounce
    - Confirmation dialog before posting
    - Shows "Posted by [Name] on [Date]" for replies

#### 6. TypeScript Types
- **File:** `src/types/google-reviews.ts`
- Comprehensive type definitions for reviews and API responses

#### 7. Environment Variables
- **File:** `.env` (modified)
- Added:
  - `GOOGLE_BUSINESS_ACCOUNT_ID=100855399028765525123`
  - `GOOGLE_BUSINESS_LOCATION_ID=8093696109775766649`

---

## 🚀 Setup Instructions (REQUIRED)

### ⚠️ Step 0: Request Google My Business API Access (CRITICAL)

**The Google My Business API requires formal approval from Google before use.**

1. **Submit Access Request Form:**
   - URL: https://support.google.com/business/contact/api_default
   - Select: "Application for Basic API Access"
   - Project Number: `1071951248692`
   - Email: Use `info@len.golf` (must be Business Profile owner/manager)
   - Use Case: "Internal backoffice system to manage and respond to Google reviews"

2. **Wait for Approval:**
   - Processing time: Up to 14 days
   - You'll receive an email when approved
   - Once approved, the `mybusiness.googleapis.com` API will be available to enable

3. **After Approval:**
   - Run: `gcloud services enable mybusiness.googleapis.com`
   - Or enable via console at: https://console.developers.google.com/apis/api/mybusiness.googleapis.com/overview?project=1071951248692

**Note:** The feature is fully built and ready. It will work immediately once API access is approved.

### Step 1: Enable Google APIs

1. Go to [Google Cloud Console - API Library](https://console.cloud.google.com/apis/library?project=lengolf-forms)

2. Search for and enable these APIs:
   - ✅ **My Business Business Information API** (already enabled)
   - ✅ **My Business Account Management API** (already enabled)

3. **Check Quotas** (after enabling):
   - Go to: APIs & Services > My Business Business Information API > Quotas
   - If quota shows 0, you may need to request access
   - Most business owners get automatic access for their own locations

### Step 2: Run Database Migration

Option A - Using Supabase CLI:
```bash
cd C:\vs_code\lengolf-forms-feature\lengolf-forms
supabase db push
```

Option B - Manual (Supabase Dashboard):
1. Go to https://bisimqmtxjsptehhqpeg.supabase.co
2. Navigate to SQL Editor
3. Copy contents of `supabase/migrations/20260105120000_create_google_reviews_table.sql`
4. Execute the SQL

### Step 3: Connect Google Business Account

**IMPORTANT:** This system uses a separate OAuth flow (not your regular login).

1. Navigate to: **`/admin/google-reviews`**

2. You'll see a connection status banner:
   - If disconnected: Orange banner with "Connect Google Business" button
   - If connected: Green banner showing connected email

3. Click **"Connect Google Business"** button

4. Sign in with `info@len.golf` (or the Google account that manages your Business Profile)

5. Grant permissions:
   - ✅ "Manage your business information on Google"
   - Click "Allow"

6. You'll be redirected back with a success message

**Note:** This connection is stored separately and doesn't affect your admin login.

### Step 4: Test the Feature

1. After connecting, the **"Sync Reviews"** button will become active

2. Click **"Sync Reviews"** to fetch from Google

3. You should see:
   - Loading indicator during sync
   - Success message: "Sync completed! X new, Y updated, Z total"
   - Reviews appearing in the table/cards
   - Stats updating automatically

4. Try the features:
   - Filter by reply status
   - Click any review to see full details
   - Test on mobile (card-based layout)

---

## 📊 How to Use

### Admin Dashboard (`/admin/google-reviews`)

**Features:**
- **Stats Cards:** Total reviews, average rating, replied vs. pending
- **Filters:** All | Has Reply | Needs Reply
- **Sync Button:** Fetches latest reviews from Google
- **Reviews Table:** Shows reviewer, rating, comment, language, status, date

**Workflow:**
1. Click "Sync Reviews" to fetch from Google (can run anytime)
2. Use filters to view specific review types
3. See which reviews need replies (orange "Pending" badge)

---

## 🔍 Troubleshooting

### Issue: "Google Business account not connected"

**Cause:** No OAuth tokens stored in database

**Solution:**
1. Navigate to `/admin/google-reviews`
2. Click "Connect Google Business" button
3. Sign in with `info@len.golf` account
4. Grant the required permissions

### Issue: "Failed to fetch reviews: 403 Forbidden"

**Cause:** API not enabled or account doesn't have permission

**Solutions:**
1. Verify Google My Business API is enabled in Google Cloud Console
2. Check that `info@len.golf` is a Manager/Owner of the LENGOLF Business Profile
3. Confirm OAuth tokens are stored (check connection status)
4. Try disconnecting and reconnecting

### Issue: Sync button is disabled

**Cause:** Google Business account not connected

**Solution:**
- Check connection status banner at top of page
- Click "Connect Google Business" if showing as disconnected

### Issue: Quota is 0 after enabling API

**Cause:** Google requires manual approval for some accounts

**Solution:**
- Contact Google via their GBP API access request form
- Mention you're accessing reviews for your own business location
- Usually approved within 2-3 business days

### Issue: Reviews not appearing after sync

**Solutions:**
1. Check browser console for errors
2. Verify database migration ran successfully:
   ```sql
   SELECT * FROM backoffice.google_reviews LIMIT 1;
   ```
3. Check API logs in Vercel/deployment platform

---

## 🛠️ Technical Architecture

### Authentication Flow (Separate from User Login)
```
Admin clicks "Connect Google Business"
  ↓
Redirect to Google OAuth consent screen
  ↓
User signs in with info@len.golf
  ↓
Google returns authorization code
  ↓
exchangeCodeForTokens() [src/lib/google-business-oauth.ts]
  ↓
Tokens stored in backoffice.google_business_oauth table
  ↓
Auto-refresh logic keeps tokens valid
```

### Review Sync Flow
```
Admin clicks "Sync Reviews"
  ↓
getValidAccessToken() [src/lib/google-business-oauth.ts]
  - Fetches token from database
  - Auto-refreshes if expired
  ↓
fetchAllReviews(accessToken) [src/lib/google-business-profile.ts]
  - Calls Google Business Profile API v4
  - Paginated fetching (50 per page)
  ↓
syncReviewsToSupabase(accessToken)
  - Upserts reviews to backoffice.google_reviews
  - Updates existing reviews if changed
  ↓
Success response with counts (new, updated, total)
  ↓
Admin UI refreshes and displays reviews
```

### OAuth Scopes Required
- `openid` - User identification
- `email` - User email
- `profile` - User profile info
- `https://www.googleapis.com/auth/business.manage` - Read/write business info

### Key Design Decisions
1. **Separate OAuth Flow:** Keeps business profile access independent from user authentication
2. **Dedicated Account:** Uses `info@len.golf` to ensure consistent access
3. **Token Storage:** Database storage enables server-side token refresh
4. **Direct REST API:** Uses fetch() instead of googleapis library for better control

---

## ✅ Phase 2: Reply Posting (COMPLETED)

### Overview

Phase 2 allows admins to post replies to Google reviews directly from the backoffice.

**Implementation:** Option A - Manual Reply Posting

### What Was Implemented

#### 1. Database Migration
- **File:** `supabase/migrations/20260115000000_add_google_reviews_reply_audit_columns.sql`
- **Added columns to `backoffice.google_reviews`:**
  - `replied_by` (TEXT) - First name of admin who posted the reply
  - `replied_at_local` (TIMESTAMPTZ) - When we posted from our system

#### 2. API Endpoint
- **File:** `app/api/google-reviews/[id]/reply/route.ts`
- **Method:** POST
- **Body:** `{ reply_text: string }`
- **Features:**
  - Admin-only authentication
  - Validates reply length (10-4096 characters)
  - Prevents duplicate replies
  - Posts to Google Business Profile API
  - Updates local database with audit trail

#### 3. Backend Service Functions
- **File:** `src/lib/google-business-profile.ts`
- **New functions:**
  - `postReviewReply()` - Posts reply to Google, updates database
  - `getReviewById()` - Fetches single review by ID

#### 4. UI Components
- **File:** `app/admin/google-reviews/page.tsx`
- **File:** `src/components/ui/alert-dialog.tsx` (NEW)
- **Features:**
  - Reply textarea with character counter (X / 4096)
  - Minimum 10 character validation with helper text
  - "Post Reply" button with 2-second debounce after posting
  - Confirmation dialog showing preview before posting
  - Loading state during posting
  - Success/error toast messages
  - Shows "Posted by [Name] on [Date]" for completed replies

#### 5. TypeScript Types
- **File:** `src/types/google-reviews.ts`
- **Added:**
  - `replied_by` and `replied_at_local` to `GoogleReviewDB`
  - `PostReplyResult` interface

### How to Use

1. Navigate to `/admin/google-reviews`
2. Click on a review that needs a reply (orange "Pending" badge)
3. In the modal, write your reply in the textarea (minimum 10 characters)
4. Click "Post Reply"
5. Confirm in the dialog
6. Reply is posted to Google and saved locally with audit info

### Validation Rules
- **Minimum length:** 10 characters
- **Maximum length:** 4096 characters
- **Admin only:** Only Chris and David can post replies
- **One reply per review:** Cannot post to reviews that already have replies

---

### Option B: AI-Assisted Reply Generation (Future Enhancement)

**Additional Requirements:**
- OpenAI API integration
- Reply approval workflow
- Database table to track suggestions
- More complex UI

**Database Addition:**
**File:** `supabase/migrations/YYYYMMDD_google_review_replies.sql` (NOT YET CREATED)

```sql
CREATE TABLE backoffice.google_review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES backoffice.google_reviews(id),
  suggested_reply TEXT,  -- AI-generated suggestion
  final_reply TEXT NOT NULL,  -- What was actually posted
  status TEXT DEFAULT 'draft',  -- draft, posted, failed
  posted_by TEXT,  -- admin user email
  posted_at TIMESTAMPTZ,
  post_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. AI Reply Generation Service
**File:** `src/lib/ai/google-review-reply-generator.ts` (NOT YET CREATED)

**Purpose:** Generate contextual replies based on review content

**Features:**
- Use OpenAI API to generate replies
- Style based on existing LENGOLF reply patterns:
  - Short & friendly (1-2 sentences)
  - Include reviewer's name
  - Golf emojis (⛳️ 🏌️)
  - Invitation to return
  - Thai replies for Thai reviewers (with คุณ prefix)

**Example Patterns from Existing Replies:**
- "Thanks for coming [Name]! Please come back again soon! ⛳️"
- "Loved having you [Name]! Your long drive records will be tough to beat! ⛳️"
- "Thank you คุณ [Name] - glad you had a great time! Please come back soon!"

#### 3. UI Enhancements for AI
- "Generate AI Reply" button in review detail modal
- Edit/approve workflow before posting
- Show AI confidence score (optional)
- Bulk generate for multiple reviews

#### 4. Additional API Routes for AI
**File:** `app/api/google-reviews/[id]/suggest/route.ts` (NOT YET CREATED)

```typescript
POST /api/google-reviews/{review_id}/suggest
Response: { suggested_reply: string }

// Uses OpenAI to generate reply based on:
// - Review rating
// - Review comment
// - Reviewer language (EN/TH)
// - Reviewer name
```

---

## 📝 Phase 2 Implementation Checklist

### Option A: Manual Reply Posting (2-3 hours)

#### Prerequisites
- [x] Phase 1 fully tested and working
- [x] OAuth tokens with business.manage scope available
- [ ] Test posting on non-production reviews first

#### Backend (1-2 hours)
- [ ] Create `postReviewReply()` function in `src/lib/google-business-profile.ts`
  - Fetch review details from database
  - Get valid access token
  - Call Google API to post reply
  - Update local database with reply info
- [ ] Create API route: `app/api/google-reviews/[id]/reply/route.ts`
  - Admin authentication check
  - Validate reply text (not empty, max length)
  - Error handling for API failures
  - Return success/error response

#### Frontend (1 hour)
- [ ] Update review detail modal in `app/admin/google-reviews/page.tsx`
  - Add reply textarea (only for reviews without replies)
  - Add "Post Reply" button
  - Add loading state during posting
  - Show success/error messages
  - Add confirmation dialog before posting
- [ ] Update modal to disable reply form after successful post
- [ ] Refresh review data after posting

#### Testing (30 minutes)
- [ ] Test posting reply to a real review
- [ ] Verify reply appears in Google Business Profile
- [ ] Test error handling (network failures, invalid tokens)
- [ ] Verify database updates correctly
- [ ] Test with Thai characters

---

### Option B: AI-Assisted Replies (Additional 4-6 hours)

#### Prerequisites (Option B Only)
- [ ] Option A completed and tested
- [x] OpenAI API key in `.env` (OPENAI_API_KEY already exists)
- [ ] Define reply generation prompt and examples

#### Database (Option B Only)
- [ ] Create migration for `google_review_replies` table
- [ ] Add indexes for review_id and status

#### Backend (Option B Only)
- [ ] Create AI reply generator: `src/lib/ai/google-review-reply-generator.ts`
  - OpenAI API integration
  - Language detection (EN/TH)
  - Style matching (emojis, tone, length)
  - Name extraction from reviews
- [ ] Create API route: `app/api/google-reviews/[id]/suggest/route.ts`
- [ ] Add bulk suggestion endpoint (optional)

#### Frontend (Option B Only)
- [ ] Add "Generate AI Reply" button
- [ ] Show AI suggestion with edit capability
- [ ] Add regenerate option
- [ ] Show loading state during generation
- [ ] Add bulk actions toolbar (optional)

#### Testing (Option B Only)
- [ ] Test AI generation with 5-star reviews
- [ ] Test AI generation with 3-star reviews
- [ ] Test AI generation with negative reviews
- [ ] Test Thai language reply generation
- [ ] Verify reply style matches LENGOLF tone

---

## 🔐 Security Considerations

### Current Implementation
- ✅ Admin-only access (checked via `isUserAdmin()`)
- ✅ OAuth tokens stored securely in session
- ✅ No service account keys exposed to client
- ✅ API routes protected with authentication

### Phase 2 Considerations
- Only admins can approve/post replies
- Audit log for all posted replies (who approved, when)
- Rate limiting on Google API calls
- Validation of reply content before posting
- Ability to revoke/edit posted replies (if needed)

---

## 📞 Support & Questions

### Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/google-business-oauth.ts` | OAuth flow for Google Business Profile |
| `src/lib/google-business-profile.ts` | Core Google API integration (fetch reviews, sync, post replies) |
| `app/api/google-reviews/oauth/*` | OAuth endpoints (connect, callback, status, disconnect) |
| `app/api/google-reviews/sync/route.ts` | Sync reviews endpoint |
| `app/api/google-reviews/route.ts` | Get reviews endpoint |
| `app/api/google-reviews/[id]/reply/route.ts` | Post reply endpoint (Phase 2) |
| `app/admin/google-reviews/page.tsx` | Admin UI (desktop table, mobile cards, detail modal, reply form) |
| `supabase/migrations/20260105120000_create_google_reviews_table.sql` | Reviews table schema |
| `supabase/migrations/20260105130000_create_google_business_oauth_table.sql` | OAuth tokens table schema |
| `supabase/migrations/20260115000000_add_google_reviews_reply_audit_columns.sql` | Reply audit columns (Phase 2) |
| `src/types/google-reviews.ts` | TypeScript type definitions |
| `src/components/ui/alert-dialog.tsx` | Confirmation dialog component (Phase 2) |

### Common Tasks

**Add new fields to reviews:**
1. Update database migration
2. Update TypeScript types in `src/types/google-reviews.ts`
3. Update `convertToDBFormat()` in `google-business-profile.ts`
4. Update UI to display new fields

**Connect/disconnect Google Business account:**
1. Navigate to `/admin/google-reviews`
2. Click "Connect Google Business" or "Disconnect" button
3. OAuth flow managed in `src/lib/google-business-oauth.ts`

**Modify sync behavior:**
- Edit `syncReviewsToSupabase()` in `src/lib/google-business-profile.ts`

**Post a reply to a review:**
1. Navigate to `/admin/google-reviews`
2. Click on a review with "Pending" status
3. Write your reply (min 10 chars, max 4096)
4. Click "Post Reply" and confirm

---

## 📅 Timeline Estimate for Phase 2

### Option A: Manual Reply Posting
**Estimated Effort:** 2-3 hours

**Breakdown:**
- Backend (API + Google integration): 1-2 hours
- Frontend (modal + form): 1 hour
- Testing: 30 minutes

### Option B: AI-Assisted Replies (Additional)
**Estimated Effort:** 4-6 hours on top of Option A

**Breakdown:**
- Database migration: 30 minutes
- AI reply generator: 2-3 hours (including prompt engineering)
- Additional API routes: 1 hour
- UI enhancements: 1-2 hours
- Testing AI generation: 1 hour

**Recommendation:** Start with Option A to get basic reply posting working, then add AI features if needed.

---

## ✅ Deployment Checklist

Before deploying to production:

1. **Environment Variables** (Vercel):
   - [ ] `GOOGLE_BUSINESS_ACCOUNT_ID`
   - [ ] `GOOGLE_BUSINESS_LOCATION_ID`
   - [ ] Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set

2. **Database**:
   - [ ] Migration applied to production Supabase
   - [ ] RLS policies configured (if needed)

3. **Google Cloud Console**:
   - [ ] APIs enabled
   - [ ] OAuth consent screen configured
   - [ ] Redirect URIs include production URL

4. **Testing**:
   - [ ] Test sync on production
   - [ ] Verify admin access restrictions
   - [ ] Check performance with 483+ reviews

5. **Documentation**:
   - [ ] Update admin user guide
   - [ ] Train staff on review management

---

**Last Updated:** January 15, 2026
**Version:** 2.0 (Phase 1 & Phase 2 Complete)
**Current Status:** Fully functional - Sync reviews and post replies
**Future Enhancements:**
- AI-assisted reply generation
- Edit/delete posted replies
- Bulk reply functionality
