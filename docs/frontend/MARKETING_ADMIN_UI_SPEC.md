## Marketing Admin UI: Frontend Specification (UI/UX Only)

This document describes exactly what the UI looks like and how it behaves visually. It intentionally avoids backend/data logic, with the only behavior rules being:

- When the user clicks "Estimate size," display the estimated number of customers meeting the selected parameters.
- When the user clicks "Proceed to LINE" or "Proceed to Calls," the audience they just built appears on that destination tab.

---

## Global

- Page title: "Marketing"
- Subtitle: "Build audiences, send LINE messages, and log calls."
- Three main tabs visible at the top (pill style):
  - Audience Builder
  - LINE Blast
  - Call Workflow
- Active tab is highlighted; inactive tabs are muted.

### Tabs Bar (Wireframe)
```
+------------------------------------------------------------------------------------+
|  [ Audience Builder ]   [ LINE Blast ]   [ Call Workflow ]                         |
+------------------------------------------------------------------------------------+
```

---

## Tab 1: Audience Builder

### Layout
- Two-column grid on desktop:
  - Left column (wider): Filters card
  - Right column (narrower): Save Audience card
- Below columns: Saved Audiences card (full width), only visible when at least one audience was saved in the current session.

### Wireframe – Audience Builder (Desktop)
```
+------------------------------------------------------------------------------------+
| Filters (Left, wide)                                   | Save Audience (Right)     |
|------------------------------------------------------------------------------------|
| Title: Filters                                         | Title: Save Audience      |
| Desc: Select customers by last booking date...         | Desc: Snapshots are...    |
| Note: consent not considered                           |                           |
|                                                        | Name: [ Summer Re-... ]   |
| Last booking from: [  yyyy-mm-dd  ]                    |                           |
| Last booking to:   [  yyyy-mm-dd  ]                    | [Save Snapshot]           |
| [ ] Has LINE user ID (switch)                          | [Proceed to LINE]         |
|                                                        | [Proceed to Calls]        |
| [Estimate size]   [ Audience size: X customers match ] |                           |
+------------------------------------------------------------------------------------+
| (Optional) Saved Audiences                                                       > |
|  • Audience A — 123 members · 1/2/2025 3:21 PM             [trash]                |
|  • Audience B — 84 members · 1/1/2025 5:10 PM              [trash]                |
+------------------------------------------------------------------------------------+
```

### Filters Card
- Header:
  - Title: "Filters"
  - Description: "Select customers by last booking date within a window."
  - Note (muted, small text): "Note: Customer consent to marketing materials not considered in audience selection"
- Controls (two columns on desktop, stacked on mobile):
  - Last booking from
    - Input type: date
  - Last booking to
    - Input type: date
  - Has LINE user ID
    - Switch control with label to the right; off by default
- Actions row:
  - Button: "Estimate size" (outline style)
  - Inline status box showing:
    - Title: "Audience size"
    - Description: "X customers match" (updates after estimate is clicked; shows number)

### Save Audience Card
- Title: "Save Audience"
- Description: "Snapshots are stored."
- Field: Name (text input, placeholder: "Summer Re-Engagement")
- Actions:
  - "Save Snapshot" (disabled if estimated size is 0)
  - "Proceed to LINE" (secondary; disabled if estimated size is 0)
  - "Proceed to Calls" (secondary; disabled if estimated size is 0)

### Saved Audiences (Optional)
- Visible after the first save in-session
- For each row: Audience name (bold), "[size] members · [local timestamp]", right-aligned ghost trash icon button

### Empty/Loading/Error Visuals
- Before estimate: "Audience size" shows "0 customers match" until a user estimates.
- Save buttons are disabled when no estimate or estimated size is 0.

---

## Tab 2: LINE Blast

### Layout
- Two-column grid on desktop:
  - Left (wider): Composer card
  - Right (narrower): Templates card

### Wireframe – LINE Blast (Desktop)
```
+------------------------------------------------------------------------------------+
| Composer (Left, wide)                                    | Templates (Right)        |
|------------------------------------------------------------------------------------|
| Title: Composer                                          | Title: Templates         |
| Desc: Create and preview rich messages.                  | Desc: Save and reuse...  |
|                                                          | Template name: [      ]  |
| Text (textarea, ~6 rows):                                | [Save]                   |
| [                                                       ]|                          |
| [                                                       ]| Saved Templates:         |
|                                                          |  • Name — Updated 1/2... |
| Image URL (optional): [ https://... ]                    |     [Load]  [trash]      |
|                                                          |  • Name — Updated 12/30..|
| [ Send Test (mock) ]   [ Send to Audience (N) ]          |     [Load]  [trash]      |
| (inline small error text if needed)                      |                          |
|                                                          |                          |
| Preview:                                                 |                          |
|  ┌───────────────────────────────────────────────┐       |                          |
|  | message text (preserve line breaks)          |       |                          |
|  | [optional image preview]                     |       |                          |
|  └───────────────────────────────────────────────┘       |                          |
+------------------------------------------------------------------------------------+
```

