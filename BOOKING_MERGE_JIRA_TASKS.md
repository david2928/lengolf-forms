# Booking Merge Implementation Tasks (JIRA Format)

## Epic: BKM-E0: Prerequisites & Configuration

**Goal:** Ensure the development environment and application configuration are correctly set up to interact with the target Supabase project using a dedicated client.

---

**Story/Task:** BKM-T0: Create and Configure *New* Supabase Client for Target Project
*   **Description:** Introduce a second Supabase client configuration in `lengolf-forms` specifically for the target project (`bisimqmtxjsptehhqpeg`).
    *   Define and document new environment variables (`REFAC_SUPABASE_URL`, `REFAC_SUPABASE_ANON_KEY`) in `.env`, `env.example`, and deployment environments.
    *   Create a new client initialization file (e.g., `src/lib/refac-supabase.ts`) that uses these new variables to connect anonymously (using the Anon Key) to the target project.
    *   Export the new client instance (e.g., `refacSupabase`).
*   **Acceptance Criteria:**
    *   New environment variables are defined and documented.
    *   A new Supabase client instance connecting to the target project using its Anon Key is successfully created and exported.
    *   The existing Supabase client (`@/lib/supabase`) and its configuration remain unchanged.
    *   The existing `next-auth` configuration for backoffice employee login remains unchanged and unaffected.

---

## Epic: BKM-E1: Align Booking Data with Target Schema

**Goal:** Modify the backoffice application to format and insert booking data matching the target `bookings` table schema, using the fixed email and user ID placeholders.

---

**Story/Task:** BKM-T1: Update `Booking` Type Definition
*   **Description:** Modify the `Booking` interface in `src/types/booking.ts` to match the target database schema structure (including fields like `id`, `name`, `email`, `phone_number`, `date`, `start_time`, `duration`, `number_of_people`, `customer_notes`, `user_id`, `bay`, `status`, `created_at`, `updated_at`). This type represents the object intended for DB insertion.
*   **Acceptance Criteria:**
    *   The `Booking` interface in `src/types/booking.ts` accurately reflects the target `bookings` table schema columns and types confirmed in the spec.
    *   Type checking passes for code using this interface.

---

**Story/Task:** BKM-T2: Implement Booking ID Generation Logic
*   **Description:** Create or adapt a function (potentially in `src/components/booking-form/submit/submit-handler.ts` or a new util file) to generate a unique booking ID string (e.g., `BK` prefix + timestamp + random chars, similar to refactor, or use `uuid`). The target `id` column is `text`.
*   **Acceptance Criteria:**
    *   A function exists that reliably generates unique string IDs suitable for the `bookings.id` column.
    *   The generated ID format is documented or clear from the code.

---

**Story/Task:** BKM-T3: Update `formatBookingData` Function
*   **Description:** Refactor the `formatBookingData` function in `src/components/booking-form/submit/submit-handler.ts`.
    *   It should take `formData` as input.
    *   It should return an object conforming to the **new `Booking` type (BKM-T1)**, intended for **database insertion**.
    *   Calculate `duration` (integer hours) from `formData.startTime` and `formData.endTime`.
    *   Map fields (`customer_name` -> `name`, `contact_number` -> `phone_number`, etc.).
    *   Format `start_time` to `HH:mm`.
    *   Map `bay_number` display names (`Bay 1 (Bar)`) to simple IDs (`Bay 1`).
    *   Generate `id` using the logic from **BKM-T2**.
    *   Set `email` to `'info@len.golf'`.
    *   Set `user_id` to `'059090f8-2d76-4f10-81de-5efe4d2d0fd8'`.
    *   Set `status` to `'confirmed'`.
    *   Include necessary fields like `date`, `number_of_people`, `customer_notes`.
    *   Explicitly *exclude* fields not in the target schema from the returned DB object (`employee_name`, `end_time`, `booking_source`, etc.).
*   **Acceptance Criteria:**
    *   `formatBookingData` correctly transforms `FormData` into an object matching the target `bookings` schema (and the updated `Booking` type).
    *   All required fields are present with correct formatting and placeholder values.
    *   Fields not present in the target schema are excluded from the returned object.
    *   Calculations (duration) and mappings (bay names) are correct.

---

**Story/Task:** BKM-T4: Update `/api/bookings/create` Endpoint
*   **Description:** Modify the API route `app/api/bookings/create/route.ts`.
    *   Import and use the **new Supabase client** (`refacSupabase` from **BKM-T0**).
    *   Ensure it receives the booking data object (formatted by `formatBookingData` on the client).
    *   The **`refacSupabase`** client should perform an `insert` into the target `bookings` table using the received data object.
    *   The object passed to `insert` must match the target `bookings` table schema precisely.
    *   The endpoint should return `{ success: true, bookingId: data.id }` on success.
    *   Error handling should be robust.
*   **Acceptance Criteria:**
    *   The API endpoint successfully inserts a record into the target `bookings` table using the provided data.
    *   The inserted data matches the expected schema, types, and values.
    *   The correct `bookingId` is returned on success.
    *   Appropriate error responses are returned on failure (e.g., database error).

---

## Epic: BKM-E2: Align Calendar Event Formatting

**Goal:** Modify the backoffice application to generate Google Calendar events matching the formatting standard of the target application, using derived `packageInfo` and correct source attribution.

---

