# Inventory Dashboard Development Plan
## Jira Stories for Sprint Planning

---

## EPIC: Inventory Management Dashboard (Admin Panel)
**Epic Description:** Build admin dashboard for inventory visualization and management at `/admin/inventory`  
**Epic Goal:** Enable admins to view inventory status, manage reorder needs, and edit product metadata  
**Epic Priority:** High  
**Estimated Story Points:** 43 points  

---

## THEME 1: Database & Infrastructure Setup

### 🔧 **INV-001: Database Schema Extension**
**Story:** As an admin, I need the inventory products table extended with cost and purchase metadata so that I can manage product information from the dashboard.

**Acceptance Criteria:**
- [ ] Add `unit_cost DECIMAL(10,2)` to `inventory_products` table
- [ ] Add `image_url TEXT` to `inventory_products` table  
- [ ] Add `purchase_link TEXT` to `inventory_products` table
- [ ] Create database migration script
- [ ] Verify existing data integrity after migration
- [ ] Update TypeScript types in `src/types/inventory.ts`

**Technical Notes:**
- Run SQL: `ALTER TABLE inventory_products ADD COLUMN unit_cost DECIMAL(10,2), ADD COLUMN image_url TEXT, ADD COLUMN purchase_link TEXT;`
- Update `InventoryProduct` interface

**Story Points:** 3  
**Priority:** Highest  
**Dependencies:** None  

---

### 🔧 **INV-002: Admin API Endpoints**
**Story:** As a developer, I need API endpoints for the admin dashboard to retrieve dashboard data and update product metadata.

**Acceptance Criteria:**
- [ ] Create `GET /api/admin/inventory/overview` endpoint
  - [ ] Returns products grouped by reorder status (needs reorder, low stock, sufficient)
  - [ ] Includes current stock levels from latest submissions
  - [ ] Includes total inventory value calculations
  - [ ] Uses existing reorder analysis logic
- [ ] Create `PUT /api/admin/inventory/products/[productId]` endpoint
  - [ ] Updates unit_cost, image_url, purchase_link, reorder_threshold
  - [ ] Validates admin permissions
  - [ ] Returns updated product data
- [ ] Create `GET /api/admin/inventory/trends/[productId]` endpoint (future use)
  - [ ] Returns 14-day submission history for numerical products
- [ ] Add proper error handling and validation
- [ ] Add API documentation

**Technical Notes:**
- Extend existing admin middleware protection
- Use existing Supabase client patterns
- Follow existing API response formats

**Story Points:** 5  
**Priority:** High  
**Dependencies:** INV-001  

---

## THEME 2: Core Dashboard UI

### 🎨 **INV-003: Admin Navigation Integration**
**Story:** As an admin, I want to access the inventory dashboard through the existing admin navigation so that it's consistent with other admin tools.

**Acceptance Criteria:**
- [ ] Add "Inventory" item to admin dropdown menu
- [ ] Create `/admin/inventory` route
- [ ] Add admin layout wrapper with proper middleware protection
- [ ] Ensure responsive navigation on mobile/tablet
- [ ] Add breadcrumb navigation
- [ ] Test admin access control (redirect non-admins)

**Technical Notes:**
- Update admin navigation component
- Follow existing admin page structure from Sales Dashboard
- Use existing admin middleware

**Story Points:** 2  
**Priority:** High  
**Dependencies:** None  

---

### 🎨 **INV-004: Dashboard Layout & Summary Cards**
**Story:** As an admin, I want to see a dashboard overview with total inventory value and status summary so that I can quickly assess overall inventory health.

**Acceptance Criteria:**
- [ ] Create main dashboard page at `/admin/inventory/page.tsx`
- [ ] Display summary cards at top:
  - [ ] Total inventory value (sum of unit_cost × current_quantity)
  - [ ] Count of items needing reorder
  - [ ] Count of low stock items
  - [ ] Count of sufficient stock items
- [ ] Create responsive grid layout
- [ ] Use existing admin styling patterns (follow Sales Dashboard)
- [ ] Add loading states
- [ ] Add error handling

**Technical Notes:**
- Use existing Card, CardHeader, CardContent components
- Follow existing admin dashboard styling
- Implement proper TypeScript types

**Story Points:** 4  
**Priority:** High  
**Dependencies:** INV-002, INV-003  

---

