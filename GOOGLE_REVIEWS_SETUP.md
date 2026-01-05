# Google Reviews Management System - Setup Guide

## 📋 Overview

This system allows you to sync Google Business Profile reviews to the LENGOLF backoffice, view them in an admin dashboard, and (in Phase 2) generate AI-powered reply suggestions.

**Current Status:** Phase 1 Complete ✅

---

## 🏗️ Phase 1: Review Sync to Supabase (COMPLETED)

### What Was Implemented

#### 1. Database Schema
- **File:** `supabase/migrations/20260105120000_create_google_reviews_table.sql`
- **Table:** `backoffice.google_reviews`
- **Fields:**
  - Review metadata (reviewer name, rating, comment, language)
  - Reply information (existing replies from Google)
  - Sync timestamps

#### 2. OAuth Authentication
- **File:** `src/lib/auth-config.ts` (modified)
- **Scope Added:** `https://www.googleapis.com/auth/business.manage`
- **Method:** Uses NextAuth with Google OAuth
- **Access:** Stored in user session (access token & refresh token)

#### 3. Google Business Profile Service
- **File:** `src/lib/google-business-profile.ts`
- **Functions:**
  - `fetchAllReviews(accessToken)` - Fetch reviews from Google API
  - `syncReviewsToSupabase(accessToken)` - Sync to database
  - `getReviewsFromDB(filters)` - Query database

#### 4. API Endpoints
- **POST** `/api/google-reviews/sync` - Trigger sync from Google
- **GET** `/api/google-reviews` - List reviews with filters

#### 5. Admin UI
- **Page:** `/admin/google-reviews`
- **Features:**
  - Stats dashboard (total, avg rating, replied, pending)
  - Filter by reply status
  - Sync button
  - Reviews table with ratings, comments, language

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

### Step 1: Enable Google APIs

