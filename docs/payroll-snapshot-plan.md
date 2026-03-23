# Payroll Snapshot Integration Plan
**Status:** Approved for implementation
**Last updated:** 2026-03-20
**Test suite:** See `docs/payroll-test-suite.md`
**Affects:** lengolf-forms (calculation + submit) · LENGOLF accounting (run creation + UI)

---

## Overview

The two apps share the same Supabase project (`bisimqmtxjsptehhqpeg`). Instead of duplicating payroll calculation logic in the accounting app, lengolf-forms calculates payroll and writes results to a shared staging table (`backoffice.payroll_snapshots`). The accounting app reads from that table when creating a payroll run.

```
lengolf-forms                          Supabase (shared DB)                  accounting app
─────────────                          ────────────────────                  ──────────────
Admin reviews payroll calc ──writes──▶ backoffice.payroll_snapshots ──reads──▶ Start Run
for a period                           (one row per staff per period)          pre-populates items
                                                                               Accountant reviews
                                                                               → Process → Journal
```

No API calls between apps. No tokens. Just a shared table.

---

## Part 1 — Database (run once in Supabase SQL editor)

### 1.0 Add COA account `2195 Other Payables`

Required before the journal generator fix goes live. Run in Supabase SQL editor:

```sql
INSERT INTO accounting.chart_of_accounts
  (account_code, name_th, name_en, account_type, account_subtype, normal_balance, is_system, is_header)
VALUES
  ('2195', 'เจ้าหนี้อื่น', 'Other Payables', 'liability', 'current_liability', 'credit', false, false);

UPDATE accounting.chart_of_accounts SET parent_code = '2100' WHERE account_code = '2195';
```

Also append the same row to `supabase/migrations/002_seed_chart_of_accounts.sql` so it's reproducible.

### 1.1 New table: `backoffice.payroll_snapshots`

```sql
CREATE TABLE backoffice.payroll_snapshots (
  id                  SERIAL        PRIMARY KEY,
  period_code         TEXT          NOT NULL,          -- e.g. '2026-02'
  staff_id            INTEGER       NOT NULL REFERENCES backoffice.staff(id),
  staff_name          TEXT          NOT NULL,           -- snapshot at calculation time
  compensation_type   TEXT          NOT NULL CHECK (compensation_type IN ('salary', 'hourly')),
  -- Hours
  working_days        NUMERIC(6,2)  NOT NULL DEFAULT 0, -- days with >= 6 hrs
  total_hours         NUMERIC(8,2)  NOT NULL DEFAULT 0,
  overtime_hours      NUMERIC(8,2)  NOT NULL DEFAULT 0, -- hours over 48/week (non-holiday)
  holiday_hours       NUMERIC(8,2)  NOT NULL DEFAULT 0, -- hours worked on public holidays
  -- Pay components
  base_pay            NUMERIC(12,2) NOT NULL DEFAULT 0, -- base_salary or hours × rate
  daily_allowance     NUMERIC(12,2) NOT NULL DEFAULT 0, -- working_days × daily_allowance_thb
  overtime_pay        NUMERIC(12,2) NOT NULL DEFAULT 0,
  holiday_pay         NUMERIC(12,2) NOT NULL DEFAULT 0, -- 2× rate per Thai LPA §62
  service_charge      NUMERIC(12,2) NOT NULL DEFAULT 0, -- equal share of monthly pool
  total_payout        NUMERIC(12,2) NOT NULL DEFAULT 0, -- sum of all above
  -- Metadata
  status              TEXT          NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'imported', 'superseded')),
  calculated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  calculated_by       TEXT          NOT NULL DEFAULT '',  -- email of who triggered it
  UNIQUE (period_code, staff_id)                          -- one snapshot per person per month
);

CREATE INDEX idx_payroll_snapshots_period ON backoffice.payroll_snapshots(period_code);
CREATE INDEX idx_payroll_snapshots_status ON backoffice.payroll_snapshots(status);
```