### Composer Card
- Fields:
  - Text (textarea, ~6 rows)
  - Image URL (optional)
- Actions:
  - "Send Test (mock)" (secondary)
  - "Send to Audience (N)" (primary; N = count with LINE IDs in current audience; disabled if no audience or N=0)
- Preview:
  - Shows message text and an image preview if provided

### Templates Card
- Template name input
- Actions: "Save"
- Saved templates list with rows containing name, "Updated [timestamp]", and actions: "Load" (secondary), "Delete" (ghost)

### Empty/Loading/Error Visuals
- Loading message appears while templates are being fetched
- Hidden list when no templates exist

---

## Tab 3: Call Workflow

### Layout
- Two-column grid on desktop:
  - Left (wider): Audience Members card (table)
  - Right (narrower): Notes card
- Below: Logged Calls (mock) card appears if any calls were logged during this session.

### Wireframe – Call Workflow (Desktop)
```
+------------------------------------------------------------------------------------+
| Audience Members (Left, wide)                              | Notes (Right)           |
|------------------------------------------------------------------------------------|
| Title: Audience Members                                    | Title: Notes            |
| Desc: Materialized recipients for calling.                 | Desc: Outcome + notes.. |
| (loading/error/empty message when applicable)              | Reachable? (Yes/No)     |
|                                                            | If Yes:                 |
|  +------------------------------------------------------+  |  Response? (select)     |
|  | Name        | Phone      | LINE? | Last booking | Last | |  Visit timeline? (sel) |
|  |-------------|------------|-------|--------------|------| | Follow-up? (Yes/No)    |
|  | Customer... | 080-...    |  ✓    | 01-03-25     | 01-03| | If Yes and reachable:  |
|  | ... rows ...| ...        |  ×    | ...          | ...  | |  Booking submitted?    |
|  +------------------------------------------------------+  |  (Yes/No)               |
|                                                            | Additional comments:    |
|  Page X of Y   [Prev] [Next]   Rows per page: [10 v]       | [.................]     |
|                                                            |                         |
|                                                            | [Log] [Log & create bkg]|
+------------------------------------------------------------------------------------+
| Logged Calls (mock) (appears after first log)                                       |
|  • Name · 1/2/2025 2:34 PM                                                          |
|    080-... · connected                                                              |
|    notes here...                                                                    |
+------------------------------------------------------------------------------------+
```

### Audience Members Card
- Loading text when fetching; error text (small, red) if retrieval fails
- Empty state: "No audience loaded yet. Build and materialize an audience first."
- Table columns: Name, Phone, LINE? (✓ or ×), Last booking, Last contact
- Rows: click to select (row highlight)
- Footer: pagination controls (Prev/Next) and rows-per-page selector (10/25/50/100)

### Notes Card
- Controls:
  - Reachable? (Yes/No)
  - If Yes: Response (select), Visit timeline (select)
  - Follow-up? (Yes/No)
  - If reachable: Booking submitted? (Yes/No)
  - Additional comments (textarea ~6 rows)
- Actions:
  - "Log" (small; disabled if no selection or empty notes)
  - "Log and create booking" (small, secondary; disabled if no selection or empty notes)

### Logged Calls (mock)
- Appears after first log
- Shows Name · timestamp, phone · outcome, notes (wrapped)

---

## Cross-Tab Rules (UI-only)

- **Estimate size:** When clicked on the Audience Builder tab, show the computed number in "Audience size."
- **Proceed to destination:** "Proceed to LINE" or "Proceed to Calls" navigates to that tab and shows the same set of customers (the audience that was just built).

---

## Accessibility and Responsiveness

- All inputs have visible labels.
- Buttons have clear text labels and disabled styles when not actionable.
- Desktop: two-column layout. Mobile: stacks to a single column with consistent spacing.
- Table: supports keyboard focus for pagination and row selection.

---

## Visual Style

- Cards with titles and small descriptions.
- Muted descriptive copy; error copy in red.
- Buttons:
  - Primary: solid fill
  - Secondary: subtle fill
  - Outline: bordered
  - Ghost: minimal (icon-only actions)

---

## Empty States Summary

- Audience size: 0 until estimated.
- Saved audiences: hidden until one is saved.
- LINE templates: hidden list when none saved.
- Calls table: shows empty message until an audience is shown.
- Logged calls: hidden until at least one call is logged. 