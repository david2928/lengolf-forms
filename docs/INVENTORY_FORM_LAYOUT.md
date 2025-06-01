# Inventory Form Layout Specification
## LenGolf Inventory Management System

**Document Version:** 1.0  
**Date:** December 2024  
**Purpose:** Technical specification for inventory form layout and field structure

---

## 📋 Form Overview

**Form Title:** Inventory Tracker  
**Total Fields:** 73 inventory items + 1 staff selector  
**Categories:** 6 main categories  
**Input Types:** 4 different input types  
**Target Device:** Tablet-optimized  

---

## 👤 Staff Selection Section

**Field:** Staff Name  
**Type:** Dropdown/Select  
**Required:** Yes  
**Options:**
- Net
- Dolly  
- May

**Implementation:**
```typescript
{
  id: 'staff_name',
  name: 'Staff Name',
  type: 'select',
  required: true,
  options: ['Net', 'Dolly', 'May']
}
```

---

## 🍺 Category 1: Beer (6 items)

| Order | Field Name | Input Type | Unit | Required | Notes |
|-------|------------|------------|------|----------|-------|
| 1 | Asahi | number | bottles | No | Current stock count |
| 2 | Singha | number | bottles | No | Current stock count |
| 3 | Hoegaarden | number | bottles | No | Current stock count |
| 4 | Craft beer (various brands) | number | bottles | No | Current stock count |
| 5 | Heineken | number | bottles | No | Current stock count |
| 6 | Chatri IPA | number | bottles | No | Current stock count |

**Implementation Example:**
```typescript
{
  category: 'Beer',
  display_order: 1,
  products: [
    {
      id: 'beer_asahi',
      name: 'Asahi',
      input_type: 'number',
      unit: 'bottles',
      display_order: 1,
      is_required: false
    }
    // ... other beer products
  ]
}
```

---

## 🥃 Category 2: Liquor (12 items)

| Order | Field Name | Input Type | Unit | Required | Notes |
|-------|------------|------------|------|----------|-------|
| 1 | Absolute Vodka | number | bottles | No | Current stock count |
| 2 | Bacardi Rum | number | bottles | No | Current stock count |
| 3 | Chita Whiskey | number | bottles | No | Current stock count |
| 4 | Regency Whiskey | number | bottles | No | Current stock count |
| 5 | Hibiki Whiskey | number | bottles | No | Current stock count |
| 6 | Kakubin Whiskey | number | bottles | No | Current stock count |
| 7 | Black Label Whiskey | number | bottles | No | Current stock count |
| 8 | Chivas Whiskey | number | bottles | No | Current stock count |
| 9 | Tequila | number | bottles | No | Current stock count |
| 10 | Gin (Bombay Sapphire) | number | bottles | No | Current stock count |
| 11 | Gin (House Gin) | number | bottles | No | Current stock count |
| 12 | Vodka (House Vodka) | number | bottles | No | Current stock count |

---

## 🍷 Category 3: Wine (7 items)

| Order | Field Name | Input Type | Unit | Required | Notes |
|-------|------------|------------|------|----------|-------|
| 1 | Red Wine (Most Expensive) | number | bottles | No | Premium red wine stock |
| 2 | Red Wine (Middle Expensive) | number | bottles | No | Mid-range red wine stock |
| 3 | Red Wine (Least Expensive) | number | bottles | No | Budget red wine stock |
| 4 | White wine (Most Expensive) | number | bottles | No | Premium white wine stock |
| 5 | White wine (Middle Expensive) | number | bottles | No | Mid-range white wine stock |
| 6 | White wine (Least Expensive) | number | bottles | No | Budget white wine stock |
| 7 | Sparkling Wine | number | bottles | No | Sparkling wine stock |

---

## 🥤 Category 4: Non-Alcoholic (19 items)

### Beverages (15 items)
| Order | Field Name | Input Type | Unit | Required | Notes |
|-------|------------|------------|------|----------|-------|
| 1 | Red Bull | number | cans | No | Energy drink stock |
| 2 | Coke Zero | number | cans | No | Sugar-free cola stock |
| 3 | Coke Original | number | cans | No | Regular cola stock |
| 4 | Sprite | number | cans | No | Lemon-lime soda stock |
| 5 | Tonic water (Schweppes) | number | bottles | No | Tonic water stock |
| 6 | Soda water (Singha) | number | bottles | No | Soda water stock |
| 7 | Still water | number | bottles | No | Still water stock |
| 8 | Gatorade - Blue | number | bottles | No | Sports drink stock |
| 9 | Gatorade - Lime | number | bottles | No | Sports drink stock |
| 10 | Zuza (Lime) | number | bottles | No | Local beverage stock |
| 11 | Zuza (Passion Fruit) | number | bottles | No | Local beverage stock |
| 12 | Zuza (Lychee) | number | bottles | No | Local beverage stock |
| 13 | Festilia (Lime) | number | bottles | No | Local beverage stock |
| 14 | Festilia (Orange) | number | bottles | No | Local beverage stock |
| 15 | Tea Bags | number | packages | No | Tea bag stock |