**Status lifecycle:**
- `pending` — calculated, not yet imported into a payroll run
- `imported` — accounting app has created a run from this snapshot
- `superseded` — a recalculation was submitted for the same period (old rows marked superseded, new rows inserted as pending)

### 1.2 Updated columns on `accounting.payroll_run_items`

The current `allowances` column is too coarse. Replace with four named fields. Also add `bonus`.

**Run this in Supabase SQL editor** (safe — adds columns, drops the old one):

```sql
-- Add named earnings columns
ALTER TABLE accounting.payroll_run_items
  ADD COLUMN IF NOT EXISTS daily_allowance  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS holiday_pay      NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_charge   NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus            NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Drop the old catch-all (only if no data depends on it)
ALTER TABLE accounting.payroll_run_items
  DROP COLUMN IF EXISTS allowances,
  DROP COLUMN IF EXISTS other_additions;
```

**New gross pay formula:**
```
gross_pay = base_salary + ot_pay + daily_allowance + holiday_pay + service_charge + bonus
```

---

## Part 2 — lengolf-forms (implement in that codebase)

### 2.1 New API route: `POST /api/admin/payroll/[month]/submit`

> **Note:** The route uses `[month]` (not `[period]`) to match the naming convention of all
> other lengolf-forms payroll routes (`[month]/calculations`, `[month]/review-entries`, etc.).
> The parameter format is identical — `YYYY-MM`.
> A `GET` handler on the same route returns snapshot status metadata for the UI.

**What it does:**
1. Calls the existing `calculatePayrollForMonth(monthYear)` from `@/lib/payroll-calculations`
   - Signature: `calculatePayrollForMonth(monthYear: string): Promise<PayrollCalculationResult[]>`
   - `monthYear` format: `'YYYY-MM'` (e.g. `'2026-02'`)
2. Marks any existing `pending` snapshots for the same period as `superseded`
3. Upserts new rows into `backoffice.payroll_snapshots` with `status = 'pending'`
4. Returns `{ period_code, staff_count, total_payout }`

**Mapping from `PayrollCalculationResult` → `payroll_snapshots`:**

| `PayrollCalculationResult` field | → `payroll_snapshots` column | Notes |
|----------------------------------|------------------------------|-------|
| `staff_id`                       | `staff_id`                   | |
| `staff_name`                     | `staff_name`                 | |
| `compensation_type`              | `compensation_type`          | |
| `working_days`                   | `working_days`               | |
| `total_hours`                    | `total_hours`                | |
| `overtime_hours`                 | `overtime_hours`             | |
| `holiday_hours`                  | `holiday_hours`              | |
| `base_pay`                       | `base_pay`                   | NOT `base_salary` — use the computed amount |
| `daily_allowance`                | `daily_allowance`            | |
| `overtime_pay`                   | `overtime_pay`               | |
| `holiday_pay`                    | `holiday_pay`                | |
| `service_charge`                 | `service_charge`             | |
| `total_payout`                   | `total_payout`               | |

> Note: `PayrollCalculationResult` also has `base_salary` and `hourly_rate` as raw fields — do NOT map these to the snapshot. Use `base_pay` which is already the computed amount (base_salary for salary staff, total_hours × hourly_rate for hourly staff).

**Auth:** Use existing admin session auth. Capture `session.user.email` as `calculated_by`.

### 2.2 UI change: "Submit to Accounting" button

**Location (lengolf-forms):**
- Page: `app/admin/payroll-calculations/page.tsx`
- Component to edit: `src/components/admin/payroll/payroll-calculations-interface.tsx`

This is the main interface where staff results are displayed after calculation runs. Add the button there.

**Behaviour:**
- Only enabled after payroll has been calculated for the period
- Calls `POST /api/admin/payroll/[period]/submit`
- On success: shows confirmation toast — *"February 2026 payroll submitted to accounting (12 staff, ฿284,500 total)"*
- If a snapshot already exists for the period: shows warning — *"A snapshot already exists for this period. Submitting will supersede it. Continue?"*
- Button label: **Submit to Accounting**

