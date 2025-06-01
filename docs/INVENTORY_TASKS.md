# Inventory Management System - Phase 1 Tasks
## Epic: Replace Google Forms with Integrated Inventory System

**Epic Summary:** Build a simple tablet-optimized inventory submission form to replace the current Google Forms process for daily inventory tracking at LenGolf.

**Epic Status:** 🟡 In Progress  
**Sprint:** Phase 1 - Weeks 1-2  
**Story Points:** 21 points  

---

## 📋 Sprint Backlog

### Story 1: Database Schema Setup
**Story ID:** INV-001  
**Type:** Story  
**Priority:** High  
**Story Points:** 3  
**Status:** 🔴 To Do  
**Assignee:** Developer  

**User Story:**  
As a developer, I need to create the database schema to store inventory categories, products, and submissions so that the system can persist inventory data.

**Acceptance Criteria:**
- [ ] Create `inventory_categories` table with proper structure
- [ ] Create `inventory_products` table with JSONB options support
- [ ] Create `inventory_submissions` table with JSONB data storage
- [ ] Add appropriate indexes for performance
- [ ] Test database schema with sample data

**Tasks:**
- [ ] Design and create database tables in Supabase
- [ ] Set up proper UUID primary keys and foreign key constraints
- [ ] Create database indexes for optimization
- [ ] Test CRUD operations on all tables
- [ ] Document database schema

**Definition of Done:**
- All tables created and accessible via Supabase
- Database queries perform under 100ms for typical operations
- Sample data can be inserted and retrieved successfully

---

### Story 2: Product Data Migration
**Story ID:** INV-002  
**Type:** Story  
**Priority:** High  
**Story Points:** 5  
**Status:** 🔴 To Do  
**Assignee:** Developer  

**User Story:**  
As a developer, I need to migrate the existing Google Form structure into the database so that the inventory form matches the current workflow.

**Acceptance Criteria:**
- [ ] Parse existing form structure (73 inventory items, 6 categories)
- [ ] Create categories: Beer, Liquor, Wine, Non-Alcoholic, Food & Supplies, Other
- [ ] Import all products with correct input types (number, checkbox, textarea)
- [ ] Set up checkbox options for products that need them
- [ ] Maintain display order matching current form

**Tasks:**
- [ ] Analyze existing_form_structure.txt file
- [ ] Create data migration script
- [ ] Map Google Form field types to database input_types
- [ ] Import categories and products via API or direct DB insert
- [ ] Verify all products imported correctly

**Definition of Done:**
- All 73 inventory items exist in database
- Categories match Google Form structure
- Input types and options correctly configured
- Products display in same order as original form

---

### Story 3: API Routes Development
**Story ID:** INV-003  
**Type:** Story  
**Priority:** High  
**Story Points:** 5  
**Status:** 🔴 To Do  
**Assignee:** Developer  

**User Story:**  
As a frontend developer, I need API endpoints to fetch products and submit inventory data so that the form can communicate with the database.

**Acceptance Criteria:**
- [ ] GET `/api/inventory/products` returns products grouped by category
- [ ] POST `/api/inventory/submissions` accepts and stores form submissions
- [ ] API validates required fields and data types
- [ ] Error handling returns appropriate HTTP status codes
- [ ] API responses match defined TypeScript interfaces

**Tasks:**
- [ ] Create `app/api/inventory/products/route.ts` GET endpoint (following existing pattern)
- [ ] Create `app/api/inventory/submissions/route.ts` POST endpoint (following existing pattern)
- [ ] Create `app/api/inventory/submissions/latest/route.ts` GET endpoint for prefilling
- [ ] Implement input validation and error handling
- [ ] Add TypeScript interfaces for API responses
- [ ] Test API endpoints with Postman or similar tool

**Definition of Done:**
- API endpoints return data in expected format
- Form submission successfully stores data in database
- Error cases handled gracefully with appropriate messages
- API documented with example requests/responses

---

### Story 4: TypeScript Type Definitions
**Story ID:** INV-004  
**Type:** Task  
**Priority:** Medium  
**Story Points:** 2  
**Status:** 🔴 To Do  
**Assignee:** Developer  

**User Story:**  
As a developer, I need TypeScript interfaces for inventory data so that the code is type-safe and maintainable.

**Acceptance Criteria:**
- [ ] Create `src/types/inventory.ts` with all interfaces
- [ ] Define InventoryCategory, InventoryProduct, InventorySubmission interfaces
- [ ] Export types for use across components and APIs
- [ ] Ensure types match database schema

**Tasks:**
- [ ] Create `src/types/inventory.ts` file (following existing pattern like `package-form.ts`)
- [ ] Define all necessary interfaces (InventoryCategory, InventoryProduct, InventorySubmission)
- [ ] Import types in API route files
- [ ] Import types in component files
- [ ] Follow existing type patterns from other modules

**Definition of Done:**
- All inventory-related data has proper TypeScript types
- No TypeScript errors in inventory module
- Types accurately reflect database schema

---

### Story 5: Inventory Form Components
**Story ID:** INV-005  
**Type:** Story  
**Priority:** High  
**Story Points:** 8  
**Status:** 🔴 To Do  
**Assignee:** Developer  

**User Story:**  
As a staff member, I want to fill out inventory on a tablet using a simple form so that I can quickly record daily inventory without using paper or Google Forms.

**Acceptance Criteria:**
- [ ] Form displays all inventory categories and products
- [ ] Dynamic input types: number inputs, radio groups, textarea
- [ ] Staff dropdown with options: Net, Dolly, May
- [ ] Form validation prevents submission of invalid data
- [ ] Success message confirms submission
- [ ] Tablet-optimized layout with touch-friendly controls