### Large Bottles (4 items)
| Order | Field Name | Input Type | Unit | Required | Notes |
|-------|------------|------------|------|----------|-------|
| 16 | Coke Regular (Big Bottle) | number | bottles | No | Large cola bottles |
| 17 | Coke Zero (Big Bottle) | number | bottles | No | Large sugar-free cola |
| 18 | Sprite (Big Bottle) | number | bottles | No | Large lemon-lime soda |
| 19 | Water (Big Bottle) | number | bottles | No | Large water bottles |

### Ice Stock Level
| Order | Field Name | Input Type | Required | Options |
|-------|------------|------------|----------|---------|
| 20 | Ice | radio | Yes | "Plenty", "Enough for this week", "Need to order" |

**Implementation Example:**
```typescript
{
  id: 'ice_stock',
  name: 'Ice',
  input_type: 'checkbox',
  is_required: true,
  input_options: {
    options: [
      'Plenty',
      'Enough for this week', 
      'Need to order'
    ],
    type: 'single_select'
  }
}
```

---

## 🍿 Category 5: Food & Supplies (17 items)

### Basic Supplies (5 items)
| Order | Field Name | Input Type | Unit | Required | Notes |
|-------|------------|------------|------|----------|-------|
| 1 | Garbage bags | number | rolls | No | Waste management |
| 2 | Popcorn | number | packages | No | Snack stock |
| 3 | Nuts | number | packages | No | Snack stock |
| 4 | POS paper rolls | number | rolls | No | Receipt paper |
| 5 | Credit Card paper rolls | number | rolls | No | Credit card receipts |

### Supply Stock Levels (12 items)
| Order | Field Name | Input Type | Required | Options |
|-------|------------|------------|----------|---------|
| 6 | Straws | radio | No | "Plenty of stock", "Enough for this week (at least 30)", "Need to order" |
| 7 | Paper towels | radio | No | "Plenty of stock", "Enough for this week (at least 5 packs)", "Need to order" |
| 8 | Cleaning Supply (Floor Cleaner) | radio | No | "Plenty of stock", "Enough for this week", "Need to order" |
| 9 | Cleaning Supply (General Cleaner) | radio | No | "Plenty of stock", "Enough for this week", "Need to order" |
| 10 | Cleaning Supply (Handwash) | radio | No | "Plenty of stock", "Enough for this week", "Need to order" |
| 11 | Cleaning Supply (Dishwashing Liquid) | radio | No | "Plenty of stock", "Enough for this week", "Need to order" |
| 12 | Napkins (normal) | radio | No | "Plenty of stock", "Enough for this week", "Need to order" |
| 13 | Napkins (wet) | radio | No | "Plenty of stock", "Enough for this week", "Need to order" |
| 14 | Paper Plates | radio | No | "Plenty of stock", "Enough for this week", "Need to order" |
| 15 | Fork/Knives/Spoons | radio | No | "Plenty of stock", "Enough for this week", "Need to order" |

---

## ⛳ Category 6: Other (4 items)

| Order | Field Name | Input Type | Unit | Required | Notes |
|-------|------------|------------|------|----------|-------|
| 1 | Golf gloves | textarea | - | No | Size breakdown and inventory details |
| 2 | Cash (only Bills) | number | dollars | No | Cash amount in register |
| 3 | Golf Balls (only Inventory) | number | pieces | No | Golf ball stock count |
| 4 | Damaged Golf Balls | number | pieces | No | Damaged golf ball count |
| 5 | Golf Tees (Rubber) | number | pieces | No | Golf tee stock |

**Special Implementation for Golf Gloves:**
```typescript
{
  id: 'golf_gloves',
  name: 'Golf gloves',
  input_type: 'textarea',
  placeholder: 'Enter size breakdown (e.g., size 18=6, size 19=5, size 20=39...)',
  rows: 3
}
```

---

## 🎨 UI/UX Specifications

