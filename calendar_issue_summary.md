# Bookings Calendar Troubleshooting Summary

## Problem:
The "Bookings Calendar" page at `/bookings-calendar` is currently displaying an empty calendar. No booking information is being rendered.

## Investigation and Findings:

1.  **Initial Issue (Manual Time Input & Duration):**
    *   A related issue with manual time input and booking duration calculation was resolved. This involved:
        *   Ensuring `formData.duration` (in minutes) is used correctly in `src/components/booking-form/submit/submit-handler.ts`.
        *   Updating the `duration` column in the `public.bookings` Supabase table from `INTEGER` to `REAL` to support fractional hours (e.g., 0.5 hours for 30 minutes).
    *   This part seems to be resolved, and bookings with fractional hours can now be saved.

2.  **Current Calendar Display Issue:**
    *   The frontend component responsible for the calendar is `app/bookings-calendar/page.tsx`.
    *   This component fetches booking data by making `POST` requests to the API endpoint `/api/bookings/calendar/events` for each bay.
    *   **Key Mismatch Identified:**
        *   The frontend (`app/bookings-calendar/page.tsx`) expects the API response to contain an array of booking events under a property named `events`:
          ```typescript
          // In app/bookings-calendar/page.tsx
          const data = await response.json();
          if (data.success && Array.isArray(data.events)) { 
            // Process data.events
          }
          ```
        *   However, the backend API route handler (`app/api/bookings/calendar/events/route.ts`) currently returns data under a property named `busyTimes`:
          ```typescript
          // In app/api/bookings/calendar/events/route.ts
          const busyTimes = await getBayAvailability(calendar, bayNumber, date);
          return NextResponse.json({
            success: true,
            busyTimes: busyTimes 
          });
          ```
        *   This discrepancy causes the frontend to not find any events, leading to an empty calendar. The `Array.isArray(data.events)` check fails because `data.events` is undefined.

3.  **Duration Calculation in Calendar Frontend:**
    *   A secondary issue was identified in `app/bookings-calendar/page.tsx` where `durationHours` for display/processing was calculated using `endTime.diff(startTime, 'hours').hours`, which would result in `0` for durations less than a full hour.
    *   This was corrected to:
        ```typescript
        const durationInMinutes = endTime.diff(startTime, 'minutes').minutes;
        const durationHours = durationInMinutes / 60;
        ```
    *   While this fixes the internal `duration_hours` representation in the frontend, the primary issue of not receiving event data from the API remains.

## Next Steps to Resolve:

The core problem is the mismatch between what the frontend expects (`data.events`) and what the backend API provides (`data.busyTimes`).

**Hypothesis:** A recent change might have altered the backend API to return `busyTimes` instead of the previously expected `events` array, or the frontend expectation changed.

**Proposed Actions:**

1.  **Investigate Previous Versions (User to perform locally):**
    *   Use `git` to inspect the history of `app/api/bookings/calendar/events/route.ts` and `app/bookings-calendar/page.tsx`, focusing on the suspected commit `3a37e16` or other relevant recent commits.
    *   **Goal:** Determine if the API previously returned an `events` array and if the frontend was correctly processing it.

2.  **Align Frontend and Backend:**
    *   **Option A (If API change was unintentional or incorrect):** Modify `app/api/bookings/calendar/events/route.ts` to fetch detailed booking information from the database (e.g., `public.bookings` table) for the given bay and date, format it into the `BookingEvent` structure, and return it as `NextResponse.json({ success: true, events: listOfBookingEvents });`.
    *   **Option B (If API intentionally returns `busyTimes` and frontend needs to adapt):** Modify `app/bookings-calendar/page.tsx` to use `data.busyTimes`. This would likely require significant changes to how `busyTimes` (which probably only contains start/end times) are processed into displayable booking information (customer name, type, etc., might be missing). This option seems less likely to be correct for a detailed calendar view.

**Information Needed from User:**
*   The actual JSON response body from the `/api/bookings/calendar/events` network request (from browser developer tools).
*   Relevant code snippets from the previous working version (e.g., commit `3a37e16`) of:
    *   The `return NextResponse.json(...)` part in `app/api/bookings/calendar/events/route.ts`.
    *   The data processing section in `app/bookings-calendar/page.tsx` that handles the API response.

This information will clarify whether the API's behavior changed or if the frontend's expectation was modified, and guide the best way to fix the data flow. 