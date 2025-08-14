## Marketing Admin UI — Implementation Plan (Frontend-only, Simple)

This plan implements the UI described in `MARKETING_ADMIN_UI_SPEC.md` under the admin section, keeping audience logic as simple as possible by reusing the existing customers list logic and API. No backend/database changes. All state is client-side and in-session only.

- Page route: `app/admin/marketing/page.tsx`
- Navigation: add a link in existing admin navigation/menu config
- Styling: follow `docs/frontend/STYLING_GUIDES.md` for tables/buttons/cards

---

## 1) Approach & Reuse

- **Audience logic source of truth**: Reuse existing customers list logic.
  - API: `app/api/customers/route.ts` (supports `lastVisitFrom`, `lastVisitTo`, pagination, sorting; returns `pagination.total`)
  - Hook: `src/hooks/useCustomerManagement.ts` (`useCustomers` for fetching with filters)
  - UI/Table: `src/components/admin/customers/customers-data-table.tsx` and/or `src/components/admin/customers/customer-detail/shared/ResponsiveDataView.tsx` for responsive list rendering
- **LINE presence** (simple proxy): Use `preferred_contact_method === 'LINE'` as "Has LINE user ID" toggle proxy. Keep it strictly UI-only and filter via existing API parameter `preferredContactMethod=LINE`.
- **Audience materialization**: Use the same filters and a single fetch to `/api/customers` to both:
  - show an inline preview table (first page), and
  - read `pagination.total` as the audience size
- **State sharing across tabs**: Parent-level React state inside the page component holds the current audience filters and last materialized result; both the LINE Blast and Call Workflow tabs read from the same state. No URL/state management beyond in-page state.

---

## 2) Files to Create or Edit

- Create: `app/admin/marketing/page.tsx` — single page with three tabs and shared parent state
- Edit: `src/config/menu-items.ts` — add a "Marketing" menu item (label: Marketing; path: `/admin/marketing`)
- (If needed) Edit: Admin nav component to surface new item if not data-driven

---

## 3) Data model (frontend-only)

- Filters (audience builder):
  - `lastVisitFrom?: string` (yyyy-mm-dd)
  - `lastVisitTo?: string` (yyyy-mm-dd)
  - `hasLine?: boolean` (maps to `preferredContactMethod=LINE` when true)
  - `page?: number` (for preview pagination)
  - `limit?: number` (default 10–25 for preview)
- Materialized audience result (in-session):
  - `customers: Customer[]` (from `/api/customers`)
  - `total: number` (from `pagination.total`)
  - `lineCount: number` (derived count where `preferred_contact_method === 'LINE'` among preview; for button label use `Math.min(total, estimatedLineCount)` if we later compute exactly; initially use `total` when `hasLine` filter is on, else count previewed LINEs)
  - `timestamp: string` (local time)

---

## 4) UI Structure and Responsibilities

### 4.1 Tabs Layout (single page)
- Use `Tabs` from `src/components/ui` to render three tabs (Audience Builder, LINE Blast, Call Workflow)
- Parent component holds audience state and passes it into each tab panel

### 4.2 Audience Builder
- Left card: Filters
  - Inputs: Date (from/to), Switch: "Has LINE user ID"
  - Buttons: "Estimate size" (outline)
  - Inline status: "Audience size: X customers match" (from `pagination.total`)
- Right card: Save Audience
  - Name text input (placeholder: "Summer Re-Engagement")
  - Buttons (disabled if size = 0): "Save Snapshot", "Proceed to LINE", "Proceed to Calls"
- Below (optional): Saved Audiences (in-session only)
  - Local array of `{ name, size, timestamp }`, deletable
- Actions
  - Estimate fetches `/api/customers?lastVisitFrom&lastVisitTo&preferredContactMethod|all&page=1&limit=10` and updates state with `customers` (preview) and `pagination.total` (size)
  - Proceed buttons: switch active tab, keeping the current audience state intact

