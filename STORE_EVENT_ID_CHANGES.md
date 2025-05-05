# Documentation: Storing Google Calendar Event ID in `lengolf-forms`

**Version:** 1.0
**Date:** 2024-07-27

## 1. Goal

This document outlines the modifications made to the `lengolf-forms` application to ensure that when a backoffice booking is created, the unique ID (`eventId`) of the corresponding Google Calendar event is captured and stored in the `calendar_event_id` column of the shared `bookings` table (in the `bisimqmtxjsptehhqpeg` Supabase project).

## 2. Prerequisites

*   **Database Column:** The `bookings` table in the target Supabase project must have a column named `calendar_event_id` (type: `text`, nullable: `true`). *(Verification showed this column already existed).*
*   **Supabase Client:** The application must have a Supabase client configured to interact with the target database (`refacSupabase` in `lengolf-forms`, using the Anon Key).
*   **Google Calendar API:** The necessary Google Cloud service account credentials and API setup must be in place for creating calendar events.

## 3. Implementation Steps in `lengolf-forms`

The implementation involved modifying the client-side submission handler and adding a new API endpoint for the update operation.

### 3.1. Calendar Event ID Retrieval (Existing Logic Verified)

*   **Library Function (`src/lib/google-calendar.ts`):** The existing `createCalendarEvents` function was verified to already capture the `eventId` from the Google Calendar API response for each successfully created event.
*   **API Route (`app/api/bookings/calendar/route.ts`):** This existing `POST` route was verified to call `createCalendarEvents` and return the results (including `eventId`(s)) in its JSON response structure: `{ success: true, data: [{ eventId: '...', calendarId: '...', status: '...' }, ...] }`.

### 3.2. New API Endpoint for Database Update

*   **File Created:** `app/api/bookings/update-calendar-id/route.ts`
*   **Purpose:** To receive a `bookingId` (our database booking ID) and an `eventId` (the Google Calendar event ID) and update the corresponding booking record.
*   **Method:** `POST`
*   **Request Body:** `{ "bookingId": "...", "eventId": "..." }`
*   **Logic:**
    1.  Parses `bookingId` and `eventId` from the request body.
    2.  Uses the **existing `refacSupabase` client** (configured with the Anon Key, assuming no restrictive RLS policies prevent updates via Anon key) to perform the database update:
        ```javascript
        await refacSupabase
          .from('bookings')
          .update({ calendar_event_id: eventId })
          .eq('id', bookingId)
          .select('id')
          .single();
        ```
    3.  Handles potential errors during the update.
    4.  Returns `{ success: true, updatedBookingId: data.id }` or an error response.

### 3.3. Client-Side Orchestration Modification

*   **File Modified:** `src/components/booking-form/submit/submit-handler.ts`
*   **Function Modified:** `handleFormSubmit`
*   **Changes:**
    1.  The existing sequence of calls to `/api/bookings/create` (to create the booking record and get `bookingId`) and `/api/bookings/calendar` (to create the calendar event) remains.
    2.  **Added Logic:** After the call to `/api/bookings/calendar`:
        *   Check if the response (`calendarResponse`) is `ok`.
        *   If `ok`, parse the JSON response (`calendarResult = await calendarResponse.json();`).
        *   Extract the `eventId` from the first element of the returned data array (`eventId = calendarResult?.data?.[0]?.eventId;`).
        *   If both `bookingId` (from the earlier `/api/bookings/create` call) and the extracted `eventId` are valid:
            *   Make a **new `fetch` call (`POST`)** to the `/api/bookings/update-calendar-id` endpoint.
            *   Send `{ bookingId, eventId }` in the request body.
            *   Log the success or failure of this update attempt (treated as a non-critical step for user feedback, primarily logged for diagnostics).

### 3.4. Type Definition Update

*   **File Modified:** `src/types/booking.ts`
*   **Change:** Added the optional field to the `Booking` interface:
    ```typescript
    calendar_event_id?: string | null; // Google Calendar event ID
    ```

## 4. Summary of Flow

1.  User submits the booking form.
2.  `handleFormSubmit` calls `/api/bookings/create` -> Booking inserted into DB (via `refacSupabase`), `bookingId` obtained.
3.  `handleFormSubmit` calls `/api/bookings/calendar` -> Calendar event created (via Google API), `eventId` returned in response.
4.  `handleFormSubmit` parses calendar response, extracts `eventId`.
5.  `handleFormSubmit` calls `POST /api/bookings/update-calendar-id` with `{ bookingId, eventId }`.
6.  `/api/bookings/update-calendar-id` uses `refacSupabase` to `UPDATE bookings SET calendar_event_id = eventId WHERE id = bookingId`.
7.  `handleFormSubmit` proceeds with LINE notification.

## 5. Notes for Replication in `@lengolf-booking-refactor`

*   **Database Column:** Ensure the `calendar_event_id TEXT NULL` column exists in the `bookings` table.
*   **Calendar Event ID Retrieval:** Verify that the equivalent calendar creation logic/API in the refactor app returns the `eventId`.
*   **Database Update Logic:**
    *   **RLS Check:** Determine if the Supabase client used for booking creation in the refactor app (Anon Key or user-specific key?) has permission to `UPDATE` the `calendar_event_id` column.
    *   **Service Role Key:** If RLS prevents the update, you will need to use a Supabase client initialized with the **Service Role Key** on the backend for the `UPDATE` step.
    *   **Integration:** Instead of creating a separate `/api/bookings/update-calendar-id` route and making an extra client-side call, it's likely more efficient in the refactor app to perform the `UPDATE` *within the main booking creation API route* (e.g., `/api/bookings/create`) after successfully creating the booking and the calendar event. This avoids the extra network hop from the client.
*   **File Paths:** Adapt file paths (`/lib/`, `/api/`, type definitions) to match the structure of the `@lengolf-booking-refactor` project.
*   **Types:** Update the relevant `Booking` type definition in the refactor project. 