# PR 16 – Security Review Notes

This document captures the critical findings identified while reviewing https://github.com/david2928/lengolf-forms/pull/16, together with suggested remediations.

## 1. Notifications API lacks authentication guard
- **Location:** `app/api/notifications/route.ts`
- **Issue:** The handler instantiates a Supabase client with the service-role key and serves any caller (middleware skips `api/**`). An unauthenticated request can enumerate every booking notification, including customer names, phone numbers, and internal notes.
- **Suggestion:** Require a valid NextAuth session (e.g., `getServerSession`) and verify staff/admin permissions before executing the query. Once re-authenticated, switch to an anon Supabase client scoped by RLS so that only authorized staff can read data.

## 2. Acknowledge/notes endpoints trust caller-supplied `staff_id`
- **Location:** `app/api/notifications/[id]/acknowledge/route.ts`, `app/api/notifications/[id]/notes/route.ts`
- **Issue:** Both endpoints use the service-role client and accept `staff_id` from the request body. Any caller can impersonate any staff member and mark notifications as read/add notes, even without login.
- **Suggestion:** Derive the staff identity from the authenticated session, reject unauthenticated requests, and drop the `staff_id` body parameter entirely. Enforce staff/admin role checks before updating the row.

## 3. Client hard-codes staff identity
- **Location:** `app/notifications/page.tsx`
- **Issue:** The notifications page uses `const STAFF_ID = 1` for all acknowledge/notes mutations. Even if the APIs are locked down, this will stamp every action as staff #1.
- **Suggestion:** Load the current user’s staff record (via context or a dedicated endpoint) and pass the real `staff_id` to mutation helpers. Consider moving that lookup into the `NotificationsProvider` so all consumers share the correct identity.

---
These changes should be addressed before merging to prevent data leakage and privilege escalation.