### 4.3 Audience Preview Window
- Render a compact table under the Filters card after estimation with the first page of results
- Columns: Name, Phone, LINE? (✓ when `preferred_contact_method === 'LINE'`), Last booking (`last_visit_date`)
- Reuse `ResponsiveDataView` or implement a minimal table with `src/components/ui/table`

### 4.4 LINE Blast
- Left (Composer):
  - Textarea (6 rows)
  - Optional Image URL
  - Buttons:
    - "Send Test (mock)" — no external side effects
    - "Send to Audience (N)" — N = number of recipients with LINE in current audience (derived; disabled if 0 or no audience)
  - Preview: render text and image preview
- Right (Templates):
  - Name input, Save, list of saved templates with Load/Delete (in-session only)
- Data source: uses the parent audience state as the source of recipients; no API calls beyond the existing `/api/customers` fetch used during estimation

### 4.5 Call Workflow
- Left (Audience Members): table with pagination controls bound to the same filters
  - On page change, re-fetch `/api/customers` with same filters and the requested page
  - Columns: Name, Phone, LINE?, Last booking, Last contact (render "-" for now)
- Right (Notes):
  - Reachable? (Yes/No)
  - If Yes: Response (select), Visit timeline (select)
  - Follow-up? (Yes/No)
  - If reachable: Booking submitted? (Yes/No)
  - Additional comments (textarea)
  - Actions: "Log" and "Log & create booking" (mock; append to in-session log list; optionally route to `/create-booking` when second action is clicked)
- Logged Calls (mock) appears under the grid after first log, showing recent logs

---

## 5) Simple Data Flow

- Parent state keeps `audienceFilters` and `audienceResult`
- Audience Builder "Estimate size" sets both
- Switching tabs reads the same `audienceResult` (no rematerialization)
- Call Workflow may paginate using the same `audienceFilters` to fetch additional pages; the top-of-tab retains current preview and count

---

## 6) Interaction Details (minimal)

- Disabled states:
  - Save/Proceed buttons are disabled until an estimate is run and size > 0
  - Send to Audience disabled if no audience or N = 0
  - Notes actions disabled if no row selected or notes empty (simple check)
- Errors/Loading:
  - Use small inline copy for errors; show spinners/skeletons during fetch
- Accessibility:
  - All inputs with visible labels; keyboard focus on table rows and pagination

---

## 7) API Usage (no backend changes)

- Endpoint: `GET /api/customers` with existing params
  - `lastVisitFrom`, `lastVisitTo` map to date inputs
  - `preferredContactMethod=LINE` when "Has LINE user ID" is on; otherwise omit or `all`
  - `page`, `limit` for pagination/preview
- Audience size: use `response.pagination.total`
- Preview rows: use `response.customers` from the same call

---

## 8) Deliverables Checklist

- [ ] `app/admin/marketing/page.tsx` with three tabs and shared state
- [ ] Audience Builder: filters, estimate, preview, save snapshot (in-session), proceed buttons
- [ ] LINE Blast: composer + in-session templates; send buttons wired to audience count
- [ ] Call Workflow: paginated audience table, notes card, in-session log list
- [ ] Navigation entry in `src/config/menu-items.ts`
- [ ] Styling per `docs/frontend/STYLING_GUIDES.md` (cards, buttons, table)

---

## 9) Acceptance Criteria

- Building an audience uses only the `customers` API and returns a size and preview
- Proceeding to LINE or Calls shows the exact same audience (no additional filtering)
- All persistence is in-session only (page refresh clears snapshots/logs/templates)
- No backend changes or new tables/procedures

---

## 10) Assumptions and Notes

- "Has LINE user ID" is proxied by `preferred_contact_method === 'LINE'` to keep scope minimal. If a true LINE-ID flag exists in the future, we can replace the proxy without UI changes.
- "Last contact" is not currently available from the reused API; display "-".
- For simplicity, we show up to one page of preview in Audience Builder and rely on the total count for size.

---

## 11) Implementation Steps (short)

