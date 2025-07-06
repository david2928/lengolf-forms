# Story #1: Database Schema Setup - Migration Instructions

## Overview
This document provides step-by-step instructions to complete **Story #1: Database Schema Setup** for the payroll feature.

## Prerequisites
- Admin access to your Supabase database
- Access to the SQL editor in Supabase dashboard

## Migration Steps

### Step 1: Run the SQL Migration Script

1. **Open your Supabase Dashboard**
   - Go to your project's Supabase dashboard
   - Navigate to the SQL Editor

2. **Execute the Schema Creation Script**
   - Copy the contents of `scripts/create-payroll-schema.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

   **Important**: The script includes:
   - 4 new tables: `public_holidays`, `staff_compensation`, `payroll_settings`, `monthly_service_charge`
   - 1 column addition to existing `staff` table: `is_service_charge_eligible`
   - Performance indexes for time-based queries
   - Sample data (Thai holidays 2024, default settings)

### Step 2: Verify the Migration

1. **Use the Verification Endpoint**
   - Open your browser and go to: `http://localhost:3000/api/admin/payroll/verify-schema`
   - You should see a response like:
   ```json
   {
     "schema_complete": true,
     "tables_status": [
       { "table": "public_holidays", "exists": true, "count": 16 },
       { "table": "staff_compensation", "exists": true, "count": 0 },
       { "table": "payroll_settings", "exists": true, "count": 1 },
       { "table": "monthly_service_charge", "exists": true, "count": 0 }
     ],
     "staff_column_added": true,
     "migration_required": false
   }
   ```

2. **Manual Verification in Supabase**
   - In your Supabase dashboard, go to Table Editor
   - Verify these tables exist in the `backoffice` schema:
     - ✅ `public_holidays` (should have 16 Thai holidays for 2024)
     - ✅ `staff_compensation` (empty initially)
     - ✅ `payroll_settings` (should have 1 record: daily_allowance_thb)
     - ✅ `monthly_service_charge` (empty initially)
   - Check the `staff` table has new column: `is_service_charge_eligible`

## Expected Results

After successful migration, you should have:

- **4 new tables** created in `backoffice` schema
- **16 Thai public holidays** for 2024 populated
- **1 payroll setting** for daily allowance (100 THB default)
- **Performance indexes** for fast payroll queries
- **Staff table updated** with service charge eligibility column

## Sample Data Details

### Public Holidays (16 records)
- All major Thai public holidays for 2024
- Includes Songkran, New Year, Royal birthdays, etc.

### Payroll Settings (1 record)
- `daily_allowance_thb`: "100" (Default daily allowance for working days ≥6 hours)

### Staff Compensation
- Initially empty - will be populated when staff compensation is configured
- Each staff member will have: base_salary, ot_rate_per_hour, holiday_rate_per_hour

## Troubleshooting

### If Migration Fails
1. Check for existing table conflicts
2. Ensure you have proper database permissions
3. Verify the `backoffice` schema exists
4. Try running the rollback script first: `scripts/rollback-payroll-schema.sql`

### If Verification Fails
1. Refresh your database connection
2. Check table names match exactly (case-sensitive)
3. Verify you're checking the `backoffice` schema, not `public`

## Rollback Instructions

If you need to undo the migration:

1. **Run the Rollback Script**
   - Copy contents of `scripts/rollback-payroll-schema.sql`
   - Execute in Supabase SQL Editor
   - This will remove all payroll tables and data

2. **Verify Rollback**
   - Check that all payroll tables are removed
   - Verify `staff` table no longer has `is_service_charge_eligible` column

## Next Steps

Once migration is complete and verified:

✅ **Story #1 Complete!** - Database schema is ready
🚀 **Ready for Story #2** - Core Payroll Calculation API

---

## Files Reference

- **Migration Script**: `scripts/create-payroll-schema.sql`
- **Rollback Script**: `scripts/rollback-payroll-schema.sql`
- **Verification Endpoint**: `/api/admin/payroll/verify-schema`
- **Development Stories**: `docs/development/PAYROLL_DEVELOPMENT_STORIES.md` 