---

## Part 3 — LENGOLF accounting app (implement in this codebase)

### 3.1 Migration update: `010_payroll_module.sql`

Already handled in §1.2 above — add the ALTER TABLE statements to the bottom of the migration file so it's self-contained for future reference.

### 3.2 Updated types: `src/types/accounting.ts`

Replace the `PayrollRunItem` interface — drop `allowances` and `other_additions`, add four named fields:

```typescript
export interface PayrollRunItem {
  id: string
  run_id: string
  staff_id: number
  staff_name: string
  // Earnings
  base_salary: number
  ot_hours: number
  ot_pay: number
  daily_allowance: number   // replaces allowances
  holiday_pay: number
  service_charge: number
  bonus: number             // manual, never pre-filled from snapshot
  gross_pay: number
  // Deductions
  sso_employee: number
  sso_employer: number
  wht_pnd1: number          // always manual
  other_deductions: number
  // Net
  net_pay: number
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  sso_enrolled?: boolean
}
```

Add a new type for the snapshot:

```typescript
export interface PayrollSnapshot {
  id: number
  period_code: string
  staff_id: number
  staff_name: string
  compensation_type: 'salary' | 'hourly'
  working_days: number
  total_hours: number
  overtime_hours: number
  holiday_hours: number
  base_pay: number
  daily_allowance: number
  overtime_pay: number
  holiday_pay: number
  service_charge: number
  total_payout: number
  status: 'pending' | 'imported' | 'superseded'
  calculated_at: string
  calculated_by: string
}

export interface PayrollSnapshotMeta {
  period_code: string
  staff_count: number
  total_payout: number
  calculated_at: string
  calculated_by: string
  status: 'pending' | 'imported' | 'superseded' | 'none'
}
```

Also update `PayrollSummary` to include the new fields:

```typescript
export interface PayrollSummary {
  total_gross: number
  total_ot_pay: number
  total_daily_allowance: number
  total_holiday_pay: number
  total_service_charge: number
  total_bonus: number
  total_sso_employee: number
  total_sso_employer: number
  total_wht_pnd1: number
  total_other_deductions: number
  total_net_pay: number
  total_cash_required: number   // net_pay + sso_employer (what leaves the bank)
  employee_count: number
}
```

### 3.3 New API route: `GET /api/accounting/payroll/snapshot?period=YYYY-MM`

Returns metadata about the snapshot for a given period (does not return all rows — just enough for the UI banner).

**Response:**
```typescript
{
  status: 'pending' | 'imported' | 'superseded' | 'none',
  staff_count: number,
  total_payout: number,
  calculated_at: string,
  calculated_by: string
}
```

### 3.4 Updated `POST /api/accounting/payroll/runs`

**Change:** After creating the run and its items, check for a `pending` snapshot:

```
1. Create payroll_runs record (unchanged)
2. Check backoffice.payroll_snapshots WHERE period_code = ? AND status = 'pending'
3a. If snapshot exists:
    - Pre-populate items from snapshot (see mapping below)
    - Mark snapshot rows as status = 'imported'
3b. If no snapshot:
    - Pre-populate items from backoffice.staff + staff_compensation (salary only)
    - Flag: snapshot_used = false (returned in response so UI can warn)
4. Return { run, snapshot_used: boolean }
```

**Mapping snapshot → `payroll_run_items`:**

| `payroll_snapshots` field | → `payroll_run_items` field | Notes |
|---------------------------|------------------------------|-------|
| `base_pay`                | `base_salary`                | |
| `overtime_hours`          | `ot_hours`                   | |
| `overtime_pay`            | `ot_pay`                     | |
| `daily_allowance`         | `daily_allowance`            | |
| `holiday_pay`             | `holiday_pay`                | |
| `service_charge`          | `service_charge`             | |
| *(not in snapshot)*       | `bonus`                      | Always 0, manual only |
| computed from gross       | `sso_employee`               | 5% capped at ฿750, from payroll_staff_settings.sso_enrolled |
| computed from gross       | `sso_employer`               | same as above |
| `0`                       | `wht_pnd1`                   | Always manual |