1. Add menu item to `src/config/menu-items.ts` pointing to `/admin/marketing`.
2. Create `app/admin/marketing/page.tsx` with `Tabs` and parent state for filters + result.
3. Implement Audience Builder card(s): date pickers, LINE switch, estimate button, preview table (use existing table components), and save/proceed actions.
4. Implement LINE Blast using in-session templates and a simple preview; buttons use audience size and are guarded by disabled states.
5. Implement Call Workflow with table + notes + mock log list; re-fetch on pagination using stored filters.
6. Verify accessibility/disabled states and apply styles per guides.

---

## 12) Testing Plan (manual)

- Audience Builder:
  - Set a date window and estimate; verify size and preview render
  - Toggle LINE switch; estimate again; verify size adjusts
  - Save snapshot; verify it appears below
  - Click Proceed to LINE/Calls; verify active tab changes and audience is preserved
- LINE Blast:
  - Enter text and image URL; verify preview
  - Verify Send to Audience is disabled when N=0 and enabled otherwise
  - Save template; load and delete work in-session
- Call Workflow:
  - Verify audience table matches builder preview (first page) and paginates
  - Fill notes and Log; verify it appears in Logged Calls (mock) 

---

## 13) Phase Scope

- **Phase 1 (current)**:
  - Implement Audience Builder and Call Workflow per this plan
  - Add LINE Blast tab as a placeholder only (static card with copy: "Phase 2 – coming soon")
  - No LINE messaging, templates, or send/test behavior
  - All persistence remains in-session only
- **Phase 2 (future)**:
  - Activate LINE Blast composer, in-session templates, and "Send to Audience"
  - Wire up real send behavior per integration plan (separate spec)
  - Optional: persist templates and logs if required

Note: Where section 4.4 details composer/templates, that content is deferred to Phase 2. In Phase 1, render a placeholder card inside the LINE Blast tab with disabled or absent controls.

---

## 14) Tasks & Progress Tracking

- Setup and Navigation
  - [ ] Add "Marketing" item to `src/config/menu-items.ts` pointing to `/admin/marketing`
  - [ ] Verify admin navigation shows the new entry

- Page Scaffold (`app/admin/marketing/page.tsx`)
  - [ ] Create page with `Tabs`: Audience Builder, LINE Blast, Call Workflow
  - [ ] Establish parent state for `audienceFilters` and `audienceResult`

- Audience Builder (Phase 1)
  - [ ] Filters card: date inputs (from/to), LINE switch (sets `preferredContactMethod=LINE` when on)
  - [ ] Estimate action: fetch `/api/customers` using filters; store `customers` and `pagination.total`
  - [ ] Audience size inline status updates from `pagination.total`
  - [ ] Preview window: compact table of first page results (Name, Phone, LINE?, Last booking)
  - [ ] Save Audience card: name input; in-session save list below with delete
  - [ ] Proceed buttons: switch tab to LINE Blast or Call Workflow, preserving audience state

- LINE Blast (Phase 1 placeholder)
  - [ ] Render placeholder card with text: "LINE Blast – Phase 2 (coming soon)"
  - [ ] Ensure it still reads current audience size (for display only)

- Call Workflow (Phase 1)
  - [ ] Audience Members table reading the same filters; supports pagination via `/api/customers`
  - [ ] Row selection state and disabled actions when no selection
  - [ ] Notes card: reachable, response, visit timeline, follow-up, booking submitted, comments
  - [ ] Actions: "Log" and "Log & create booking" (mock append to in-session log; optional navigate for booking)
  - [ ] Logged Calls (mock) appears after first log

- UX/Accessibility/Styling
  - [ ] Disabled states as specified (buttons, actions)
  - [ ] Loading and small error messages in each card/table
  - [ ] Keyboard focus on table rows and pagination controls
  - [ ] Apply styles per `docs/frontend/STYLING_GUIDES.md`

- Documentation & QA
  - [ ] Update this plan with any deviations during build
  - [ ] Manual test scenarios from Section 12 verified 