### Layout Structure
```
┌─────────────────────────────────────────┐
│ 📱 LenGolf Inventory Management         │
├─────────────────────────────────────────┤
│ Staff Name: [Dropdown: Net/Dolly/May]  │
│ Date: [Auto-filled: Today's Date]      │
├─────────────────────────────────────────┤
│ 🍺 Beer                                 │
│ ┌─────────────────────────────────────┐ │
│ │ Asahi        [Number Input] bottles │ │
│ │ Singha       [Number Input] bottles │ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ 🥃 Liquor                               │
│ ┌─────────────────────────────────────┐ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
│ [Continue for all categories...]        │
├─────────────────────────────────────────┤
│        [Submit Inventory] [Clear]       │
└─────────────────────────────────────────┘
```

### Tablet Optimization

**Touch Targets:**
- Minimum 44px height for all interactive elements
- 16px minimum spacing between touch targets
- Large, clear labels and inputs

**Input Styling:**
```css
/* Number inputs */
.inventory-number-input {
  min-height: 48px;
  font-size: 16px;
  padding: 12px 16px;
  border-radius: 8px;
}

/* Radio button groups */
.inventory-radio-group {
  gap: 12px;
  margin: 8px 0;
}

.inventory-radio-item {
  min-height: 44px;
  padding: 12px;
  border-radius: 8px;
}

/* Textarea */
.inventory-textarea {
  min-height: 120px;
  font-size: 16px;
  padding: 12px;
  border-radius: 8px;
}
```

---

## 🔧 Technical Implementation

### Database Mapping
```sql
-- Categories will be stored as:
INSERT INTO inventory_categories (name, display_order) VALUES
('Beer', 1),
('Liquor', 2), 
('Wine', 3),
('Non-Alcoholic', 4),
('Food & Supplies', 5),
('Other', 6);

-- Products example:
INSERT INTO inventory_products (
  category_id, name, input_type, unit, input_options, display_order
) VALUES (
  'beer_category_id',
  'Asahi', 
  'number',
  'bottles',
  NULL,
  1
);

-- Checkbox products example:
INSERT INTO inventory_products (
  category_id, name, input_type, input_options, display_order
) VALUES (
  'supplies_category_id',
  'Ice',
  'checkbox',
  '{"options": ["Plenty", "Enough for this week", "Need to order"], "type": "single_select"}',
  1
);
```

### Form Validation Rules

```typescript
const validationRules = {
  staff_name: { required: true },
  number_fields: { 
    min: 0, 
    max: 9999,
    type: 'number'
  },
  checkbox_fields: {
    required: false // Most are optional
  },
  textarea_fields: {
    maxLength: 500
  }
};
```

### Form Data Structure
```typescript
interface InventorySubmissionData {
  staff_name: 'Net' | 'Dolly' | 'May';
  submission_date: string; // YYYY-MM-DD
  inventory_data: {
    [product_id: string]: string | number;
  };
  notes?: string;
}

// Example submission:
{
  staff_name: 'Dolly',
  submission_date: '2024-12-20',
  inventory_data: {
    'beer_asahi': 89,
    'beer_singha': 91,
    'ice_stock': 'Enough for this week',
    'golf_gloves': 'size 18=6, size 19=5, size 20=39...',
    'cash_bills': 11797
  }
}
```

---

## 📱 Responsive Breakpoints

**Tablet Landscape (1024px+):**
- 2-column layout for form sections
- Side-by-side category navigation
- Larger input fields and spacing

**Tablet Portrait (768px - 1023px):**
- Single column layout
- Collapsible category sections
- Optimized touch targets

**Mobile Fallback (< 768px):**
- Single column, compact layout
- Smaller but still touch-friendly controls
- Minimal spacing to fit content

---

## 🧪 Testing Scenarios

### Data Entry Testing
1. **Complete Form Submission**: Fill all 73 fields and submit
2. **Partial Submission**: Submit with only required fields
3. **Invalid Data**: Test number field limits and validation
4. **Checkbox Selection**: Test all radio button combinations
5. **Textarea Input**: Test golf gloves detailed entry

### Touch Interaction Testing
1. **Tap Accuracy**: Ensure all inputs respond to touch
2. **Scroll Performance**: Smooth scrolling through categories
3. **Keyboard Behavior**: Number pad for numeric inputs
4. **Focus Management**: Proper tab order and focus states

---

**Document Status:** ✅ Complete  
**Last Updated:** December 2024  
**Review Required:** Before implementation begins  
**Dependencies:** Database schema (INV-001), Data migration (INV-002) 