**Gross pay for SSO computation:**
```
gross = base_pay + overtime_pay + daily_allowance + holiday_pay + service_charge
sso = sso_enrolled ? min(gross × 0.05, 750) : 0
```

### 3.5 Updated `PayrollRunClient.tsx`

**Changes:**

1. **Snapshot status banner** (above the employee table):
   - Fetch `/api/accounting/payroll/snapshot?period=YYYY-MM` on period change
   - **Green banner:** *"Payroll calculated by [email] on [date] — OT, holiday pay, and service charge pre-filled from LENGOLF Forms"*
   - **Amber banner:** *"No payroll snapshot found for this period"* — shown when creating a new run
   - **Blue banner (after import):** *"Snapshot imported [date] — [N] staff, ฿[total]"*

2. **Warning modal when no snapshot exists:**
   Triggered when user clicks "Start Run" and `snapshot_used = false`.
   ```
   Title: "No payroll calculation found"
   Body:  "Only base salaries will be pre-filled. OT pay, holiday pay, and
           service charge will be ฿0. Go to LENGOLF Forms to run payroll
           calculations first, then start this run."
   Buttons:
     [primary]           Go to LENGOLF Forms   → opens lengolf-forms payroll page
     [destructive/ghost] Continue with salary only → proceeds with run creation
   ```

3. **Updated table columns** — replace `Allowances` column with four columns:
   - `Daily Allow.`
   - `Holiday Pay`
   - `Svc Charge`
   - `Bonus` (always editable, never pre-filled)

4. **Updated `recomputeItem()` function:**
   ```typescript
   gross = base_salary + ot_pay + daily_allowance + holiday_pay + service_charge + bonus
   sso   = sso_enrolled ? min(gross × 0.05, 750) : 0
   net   = gross - sso_employee - wht_pnd1 - other_deductions
   ```

5. **Updated journal preview** — DR/CR lines reflect new gross formula.

### 3.6 `src/lib/payroll-utils.ts` (shared utility)

Extract SSO calculation to one place, used by API routes and UI:

```typescript
export function calcSso(grossPay: number, enrolled: boolean): number {
  if (!enrolled) return 0
  return Math.round(Math.min(grossPay * 0.05, 750) * 100) / 100
}

export function computeGross(item: Pick<PayrollRunItem,
  'base_salary' | 'ot_pay' | 'daily_allowance' | 'holiday_pay' | 'service_charge' | 'bonus'
>): number {
  return item.base_salary + item.ot_pay + item.daily_allowance +
         item.holiday_pay + item.service_charge + item.bonus
}
```

### 3.7 `src/lib/journal-generators/payroll.ts`

**Fix 1 — `other_deductions` journal bug (critical):**
Currently `other_deductions` is calculated but never appears in the journal lines, causing an unbalanced entry whenever it's non-zero. Add a CR line to account `2195 Other Payables (เจ้าหนี้อื่น)`.

> **Prerequisite:** Add `2195` to the COA before this goes live. `2180` = Corporate Income Tax Payable and `2190` = VAT Payable PP36 — both are taken. Also add the seed row to `supabase/migrations/002_seed_chart_of_accounts.sql`.

```
DR 6110  Salaries & Wages      gross_pay (all staff)
DR 6140  SSO Employer Contrib  sso_employer (all staff)
CR 11122.02  KBank Savings     net_pay (all staff)
CR 2131  WHT Payable PND1      wht_pnd1 (all staff, if > 0)
CR 2170  SSO Payable           sso_employee + sso_employer (all staff)
CR 2195  Other Payables        other_deductions (all staff, if > 0)   ← NEW
```