1. Go to [Google Cloud Console - API Library](https://console.cloud.google.com/apis/library?project=lengolf-forms)

2. Search for and enable these APIs:
   - ✅ **My Business Business Information API**
   - ✅ **My Business Account Management API**

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

### Step 3: Re-authenticate to Grant OAuth Scope

**CRITICAL STEP:**

The new OAuth scope (`business.manage`) requires re-authentication:

1. Sign out of the lengolf-forms backoffice
2. Sign in again with your Google account
3. You'll see a new permission request:
   - ✅ "Manage your business information on Google"
4. Click "Allow"

This grants the access token needed to fetch reviews.

### Step 4: Test the Feature

1. Navigate to: **`/admin/google-reviews`**

2. Click **"Sync Reviews"** button

3. You should see:
   - Reviews syncing from Google
   - Success message: "Sync completed! X new, Y updated, Z total"
   - Reviews appearing in the table

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

### Issue: "No Google access token found"

**Cause:** You haven't re-authenticated since adding the new scope

**Solution:**
1. Sign out completely
2. Clear browser cache/cookies (optional but recommended)
3. Sign in again and grant permissions

### Issue: "Failed to fetch reviews: 403 Forbidden"

**Cause:** Service account or user doesn't have permission to access reviews

**Solutions:**
1. Verify APIs are enabled in Google Cloud Console
2. Check that your Google account is a Manager/Owner of the LENGOLF Business Profile
3. Confirm you granted the OAuth permission during sign-in

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

### Authentication Flow
```
User Signs In (OAuth)
  ↓
NextAuth stores access_token in session
  ↓
Admin clicks "Sync Reviews"
  ↓
API uses access_token to call Google Business Profile API
  ↓
Reviews synced to backoffice.google_reviews table
```

### Data Flow
```
Google Business Profile API
  ↓
fetchAllReviews() [src/lib/google-business-profile.ts]
  ↓
syncReviewsToSupabase()
  ↓
backoffice.google_reviews (Supabase)
  ↓
GET /api/google-reviews
  ↓
Admin UI displays reviews
```

### OAuth Scopes Required
- `openid` - User identification
- `email` - User email
- `profile` - User profile info
- `https://www.googleapis.com/auth/business.manage` - **NEW** - Read/write business info

---

## ⏳ Phase 2: AI Reply Generation & Posting (PENDING)

### Outstanding Features

#### 1. Database Addition
**File:** `supabase/migrations/YYYYMMDD_google_review_replies.sql` (NOT YET CREATED)

```sql
CREATE TABLE backoffice.google_review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES backoffice.google_reviews(id),
  suggested_reply TEXT NOT NULL,
  approved_reply TEXT,
  status TEXT DEFAULT 'pending',  -- pending, approved, posted, rejected
  approved_by TEXT,  -- admin user email
  approved_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  post_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. AI Reply Generator
**File:** `src/lib/ai/google-review-reply-generator.ts` (NOT YET CREATED)

**Features:**
- Use OpenAI API to generate replies
- Style based on existing LENGOLF reply patterns:
  - Short & friendly (1-2 sentences)
  - Include reviewer's name
  - Golf emojis (⛳️ 🏌️)
  - Invitation to return
  - Thai replies for Thai reviewers (with K' prefix)

**Example Prompts from Existing Replies:**
- "Thanks for coming [Name]! Please come back again soon! ⛳️"
- "Loved having you [Name]! Your long drive records will be tough to beat! ⛳️"
- "Thank you คุณ [Name] - glad you had a great time! Please come back soon!"

#### 3. Additional API Routes (NOT YET CREATED)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/google-reviews/[id]/suggest` | POST | Generate AI reply suggestion |
| `/api/google-reviews/[id]/approve` | POST | Approve/edit reply (admin only) |
| `/api/google-reviews/[id]/post` | POST | Post approved reply to Google |
| `/api/google-reviews/bulk-suggest` | POST | Generate suggestions for all unreplied |

#### 4. UI Components (NOT YET CREATED)

**Directory:** `app/admin/google-reviews/components/`

Components needed:
- `ReplyEditor.tsx` - Modal to view/edit AI suggestion
- `ReviewCard.tsx` - Enhanced card with reply workflow
- `BulkActions.tsx` - Generate all / Approve all buttons

**Workflow:**
1. User clicks "Generate Reply" on a review
2. AI creates suggestion based on review content
3. Admin reviews and can edit suggestion
4. Admin clicks "Approve & Post"
5. Reply posted to Google via API
6. Status updated in database

#### 5. Reply Posting Service (NOT YET CREATED)

**Function:** `postReviewReply(reviewName, replyText, accessToken)`

**Google API Endpoint:**
```
PUT accounts/{account}/locations/{location}/reviews/{review}/reply
```

**Request Body:**
```json
{
  "comment": "Thanks for coming! Please visit again soon! ⛳️"
}
```

---

## 📝 Phase 2 Implementation Checklist

### Prerequisites
- [ ] Phase 1 fully tested and working
- [ ] OpenAI API key confirmed in `.env` (already exists: `OPENAI_API_KEY`)
- [ ] Admin approval workflow requirements confirmed

### Database
- [ ] Create migration for `google_review_replies` table
- [ ] Add indexes for status and review_id

### Backend
- [ ] Create AI reply generator service
- [ ] Create API route: suggest reply
- [ ] Create API route: approve reply
- [ ] Create API route: post to Google
- [ ] Add admin-only permission checks
- [ ] Implement error handling for Google API failures

### Frontend
- [ ] Create ReplyEditor component with textarea for editing
- [ ] Add "Generate Reply" button to review rows
- [ ] Add approval workflow UI
- [ ] Show reply posting status (pending/posted/error)
- [ ] Add bulk actions toolbar

### Testing
- [ ] Test AI reply generation with different review types
- [ ] Test approval workflow
- [ ] Test posting replies to Google (use test reviews first!)
- [ ] Test error handling (API failures, invalid tokens)
- [ ] Test Thai language detection and reply generation

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
| `src/lib/google-business-profile.ts` | Core Google API integration |
| `src/lib/auth-config.ts` | OAuth configuration |
| `app/api/google-reviews/sync/route.ts` | Sync endpoint |
| `app/admin/google-reviews/page.tsx` | Admin UI |
| `supabase/migrations/20260105120000_create_google_reviews_table.sql` | Database schema |

### Common Tasks

**Add new fields to reviews:**
1. Update database migration
2. Update TypeScript types in `src/types/google-reviews.ts`
3. Update `convertToDBFormat()` in `google-business-profile.ts`
4. Update UI to display new fields

**Change OAuth scopes:**
1. Update `src/lib/auth-config.ts` authorization params
2. Users must re-authenticate to grant new scope

**Modify sync behavior:**
- Edit `syncReviewsToSupabase()` in `src/lib/google-business-profile.ts`

---

## 📅 Timeline Estimate for Phase 2

**Estimated Effort:** 1-2 days of development

**Breakdown:**
- Database migration: 30 minutes
- AI reply generator: 2-3 hours (including prompt engineering)
- API routes: 2-3 hours
- UI components: 3-4 hours
- Testing: 2-3 hours

**Total:** 8-12 hours

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

**Last Updated:** January 5, 2026
**Version:** 1.0 (Phase 1 Complete)
**Next Milestone:** Phase 2 - AI Reply Generation
