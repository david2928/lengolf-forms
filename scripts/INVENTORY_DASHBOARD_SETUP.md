# Inventory Dashboard Database Setup

## Overview
This document outlines the database setup required for the admin inventory dashboard.

## Database Scripts to Run

Run these scripts in your Supabase SQL Editor in order:

### 1. Extend Inventory Products Schema
**File:** `extend-inventory-products-schema.sql`
**Purpose:** Adds new columns for admin dashboard metadata

```sql
-- Run this first to add the new columns
-- This script adds: unit_cost, image_url, purchase_link
```

### 2. Create Admin Inventory Functions  
**File:** `create-admin-inventory-functions.sql`
**Purpose:** Creates database functions for the admin dashboard API

```sql
-- Run this second to create the functions
-- Creates: get_inventory_overview_with_reorder_status() and get_product_trend_data()
```

## Verification

After running the scripts, verify the setup:

1. **Check new columns exist:**
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'inventory_products' 
AND column_name IN ('unit_cost', 'image_url', 'purchase_link');
```

2. **Test the overview function:**
```sql
SELECT * FROM get_inventory_overview_with_reorder_status() LIMIT 5;
```

3. **Test the trend function (replace with actual product ID):**
```sql
SELECT * FROM get_product_trend_data('your-product-id-here');
```

## API Endpoints Created

With these database changes, the following API endpoints are now available:

- `GET /api/admin/inventory/overview` - Dashboard overview data
- `PUT /api/admin/inventory/products/[productId]` - Update product metadata  
- `GET /api/admin/inventory/products/[productId]` - Get product details
- `GET /api/admin/inventory/trends/[productId]` - Get 14-day trend data

## Next Steps

After running these database scripts:

1. ✅ Database schema is ready
2. ✅ API endpoints are ready  
3. ⏳ Ready to start Sprint 2 (UI development)

## Security Notes

- All API endpoints require admin authentication
- Database functions have proper permissions set
- Input validation is implemented on all endpoints

---

**Sprint 1 Status:** ✅ Complete  
**Ready for Sprint 2:** ✅ Yes 