**Story/Task:** BKM-T5: Install `date-fns` and `date-fns-tz`
*   **Description:** Add `date-fns` and `date-fns-tz` as project dependencies. Run `npm install date-fns date-fns-tz`.
*   **Acceptance Criteria:**
    *   Dependencies are added to `package.json`.
    *   `npm install` completes successfully.
    *   The libraries can be imported into project files.

---

**Story/Task:** BKM-T6: Refactor `formatCalendarEvent` Function
*   **Description:** Refactor the `formatCalendarEvent` function in `src/lib/google-calendar.ts`.
    *   Update imports to use `date-fns` and `date-fns-tz`; remove `luxon`.
    *   The function needs access to fields required for formatting (e.g., `id`, `name`, `phone_number`, `number_of_people`, `date`, `start_time`, `duration`, `bay`, `customer_notes`, `employee_name`, `booking_type`, `package_name`). Adjust function signature or the data passed to it accordingly.
    *   Derive `packageInfo` string locally from `booking_type` and `package_name`.
    *   Format the `summary` string using the target format, derived `packageInfo`, and simple bay names.
    *   Format the `description` string using the target multi-line format, including derived `packageInfo`, placeholder email, simple bay names, `Via: Backoffice`, `Booking ID`, and `Booked By: ${employee_name}`. Use `date-fns-tz` for date (`EEEE, MMMM d`) and time (`HH:mm - HH:mm`) formatting in `Asia/Bangkok`.
    *   Format `start.dateTime` and `end.dateTime` using ISO format with timezone (`yyyy-MM-dd'T'HH:mm:ssxxx`) via `date-fns-tz`.
    *   Ensure color mapping uses simple bay names (`Bay 1` etc.).
*   **Acceptance Criteria:**
    *   The function correctly generates a Google Calendar `Event` object.
    *   Summary and Description match the target format precisely, with correct data substitution, derived `packageInfo`, placeholder email, and `Via: Backoffice`.
    *   Start/End times are correctly calculated and formatted using `date-fns-tz` in `Asia/Bangkok`.
    *   The function no longer uses `luxon`.

---

## Epic: BKM-E3: Update Frontend Submit Logic

**Goal:** Adjust the form submission handler to use the updated data formatting, manage the data flow for different consumers (DB insert, Calendar format, LINE format), and handle API calls correctly.

---

**Story/Task:** BKM-T7: Modify `handleFormSubmit` Data Flow
*   **Description:** Update the `handleFormSubmit` function in `src/components/booking-form/submit/submit-handler.ts`.
    *   Call the updated `formatBookingData` (**BKM-T3**) to get the object for **database insertion**. Let's call this `dbBookingData`.
    *   Make the POST request to `/api/bookings/create` (**BKM-T4**) using `dbBookingData`. Store the returned `bookingId`.
    *   Prepare the data needed for `formatCalendarEvent` (**BKM-T6**). This might involve creating a separate object holding fields from `formData` and the `bookingId`. Let's call this `calendarInputData`.
    *   Make the POST request to `/api/bookings/calendar` passing `calendarInputData`. Note: The response no longer contains a useful `calendarEventId` to store. Adjust response handling accordingly.
    *   Prepare data for the LINE notification (`formatLineMessage`). Ensure it uses the necessary original fields (like `employee_name`) and potentially the derived `packageInfo` for consistency.
    *   Make the POST request to `/api/notify`.
    *   Adjust overall success/error handling based on the results of these steps.
*   **Acceptance Criteria:**
    *   The function correctly orchestrates the calls to `formatBookingData`, `/api/bookings/create`, `/api/bookings/calendar`, and `/api/notify`.
    *   The correct data payloads are sent to each API endpoint.
    *   The `bookingId` received from `/api/bookings/create` is correctly handled and potentially passed to subsequent steps if needed (e.g., for calendar formatting).
    *   LINE notification formatting remains correct or is adapted as needed.
    *   Frontend UI correctly reflects the overall success or failure state.

---

## Epic: BKM-E4: Testing and Validation

**Goal:** Ensure the implemented changes function correctly and meet the requirements.

---

**Story/Task:** BKM-T8: Unit/Integration Tests
*   **Description:** Write or update unit/integration tests for:
    *   Booking ID generation (**BKM-T2**).
    *   `formatBookingData` (**BKM-T3**) - verify output structure, values, formatting.
    *   `formatCalendarEvent` (**BKM-T6**) - verify output structure, summary/description content, date/time formatting.
    *   API endpoints (`/api/bookings/create`, `/api/bookings/calendar`) if possible.
*   **Acceptance Criteria:**
    *   Relevant functions and components have adequate test coverage.
    *   All tests pass.

---

**Story/Task:** BKM-T9: End-to-End Testing
*   **Description:** Manually test the complete booking flow using the backoffice form.
    *   Create various booking types (normal, package, different bays).
    *   Verify records appear correctly in the target Supabase `bookings` table (check `name`, `email` placeholder, `user_id` placeholder, `bay` ID, `start_time` format, `duration`, etc.).
    *   Verify Google Calendar events are created with the correct details (summary, description, `Via: Backoffice`, times, derived `packageInfo`).
    *   Verify LINE notifications are still sent correctly.
    *   Compare created bookings/events with those from the main customer app for consistency (allowing for known differences like email/source).
*   **Acceptance Criteria:**
    *   The end-to-end flow works as expected according to the specification.
    *   Data in Supabase is correct.
    *   Calendar events are correct.
    *   LINE notifications are correct.
    *   No regressions are observed. 