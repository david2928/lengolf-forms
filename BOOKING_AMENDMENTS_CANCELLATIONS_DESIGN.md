\
## Design Document: Managed Booking Amendments & Cancellations

**Version:** 0.8
**Date:** (Current Date)
**Author:** AI Assistant & User

**1. Introduction**

*   **1.1. Purpose:** This document outlines the design for new API endpoints and associated logic to manage booking amendments (modifications) and cancellations within the Lengolf Forms system, accessible by both internal staff tools and potentially the customer-facing booking application.
*   **1.2. Problem Statement:** Currently, booking modifications or cancellations made directly in Google Calendar do not update the Supabase backend. This leads to data inconsistencies. This also prevents future enhancements like customer self-service for booking changes and lacks a proper audit trail.
*   **1.3. Proposed Solution Overview:**
    *   Introduce dedicated API endpoints for booking amendments and cancellations.
    *   These endpoints will manage updates in both Supabase and Google Calendar.
    *   Establish Supabase as the single source of truth.
    *   Implement an audit log for all booking changes.
    *   Guide staff to use new system features, avoiding direct GCal edits for bookings.
    *   Design APIs with consideration for future use by the customer-facing booking application.
*   **1.4. Key Pre-requisite & Finding:**
    *   **Critical Finding & Confirmation:** The current front-end booking flow (`src/components/booking-form/submit/submit-handler.ts` via `/api/bookings/calendar` and `src/lib/google-calendar.ts`) correctly creates multiple Google Calendar events if applicable (e.g., for coaching bookings, an event is created in the relevant bay calendar AND the specific coach's calendar, confirmed by reviewing `getRelevantCalendarIds`). The Supabase `bookingId` (generated client-side) is embedded in the GCal event description. However, despite the existence of an `/api/bookings/update-calendar-id` endpoint, **the main booking flow does NOT currently call it (or any similar mechanism) to save the returned array of Google Calendar `eventId`(s) and `calendarId`(s) back to the Supabase `bookings` table.**
    *   **Pre-requisite (P0 Task):** Before implementing amendment/cancellation features, the booking creation flow *must* be updated to store all associated Google Calendar `eventId`s and their respective `calendarId`s in the Supabase `bookings` table using a structured format (JSONB array recommended, see section 3.5).

**2. Current Booking Flow & System Analysis**

*   **2.1. Booking Creation (Revised based on investigation & confirmation):**
    *   Staff create bookings via the backoffice application.
    *   `handleFormSubmit` in `submit-handler.ts` orchestrates:
        1.  Client-side `bookingId` generation.
        2.  `POST /api/bookings/create` saves initial booking to Supabase.
        3.  `/api/bookings/calendar` (calling `createCalendarEvents`) creates event(s) in relevant Google Calendar(s) (bay and/or coach calendars). Supabase `bookingId` is in event description.
        4.  `createCalendarEvents` returns `CalendarEventResult[]` (array of `{eventId, calendarId, status}`).
        5.  **Gap:** This array is **NOT** currently persisted back to the Supabase `bookings` record. The existing `calendar_event_id` field is unpopulated/insufficient.
*   **2.2. Data Storage:**
    *   `bookings` table (Supabase) is primary store.
    *   `Booking` type includes `calendar_event_id?: string | null;` which is insufficient for multiple events and not reliably populated. This needs to be replaced/augmented (see section 3.5).
*   **2.3. Current Modification/Cancellation Process:** Manual GCal edits not synced to Supabase.

**3. Proposed Solution: New API Endpoints & Logic**

*   **3.1. P0 Task: Implement Storage for Multiple Google Calendar Event IDs in Booking Creation Flow**
    *   **3.1.1. Backend - New/Enhanced Endpoint for Linking Events:**
        *   Create a new endpoint: `PUT /api/bookings/{bookingId}/link-calendar-events`.
            *   **Purpose:** Update a Supabase booking record with all its associated Google Calendar event details.
            *   **Request Payload:**
                ```json
                {
                  "calendar_events": [ // Array of calendar event details from CalendarEventResult[]
                    { "eventId": "string", "calendarId": "string", "status": "string" }
                  ]
                }
                ```
            *   **Logic:** Validate `bookingId` and payload. Update the `bookings` table row for `bookingId`, storing the `calendar_events` array in a new dedicated JSONB column (named `calendar_events`, see section 3.5). The existing `/api/bookings/update-calendar-id` should be deprecated or re-evaluated once this is in place.
    *   **3.1.2. Frontend (`src/components/booking-form/submit/submit-handler.ts`):**
        *   Modify `handleFormSubmit`:
            *   After successfully calling the Google Calendar creation step (e.g., `/api/bookings/calendar`) and receiving the `calendarEventResultsArray`.
            *   If `calendarEventResultsArray` is not empty and contains valid event details:
                *   Call `PUT /api/bookings/{bookingId}/link-calendar-events` with the `calendarEventResultsArray` as the payload.
            *   Handle success/error of this linking update.

*   **3.2. Guiding Principles for Amendments/Cancellations:**
    *   **Supabase as Single Source of Truth:** All booking states reside in Supabase.
    *   **API-Driven Changes:** All modifications/cancellations via these new APIs.
    *   **Atomic Operations (Best Effort):** Strive for Supabase & GCal updates to succeed together.
    *   **Comprehensive Audit Logging:** All changes creating, updating, or cancelling bookings via these APIs must be logged in a dedicated `booking_history` table.

*   **3.3. API Consumer Considerations (Staff Backoffice & Customer Booking App)**
    *   **Authentication:** APIs must be protected. Staff backoffice uses NextAuth/Google. The customer booking app will have its own authentication mechanism. API logic will need to identify the calling application/user type.
    *   **Authorization:**
        *   **Staff:** Broad permissions to modify/cancel bookings, potentially with overrides for certain business rules. Identified by `employee_name` (form field).
        *   **Customers:** Can only modify/cancel *their own* bookings, identified via their authentication token. May have restrictions on editable fields and timeframes for changes/cancellations (e.g., no cancellation within 24 hours of booking time without staff override).
        *   API endpoint logic will need to differentiate behavior and apply rules based on user role.

*   **3.4. API Endpoints (Amendments/Cancellations):**

    *   **3.4.1. Update Booking:** `PUT /api/bookings/{bookingId}`
        *   **Request Payload (Staff initiated):**
            ```json
            {
              "bay"?: "Bay 1" | "Bay 2" | "Bay 3" | null,
              "date"?: "YYYY-MM-DD",
              "start_time"?: "HH:mm",
              "end_time"?: "HH:mm", // Or duration, to be finalized
              "bookingType"?: "string", // e.g., "Normal Bay Rate", "Gold Package"
              "packageName"?: "string | null", // If bookingType involves a package
              "customer_notes"?: "string | null", // Internal notes, part of GCal desc.
              "number_of_people"?: number,
              "employee_name": "string" // Staff making the change
            }
            ```
        *   **Note:** Customer `name` and `phone_number` on the booking are NOT directly updatable via this endpoint. If these were incorrect during initial creation, the booking should be cancelled and re-created.
        *   Core Logic:
            1.  Authentication & Authorization.
            2.  Validation.
            3.  Availability Check (If Bay/Date/Time Changed).
            4.  Fetch Current Booking from Supabase.
            5.  Calendar Event Identification Fallback.
            6.  Supabase Update: Apply changes from payload to the `bookings` record. Set `updated_by_identifier` to `employee_name`, `updated_by_type` to 'staff'.
            7.  Create Audit Log Entry.
            8.  **Google Calendar Update:**
                *   Fetch the fully updated booking data from Supabase (or use the merged data).
                *   Transform this data into `CalendarFormatInput` (similar to new booking flow).
                *   Call `formatCalendarEvent` (from `src/lib/google-calendar.ts`) to regenerate the GCal event `summary` and `description` based on the *updated booking details*.
                *   For each linked GCal event in `calendar_events`:
                    *   If bay/calendar changes: Delete old event, create new one with regenerated details, update `calendar_events` in Supabase for that GCal link.
                    *   Else: Update existing GCal event (`calendar.events.update()`) with the regenerated `summary`, `description`, new times, etc.
            9.  **Notification (LINE):** Send a LINE message indicating booking modification (see section 3.7).
            10. Error Handling & Logging.

    *   **3.4.2. Cancel Booking:** `POST /api/bookings/{bookingId}/cancel`
        *   Core Logic:
            1.  Auth & Validation.
            2.  Fetch Booking.
            3.  Calendar Event Identification Fallback.
            4.  Supabase Update.
            5.  Create Audit Log Entry.
            6.  Google Calendar Update: Delete GCal events.
            7.  **Notification (LINE):** Send a LINE message indicating booking cancellation (see section 3.7).
            8.  Error Handling & Logging.

*   **3.5. `src/lib/google-calendar.ts` Modifications:**
    *   **New Function: `updateCalendarEvent`** (as detailed in Design Doc v0.1/v0.2)
    *   **New Function: `deleteCalendarEvent`** (as detailed in Design Doc v0.1/v0.2)
    *   **New Function: `findCalendarEventsByBookingId`**
        *   `async function findCalendarEventsByBookingId(auth: any, bookingId: string, allPossibleCalendarIds: string[]): Promise<{eventId: string, calendarId: string}[]>`
        *   Logic: Iterate `allPossibleCalendarIds`, list events filtering by `q: "Booking ID: {bookingId}"`.
    *   The existing `formatCalendarEvent` function will be crucial for regenerating GCal event `summary` and `description` during updates, ensuring consistency.

*   **3.6. Data Model Changes (Supabase):**
    *   **`bookings` table:**
        *   `calendar_event_id` (Existing string field): To be deprecated.
        *   `calendar_events` (New, JSONB column, nullable - Confirmed Solution): Stores `[{ "eventId": "string", "calendarId": "string", "status": "string" }, ...]`. Target for P0 Task.
        *   `updated_by_type`: (New, nullable text, e.g., 'staff', 'customer', 'system') - To distinguish modifier type.
        *   `updated_by_identifier`: (New, nullable text) Stores `employee_name` for staff, or customer user ID for customers.
        *   `cancelled_by_type`: (New, nullable text, e.g., 'staff', 'customer').
        *   `cancelled_by_identifier`: (New, nullable text) Stores `employee_name` or customer user ID.
        *   `cancellation_reason`: (New, nullable text).
        *   `google_calendar_sync_status`: (New, nullable text).
    *   **`booking_history` table (New):**
        *   `history_id` (UUID, PK, default `gen_random_uuid()`)
        *   `booking_id` (UUID, FK to `bookings.id`, not nullable)
        *   `changed_at` (TIMESTAMPTZ, default `now()`, not nullable)
        *   `action_type` (TEXT, not nullable, e.g., 'CREATE_BOOKING', 'UPDATE_BOOKING_STAFF', 'CANCEL_BOOKING_CUSTOMER', 'GCAL_LINK_UPDATE')
        *   `changed_by_type` (TEXT, nullable, e.g., 'staff', 'customer', 'system')
        *   `changed_by_identifier` (TEXT, nullable, stores `employee_name` or customer user ID/identifier)
        *   `changes_summary` (TEXT, nullable, brief human-readable summary of change, e.g., "Date changed from X to Y")
        *   `old_booking_snapshot` (JSONB, nullable, snapshot of the `bookings` row *before* this specific change)
        *   `new_booking_snapshot` (JSONB, nullable, snapshot of the `bookings` row *after* this specific change, useful for updates)
        *   `notes` (TEXT, nullable, e.g., for storing `cancellation_reason` here too, or system notes)

*   **3.7. Notification Strategy (LINE Messaging)**
    *   Utilize the existing `/api/notify` endpoint and `LineMessagingClient` (`src/lib/line-messaging.ts`).
    *   The API routes for Update Booking and Cancel Booking will be responsible for triggering notifications after all other operations (Supabase update, GCal update, Audit Log) are successful.
    *   **3.7.1. Modification Notifications:**
        *   Message should clearly state "UPDATED Booking Notification (ID: {bookingId})."
        *   Content should reflect the *new, confirmed details* of the booking, similar to the current new booking notification (generated by a function like `formatLineMessage` but adapted for modifications, e.g., `formatLineModificationMessage(updatedBookingData, oldBookingData)` to potentially highlight changes if desired, or just show the new state).
        *   Target appropriate LINE group(s) (e.g., 'operations', and potentially coaching groups if a coaching booking is modified).
    *   **3.7.2. Cancellation Notifications:**
        *   Message should be concise: e.g., `Booking CANCELLED (ID: {bookingId})
Customer: {CustomerName}
Date: {Date} {Time}
Bay: {Bay}
Cancelled By: {employee_name}
Reason: {cancellation_reason (if provided)}`.
        *   A new formatting function like `formatLineCancellationMessage(cancelledBookingData)` will be needed.
        *   Target appropriate LINE group(s).

**4. Impact on Existing System & Workflow**

*   **P0 Task Implementation:** Highest priority.
*   **Staff Training:** Emphasize using new system features for all changes and avoiding direct GCal edits.
*   **Error Reporting/Dashboard:** For monitoring `google_calendar_sync_status`.
*   **Backfill Strategy:** Consider a script to populate `calendar_events` (or the enhanced `calendar_event_id` string) for existing bookings using `findCalendarEventsByBookingId`.

**5. Future Considerations**

*   Customer Self-Service Portal.
*   UI for Staff for these new actions.
*   Granular Permissions.
*   Automated reconciliation jobs for `google_calendar_sync_status = 'error_syncing'`.

**6. Open Questions & Discussion Points (Updated)**

*   **Updatable Fields - Staff (Finalized for this phase):**
    *   Allowed: `bay`, `date`, `start_time`/`end_time` (or `duration`), `number_of_people`, `customer_notes` (internal), `bookingType`, `packageName`.
    *   **NOT directly updatable on existing booking:** Customer `name`, `phone_number`. Requires cancel and re-create if incorrect.
    *   Google Calendar `summary` and `description` will be *regenerated* by the system based on underlying Supabase data changes. The `customer_notes` field from Supabase will be part of the GCal event description's notes section.
*   **Updatable Fields - Customers:** (To be defined when customer portal is designed).
*   **Business rules for customer modifications/cancellations:** (To be defined for customer portal).
*   **Transactionality for Audit Log:** (MVP: Log error; Future: DB Transactions).
*   **UI for `employee_name` (Staff Attribution):** (Confirmed: Manual input field for staff, similar to booking creation).

**7. User Interface Considerations (Staff Backoffice - Expanded)**

*   **7.1. Booking List & Search:**
    *   Existing booking list/search interfaces should be enhanced to easily identify bookings.
    *   Clear display of booking status (confirmed, cancelled).
*   **7.2. Booking Details View:**
    *   A comprehensive view of a single booking's current details.
    *   Should display `google_calendar_sync_status` if not 'synced'.
    *   Buttons: "Edit Booking", "Cancel Booking".
    *   Tab/Section: "Booking History" to display relevant entries from `booking_history` table for this booking.
*   **7.3. Edit Booking Workflow (Modal/Page):**
    *   Accessed via "Edit Booking" button from the Booking Details View.
    *   Form pre-filled with current booking data.
    *   **Fields available for Staff Editing (reflecting payload in 3.4.1):**
        *   `Bay`: Dropdown/Select. *Triggers availability check.*
        *   `Date`: Date picker. *Triggers availability check.*
        *   `Start Time`: Time picker. *Triggers availability check.*
        *   `End Time`: Time picker (or `Duration`). *Triggers availability check.*
        *   `Booking Type`: Dropdown/Select.
        *   `Package Name`: (Potentially auto-populated or selectable if booking type involves packages).
        *   `Customer Notes (Internal)`: Text area. (This will also be included in GCal event description notes).
        *   `Number of People`: Number input.
        *   `Employee Name`: Text input (mandatory for staff action attribution).
        *   **Not Editable Here:** Customer Name, Customer Phone (staff must cancel/recreate if these are wrong for the booking).
    *   Availability Display: When date/time/bay is changed, UI should ideally show a loading state and then confirm availability or show an error message if the new slot is booked (from the API's availability check).
    *   "Save Changes" button: Enabled only if form is valid and any (new) slot is available. Triggers `PUT /api/bookings/{bookingId}`.
    *   Clear success/error feedback from the API call.
*   **7.4. Cancel Booking Workflow (Modal):**
    *   Accessed via "Cancel Booking" button.
    *   Confirmation Dialog: "Are you sure you want to cancel this booking?"
        *   Display key booking details (e.g., Customer, Date, Time, Bay).
    *   **Input Fields in Modal:**
        *   `Cancellation Reason`: Text area (optional or required based on policy).
        *   `Employee Name`: Text input, pre-filled if possible, otherwise mandatory.
    *   "Confirm Cancellation" button triggers `POST /api/bookings/{bookingId}/cancel`.
    *   Clear success/error feedback. Booking status should update in UI (e.g., list view, details view).
*   **7.5. Error/Discrepancy Handling UI:**
    *   A way for admins to view bookings flagged with `google_calendar_sync_status = 'error_syncing'`._ This might be a separate admin dashboard/view.

--- 