# Package Management Admin System

## Overview
The Package Management Admin system provides advanced administrative capabilities for managing customer packages in the Lengolf Forms application. This system enables administrators to perform critical package operations including editing, transferring ownership, managing usage records, and monitoring package status across all customers.

## Key Features

### 1. Package Search and Filtering
- **Customer Name Search**: Find packages by searching customer names (not IDs)
- **Package Type Filtering**: Filter by specific package types (Standard, Unlimited, VIP, etc.)
- **Status Filtering**: Filter by Active, Expiring Soon (7 days), or Expired packages
- **Compact Filter Interface**: All filters in a single row for efficient screen usage

### 2. Package Display and Sorting
- **Sortable Columns**: Click column headers to sort by:
  - Customer Name (alphabetical)
  - Package Type (alphabetical)
  - Remaining Hours (numerical)
  - Expiration Date (chronological)
- **Visual Status Indicators**: Color-coded badges showing:
  - Not Activated (gray outline) - Packages not yet used (no first_use_date)
  - Active (green) - Valid packages with remaining hours
  - Expiring (yellow) - Packages expiring within 7 days
  - Expired (red) - Past expiration date
  - No Hours (gray) - Valid but no hours remaining
- **Professional Table Design**: Gray headers, avatar initials, hover effects matching time clock dashboard

### 3. Package Editing
- **Editable Fields**:
  - Package Type
  - Purchase Date
  - Expiration Date (auto-calculated when package is first used)
  - First Use Date (triggers expiration date calculation)
  - Employee Name
- **Non-Editable Fields**:
  - Customer Name (maintains data integrity with customer management system)
  - Customer ID
- **Audit Trail**: Required modification notes explaining changes
- **Tracking**: Automatic recording of:
  - Last modified by (admin email)
  - Last modified at (timestamp)
  - Modification notes

### 4. Package Transfer
- **Customer Search**: Search for target customer by name
- **Autocomplete**: Real-time customer suggestions as you type
- **Transfer Validation**: Ensures target customer exists
- **Transfer Reason**: Required field explaining why package is being transferred
- **Audit Trail**: Complete history of package ownership changes

### 5. Usage Management (Hours-Based Packages Only)
- **View Usage History**: See all usage records for a package
- **Sortable by Date**: Most recent usage displayed first
- **Usage Details**:
  - Date and time of usage
  - Hours consumed
  - Employee who recorded usage
  - Associated booking ID (if applicable)
  - Modification history
- **Professional Display**: Matching table styling with employee avatars
- **Note**: Unlimited packages don't show usage management button

### 6. Overview Cards
- **Total Packages**: Count of all packages in system
- **Active Packages**: Packages not yet expired
- **Expiring Soon**: Packages expiring within 7 days
- **Unlimited**: Count of unlimited packages

## Technical Architecture

### API Endpoints

#### List Packages
```
GET /api/admin/packages
Query Parameters:
- search: Customer name search
- package_type_id: Filter by package type
- status: active | expiring | expired
- page: Page number
- limit: Results per page
```

#### Get Single Package
```
GET /api/admin/packages/[id]
Returns: Package details with usage records
```

#### Update Package
```
PUT /api/admin/packages/[id]
Body: {
  package_type_id: number,
  purchase_date: string,
  expiration_date: string,
  first_use_date?: string,
  employee_name?: string,
  modification_notes: string
}
```

#### Transfer Package
```
POST /api/admin/packages/[id]/transfer
Body: {
  toCustomerId: string,
  reason: string
}
```

#### Get Package Usage
```
GET /api/admin/packages/[id]/usage
Returns: Array of usage records
```

### Database Schema

#### Packages Table (backoffice.packages)
```sql
-- Tracking columns added for admin operations
last_modified_by VARCHAR
last_modified_at TIMESTAMPTZ DEFAULT NOW()
modification_notes TEXT
```

### Component Structure
```
app/admin/packages/
├── page.tsx                        # Main page component
└── components/
    ├── PackageListTable.tsx        # Sortable table with actions
    ├── PackageFilters.tsx          # Compact filter interface
    ├── PackageForm.tsx             # Edit package modal
    ├── PackageTransferModal.tsx    # Transfer ownership modal
    └── UsageManagementModal.tsx    # View/manage usage records
```

### State Management
- **Custom Hooks**:
  - `useAdminPackages`: Package data fetching and filtering
  - `usePackageTypes`: Package type definitions
