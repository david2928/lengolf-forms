# Lengolf Forms - Booking Amendments & Cancellations Implementation Tasks

This document outlines the tasks required to implement the booking amendments and cancellations feature as detailed in the `BOOKING_AMENDMENTS_CANCELLATIONS_DESIGN.MD` (version 0.8).

## Phase 0: Pre-requisites (P0 Task - Link Google Calendar Events to Supabase Bookings)

**Goal:** Ensure that for every new booking, all associated Google Calendar event IDs and their respective calendar IDs are reliably stored in the Supabase `bookings` table.

*   **Backend (Supabase Database & API Route)**
    *   [ ] **DB Schema:** Add `calendar_events` (JSONB, nullable) column to the `bookings` table.
        *   *Note: This column will store an array of objects, e.g., `[{ "eventId": "string", "calendarId": "string", "status": "string" }, ...]`*
    *   [ ] **DB Schema:** Plan for the eventual deprecation of the old `calendar_event_id` (TEXT type) column in the `bookings` table.
    *   [ ] **API Route:** Create new endpoint `PUT /api/bookings/{bookingId}/link-calendar-events`.
        *   [ ] Endpoint Logic: Accept `bookingId` from path and `calendar_events` array in the request body.
        *   [ ] Endpoint Logic: Validate `bookingId` and the structure of the `calendar_events` payload.
        *   [ ] Endpoint Logic: Update the corresponding row in the `bookings` table, setting the `calendar_events` JSONB column.
        *   [ ] Endpoint Logic: Implement robust error handling (e.g., booking not found, invalid payload).
        *   [ ] Endpoint Logic: Deprecate or re-evaluate the existing `POST /api/bookings/update-calendar-id` endpoint.
*   **Frontend (`src/components/booking-form/submit/submit-handler.ts`)**
    *   [ ] **Modify `handleFormSubmit` Function:**
        *   [ ] After the successful creation of Google Calendar events (currently done via a call to `/api/bookings/calendar` which returns `calendarEventResultsArray`).
        *   [ ] If `calendarEventResultsArray` is not empty and contains valid event details:
            *   [ ] Make a `PUT` request to the new `/api/bookings/{bookingId}/link-calendar-events` endpoint.
            *   [ ] Send the `calendarEventResultsArray` as the `calendar_events` field in the request body.
        *   [ ] Handle success and error responses from this new API call appropriately (e.g., log errors, potentially provide user feedback if critical).
*   **Testing & Verification (P0)**
    *   [ ] Verify that new bookings (both single GCal event and multiple GCal event types like coaching) correctly populate the `calendar_events` field in the Supabase `bookings` table.
    *   [ ] Test error handling for the new `link-calendar-events` API endpoint.
    *   [ ] Test error handling in the frontend `handleFormSubmit` for the linking step.

## Phase 1: Booking Amendments & Cancellations - Backend Development

**Goal:** Develop the backend infrastructure (database changes, API endpoints, helper functions) to support booking modifications and cancellations.

*   **Data Model Changes (Supabase `bookings` table - additions)**
    *   [x] **DB Schema:** Add `updated_by_type` (TEXT, nullable, e.g., 'staff', 'customer', 'system').
    *   [x] **DB Schema:** Add `updated_by_identifier` (TEXT, nullable, stores `employee_name` or customer ID).
    *   [x] **DB Schema:** Add `cancelled_by_type` (TEXT, nullable, e.g., 'staff', 'customer').
    *   [x] **DB Schema:** Add `cancelled_by_identifier` (TEXT, nullable, stores `employee_name` or customer ID).
    *   [x] **DB Schema:** Add `cancellation_reason` (TEXT, nullable).
    *   [x] **DB Schema:** Add `google_calendar_sync_status` (TEXT, nullable, e.g., 'synced', 'error_syncing', 'pending_link', 'found_via_fallback').
