
**Inventory Management Dashboard: UX/UI Specification Document**

**Author:** [UX/UI Designer Name]  
**Date:** June 12, 2025  
**Project:** Internal Inventory Management Dashboard (Management View)  
**Primary Stakeholder:** Product Manager  

---

### Overview
This document outlines UX/UI recommendations for enhancing the internal inventory management dashboard. The dashboard is used by management staff to monitor daily stock updates submitted via form by ground-level staff, and to guide reordering decisions. The design must prioritize clarity, scannability, and visual prioritization of urgent stock alerts.

---

### Primary Use Cases
1. **View low stock or out-of-stock items (stock alerts).**
2. **Assess inventory levels and make reorder decisions.**
3. **Track inventory cost distribution and restocking recency.**

---

### User Personas
- **Primary:** Business owner or operations manager (desktop-first, analytical mindset)
- **Secondary:** Mobile-viewing manager (tablet or phone, quick-glance needs)

---

### Data Update Frequency
- Daily (via staff-submitted form)

---

## UX/UI Recommendations

### 1. Information Hierarchy & Card Density
#### Problem:
High-stock items dominate visual real estate, diluting focus from low-stock alerts.

#### Solution:
- **Default View:** Expanded cards for low/out-of-stock items (Red/Yellow).
- **Collapsed View:** For in-stock items (Green), show a condensed horizontal card with:
  - Product name
  - Status dot (colored)
  - Current quantity
- **Toggle:** Add a switch in the top-right labeled:
  - "Expanded View" (default)
  - "Consolidated View" (collapses green-status cards)

### 2. Dashboard Metric Boxes (Top Summary Row)
#### Metrics:
- Total Inventory Cost
- Out of Stock Count
- Low Stock Count

#### Improvements:
- Make metric boxes **clickable** to reveal relevant drill-downs (modal or drawer):
  - **Total Inventory Cost:** Pie chart of cost by category + highlight most expensive SKUs.
  - **Out of Stock:** Jumps to Out of Stock section.
  - **Low Stock:** Jumps to Low Stock section.
- **Tooltip Insights:** For cost metric, show context like:
  - "Current inventory value is 14% higher than the 30-day average."

### 3. Card Layout Enhancements
#### New Iconography (placed before labels):
- 💲 **Unit Cost** (in Thai Baht - ฿)
- 📦 **Reorder Threshold**
- 🔗 **Purchase Link**

#### Tooltip:
- 🕓 **Last Restocked:** Only visible on hover to reduce visual noise.

### 4. Sticky Filter/Search Bar
#### Improvements:
- Make the search bar and any filtering controls sticky when scrolling.
- Add a quick-jump dropdown (or tabs) to categories:
  - Beer
  - Liquor
  - Mixers
  - Non-Alcoholic

### 5. Scroll Fatigue & Visual Density
#### Problem:
Lengthy pages require too much vertical scrolling.

#### Solution:
- Combine with #1 above (collapsed cards).
- Include a floating "scroll to top" button.

### 6. Actionable Interactions & Bulk Actions
#### Expand Click Area:
- All buttons (e.g. Edit, Reorder) should have larger padding for better accessibility.

#### Bulk Actions (upon checkbox selection):
- 📦 Mark as Reordered
- ✍️ Add Manager Note
- 📤 Export Selected to CSV
- 🔗 Trigger Webhook or Email Notification

Action bar should appear when one or more checkboxes are active.

### 7. Accessibility
#### Requirements:
- **Contrast Ratios:** All status colors must meet WCAG AA.
  - Red: Minimum #B00020
  - Yellow: Use darker tones like #C77700
- **Font Size:** Minimum 14px for metadata, 16px preferred for primary content.
- **Keyboard Navigation:** All interactive elements must be tabbable.
- **ARIA Labels:** Product cards should include appropriate ARIA descriptions for screen readers:
  - Example: "Bud Light, 25 in stock, status green."

### 8. Responsive Design Considerations
- Desktop-first layout.
- On mobile:
  - Display product name, quantity, and status icon only.
  - Use expandable accordion format.
- Consolidated view mode should be default on mobile.