### 🎨 **INV-005: Product Cards with Reorder Status**
**Story:** As an admin, I want to see all products organized by reorder status (needs reorder, low stock, sufficient) so that I can prioritize what needs attention.

**Acceptance Criteria:**
- [ ] Display products in 3 grouped sections:
  - [ ] "Needs Reorder" (red indicators)
  - [ ] "Running Low" (yellow indicators) 
  - [ ] "Sufficient Stock" (green indicators)
- [ ] Each product card shows:
  - [ ] Product name and category
  - [ ] Current stock level
  - [ ] Reorder threshold
  - [ ] Last updated date and staff member
  - [ ] Supplier information
  - [ ] Visual status indicator (color-coded)
- [ ] Responsive card layout (grid on desktop, stack on mobile)
- [ ] Use colorblind-safe color palette
- [ ] Handle missing data gracefully

**Technical Notes:**
- Use existing reorder analysis logic
- Create reusable ProductCard component
- Use existing Badge, Card components from shadcn/ui

**Story Points:** 6  
**Priority:** High  
**Dependencies:** INV-004  

---

## THEME 3: Product Metadata Management

### ⚙️ **INV-006: Product Edit Modal**
**Story:** As an admin, I want to edit product metadata (cost, image, purchase link, reorder threshold) through a modal interface so that I can maintain accurate product information.

**Acceptance Criteria:**
- [ ] Add "Edit" button to each product card
- [ ] Create modal with form fields:
  - [ ] Unit cost (number input with currency formatting)
  - [ ] Image URL (text input with image preview)
  - [ ] Purchase link (URL input with validation)
  - [ ] Reorder threshold (number input)
  - [ ] Admin notes (textarea)
- [ ] Form validation (required fields, URL format, number ranges)
- [ ] Save/Cancel functionality
- [ ] Loading states during save
- [ ] Success/error notifications
- [ ] Close modal after successful save

**Technical Notes:**
- Use existing modal patterns from inventory form
- Use React Hook Form for form handling
- Follow existing form validation patterns
- Use existing Toast notifications

**Story Points:** 6  
**Priority:** High  
**Dependencies:** INV-005  

---

### ⚙️ **INV-007: Purchase Link Access**
**Story:** As an admin, I want to quickly access purchase links for products that need reordering so that I can efficiently place orders.

**Acceptance Criteria:**
- [ ] Add "Purchase" button to product cards (when purchase link exists)
- [ ] Button opens modal with:
  - [ ] Clickable purchase link (opens in new tab)
  - [ ] Copy to clipboard button
  - [ ] Supplier information display
  - [ ] Product details summary
- [ ] Handle products without purchase links gracefully
- [ ] Show "No purchase link available" message when appropriate
- [ ] Track click analytics (optional)

**Technical Notes:**
- Create PurchaseLinkModal component
- Use existing modal patterns
- Use clipboard API for copy functionality

**Story Points:** 3  
**Priority:** Medium  
**Dependencies:** INV-006  

---

## THEME 4: Search & Filtering

### 🔍 **INV-008: Search and Category Filtering**
**Story:** As an admin, I want to search for specific products and filter by category so that I can quickly find items in the large inventory list (73+ products).

**Acceptance Criteria:**
- [ ] Add search input at top of dashboard
- [ ] Real-time search filtering by product name
- [ ] Category filter dropdown with existing categories:
  - [ ] Beer, Liquor, Wine, Non-Alcoholic, Food & Supplies, Other
- [ ] Combine search and category filters
- [ ] Show item count for each filter result
- [ ] Clear filters button
- [ ] Maintain filters during page interactions
- [ ] Responsive filter layout

**Technical Notes:**
- Use existing Select components
- Implement debounced search input
- Use URL params for filter state persistence

**Story Points:** 4  
**Priority:** Medium  
**Dependencies:** INV-005  

---

## THEME 5: Data Quality & Polish

### 🧪 **INV-009: Error Handling & Loading States**
**Story:** As an admin, I want proper loading states and error handling so that I have a smooth experience even when data is loading or errors occur.

**Acceptance Criteria:**
- [ ] Loading spinners for dashboard data
- [ ] Skeleton cards while products load
- [ ] Error boundaries for component failures
- [ ] Network error handling with retry buttons
- [ ] Empty states when no data available
- [ ] Graceful handling of missing submissions
- [ ] Proper error messages for failed updates
- [ ] Loading indicators in modals during save operations

