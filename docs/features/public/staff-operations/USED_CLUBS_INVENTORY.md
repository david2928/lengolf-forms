# Used Clubs Inventory Management

## Overview

The Used Clubs Inventory feature manages LENGOLF's second-hand golf club listings across two applications: the **Forms app** (staff and admin management) and the **Website app** (public-facing sales page). Staff can browse inventory and add new clubs, while admins have full CRUD control including cost management, availability toggles, set organization, and club deletion.

**Staff Location**: `/staff/used-clubs`
**Admin Location**: `/admin/used-clubs`
**Access Level**: Staff (browse, add, edit details) / Admin (full CRUD, cost, availability, sets, delete)
**Primary Purpose**: Manage second-hand club listings that appear on the public website for sale

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Staff Workflow](#staff-workflow)
3. [Admin Workflow](#admin-workflow)
4. [Club Set Management](#club-set-management)
5. [Image Upload System](#image-upload-system)
6. [Pricing Model](#pricing-model)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)
9. [Component Architecture](#component-architecture)
10. [Cross-Application Integration](#cross-application-integration)
11. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Two-Application System

```
┌──────────────────────────────────────────────────────────┐
│                    Forms App (this repo)                  │
│                                                          │
│  Staff Page (/staff/used-clubs)                          │
│    - Browse inventory (no cost shown)                    │
│    - Add new clubs                                       │
│    - Edit club details (not price/cost/availability)     │
│                                                          │
│  Admin Page (/admin/used-clubs)                          │
│    - Full CRUD (create, read, update, delete)            │
│    - Cost management (internal only)                     │
│    - Availability toggles (sale/rental)                  │
│    - Set management (group clubs into sets)              │
│                                                          │
│  API Routes                                              │
│    - /api/used-clubs/* (staff endpoints)                 │
│    - /api/admin/used-clubs/* (admin endpoints)           │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│              Supabase (Shared Database)                   │
│                                                          │
│  public.used_clubs_inventory                             │
│  public.club_sets                                        │
│  Storage: website-assets/used-clubs/                     │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│             Website App (separate repo)                   │
│                                                          │
│  /second-hand-golf-clubs-bangkok                         │
│    - Public sales page (ISR, 1-hour revalidation)        │
│    - Shows clubs where available_for_sale = true         │
│    - NEVER displays cost field                           │
│    - LINE enquiry button for purchase inquiries          │
└──────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: React 19 with SWR for data fetching, shadcn/ui components
- **Backend**: Next.js API routes with Supabase service role client
- **Storage**: Supabase Storage (`website-assets` bucket, `used-clubs/` prefix)
- **Auth**: Staff = `isStaff || isAdmin`, Admin = `isAdmin` only

---

## Staff Workflow

**Page**: `/staff/used-clubs`
**Component**: `StaffUsedClubsContent`

The staff page has two tabs:

### Browse Inventory

Displays all clubs in inventory with:
- Brand, model, club type, specification, shaft
- Condition badge (Excellent/Good/Fair)
- Price (sale price visible to staff)
- Image thumbnails
- Set assignment (if any)
- Edit button to switch to the edit form

**Important**: The `cost` field is never returned by the staff API endpoints. Staff cannot see internal purchase costs.

### Add / Edit Club

A form for creating new clubs or editing existing entries. Staff can set:

| Field | Required | Notes |
|-------|----------|-------|
| Brand | Yes | Dropdown: Callaway, TaylorMade, Titleist, Ping, Mizuno, Cobra, Srixon, Other |
| Club Type | Yes | Driver, Iron Set, Iron, Wedge, Putter, Hybrid, Fairway Wood, Full Set, Partial Set |
| Condition | Yes | Excellent, Good, Fair |
| Model | No | Free text (e.g., "Warbird", "SIM2") |
| Specification | No | Iron numbers (3-PW), loft (56 degrees), etc. |
| Shaft | No | Material + flex (e.g., "Graphite Regular") |
| Gender | No | Men's, Women's, Unisex (default: Men's) |
| Price | No | Sale price in THB (defaults to 0) |
| Description | No | Free-text notes |
| Images | No | Upload via drag-and-drop or camera |
| Set | No | Assign to an existing club set |

**Staff cannot set**: `cost`, `available_for_sale`, `available_for_rental`

---

## Admin Workflow

**Page**: `/admin/used-clubs`
**Component**: `UsedClubsManager`

The admin page provides full inventory management with two tabs: **Clubs** and **Sets**.

### Clubs Tab

A table view of all clubs with:

- All club details (brand, model, type, spec, shaft, gender, condition)
- **Cost** column (internal purchase cost -- admin only)
- **Price** column (asking/sale price)
- Condition badges (color-coded: green/amber/gray)
- Image thumbnails
- Set assignment
- **Availability toggles**: Inline switches for `available_for_sale` and `available_for_rental`
- **Edit** button: Opens full edit dialog
- **Delete** button: Confirmation dialog, also cleans up images from storage

### Summary Statistics

The admin page displays aggregate statistics at the top:
- Total clubs in inventory
- Number available for sale
- Number available for rental
- Total cost (sum of all purchase costs)
- Total asking price (sum of all sale prices)

### Admin Edit Dialog

The admin edit dialog includes all staff fields plus:
- **Cost**: Internal purchase cost in THB
- **Available for Sale**: Toggle (controls visibility on public website)
- **Available for Rental**: Toggle
- **Purchased At**: Date the club was acquired

---

## Club Set Management

Club sets group related clubs together (e.g., "Callaway Warbird Full Set #1"). This is useful for selling complete sets or tracking which individual clubs belong together.

### Set Properties

| Field | Required | Description |
|-------|----------|-------------|
| Name | Yes | Descriptive set name |
| Brand | Yes | Set brand |
| Description | No | Additional notes |

### Set Operations

- **Create**: Add new sets via the Sets tab
- **Edit**: Update set name, brand, description
- **Delete**: Only allowed when no clubs are assigned to the set (returns 409 Conflict otherwise)
- **Club count**: Each set displays the number of clubs assigned to it

### Assigning Clubs to Sets

When editing a club (either staff or admin), the `set_id` field can be set to associate the club with a set. The set dropdown is populated from the `club_sets` table.

---

## Image Upload System

### Upload Flow

1. Staff or admin selects an image file (via file picker or drag-and-drop)
2. Client sends the file as `multipart/form-data` to `POST /api/used-clubs/upload-image`
3. API validates file type and size
4. File is uploaded to Supabase Storage: `website-assets/used-clubs/{timestamp}-{random}.{ext}`
5. Public URL is returned to the client
6. URL is saved to `image_url` (primary) and `image_urls` (array for multiple images)

### Constraints

| Constraint | Value |
|------------|-------|
| Allowed formats | JPEG, PNG, WebP, HEIC, HEIF |
| Maximum file size | 5 MB |
| Storage bucket | `website-assets` |
| Storage path prefix | `used-clubs/` |

### Image Cleanup

When a club is deleted via the admin API, all associated images are removed from Supabase Storage as a best-effort operation. The deletion extracts storage paths from both `image_url` and `image_urls` fields.

---

## Pricing Model

### Two Price Fields

| Field | Visibility | Purpose |
|-------|-----------|---------|
| `price` | Public (staff, admin, website) | Asking/sale price shown to customers in THB |
| `cost` | Admin only | Internal purchase cost, never exposed to staff or public |

**Critical Rule**: The `cost` field must never be exposed to the public website or staff-facing APIs. The staff list endpoint (`GET /api/used-clubs/list`) explicitly excludes `cost` from its SELECT clause.

### Margin

The difference between `price` and `cost` represents the margin. This is visible only to admins through the admin interface summary statistics (total cost vs. total asking price).

---

## Database Schema

### `public.used_clubs_inventory`

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | PK | `gen_random_uuid()` | |
| `brand` | text | Yes | | Callaway, TaylorMade, Titleist, Ping, Mizuno, Cobra, Srixon, Other |
| `model` | text | No | | e.g., "Warbird", "SIM2", "Stealth" |
| `club_type` | text | Yes | | Driver, Iron Set, Iron, Wedge, Putter, Hybrid, Fairway Wood, Full Set, Partial Set |
| `specification` | text | No | | Iron numbers (3-PW, 7), loft (56 degrees, 10.5 degrees), etc. |
| `shaft` | text | No | | Material + flex: "Graphite Regular", "Steel Stiff" |
| `gender` | text | Yes | `'Unisex'` | Men's, Women's, Unisex |
| `condition` | text | Yes | | Excellent, Good, Fair |
| `price` | integer | Yes | | Asking/sale price in THB |
| `cost` | integer | No | | Internal purchase cost in THB (admin only) |
| `description` | text | No | | Free-text notes |
| `image_url` | text | No | | Primary image URL (Supabase Storage) |
| `image_urls` | jsonb | No | `[]` | Array of all image URLs |
| `available_for_sale` | boolean | Yes | `true` | Visible on public website when true |
| `available_for_rental` | boolean | Yes | `false` | Available for rental |
| `purchased_at` | date | No | | Date the club was acquired |
| `set_id` | uuid | No | | FK to `club_sets.id` |
| `created_at` | timestamptz | | `now()` | |
| `updated_at` | timestamptz | | `now()` | |

### `public.club_sets`

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | PK | `gen_random_uuid()` | |
| `name` | text | Yes | | Descriptive set name |
| `brand` | text | Yes | | Brand of the set |
| `description` | text | No | | Notes |
| `created_at` | timestamptz | | `now()` | |
| `updated_at` | timestamptz | | `now()` | |

### Migrations

| Migration | Description |
|-----------|-------------|
| `20260221160000_add_used_clubs_specification.sql` | Added `specification` and `shaft` columns |
| `20260222100000_add_used_clubs_image_urls.sql` | Added `image_urls` array column |
| `20260222110000_add_used_clubs_purchased_at.sql` | Added `purchased_at` date column |

---

## API Reference

### Staff Endpoints

All staff endpoints require `isStaff || isAdmin` role.

#### `GET /api/used-clubs/list`

Lists all clubs without the `cost` field. Returns clubs ordered by `created_at` descending.

**Response**: Array of club objects (no `cost` field)

#### `GET /api/used-clubs/recent`

Returns the 10 most recently created clubs (no `cost` field). Useful for quick browse.

#### `GET /api/used-clubs/sets`

Lists all club sets with `id`, `name`, `brand`, `description`. Used to populate set dropdowns in forms.

#### `POST /api/used-clubs`

Creates a new club. Staff cannot set `cost`, `available_for_sale`, or `available_for_rental`.

**Required fields**: `brand`, `club_type`, `condition`

**Body**:
```json
{
  "brand": "Callaway",
  "model": "Warbird",
  "club_type": "Full Set",
  "specification": "5-PW",
  "shaft": "Graphite Regular",
  "gender": "Men's",
  "condition": "Good",
  "price": 8500,
  "description": "Complete set in good condition",
  "image_urls": ["https://..."],
  "set_id": "uuid-of-set"
}
```

#### `PUT /api/used-clubs/[id]`

Updates a club (staff can edit details but not price, cost, or availability). Uses partial update -- only provided fields are modified.

#### `POST /api/used-clubs/upload-image`

Uploads a club image to Supabase Storage.

**Content-Type**: `multipart/form-data`
**Field**: `file` (image file)

**Response**:
```json
{ "url": "https://...supabase.co/storage/v1/object/public/website-assets/used-clubs/..." }
```

### Admin Endpoints

All admin endpoints require `isAdmin` role.

#### `GET /api/admin/used-clubs`

Lists all clubs including `cost` field, with related `club_sets` data. Ordered by `created_at` descending.

#### `POST /api/admin/used-clubs`

Creates a club with all fields including `cost`, `available_for_sale`, `available_for_rental`, and `purchased_at`.

**Required fields**: `brand`, `club_type`, `condition`, `price`

#### `PUT /api/admin/used-clubs/[id]`

Full update of any club field including cost and availability. Partial update -- only provided fields are modified.

#### `DELETE /api/admin/used-clubs/[id]`

Deletes a club and performs best-effort cleanup of associated images from Supabase Storage.

#### `GET /api/admin/used-clubs/sets`

Lists all sets with club count per set.

#### `POST /api/admin/used-clubs/sets`

Creates a new club set.

**Required fields**: `name`, `brand`

#### `PUT /api/admin/used-clubs/sets`

Updates a club set.

**Required fields**: `id`, `name`, `brand`

#### `DELETE /api/admin/used-clubs/sets?id={set-id}`

Deletes a club set. Returns `409 Conflict` if any clubs are still assigned to the set.

---

## Component Architecture

### Staff Components

| Component | File | Purpose |
|-----------|------|---------|
| `StaffUsedClubsContent` | `src/components/staff/used-clubs/StaffUsedClubsContent.tsx` | Tab container (Browse / Add-Edit) |
| `ClubInventoryBrowser` | `src/components/staff/used-clubs/ClubInventoryBrowser.tsx` | Browse all clubs, trigger edit |
| `ClubUploadForm` | `src/components/staff/used-clubs/ClubUploadForm.tsx` | Add/edit form with image upload |

### Admin Components

| Component | File | Purpose |
|-----------|------|---------|
| `UsedClubsManager` | `src/components/admin/used-clubs/UsedClubsManager.tsx` | Tab container (Clubs / Sets), table views, stats, toggles |
| `ClubEditDialog` | `src/components/admin/used-clubs/ClubEditDialog.tsx` | Full edit dialog with all fields |
| `SetFormDialog` | `src/components/admin/used-clubs/SetFormDialog.tsx` | Create/edit set dialog |

### Shared Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useStaffClubList` | `src/hooks/use-used-clubs.ts` | Fetches clubs via staff endpoint (no cost) |
| `useRecentClubs` | `src/hooks/use-used-clubs.ts` | Fetches 10 most recent clubs |
| `useClubSets` | `src/hooks/use-used-clubs.ts` | Fetches sets for staff dropdowns |
| `useAllClubs` | `src/hooks/use-used-clubs.ts` | Fetches all clubs via admin endpoint (includes cost) |
| `useAdminClubSets` | `src/hooks/use-used-clubs.ts` | Fetches sets with club counts (admin) |
| `updateClub` | `src/hooks/use-used-clubs.ts` | Admin update function |
| `deleteClub` | `src/hooks/use-used-clubs.ts` | Admin delete function |
| `deleteSet` | `src/hooks/use-used-clubs.ts` | Admin set delete function |

All hooks use SWR for caching with `refreshInterval: 0` (manual refresh only).

---

## Cross-Application Integration

### Website App

The public website (`lengolf-website` repo) reads from the same `used_clubs_inventory` table:

- **Page**: `/second-hand-golf-clubs-bangkok` (SEO-optimized slug)
- **Data fetch**: Filters `available_for_sale = true` only
- **Revalidation**: ISR with 1-hour revalidation period
- **Display**: Card grid with brand, model, type, specification, condition, price
- **Never shows**: `cost` field
- **CTA**: LINE enquiry button for purchase inquiries
- **i18n**: English and Thai via `next-intl`
- **SEO**: JSON-LD structured data for product listings

### Workflow

1. Staff adds a club via `/staff/used-clubs` (defaults to `available_for_sale = false`)
2. Admin reviews the club on `/admin/used-clubs`, sets cost and price
3. Admin toggles `available_for_sale = true`
4. Within 1 hour, the club appears on the public website
5. Customer inquires via LINE
6. After sale, admin toggles `available_for_sale = false` or deletes the club

---

## Troubleshooting

### Images Not Uploading

1. **Check file size** -- Maximum 5 MB per image
2. **Check file type** -- Must be JPEG, PNG, WebP, HEIC, or HEIF
3. **Check Supabase Storage** -- Verify the `website-assets` bucket exists and has appropriate policies
4. **Check permissions** -- User must have `isStaff` or `isAdmin` role

### Club Not Appearing on Website

1. **Check `available_for_sale`** -- Must be `true` for the club to appear
2. **Wait for ISR revalidation** -- The website uses 1-hour ISR; changes may take up to 1 hour
3. **Verify in admin** -- Check the club exists on `/admin/used-clubs` with correct availability

### Cannot Delete Set

Sets cannot be deleted while clubs are assigned to them. Reassign or delete the clubs first. The API returns a `409 Conflict` error with an explanatory message.

### Cost Field Not Visible

The `cost` field is intentionally hidden from staff. Only admin users can view and set costs via the `/admin/used-clubs` page.

---

*Last updated: 2026-03-21*
