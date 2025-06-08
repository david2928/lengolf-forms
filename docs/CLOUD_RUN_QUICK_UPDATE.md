# 🚀 QUICK UPDATE: Cloud Run Service Migration

**For**: Google Cloud Run `lengolf-crm` service  
**Urgency**: 🔴 IMMEDIATE - Required for CRM functionality  

---

## 📝 **What Changed**
The Next.js app migrated from `supabase_forms` to `supabase_booking` project. The Cloud Run service must follow.

## 🔧 **Essential Updates Required**

### 1. **Environment Variables in Cloud Run**
Update these 2 environment variables:

```bash
# OLD VALUES ❌
SUPABASE_URL=https://dujqvigihnlfnvmcdrko.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[old_key]

# NEW VALUES ✅  
SUPABASE_URL=https://bisimqmtxjsptehhqpeg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[new_key_from_bisimqmtxjsptehhqpeg]
```

### 2. **Python Code Updates** 
Find and replace in all `.py` files:

```python
# Schema updates
"DELETE FROM customers" → "DELETE FROM backoffice.customers"
"INSERT INTO customers" → "INSERT INTO backoffice.customers"  
"SELECT * FROM customers" → "SELECT * FROM backoffice.customers"

# Column name updates
"name" → "customer_name"
```

## 🎯 **Steps**
1. Get new service role key from: https://supabase.com/dashboard/project/bisimqmtxjsptehhqpeg/settings/api
2. Update Cloud Run environment variables
3. Update Python code references
4. Deploy and test

## ✅ **Test After Update**
- Manual sync button works at: https://lengolf-forms.vercel.app/
- Customer data appears in `backoffice.customers` table
- New `batch_id` generated after sync

---

**Full instructions**: See `CLOUD_RUN_MIGRATION_INSTRUCTIONS.md` 