**Technical Notes:**
- Use existing Skeleton components
- Follow existing error handling patterns
- Use SWR for data fetching with error retry

**Story Points:** 3  
**Priority:** Medium  
**Dependencies:** All previous stories  

---

### 🧪 **INV-010: Mobile Responsiveness & Polish**
**Story:** As an admin, I want the dashboard to work well on tablets and mobile devices so that I can manage inventory from any device.

**Acceptance Criteria:**
- [ ] Responsive layout that works on tablet (primary device)
- [ ] Mobile-friendly modal sizing
- [ ] Touch-friendly button sizes
- [ ] Proper spacing and typography scaling
- [ ] Test on various screen sizes (320px to 1920px)
- [ ] Optimize for tablet landscape orientation
- [ ] Fast loading and smooth interactions
- [ ] Accessibility compliance (keyboard navigation, screen readers)

**Technical Notes:**
- Use existing responsive patterns from Sales Dashboard
- Test with various device sizes
- Follow existing accessibility patterns

**Story Points:** 3  
**Priority:** Medium  
**Dependencies:** All previous stories  

---

---

## THEME 6: Data Visualization & Trends

### 📊 **INV-011: 14-Day Trend Charts**
**Story:** As an admin, I want to see 14-day usage trends for numerical products so that I can understand consumption patterns and make better reorder decisions.

**Acceptance Criteria:**
- [ ] Add trend chart icon/button to each product card (numerical products only)
- [ ] Click opens modal with 14-day line chart showing:
  - [ ] Dates on X-axis (last 14 days)
  - [ ] Quantities on Y-axis
  - [ ] Product name and current stock level as title
  - [ ] Clear trend direction indicator (up/down/stable)
- [ ] Handle missing submission days gracefully (show gaps or zero values)
- [ ] Skip non-numerical products (checkboxes, text fields) - no trend button shown
- [ ] Use `GET /api/admin/inventory/trends/[productId]` endpoint
- [ ] Responsive chart sizing for mobile/tablet
- [ ] Loading states while fetching trend data
- [ ] Error handling for failed trend requests

**Technical Notes:**
- Use Recharts library (already in project dependencies)
- Query last 14 `inventory_submissions` entries for specific product
- Filter for `value_numeric IS NOT NULL`
- Use existing modal patterns for chart display
- Consider caching trend data for performance

**Story Points:** 4  
**Priority:** High  
**Dependencies:** INV-005, INV-002  

---

## FUTURE PHASE STORIES (Not in MVP)

### 📈 **INV-012: Advanced Analytics (Phase 3)**
**Story:** As an admin, I want advanced analytics including usage alerts and predictions.

**Story Points:** 8  
**Priority:** Low  

### 📄 **INV-013: CSV Export (Phase 4)**
**Story:** As an admin, I want to export inventory data to CSV for external reporting.

**Story Points:** 3  
**Priority:** Low  

---

## SPRINT PLANNING RECOMMENDATION

### **Sprint 1 (8 points):** Foundation
- INV-001: Database Schema Extension (3 pts)
- INV-002: Admin API Endpoints (5 pts)

### **Sprint 2 (12 points):** Core Dashboard  
- INV-003: Admin Navigation Integration (2 pts)
- INV-004: Dashboard Layout & Summary Cards (4 pts)
- INV-005: Product Cards with Reorder Status (6 pts)

### **Sprint 3 (13 points):** Product Management & Trends
- INV-006: Product Edit Modal (6 pts)
- INV-007: Purchase Link Access (3 pts)
- INV-011: 14-Day Trend Charts (4 pts)

### **Sprint 4 (10 points):** Polish & Features
- INV-008: Search and Category Filtering (4 pts)
- INV-009: Error Handling & Loading States (3 pts)
- INV-010: Mobile Responsiveness & Polish (3 pts)

**Total MVP:** 43 story points across 4 sprints

---

## DEFINITION OF DONE
- [ ] Code implemented and tested
- [ ] Admin access control verified
- [ ] Mobile/tablet responsive
- [ ] Error handling implemented
- [ ] TypeScript types updated
- [ ] Code review completed
- [ ] Integration tested with existing system
- [ ] Admin user acceptance testing passed 