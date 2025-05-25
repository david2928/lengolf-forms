# Product Requirements Document (PRD)

## Product Name: Inventory Management System for LenGolf

**Prepared By:** Development Team  
**Date:** December 2024  
**Version:** 1.0

---

## 1. Objective

Build a simple, reliable, and efficient inventory management system to replace the current manual process of recording inventory on paper and Google Forms. The system will be integrated directly into the existing LenGolf Next.js React web application. It will allow staff to quickly and accurately input, track, and review inventory data from a mobile or desktop interface.

---

## 2. Background

LenGolf currently operates a retail golf simulator and bar. Staff take daily inventory of consumables (e.g. beer, water), golf equipment (e.g. golf balls, tees), and operational items (e.g. cash). This is done manually on paper, then re-entered into a Google Form. The current method is time-consuming, error-prone, and inefficient.

The current Google Form includes a wide range of item types:

* Text-entry fields for specific drink and supply quantities
* Checkbox fields for stock levels (e.g., "Plenty", "Need to order")
* Paragraph text fields for items like gloves and notes

---

## 3. Goals

* Streamline the inventory process
* Reduce input errors
* Improve speed and usability for staff
* Enable real-time inventory tracking and reporting
* Integrate seamlessly with LenGolf's existing web application

---

## 4. Key Features

### 4.1 User Roles

* **Staff**: Can submit daily inventory reports using a simple dropdown selection (Net, Dolly, May).

### 4.2 Inventory Management (Products Table)

* Stores metadata for each inventory item:
  * Name, category (e.g. Beer, Liquor, Supplies), unit, reorder threshold
  * Input type (number, dropdown, checkbox, paragraph text)
  * Dropdown/checkbox options (e.g. "Plenty", "Need to order")
  * Active/inactive status

### 4.3 Daily Inventory Submissions (Form Submissions Table)

* Captures staff name, timestamp, and values for each product
* JSON-based structure mapping product ID to entered values
* Dynamic form rendering based on product metadata
* Auto-prefill with previous day's values (if available)
* Form validation (e.g., required fields, numeric limits)
* Reorder alerts if values fall below thresholds

### 4.4 Basic Data Storage

* Store inventory submissions with timestamp and staff name
* Simple historical record keeping for future enhancements

---

## 5. Current State Analysis

### 5.1 Current Google Form Structure

Based on the existing form structure, we have identified:

* **73 inventory items** across 6 main categories:
  1. Beer (6 items)
  2. Liquor (12 items)
  3. Wine (7 items)
  4. Non-Alcoholic (19 items)
  5. Food & Supplies (17 items)
  6. Other (4 items)

* **Input Types Used**:
  * TEXT fields (46 items) - for quantity counts
  * CHECKBOX fields (17 items) - for stock level indicators
  * MULTIPLE_CHOICE (1 item) - staff name selection
  * PARAGRAPH_TEXT (1 item) - for detailed notes
  * PAGE_BREAK (8 items) - for form organization

### 5.2 Current Data Structure

Sample data shows:
* Numeric values for countable items (e.g., "89" for Asahi beer)
* Stock level indicators ("Plenty of stock", "Need to order")
* Reorder thresholds and supplier information
* Automatic reorder alerts based on thresholds

---

## 6. Technical Requirements

### 6.1 Integration Points

* Must integrate with existing LenGolf Next.js application
* Use existing Supabase database infrastructure
* Maintain consistency with current UI/UX patterns
* Optimize for tablet usage (primary device)
* Add new "Inventory Management" section to main navigation

### 6.2 Data Migration

* Import existing inventory items from Google Form structure (future enhancement)
* Focus on current form structure for Phase 1

### 6.3 Performance Requirements

* Form submission should complete within 3 seconds
* Support concurrent use by multiple staff members
* No offline capability required for Phase 1

---

## 7. User Stories

### As a Staff Member:
* I want to quickly complete daily inventory without paper forms
* I want the form to remember yesterday's values to save time (future enhancement)
* I want to access the system from our tablet
* I want a simple, fast form that replaces our Google Form process

---

## 8. Success Metrics

* 100% reduction in paper-based inventory tracking
* 50% reduction in time spent on daily inventory
* 90% staff adoption within first month
* Zero data entry errors due to double-handling

---

## 9. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Staff resistance to change | Medium | Provide onboarding and training |
| Data sync errors | High | Implement auto-backups and logging |
| Limited internet access | Medium | Consider offline entry and sync later |
| Mobile usability issues | Medium | Extensive mobile testing and optimization |

---

## 10. Timeline

**Phase 1 (Week 1-2)**: Simple inventory submission form to replace Google Forms  
- Database schema for basic inventory tracking
- Dynamic form generation based on existing Google Form structure
- Simple staff dropdown selection (Net, Dolly, May)
- Basic form submission and data storage
- Integration with main navigation ("Inventory Management")

**Future Phases**: Advanced features like reporting, analytics, and admin functions

---

**End of Document** 