*   **Data Model Changes (Supabase - new `booking_history` table)**
    *   [x] **DB Schema:** Create `booking_history` table with the following columns:
        *   `history_id` (UUID, PK, default `gen_random_uuid()`)
        *   `booking_id` (TEXT, FK to `bookings.id`, not nullable)
        *   `changed_at` (TIMESTAMPTZ, default `now()`, not nullable)
        *   `action_type` (TEXT, not nullable, e.g., 'CREATE_BOOKING', 'UPDATE_BOOKING_STAFF', 'CANCEL_BOOKING_CUSTOMER', 'GCAL_LINK_UPDATE')
        *   `changed_by_type` (TEXT, nullable)
        *   `changed_by_identifier` (TEXT, nullable)
        *   `changes_summary` (TEXT, nullable, brief human-readable summary)
        *   `old_booking_snapshot` (JSONB, nullable)
        *   `new_booking_snapshot` (JSONB, nullable)
        *   `notes` (TEXT, nullable, e.g., cancellation reason, system notes)
*   **Google Calendar Library (`src/lib/google-calendar.ts`)**
    *   [x] Implement `async function updateCalendarEvent(auth, calendarId, eventId, eventData)`.
    *   [x] Implement `async function deleteCalendarEvent(auth, calendarId, eventId)`.
    *   [x] Implement `async function findCalendarEventsByBookingId(auth, bookingId, allPossibleCalendarIds)`.
*   **API Endpoint: Update Booking (`PUT /api/bookings/{bookingId}`)**
    *   [x] Endpoint: Implement structure and validate request payload (as per Design Doc v0.8).
    *   [x] Endpoint: Implement Authentication & Authorization logic (initially for staff, consider customer path for future).
    *   [x] Endpoint: Implement Availability Check logic if bay/date/time fields are present in the payload.
    *   [x] Endpoint: Implement Supabase update logic for the `bookings` table (apply changes, set `updated_by_*` fields).
    *   [x] Endpoint: Implement insertion into `booking_history` table (MVP: log error on failure; Future: transactional).
    *   [x] Endpoint: Implement Google Calendar update logic:
        *   *Note: `bookingType` and `packageName` are now retrieved by fetching and parsing the existing GCal event's description to ensure accurate GCal/LINE integration during updates.*
        *   [x] Regenerate GCal `summary` and `description` using `formatCalendarEvent` with updated booking data.
        *   [x] Handle GCal event updates (bay moves mean delete old, create new; otherwise, update existing).
    *   [x] Endpoint: Implement LINE Notification for modification (see Task: Notification Message Formatting).
    *   [x] Endpoint: Implement comprehensive error handling and logging.
*   **API Endpoint: Cancel Booking (`POST /api/bookings/{bookingId}/cancel`)**
    *   [x] Endpoint: Implement structure and validate request payload.
    *   [x] Endpoint: Implement Authentication & Authorization logic.
    *   [x] Endpoint: Implement Supabase update logic for `bookings` table (set `status` to 'cancelled', set `cancelled_by_*`, `cancellation_reason`).
    *   [x] Endpoint: Implement insertion into `booking_history` table (MVP: log error on failure; Future: transactional).
    *   [x] Endpoint: Implement Google Calendar delete logic for all linked events.
    *   [x] Endpoint: Implement LINE Notification for cancellation (see Task: Notification Message Formatting).
    *   [x] Endpoint: Implement comprehensive error handling and logging.
*   **Notification Message Formatting (Backend)**
    *   [x] Create/adapt function `formatLineModificationMessage(updatedBookingData, oldBookingData)` for modification notifications.
    *   [x] Create function `formatLineCancellationMessage(cancelledBookingData)` for cancellation notifications.

## Phase 2: Booking Amendments & Cancellations - Staff Backoffice UI Development

**Goal:** Provide staff users with the interface to modify and cancel bookings.