- **Real-time Updates**: Refresh after operations
- **Optimistic UI**: Loading states during operations

## Security and Permissions

### Authentication
- Admin-only access enforced at multiple levels:
  - Route protection via admin layout
  - API endpoint verification
  - Database role checks

### Audit Trail
All operations tracked with:
- User email (from session)
- Timestamp
- Operation type
- Reason/notes

### Data Integrity
- Customer names are read-only to maintain consistency
- Package transfers validate customer existence
- Usage records linked to packages via foreign keys

## User Interface Guidelines

### Design Patterns
- **Table Styling**: Consistent with time clock dashboard
  - Gray header backgrounds
  - Bold semibold text
  - Hover effects on rows
  - Avatar circles for users

### Responsive Design
- Mobile-friendly with horizontal scrolling
- Compact filters for smaller screens
- Modal dialogs for complex operations

### Visual Feedback
- Loading spinners during operations
- Success/error toast notifications
- Color-coded status badges
- Sortable column indicators (arrows)

## Package Activation

### How Package Activation Works
1. **Purchase**: Package is created with a purchase date but no expiration date
2. **Not Activated Status**: Package shows "Not Activated" status until first use
3. **First Use**: When customer first uses the package, `first_use_date` is recorded
4. **Expiration Calculation**: System automatically calculates `expiration_date` based on:
   - `first_use_date` + package type's `validity_period`
5. **Active Status**: Package becomes "Active" with countdown to expiration

### Important Notes
- Packages remain valid indefinitely until first activated
- Expiration countdown only starts from first use, not purchase
- "Not Activated" packages appear with "Not Set" in expiration column
- Sorting by expiration date places unactivated packages at the beginning

## Common Use Cases

### 1. Finding Expired Packages for a Customer
1. Enter customer name in search field
2. Set status filter to "Expired"
3. View results in table

### 2. Extending Package Expiration
1. Click Edit button on package row
2. Update expiration date
3. Add reason in modification notes
4. Save changes

### 3. Transferring Package to Different Customer
1. Click Transfer button on package row
2. Search and select target customer
3. Enter transfer reason
4. Confirm transfer

### 4. Reviewing Package Usage History
1. Click Usage button on package row (hours-based only)
2. View usage records sorted by date
3. Check employee names and hours consumed

## Integration Points

### Customer Management System
- Uses `public.customers` table for customer data
- Maintains customer ID relationships
- Respects customer data ownership

### Package Types System
- References `backoffice.package_types`
- Displays package names and hour limits
- Handles unlimited vs hours-based logic

### Authentication System
- NextAuth.js session management
- Admin role verification
- Development bypass support

## Performance Considerations

### Optimizations
- Pagination for large datasets
- Indexed database queries
- Client-side sorting for displayed data
- Debounced search input

### Caching
- Package types cached in memory
- Customer search results temporary cache
- SWR for data fetching with revalidation

## Error Handling

### Common Errors
- **Customer Not Found**: When transferring to non-existent customer
- **Invalid Dates**: Purchase date after expiration
- **Missing Required Fields**: Form validation
- **Concurrent Updates**: Optimistic locking warnings

### User Feedback
- Clear error messages
- Toast notifications for operations
- Form validation indicators
- Loading states during operations

## Future Enhancements

### Planned Features
1. Bulk operations for multiple packages
2. Package usage analytics dashboard
3. Automatic expiration notifications
4. Package renewal workflows
5. Export functionality for reports

### Technical Improvements
1. Real-time updates via WebSocket
2. Advanced filtering options
3. Keyboard shortcuts for power users
4. Undo/redo for critical operations

## Related Documentation

- [Package Management (Staff)](../../public/customer-packages/PACKAGE_MANAGEMENT.md) - Staff-level package operations
- [Customer Management System](../../public/customer-packages/CUSTOMER_MANAGEMENT_SYSTEM.md) - Customer data management
- [Admin Panel](./ADMIN_PANEL.md) - Administrative interface overview
- [Authentication System](../../../technical/AUTHENTICATION_SYSTEM.md) - Access control details

## Change Log

### Version 1.0 (January 2025)
- Initial implementation of admin package management
- Core CRUD operations for packages
- Package transfer functionality
- Usage record viewing
- Audit trail implementation
- Professional UI matching existing admin interfaces