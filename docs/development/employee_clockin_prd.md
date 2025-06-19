# Product Requirements Document (PRD)

## Project Title: PIN-Based Employee Clock-In App with Photo Capture

## Prepared For
Golf Simulator Bar – In-House Platform (Browser-based, Tablet-Only)

---

## Objective
Develop a web-based time clock system that allows employees to clock in and out using unique PINs on a shared tablet. To prevent buddy punching, the app will capture a front-facing photo during each clock-in/out action. Data will be stored in an existing Supabase backend and viewable through the admin dashboard.

---

## Core Features

### 1. PIN-Based Clock-In/Out Interface
- Numeric keypad input with digits 0–9
- Buttons:
  - "Submit"
  - "Clear" or "Back"
- If a PIN is partially entered and idle for 10 seconds, reset the input field
- Upon submit:
  - Match PIN to employee in database
  - Capture timestamp (and photo, if enabled)
  - Store entry in Supabase

### 2. Front-Facing Camera Photo Capture (Security Option)
- On submit, activate the front-facing camera to take a still photo
- Display consent notice above submit button: _"By clicking Submit, you consent to your photo being captured for security purposes."_
- If permission is denied:
  - Log the clock-in without photo
  - Alert admin on dashboard
- Provide visual confirmation that photo was captured successfully

### 3. Data Storage & Reporting (Supabase)
- Save the following data:
  - Employee ID (from PIN match)
  - Timestamp
  - Action (Clock In / Clock Out)
  - Captured photo (URL or Base64)
  - Device info (optional)
- Audit trail enabled
- Photos automatically purged:
  - Each month, delete photos from the prior month

### 4. Admin Dashboard Functionality (Additions)
- View clock-in/out logs by employee, date, time
- Flag entries missing photos or exceeding thresholds
- Display overtime alerts:
  - Highlight entries where employees work more than 8 hours in a single day or more than 48 hours in a week
- Export data to CSV (daily, weekly, monthly)
- Filter by:
  - Employee name
  - Date range
  - Anomalies (e.g., no photo, missed punch)

---

## Nice-to-Have (Optional)
- Offline mode for clocking in/out
  - Cache local records and sync to Supabase once online
- Detection of duplicate use of PIN within short time window (e.g., 1 min)

---

## Technical Notes
- **Platform**: Web-based, browser-only (runs on tablet)
- **Authentication**: No login; PIN only
- **Privacy**: Consent included in UI; photos stored temporarily
- **Browser behavior**:
  - Camera access permission must be granted by the user
  - If permission is denied, app will continue to log timestamps
  - If browser resets permissions (Safari/iOS), staff will need to re-enable
- **Photo deletion**:
  - Scheduled monthly job in Supabase or via backend script
  - Retention policy: delete photos after 1 month

---

## UX/UI Requirements
- Large, finger-friendly dialpad (0–9) with:
  - Submit button (green)
  - Clear/Back button (gray or red)
- Instruction text at top: _"Enter your PIN to clock in or out"_
- Visible consent message about photo capture
- Feedback message on success: _"Clock-in successful at 10:03 AM. Have a great shift!"_
- Feedback on failure: _"PIN not recognized. Please try again."_
