# Booking Merge Implementation Progress

This tracker corresponds to the tasks outlined in `BOOKING_MERGE_JIRA_TASKS.md`.

| Task ID | Task Description                           | Status    | Assignee | Notes / PR Link     |
| :------ | :----------------------------------------- | :-------- | :------- | :------------------ |
| **E0**  | **Prerequisites & Configuration**          |           |          |                     |
| BKM-T0  | Create/Configure *New* Supabase Client     | Done      | Gemini   | New env vars documented in .env.example; `src/lib/refac-supabase.ts` created. User to add actual values. |
| **E1**  | **Align Booking Data with Target Schema**  |           |          |                     |
| BKM-T1  | Update `Booking` Type Definition           | Done      | Gemini   | Updated interface in `src/types/booking.ts` to match target schema. |
| BKM-T2  | Implement Booking ID Generation Logic    | Done      | Gemini   | Created `generateBookingId` in `src/lib/booking-utils.ts` matching refactor logic. |
| BKM-T3  | Update `formatBookingData` Function        | Done      | Gemini   | Refactored function in `submit-handler.ts` for target DB schema (incl. ID, duration, mapping, placeholders). Adjusted `handleFormSubmit` to use it. |
| BKM-T4  | Update `/api/bookings/create` Endpoint     | Done      | Gemini   | Modified API route to use `refacSupabase` client, insert updated `Booking` data into target table, return correct response. |
| **E2**  | **Align Calendar Event Formatting**        |           |          |                     |
| BKM-T5  | Install `date-fns`/`date-fns-tz`           | Done      | Gemini   | Ran `npm install date-fns date-fns-tz`. |
| BKM-T6  | Refactor `formatCalendarEvent` Function    | Done      | Gemini   | Refactored function in `google-calendar.ts` to use `date-fns-tz`, new input type, and target format. |
| **E3**  | **Update Frontend Submit Logic**           |           |          |                     |
| BKM-T7  | Modify `handleFormSubmit` Data Flow        | Done      | Gemini   | Updated `handleFormSubmit` to prepare `calendarInputData`, refactored/called `formatLineMessage` with `formData`, adjusted API calls. |
| **E4**  | **Testing and Validation**                 |           |          |                     |
| BKM-T8  | Unit/Integration Tests                     | To Do     | Gemini   |                     |
| BKM-T9  | End-to-End Testing                         | To Do     | Gemini   |                     | 