**Fix 2 — journal date off-by-one bug:**
```typescript
// WRONG — month is 1-indexed from split, but Date.UTC month param is 0-indexed
// so Date.UTC(2026, 3, 0) gives Feb 28, not Mar 31
const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()

// CORRECT
const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
// Wait — this is actually correct. month from '2026-03'.split('-') = 3.
// Date.UTC(2026, 3, 0) = day 0 of April = last day of March = 31. ✓
// Need to verify with '2026-02': Date.UTC(2026, 2, 0) = day 0 of March = Feb 28. ✓
// Actually no bug here — leave as-is after verification.
```
> **Action:** Verify the date calc with a unit test before touching it.

**Fix 3 — update gross formula** to use named fields (drop `allowances`):
```typescript
const totalGross = round2(items.reduce((s, i) =>
  s + i.base_salary + i.ot_pay + i.daily_allowance + i.holiday_pay + i.service_charge + i.bonus, 0
))
```

---

## Part 4 — Implementation Order

### Phase 1 — DB (do first, both codebases need it)
1. Add `2195 Other Payables` to COA (§1.0) — SQL editor + seed migration file
2. Run the `backoffice.payroll_snapshots` migration in Supabase SQL editor (§1.1)
3. Run the `ALTER TABLE accounting.payroll_run_items` migration in Supabase SQL editor (§1.2)

### Phase 2 — lengolf-forms
3. Build `POST /api/admin/payroll/[period]/submit` route
4. Add "Submit to Accounting" button to payroll UI

### Phase 3 — accounting app
5. Update `src/types/accounting.ts` (drop `allowances`, add named fields, add `PayrollSnapshot`)
6. Create `src/lib/payroll-utils.ts` (shared `calcSso` + `computeGross`)
7. Add `GET /api/accounting/payroll/snapshot` route
8. Update `POST /api/accounting/payroll/runs` to read snapshot
9. Fix `src/lib/journal-generators/payroll.ts` (other_deductions bug + gross formula)
10. Update `PayrollRunClient.tsx` (new columns, snapshot banner, warning modal)
11. Run `npx tsc --noEmit` — fix all errors

### Phase 4 — Verify
12. Submit a test snapshot from lengolf-forms for a past period
13. Create a run in accounting app — confirm items pre-fill correctly
14. Process the run — confirm journal balances

---

## Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Where exactly in the lengolf-forms payroll UI does the Submit button live? | Open — identify when working in that codebase |
| 2 | Should re-submitting a period require confirmation? | **Yes** — show warning modal before superseding |
| 3 | Should `bonus` ever come from the snapshot? | **Either** — manual for now, can add to snapshot later if needed |
| 4 | Account code for other_deductions CR line | **Resolved** — use `2195 Other Payables`; 2180 and 2190 are taken. Must add 2195 to COA seed before building |

---

## Files Changed — Accounting App

| File | Change type |
|------|-------------|
| `supabase/migrations/010_payroll_module.sql` | Append ALTER TABLE statements |
| `src/types/accounting.ts` | Update `PayrollRunItem`, `PayrollSummary`; add `PayrollSnapshot`, `PayrollSnapshotMeta` |
| `src/lib/payroll-utils.ts` | New file — shared `calcSso`, `computeGross` |
| `src/lib/journal-generators/payroll.ts` | Fix other_deductions bug, update gross formula |
| `src/app/api/accounting/payroll/snapshot/route.ts` | New route — GET snapshot metadata |
| `src/app/api/accounting/payroll/runs/route.ts` | Read snapshot on run creation |
| `src/components/accounting/payroll/PayrollRunClient.tsx` | New columns, banner, warning modal |

## Files Changed — lengolf-forms

| File | Change type |
|------|-------------|
| `supabase/migrations/011_payroll_snapshots.sql` | New table |
| `app/api/admin/payroll/[month]/submit/route.ts` | New route (GET = snapshot status, POST = submit) |
| `src/components/admin/payroll/payroll-calculations-interface.tsx` | Add Submit button, snapshot banner, supersede warning modal |