**Tasks:**
- [ ] Create `src/components/inventory/index.tsx` main component (following package-form pattern)
- [ ] Build `src/components/inventory/category-section.tsx` component
- [ ] Create `src/components/inventory/product-input.tsx` component with dynamic input rendering
- [ ] Implement `src/components/inventory/staff-selector.tsx` dropdown component
- [ ] Create `src/components/inventory/utils/form-helpers.ts` utility functions
- [ ] Add form validation with react-hook-form (following existing patterns)
- [ ] Style for tablet use with larger touch targets using existing Tailwind classes
- [ ] Add form submission handling

**Definition of Done:**
- Form displays all products from database correctly
- All input types render appropriately (number, radio, textarea)
- Form validates required fields before submission
- Touch-friendly on tablet devices
- Successful submission stores data and shows confirmation

---

### Story 6: Navigation Integration
**Story ID:** INV-006  
**Type:** Story  
**Priority:** Medium  
**Story Points:** 3  
**Status:** 🔴 To Do  
**Assignee:** Developer  

**User Story:**  
As a staff member, I want to access the inventory form from the main navigation so that I can find it easily alongside other LenGolf tools.

**Acceptance Criteria:**
- [ ] Add "Inventory Management" section to main navigation
- [ ] Navigation item links to `/inventory` route
- [ ] Consistent styling with existing navigation
- [ ] Mobile/tablet responsive navigation

**Tasks:**
- [ ] Update `src/config/menu-items.ts` with inventory menu item (following existing MenuItem pattern)
- [ ] Add appropriate Lucide icon (e.g., ClipboardList, Package, Warehouse)
- [ ] Verify navigation integration in main nav component
- [ ] Test navigation on tablet devices
- [ ] Ensure consistent styling with existing menu items

**Definition of Done:**
- "Inventory Management" appears in main navigation
- Clicking navigation item takes user to inventory form
- Navigation works on tablet and desktop
- Styling matches existing navigation items

---

### Story 7: Main Inventory Page
**Story ID:** INV-007  
**Type:** Story  
**Priority:** High  
**Story Points:** 3  
**Status:** 🔴 To Do  
**Assignee:** Developer  

**User Story:**  
As a staff member, I want a main inventory page that loads the form so that I can access the inventory system directly.

**Acceptance Criteria:**
- [ ] Create `/app/inventory/page.tsx` route
- [ ] Page loads inventory form component
- [ ] Page title and metadata set appropriately
- [ ] Loading states handled gracefully

**Tasks:**
- [ ] Create `app/inventory/page.tsx` route (following existing page patterns)
- [ ] Use dynamic import for client component like other pages
- [ ] Import and render InventoryForm component from `src/components/inventory`
- [ ] Add proper page metadata and titles
- [ ] Handle loading and error states following existing patterns

**Definition of Done:**
- `/inventory` route displays the inventory form
- Page loads quickly and handles errors gracefully
- Proper page title and navigation breadcrumbs

---

### Story 8: Custom React Hooks
**Story ID:** INV-008  
**Type:** Task  
**Priority:** Medium  
**Story Points:** 3  
**Status:** 🔴 To Do  
**Assignee:** Developer  

**User Story:**  
As a developer, I need reusable hooks for inventory operations so that component logic is clean and testable.

**Acceptance Criteria:**
- [ ] Create `useInventoryProducts` hook for fetching products
- [ ] Create `useInventorySubmission` hook for form submission
- [ ] Hooks handle loading, success, and error states
- [ ] Hooks use SWR for caching

**Tasks:**
- [ ] Create `src/hooks/use-inventory-products.ts` (following kebab-case pattern)
- [ ] Create `src/hooks/use-inventory-submission.ts` (following kebab-case pattern)
- [ ] Implement SWR for data fetching (following use-package-monitor.ts pattern)
- [ ] Add error handling and loading states following existing hook patterns

**Definition of Done:**
- Hooks successfully fetch and submit data
- Loading and error states properly managed
- Components use hooks instead of direct API calls

---

## 📊 Sprint Summary

**Total Story Points:** 21  
**Sprint Duration:** 2 weeks  
**Sprint Velocity Target:** 20-25 points  

### Sprint Goals:
1. ✅ Replace Google Forms with integrated web form
2. ✅ Support all existing inventory categories and input types  
3. ✅ Optimize for tablet usage
4. ✅ Integrate with existing LenGolf navigation

### Risk Items:
- **Medium Risk:** Dynamic form generation complexity
- **Low Risk:** Tablet touch optimization testing

---

## 📈 Progress Tracking

**Overall Progress:** 0% (0/8 stories completed)

**Stories by Status:**
- 🔴 To Do: 8 stories (21 points)
- 🟡 In Progress: 0 stories (0 points)
- 🟢 Done: 0 stories (0 points)

**Next Sprint Preview:**
- Future enhancements: form prefilling, basic reporting
- Advanced features: notifications, admin features
- Performance optimization and testing

---

## 🧪 Testing Strategy

### Manual Testing Checklist:
- [ ] Form displays all 73 inventory items correctly
- [ ] All input types work (number, radio buttons, textarea)
- [ ] Staff dropdown includes Net, Dolly, May options
- [ ] Form submission saves data to database
- [ ] Tablet touch interactions work smoothly
- [ ] Navigation integration works correctly

### Automated Testing:
- [ ] API endpoint unit tests
- [ ] Component rendering tests
- [ ] Form validation tests
- [ ] Database integration tests

---

**Last Updated:** December 2024  
**Next Review:** Weekly sprint review  
**Sprint Master:** TBD  
**Product Owner:** LenGolf Management 