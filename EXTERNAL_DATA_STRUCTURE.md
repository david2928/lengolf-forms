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

*   **Purpose:** This field categorizes the booking, specifying the nature of the service or resource booked.
*   **Type:** TEXT (String)
*   **Structure:** A simple string value. While the system might have a defined list of common booking types selectable through its interface, it may also support custom/other values.
*   **Common Examples (derived from UI components, not exhaustive and may include an "Others" free-text option):
    *   `"Package"` (Indicates the booking relates to a pre-defined package of services)
    *   `"Coaching (Boss)"`
    *   `"Coaching (Boss - Ratchavin)"`
    *   `"Normal Bay Rate"`
    *   `"ClassPass"`
    *   `"VR"`
    *   `"Others (e.g. Events)"` (This specific value might indicate that the actual type is a user-provided string)
*   **Meaning:** It provides essential context about what the booking represents. External systems should be prepared to handle known types and potentially more varied strings if custom types are allowed. It's advisable to clarify the full list of current, actively used `booking_type` values with the system administrators if a comprehensive mapping is required.

## 3. `package_name`

*   **Purpose:** If a `booking_type` is `"Package"` (or a similar type indicating a package), this field stores the descriptive name of that specific package.
*   **Type:** TEXT (String), Nullable
*   **Structure:** A simple string value. This field is typically `null` or an empty string if the booking is not associated with a package (i.e., `booking_type` is not 'Package' or similar).
*   **Value Determination:** The value for `package_name` is typically sourced in one of the following ways during booking creation:
    1.  **Selection from Existing Customer Packages:** If a customer has existing packages, their names are fetched (e.g., via an API endpoint like `/api/packages/customer/{customerId}`) and presented for selection. The selected package's name (often a `label` or `packageTypeName` field from the fetched data) is stored.
    2.  **Selection from General Available Packages:** A list of generally available packages might be fetched (e.g., via an API endpoint like `/api/packages/available`) for selection.
    3.  **New Package Purchase Intention:** The system may allow indicating that a customer *will buy* a new package. In such cases, `package_name` might be a user-entered string, possibly prefixed (e.g., "Will buy [Entered Package Name]").
*   **Meaning:** Provides the specific name of the package chosen or intended for purchase. External systems should use this in conjunction with `booking_type` to understand the full context of a package booking. The value can be dynamic based on available packages and user input. 