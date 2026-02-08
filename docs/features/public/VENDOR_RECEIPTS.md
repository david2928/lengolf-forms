# Vendor Receipts System Documentation

## Overview

The Vendor Receipts system enables Lengolf staff to photograph and upload vendor invoices and receipts directly from their tablets or phones. Uploaded files are stored in Google Drive with an organized folder structure, while metadata is recorded in Supabase for search, audit, and administrative review. An accompanying admin interface provides vendor management (CRUD) and receipt browsing with filters, pagination, and deletion.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Google Drive Integration](#google-drive-integration)
- [Staff User Interface](#staff-user-interface)
- [Admin User Interface](#admin-user-interface)
- [Vendor Caching](#vendor-caching)
- [TypeScript Types](#typescript-types)
- [Environment Variables](#environment-variables)
- [Menu Navigation](#menu-navigation)
- [Security](#security)
- [Development Notes](#development-notes)
- [Troubleshooting](#troubleshooting)

## System Architecture

### Data Flow

```
Staff uploads receipt (phone/tablet)
        |
        v
VendorReceiptForm (client)
        |
  FormData POST
        |
        v
/api/vendor-receipts (server)
   |              |
   v              v
Google Drive   Supabase (backoffice schema)
(file storage)  (metadata record)
```

### Component Structure

```
app/
├── vendor-receipts/
│   └── page.tsx                          # Staff-facing receipt upload page
├── admin/
│   └── vendor-receipts/
│       └── page.tsx                      # Admin vendor management page
├── api/
│   ├── vendors/
│   │   └── route.ts                      # Staff vendor list + inline create (GET, POST)
│   ├── vendor-receipts/
│   │   └── route.ts                      # Staff receipt upload + recent list (POST, GET)
│   └── admin/
│       ├── vendors/
│       │   └── route.ts                  # Admin vendor CRUD (GET, POST, PUT, DELETE)
│       └── vendor-receipts/
│           └── route.ts                  # Admin receipt list, update, delete (GET, PUT, DELETE)
src/
├── components/
│   ├── vendor-receipts/
│   │   ├── VendorReceiptForm.tsx          # Main upload form
│   │   ├── VendorCombobox.tsx             # Searchable vendor selector with inline creation
│   │   └── ReceiptFileUpload.tsx          # Drag-and-drop file upload component
│   └── admin/
│       └── vendor-receipts/
│           ├── ReceiptsTab.tsx             # Admin receipts list with filters
│           └── VendorsTab.tsx             # Admin vendor CRUD table
├── lib/
│   └── google-drive-service.ts            # Google Drive upload/delete utilities
└── types/
    └── vendor-receipts.ts                 # TypeScript interfaces and constants
```

### Tech Stack

- **Frontend**: Next.js 15.5, React 19.1, TypeScript, Tailwind CSS
- **UI Components**: Radix UI (Select, Popover, Command, Dialog, Table)
- **File Upload**: react-dropzone with drag-and-drop support
- **Icons**: Lucide React (Receipt, FileText, Upload, ExternalLink)
- **Backend**: Next.js API Routes, Supabase PostgreSQL (backoffice schema)
- **File Storage**: Google Drive API v3 via googleapis SDK
- **Authentication**: NextAuth.js with development bypass support

## Database Schema

Both tables reside in the `backoffice` schema.

### Table: `backoffice.vendors`

Stores the vendor directory used across the receipt system.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `name` | VARCHAR | Vendor name (unique constraint) |
| `category` | VARCHAR | Optional category label |
| `notes` | TEXT | Optional admin notes |
| `is_active` | BOOLEAN | Soft-delete flag (default `true`) |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp |

**Constraints**:
- Unique constraint on `name` (prevents duplicate vendor names; error code `23505`)
- `is_active` defaults to `true`

**RPC Function**: `get_vendor_receipt_counts()` returns a result set of `(vendor_id, receipt_count)` used to power the "Frequently Used" section in the combobox.

### Table: `backoffice.vendor_receipts`

Stores metadata for each uploaded receipt. The actual file is stored in Google Drive.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `vendor_id` | UUID | Foreign key to `backoffice.vendors` |
| `receipt_date` | DATE | Date on the receipt |
| `file_url` | TEXT | Google Drive viewable URL |
| `file_id` | TEXT | Google Drive file ID (used for deletion) |
| `file_name` | TEXT | Original file name |
| `submitted_by` | TEXT | Name of the authenticated user who submitted |
| `notes` | TEXT | Optional notes from staff |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp |

**Relationships**:
- `vendor_id` references `backoffice.vendors(id)` with an inner join used in queries to resolve `vendor_name` and `vendor_category`.

## API Endpoints

### Staff Endpoints

#### `GET /api/vendors`

Returns the list of active vendors for the combobox.

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `with_counts` | string | When `"true"`, include `receipt_count` per vendor |

**Response** (with counts):
```json
[
  { "id": "uuid", "name": "7-Eleven", "receipt_count": 42 },
  { "id": "uuid", "name": "Makro", "receipt_count": 15 }
]
```

**Caching**: Results are served from an in-memory cache with a 5-minute TTL. See [Vendor Caching](#vendor-caching).

**Auth**: Requires authenticated session (any staff).

---

#### `POST /api/vendors`

Creates a new vendor inline from the combobox (staff can add vendors on the fly).

**Request Body**:
```json
{
  "name": "New Vendor Name",
  "category": "Grocery"
}
```

**Responses**:
- `201`: Vendor created. Returns the new vendor object.
- `400`: Name is missing or empty.
- `409`: A vendor with that name already exists.

**Side Effect**: Invalidates the vendor cache so the new vendor appears immediately.

**Auth**: Requires authenticated session (any staff).

---

#### `POST /api/vendor-receipts`

Uploads a receipt file to Google Drive and creates a database record.

**Content-Type**: `multipart/form-data`

**Form Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `vendor_id` | string | Yes | UUID of the vendor |
| `receipt_date` | string | No | ISO date (YYYY-MM-DD). Defaults to today. |
| `file` | File | Yes | The receipt image or PDF |
| `submitted_by` | string | No | Staff name (currently overridden by session user) |
| `notes` | string | No | Free-text notes |

**Validation**:
- File type must be one of: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `application/pdf`
- File size must not exceed 10 MB

**Processing Steps**:
1. Validate authentication and input fields
2. Convert the uploaded file to a Buffer
3. Upload to Google Drive under `{ROOT}/YYYY/MM/{filename}` folder structure
4. Insert metadata into `backoffice.vendor_receipts`
5. Return the created receipt record

**Response** (`201`):
```json
{
  "id": "uuid",
  "vendor_id": "uuid",
  "receipt_date": "2026-02-07",
  "file_url": "https://drive.google.com/file/d/{fileId}/view",
  "file_id": "google-drive-file-id",
  "file_name": "receipt.jpg",
  "submitted_by": "User Name",
  "notes": "Monthly supply",
  "created_at": "2026-02-07T10:30:00.000Z",
  "updated_at": "2026-02-07T10:30:00.000Z"
}
```

**Auth**: Requires authenticated session (any staff).

---

#### `GET /api/vendor-receipts`

Returns recent receipts for the staff page's "Recent Submissions" section.

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 10 | Maximum number of receipts to return |

**Response**: Array of receipt objects with flattened vendor data (includes `vendor_name`, `vendor_category`).

**Auth**: Requires authenticated session (any staff).

---

### Admin Endpoints

All admin endpoints require `session.user.isAdmin === true`.

#### `GET /api/admin/vendors`

Returns all vendors (active and inactive) for the admin Vendors tab.

**Response**: Full vendor objects including `is_active`, `notes`, `category`.

---

#### `POST /api/admin/vendors`

Creates a new vendor from the admin interface.

**Request Body**:
```json
{
  "name": "Vendor Name",
  "category": "F&B Supply",
  "notes": "Contact: 081-xxx-xxxx",
  "is_active": true
}
```

**Responses**:
- `201`: Vendor created.
- `400`: Name missing.
- `409`: Duplicate name.

---

#### `PUT /api/admin/vendors`

Updates an existing vendor.

**Request Body**:
```json
{
  "id": "vendor-uuid",
  "name": "Updated Name",
  "category": "Office",
  "notes": "Updated notes",
  "is_active": false
}
```

**Responses**:
- `200`: Vendor updated.
- `400`: ID or name missing.
- `409`: Duplicate name conflict.

---

#### `DELETE /api/admin/vendors?id={vendor-uuid}`

Deletes a vendor. Protected against deletion when the vendor has existing receipts.

**Responses**:
- `200`: `{ "success": true }`
- `400`: Missing ID.
- `409`: Cannot delete vendor with existing receipts. Admin should deactivate instead.

---

#### `GET /api/admin/vendor-receipts`

Returns paginated, filterable receipt records for the admin Receipts tab.

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `start_date` | string | Filter receipts on or after this date |
| `end_date` | string | Filter receipts on or before this date |
| `vendor_id` | string | Filter by specific vendor UUID |
| `search` | string | Full-text search across `file_name`, `notes`, `submitted_by` |
| `limit` | number | Page size (default 50) |
| `offset` | number | Pagination offset (default 0) |

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "vendor_id": "uuid",
      "receipt_date": "2026-02-05",
      "file_url": "https://drive.google.com/file/d/.../view",
      "file_id": "drive-id",
      "file_name": "invoice_feb.pdf",
      "submitted_by": "Dolly",
      "notes": "Water delivery",
      "created_at": "...",
      "updated_at": "...",
      "vendor_name": "Singha Water",
      "vendor_category": "F&B Supply"
    }
  ],
  "total": 128
}
```

---

#### `PUT /api/admin/vendor-receipts`

Updates receipt metadata (date, notes, vendor reassignment).

**Request Body**:
```json
{
  "id": "receipt-uuid",
  "receipt_date": "2026-02-06",
  "notes": "Corrected date",
  "vendor_id": "new-vendor-uuid"
}
```

---

#### `DELETE /api/admin/vendor-receipts?id={receipt-uuid}&delete_file=true`

Deletes a receipt record. Optionally deletes the Google Drive file.

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Receipt UUID (required) |
| `delete_file` | string | When `"true"`, also deletes the file from Google Drive |

**Note**: The admin UI currently deletes the database record only (does not pass `delete_file=true`), preserving the Google Drive file as a safety measure.

## Google Drive Integration

### Service Account

The system uses a dedicated Google service account (`lengolf-operations`) for file operations. This account has Drive storage quota, unlike the default `lengolf-forms` service account. It falls back to the default service account if Drive-specific environment variables are not set.

**Service account email**: `github-actions-service-account@lengolf-operations.iam.gserviceaccount.com`

**Setup requirement**: The Google Drive receipts folder must be shared with this email address as **Editor**. Without this, uploads will fail with a "File not found" or "no storage quota" error.

**Configuration** (in `src/lib/google-drive-service.ts`):
- **Primary credentials**: `GOOGLE_DRIVE_CLIENT_EMAIL` and `GOOGLE_DRIVE_PRIVATE_KEY`
- **Fallback credentials**: `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY`
- **OAuth scope**: `https://www.googleapis.com/auth/drive.file`

### Folder Structure

Files are organized in Google Drive under a date-based hierarchy:

```
{GOOGLE_DRIVE_RECEIPTS_FOLDER_ID}/        # Root receipts folder
├── 2026/
│   ├── 01/
│   │   ├── receipt_jan_001.jpg
│   │   └── invoice_makro.pdf
│   ├── 02/
│   │   ├── delivery_note.png
│   │   └── water_invoice.pdf
│   └── ...
├── 2025/
│   ├── 12/
│   └── ...
```

The `YYYY/MM/` subfolders are created automatically using a `findOrCreateFolder` function that checks for an existing folder before creating a new one.

### Upload Process

1. **Buffer conversion**: The uploaded file is converted from a Web API `File` to a Node.js `Buffer`
2. **Folder resolution**: Year and month folders are found or created within the root folder
3. **File upload**: The buffer is streamed to Google Drive via `drive.files.create`
4. **URL generation**: A viewable link is constructed: `https://drive.google.com/file/d/{fileId}/view`
5. **Return values**: The upload returns `fileId`, `fileUrl`, and `fileName`

### File Deletion

The `deleteFileFromDrive` function handles cleanup:
- Deletes by file ID using `drive.files.delete`
- Treats HTTP 404 (already deleted) as a success
- Returns `boolean` indicating whether the operation succeeded
- Supports Shared Drives via `supportsAllDrives: true`

## Staff User Interface

### Page: `/vendor-receipts`

A mobile-optimized, single-card layout (`max-w-md`) designed for quick receipt uploads from staff tablets.

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Staff Name | Select dropdown | Yes | Predefined options: Net, Dolly, May |
| Vendor | Combobox | Yes | Searchable with frequently-used vendors and inline creation |
| Receipt Date | Date input | No | Defaults to today |
| Receipt File | Drag-and-drop upload | Yes | Images (JPEG, PNG, WebP, HEIC) or PDF, max 10 MB |
| Notes | Text input | No | Free-text notes (e.g., "Monthly grocery supply") |

### Vendor Combobox

The `VendorCombobox` component provides an enhanced vendor selection experience:

- **Frequently Used section**: When the combobox is first opened (no search text), the top 8 vendors sorted by receipt count are displayed in a "Frequently Used" group, followed by "All Vendors" below a separator.
- **Search**: Typing filters the full vendor list. The "Frequently Used" section hides during search.
- **Inline creation**: When the search text does not match any existing vendor name, an "Add `{name}`" option appears at the bottom. Selecting it creates the vendor via `POST /api/vendors` and immediately selects it.
- **Toast notifications**: Vendor creation success or failure is communicated via toast messages.

### File Upload Component

The `ReceiptFileUpload` component uses `react-dropzone`:

- **Drag-and-drop zone**: Dashed border area with visual feedback on drag hover
- **Click to browse**: Tapping the zone opens the device file picker
- **File preview**: Once a file is selected, it shows the file name, size in KB, and an icon (image or document). A remove button allows clearing the selection.
- **Validation**: Enforces allowed MIME types and 10 MB maximum size
- **Accepted formats**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`, `.pdf`

### Submission Flow

1. Staff selects their name, a vendor, and uploads a file
2. The Submit button becomes enabled when all required fields are filled
3. On submit, a loading spinner appears ("Uploading...")
4. On success, a green alert displays "Receipt uploaded successfully!" for 2 seconds, then the form resets
5. On error, a red alert displays the error message

### Recent Submissions

Below the form, a collapsible "Recent Submissions" section shows the last 10 receipts:
- Displays vendor name, receipt date, submitter, and a link to view the file in Google Drive
- Refreshes automatically after each successful submission
- Collapsed by default; toggled via a ghost button

## Admin User Interface

### Page: `/admin/vendor-receipts`

A wider layout (`max-w-7xl`) with a tabbed interface for managing receipts and vendors.

### Receipts Tab

Displays all uploaded receipts in a filterable, paginated table.

**Filter Controls** (5-column grid):
- **From date**: Start date filter
- **To date**: End date filter
- **Vendor**: Dropdown to filter by specific vendor
- **Search**: Text search across file name, notes, and submitter
- **Reset**: Clears all filters

**Table Columns**:
| Column | Description |
|--------|-------------|
| Date | Receipt date formatted as DD Mon YYYY (e.g., "07 Feb 2026") |
| Vendor | Vendor name |
| File | Clickable link to Google Drive file (truncated file name) |
| Submitted By | Staff member name |
| Notes | Truncated notes (max 200px width) |
| Actions | Delete button (trash icon) |

**Pagination**:
- 25 receipts per page
- Previous/Next navigation with page indicator ("Page X of Y")
- Total result count displayed above the table

**Delete Behavior**: Confirmation dialog warns the user. Only the database record is deleted; the Google Drive file is preserved.

### Vendors Tab

Full CRUD management for the vendor directory.

**Features**:
- **Search**: Filter vendors by name
- **Add Vendor**: Button opens a dialog with Name (required), Notes (optional), and Active toggle
- **Edit**: Pencil icon opens the same dialog pre-filled with the vendor's current data
- **Delete**: Trash icon with confirmation. Blocked if the vendor has existing receipts (returns a 409 error advising to deactivate instead).
- **Status Badge**: Shows "Active" (default badge) or "Inactive" (outline badge) per vendor

**Vendor Form Dialog Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text input | Yes | Vendor name (must be unique) |
| Notes | Text input | No | Admin notes |
| Active | Switch toggle | No | Defaults to active |

## Vendor Caching

The staff-facing vendors API (`/api/vendors`) implements an in-memory server-side cache to reduce database load:

- **TTL**: 5 minutes (300,000 ms)
- **Scope**: Caches the combined vendor list with receipt counts
- **Invalidation**: The cache is explicitly cleared when a new vendor is created via `POST /api/vendors`
- **Fallback**: If the `get_vendor_receipt_counts` RPC function fails (e.g., does not exist), the system gracefully falls back to zero counts for all vendors

**Implementation detail**: The cache is stored in a module-level variable (`vendorCache`). Since Next.js API routes in production run as serverless functions, the cache lifetime depends on the function instance's warm/cold cycle. In practice, this provides effective caching for bursts of requests while ensuring fresh data on cold starts.

## TypeScript Types

Defined in `src/types/vendor-receipts.ts`:

```typescript
// Vendor record from backoffice.vendors
interface Vendor {
  id: string
  name: string
  category: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Receipt record from backoffice.vendor_receipts
interface VendorReceipt {
  id: string
  vendor_id: string
  receipt_date: string | null
  file_url: string
  file_id: string | null
  file_name: string | null
  submitted_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Flattened receipt with vendor data (used after joining)
interface VendorReceiptWithVendor extends VendorReceipt {
  vendor_name: string
  vendor_category: string | null
}
```

**Constants**:

| Constant | Value | Description |
|----------|-------|-------------|
| `VENDOR_CATEGORIES` | `['Grocery', 'F&B Supply', 'Office', 'Delivery', 'Rent', 'Utilities', 'Other']` | Predefined vendor category options |
| `ALLOWED_RECEIPT_TYPES` | `['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']` | Accepted file MIME types |
| `MAX_RECEIPT_FILE_SIZE` | `10485760` (10 MB) | Maximum upload file size in bytes |

## Environment Variables

The following environment variables are required for Google Drive integration:

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_DRIVE_RECEIPTS_FOLDER_ID` | Root Google Drive folder ID for receipts | `1aBcDeFgHiJkLmNoPqRsTuV` |
| `GOOGLE_DRIVE_CLIENT_EMAIL` | Service account email for Drive API | `lengolf-ops@project.iam.gserviceaccount.com` |
| `GOOGLE_DRIVE_PRIVATE_KEY` | Service account private key (with `\n` escaped newlines) | `-----BEGIN PRIVATE KEY-----\n...` |

**Fallback variables** (used if the Drive-specific variables are not set):

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_EMAIL` | Default Google service account email |
| `GOOGLE_PRIVATE_KEY` | Default Google service account private key |

**Note**: The service account must have Editor or Writer access to the root receipts folder in Google Drive. The `drive.file` scope is used, which grants access only to files created by the application.

## Menu Navigation

The feature is registered in `src/config/menu-items.ts` with two entries:

| Menu Item | Path | Icon | Description | Access |
|-----------|------|------|-------------|--------|
| Vendor Receipts | `/vendor-receipts` | Receipt | Upload vendor invoices and receipts | All authenticated staff |
| Vendor Management | `/admin/vendor-receipts` | Receipt | Manage vendors and view uploaded receipts | Admin only |

## Security

### Authentication

- **Staff endpoints** (`/api/vendors`, `/api/vendor-receipts`): Require `session.user.email` to be present (any authenticated user)
- **Admin endpoints** (`/api/admin/vendors`, `/api/admin/vendor-receipts`): Require `session.user.isAdmin === true`
- **Development bypass**: Supports `SKIP_AUTH=true` for local testing via `getDevSession`

### Data Protection

- **File validation**: Server-side MIME type and file size checks prevent upload of unexpected file types
- **SQL injection prevention**: All queries use parameterized Supabase client methods
- **Unique constraints**: Database-level unique constraint on vendor names prevents duplicates
- **Referential integrity**: Vendors with existing receipts cannot be deleted (enforced at the API level)
- **Google Drive isolation**: The `drive.file` scope ensures the service account can only access files it created

### Deletion Safety

- Admin receipt deletion preserves the Google Drive file by default
- Vendor deletion is blocked when receipts reference the vendor; deactivation is recommended instead
- The `delete_file=true` query parameter enables explicit Google Drive file deletion when needed

## Development Notes

### Local Development Setup

1. Ensure Supabase credentials are configured in `.env.local`
2. Set `SKIP_AUTH=true` in `.env.local` for authentication bypass
3. Configure Google Drive environment variables (or use test/mock values)
4. Verify the `backoffice.vendors` and `backoffice.vendor_receipts` tables exist
5. Confirm the `get_vendor_receipt_counts` RPC function is deployed

### Testing

```bash
# Start the development server
npm run dev

# Navigate to the staff form
# http://localhost:3000/vendor-receipts

# Navigate to the admin interface
# http://localhost:3000/admin/vendor-receipts

# Test the vendors API
curl http://localhost:3000/api/vendors?with_counts=true

# Test vendor creation
curl -X POST http://localhost:3000/api/vendors \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Vendor"}'
```

### Code Quality

- **Linting**: `npm run lint` must pass
- **Type checking**: `npm run typecheck` must pass
- **Component testing**: Manual testing of form states, combobox search, and file upload

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "GOOGLE_DRIVE_RECEIPTS_FOLDER_ID environment variable is not set" | Missing env var | Add the folder ID to `.env` or `.env.local` |
| File upload fails with 400 | Unsupported file type or file too large | Check that the file is an image (JPEG/PNG/WebP/HEIC) or PDF and under 10 MB |
| "A vendor with this name already exists" (409) | Duplicate vendor name | Use the existing vendor or choose a different name |
| "Cannot delete vendor with existing receipts" (409) | Vendor has receipt references | Deactivate the vendor instead of deleting |
| Vendors not appearing after creation | Server-side cache not invalidated | Cache is automatically invalidated on POST; wait up to 5 minutes or restart the server |
| Google Drive upload succeeds but link does not work | Service account file not shared | Ensure the root folder is shared with the service account email |
| Admin pages return 401 | User is not flagged as admin | Verify `isAdmin` is set on the user session; check `allowed_users` table in production |

---

## Maintenance Information

**Last Updated**: February 2026
**Version**: 1.0
**Status**: Production Ready
**Maintainer**: Development Team

### Related Documentation
- [Cash Check System](./staff-operations/CASH_CHECK_SYSTEM.md) - Similar staff submission workflow pattern
- [Inventory Management](./staff-operations/INVENTORY_MANAGEMENT.md) - Similar staff data entry pattern
- [API Reference](../../api/API_REFERENCE.md) - Complete API endpoint documentation
- [Authentication System](../../technical/AUTHENTICATION_SYSTEM.md) - Auth integration details
- [Database Documentation](../../database/DATABASE_DOCUMENTATION_INDEX.md) - Complete database schemas