*   **Manage Bookings Page & Navigation**
    *   [x] UI: Add "Manage Bookings" item to the main navigation menu.
    *   [x] UI: Create new page `/manage-bookings`.
*   **Booking List & Search Enhancements**
    *   [x] UI: Implement date filter on `/manage-bookings` page, defaulting to today's date.
    *   [x] UI: Fetch and display list of bookings for the selected date.
    *   [x] UI: Ensure booking status (e.g., 'confirmed', 'cancelled') is clearly displayed in lists/search results.
    *   [x] UI: Implement search/filter functionality for the booking list (e.g., by customer name, phone, status).
*   **Booking Details View Enhancements**
    *   [x] UI: Display `google_calendar_sync_status` if it's not 'synced' or indicates an issue.
    *   [x] UI: Add "Edit Booking" button.
    *   [x] UI: Add "Cancel Booking" button.
    *   [/] UI: Implement a "Booking History" tab or section to display entries from the `booking_history` table related to the viewed booking.
        *   *API endpoint and modal for displaying booking history created. Integration into page done via button on each row.*
*   **Edit Booking Workflow (New Modal or Page)**
    *   [x] UI: Design and implement form, pre-filled with data of the booking being edited.
    *   [x] UI: Include editable fields for staff: `Bay`, `Date`, `Start Time`, `Duration`, `Customer Notes (Internal)`, `Number of People`, `Employee Name` (mandatory text input for staff attribution).
        *   *Note: `Booking Type` and `Package Name` are not stored with the booking and are therefore not editable fields in this modal. Their values for GCal/LINE integrations during updates need separate consideration if not derivable from stored booking data.*
    *   [/] UI: Implement client-side validation for these fields. (Basic validation for required fields and time format added, can be enhanced)
    *   [x] UI: When `Bay`, `Date`, or `Time` fields are changed, trigger an API call to check availability. Display a loading indicator and then success/error message for the slot availability. (Debounced check implemented)
    *   [x] UI: "Save Changes" button – enabled only if the form is valid and any newly selected slot is available. On click, it calls `PUT /api/bookings/{bookingId}`. (Availability check influences button state)
    *   [x] UI: Provide clear success (e.g., toast notification, redirect) or error feedback from the API call.
*   **Cancel Booking Workflow (New Modal)**
    *   [x] UI: Design and implement confirmation modal, displaying key booking details.
    *   [x] UI: Include input fields for `Cancellation Reason` (optional/required based on policy) and `Employee Name` (mandatory text input for staff attribution).
    *   [x] UI: "Confirm Cancellation" button – on click, it calls `POST /api/bookings/{bookingId}/cancel`.
    *   [x] UI: Provide clear success or error feedback. UI should update to reflect the new 'cancelled' status of the booking.
*   **Error/Discrepancy Handling UI (Admin - Optional MVP)**
    *   [ ] UI: Consider a basic interface for admins to view bookings flagged with `google_calendar_sync_status = 'error_syncing' `.

## Phase 3: Future Considerations & Polish (Post-MVP)

*   [ ] **Data Migration:** Develop and run a script to backfill the `calendar_events` field for existing bookings using the `findCalendarEventsByBookingId` logic.
*   [ ] **Audit Log Transactionality:** Refactor backend API endpoints to use database transactions for `bookings` table updates and `booking_history` inserts, ensuring atomicity.
*   [ ] **Customer Self-Service Portal:** Design and implement features for customers to modify/cancel their own bookings, leveraging and extending the APIs built.
*   [ ] **Automated Reconciliation:** Investigate and potentially implement automated jobs or alerts for bookings with `google_calendar_sync_status = 'error_syncing'`.
*   [ ] **UI for `employee_name`:** If staff authentication provides user details, explore auto-filling `employee_name` instead of manual input, potentially with an override.

--- 
**Progress Legend:**
*   [ ] To Do
*   [x] Done
*   [/] In Progress

*(Please update the checkboxes as tasks are worked on and completed)* 