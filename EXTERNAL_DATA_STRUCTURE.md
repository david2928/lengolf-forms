# External Data Structures for Booking Integration

This document outlines the structure and meaning of key data fields related to bookings, intended for use by external applications integrating with the booking system.

## 1. `calendar_events`

*   **Purpose:** This field links a booking record to one or more corresponding entries in a calendar system (e.g., Google Calendar). It is essential for synchronizing booking information with calendar schedules.
*   **Type:** JSONB (allowing for a flexible, structured array of objects).
*   **Structure:** An array of JSON objects. Each object represents a single calendar event associated with the booking. A booking might have multiple calendar events if it involves multiple sessions or components.

    ```json
    [
      {
        "eventId": "string",
        "calendarId": "string",
        "status": "string"
      }
      // ... additional event objects may be present
    ]
    ```

*   **Field Definitions:**
    *   `eventId`: (String) The unique identifier of the event within the external calendar system (e.g., Google Calendar's event ID).
    *   `calendarId`: (String) The identifier of the specific calendar where the event is located (e.g., `primary`, an email address associated with a calendar, or a unique calendar resource ID).
    *   `status`: (String) The current status of the calendar event (e.g., "confirmed", "tentative", "cancelled"). This helps track the event's state in the calendar system.

*   **Note on Deprecation:**
    *   Older booking records might have utilized a singular text field (commonly named `calendar_event_id`) to store a single calendar event ID. This approach is deprecated.
    *   The `calendar_events` field is the current standard and should be used for all new booking creations and for understanding calendar linkages. It provides a more robust way to handle bookings that may have multiple associated calendar entries.

## 2. `booking_type`

*   **Purpose:** This field categorizes the booking, specifying the nature of the service or resource booked (e.g., a standard reservation, a special type of session, a maintenance block).
*   **Type:** TEXT (String)
*   **Structure:** A simple string value. The actual string values used will be specific to the booking system's configuration and the types of services offered.
*   **Meaning:** It provides essential context about what the booking represents. This can influence associated logic, display, or notifications. External systems should be configured to understand the set of `booking_type` values relevant to their integration with this booking system.

## 3. `package_name`

*   **Purpose:** If a `booking_type` is part of a larger offering or a bundled package, this field stores the descriptive name of that package.
*   **Type:** TEXT (String), Nullable
*   **Structure:** A simple string value. This field can be `null` or an empty string if the booking is not associated with a specific package.
*   **Meaning:** Provides additional detail when a booking is part of a pre-defined package. If present, it gives more specific context than `booking_type` alone. The actual string values for package names will be specific to the booking system's offerings. If `null` or empty, the booking is likely a standalone offering defined solely by its `booking_type`. 