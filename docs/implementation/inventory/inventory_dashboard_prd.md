# Product Requirements Document (PRD)

**Title:** Inventory Management Dashboard (Admin Only)

**Prepared For:** Internal Admin Users  
**Platform:** Web (laptop/tablet optimized, responsive design)  
**Data Source:** Supabase (existing daily form submissions + product metadata)
**Location:** `/admin/inventory` (part of existing admin panel)

---

## 1. Overview
The Inventory Management Dashboard is a responsive, web-based admin interface that provides real-time visibility into inventory levels, reorder needs, and product metadata management. This dashboard visualizes data collected from the daily staff inventory form (`/inventory`) and allows admins to manage product settings, costs, and purchase information. The goal is to support daily operational decisions by highlighting what needs restocking and offering quick access to purchase resources.

**Key Separation:**
- **Staff Form** (`/inventory`): Daily inventory data entry by staff
- **Admin Dashboard** (`/admin/inventory`): Management visualization and metadata editing

---

## 2. Goals
- Quickly assess which items need to be reordered based on latest staff submissions
- Visualize inventory trends over the past 14 days
- Enable one-click access to reorder links
- Display total and category-level inventory value
- Allow admins to edit product metadata (costs, thresholds, purchase links)
- Group and present items in a visually intuitive and mobile-friendly layout

---

## 3. Features & Functionality

### 3.1 Core Features
- **Inventory Status Display**
  - Show current quantity vs. reorder threshold (from latest staff submission)
  - Use visual cues (e.g., color-coded pill or bar: red = reorder, yellow = low, green = sufficient)
  - Leverage existing reorder analysis logic from `inventory-reorder-analysis.sql`
- **Product Image/Icon Display**
  - Show small item image (or fallback icon)
  - Fallback to category-based icons if no image available
- **Purchase Link Access**
  - Button opens a modal with:
    - Purchase URL (clickable)
    - Copy button for link
    - Supplier information (already exists in database)
- **14-Day Inventory Trend Chart**
  - Accessed via icon or link (e.g., sparkline or modal pop-up)
  - Shows past 14 entries of recorded quantities (numerical products only)
  - Skip trend analysis for non-numerical entries (checkboxes, text fields)
- **Smart Sorting into Buckets**
  - Auto-sort items into 3 sections using existing reorder logic:
    - "Needs Reorder" (current_stock <= reorder_threshold)
    - "Running Low" (current_stock <= reorder_threshold * 1.2)
    - "Sufficient Inventory" (adequate stock)
- **Calculated Inventory Value**
  - Show total and category-level value (unit_cost * current_quantity)
  - Display in a summary section at top or sticky header

### 3.2 Admin Metadata Management
- **Modal-based editing** for product metadata:
  - Product image (image_url)
  - Purchase link (purchase_link)
  - Unit cost (unit_cost) - for inventory value calculations
  - Reorder threshold (reorder_threshold) - editable admin setting
  - Admin notes (admin_notes)
  - Supplier information (already exists - supplier field)
- **Edit button** per product opens modal with form fields
- **Save/Cancel** functionality with proper validation
- **Category management** (existing categories: Beer, Liquor, Wine, Non-Alcoholic, Food & Supplies, Other)

### 3.3 Alerts & Warnings
- Highlight items with abnormal usage (spike/drop vs. past trend)
  - E.g., "⚠️ Sudden usage increase"
- Visual badges or icons for reorder alerts
- Use existing reorder analysis logic for consistency

### 3.4 Layout Behavior
- **Fully responsive** for tablet and laptop (optimized for admin use)
- **Admin navigation integration** - fits within existing `/admin` structure
- **Grouping/filtering** by reorder status (most important feature)
- **Category filtering** using existing 6 categories
- **Search functionality** to find specific products quickly

---

## 4. Data Model Overview (Existing Structure)

**Existing Tables (No New Tables Needed):**
- `inventory_categories` ✅ 
  - id, name, display_order, is_active, created_at, updated_at
- `inventory_products` ✅ (extend with 3 new fields)
  - Existing: id, category_id, name, unit, input_type, reorder_threshold, supplier, display_order, is_active
  - **Add**: unit_cost, image_url, purchase_link
- `inventory_submissions` ✅
  - id, date, staff, product_id, category_id, value_numeric, value_text, value_json, created_at
  - Contains daily staff submissions (one per day per product)

**Database Changes Required:**
```sql
ALTER TABLE inventory_products ADD COLUMN unit_cost DECIMAL(10,2);
ALTER TABLE inventory_products ADD COLUMN image_url TEXT;
ALTER TABLE inventory_products ADD COLUMN purchase_link TEXT; 
```

---

## 5. UI/UX Notes
- **Card-based layout** grouped by reorder status
- **Modal system** for metadata editing (using existing shadcn/ui patterns)
- **Color-coded status indicators** (colorblind-safe palette)
- **Compact design** - 73+ products need efficient space usage
- **Admin navigation integration** - fits existing admin dropdown structure
- **Consistent with existing admin styling** (Sales Dashboard patterns)

---

## 6. Technical Requirements
- **Frontend Framework**: Next.js + React + Tailwind (existing stack)
- **Supabase integration**: Extend existing API patterns
- **Component library**: shadcn/ui (existing components)
- **Modal system**: Existing modal patterns from inventory form
- **Charting library**: Recharts (for 14-day trend views)
- **Admin access control**: Existing middleware protection

**API Endpoints Needed:**
- `GET /api/admin/inventory/overview` - Dashboard summary data
- `GET /api/admin/inventory/trends/[productId]` - 14-day history  
- `PUT /api/admin/inventory/products/[productId]` - Update product metadata
- Leverage existing `/api/inventory/products` for base data

---

## 7. Integration with Existing System
- **Admin Panel**: Integrate with existing `/admin` structure and navigation
- **Access Control**: Use existing admin middleware and role checking
- **Data Source**: Build on existing inventory form submissions
- **Reorder Logic**: Use existing `inventory-reorder-analysis.sql` queries
- **UI Patterns**: Follow existing admin dashboard styling (Sales Dashboard)
- **Component Reuse**: Extend existing inventory components where applicable

---

## 8. Phase 1 Scope (MVP)
- ✅ Dashboard with 3 reorder status groups
- ✅ Current stock levels from latest submissions  
- ✅ Total inventory value calculations
- ✅ Modal-based metadata editing
- ✅ Purchase link access
- ✅ Admin navigation integration
- ✅ Mobile responsive design

**Future Phases:**
- Phase 2: 14-day trend charts
- Phase 3: Advanced analytics and predictions
- Phase 4: CSV export and reporting

---

**End of Document**
