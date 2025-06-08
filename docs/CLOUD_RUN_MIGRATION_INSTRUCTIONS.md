# 🚨 URGENT: Google Cloud Run Service Migration Instructions

**Status**: 🔴 **ACTION REQUIRED**  
**Deadline**: Immediate - Required for CRM sync functionality  
**Impact**: Customer data synchronization currently broken  

---

## 📋 **Migration Overview**

The lengolf-forms project has been **migrated from** `supabase_forms` project **to** `supabase_booking` project. The Google Cloud Run lengolf_crm service must be updated to point to the new Supabase project.

### **Migration Details**
| Component | Old Value | New Value |
|-----------|-----------|-----------|
| **Project Name** | supabase_forms | supabase_booking |
| **Project ID** | `dujqvigihnlfnvmcdrko` | `bisimqmtxjsptehhqpeg` |
| **Database Schema** | `public` | `backoffice` |
| **Supabase URL** | `https://dujqvigihnlfnvmcdrko.supabase.co` | `https://bisimqmtxjsptehhqpeg.supabase.co` |

---

## 🔧 **Required Changes in Cloud Run Service**

### 1. **Update Environment Variables**

The following environment variables in the Google Cloud Run service **MUST** be updated:

#### **A. Supabase URL**
```bash
# OLD VALUE
SUPABASE_URL=https://dujqvigihnlfnvmcdrko.supabase.co

# NEW VALUE  
SUPABASE_URL=https://bisimqmtxjsptehhqpeg.supabase.co
```

#### **B. Supabase Service Role Key**
```bash
# OLD VALUE
SUPABASE_SERVICE_ROLE_KEY=[old_key_from_dujqvigihnlfnvmcdrko]

# NEW VALUE
SUPABASE_SERVICE_ROLE_KEY=[new_key_from_bisimqmtxjsptehhqpeg]
```

### 2. **Update Database Schema References**

All SQL queries in the Cloud Run Python code must be updated to use the new `backoffice` schema:

#### **Before (Old Code)**
```python
# Old schema references
cursor.execute("DELETE FROM customers")
cursor.execute("INSERT INTO customers (...) VALUES (...)")
```

#### **After (New Code)**  
```python
# New schema references
cursor.execute("DELETE FROM backoffice.customers")
cursor.execute("INSERT INTO backoffice.customers (...) VALUES (...)")
```

### 3. **Update Column Name References**

The `customers` table structure has changed. Update any column references:

#### **Before (Old Code)**
```python
# Old column name
INSERT INTO backoffice.customers (name, ...) VALUES (...)
```

#### **After (New Code)**
```python  
# New column name
INSERT INTO backoffice.customers (customer_name, ...) VALUES (...)
```

---

## 🚀 **Step-by-Step Migration Process**

### **Step 1: Get New Supabase Credentials**

1. **Access Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/projects
   - Select project: `bisimqmtxjsptehhqpeg` (supabase_booking)

2. **Get Project URL**
   - Navigate to: Settings → API  
   - Copy: **Project URL** = `https://bisimqmtxjsptehhqpeg.supabase.co`

3. **Get Service Role Key**
   - Navigate to: Settings → API
   - Copy: **service_role secret** (NOT the anon public key)

### **Step 2: Update Cloud Run Environment Variables**

1. **Access Google Cloud Console**
   - Go to: https://console.cloud.google.com/
   - Navigate to: Cloud Run → lengolf-crm-[number]

2. **Update Service Configuration**
   - Click: **Edit & Deploy New Revision**
   - Go to: **Variables & Secrets** tab
   - Update the following environment variables:

```bash
SUPABASE_URL=https://bisimqmtxjsptehhqpeg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[new_service_role_key_from_step_1]
```

3. **Deploy Changes**
   - Click: **Deploy**
   - Wait for deployment to complete

### **Step 3: Update Python Code (If Needed)**

If your Python code has hardcoded schema references, update them:

#### **Find Files to Update**
Look for any Python files containing:
- `DELETE FROM customers`
- `INSERT INTO customers`  
- `SELECT * FROM customers`
- Any direct table references without schema

#### **Update Code Pattern**
```python
# Pattern to find and replace
OLD: "DELETE FROM customers"
NEW: "DELETE FROM backoffice.customers"

OLD: "INSERT INTO customers"  
NEW: "INSERT INTO backoffice.customers"

OLD: "SELECT * FROM customers"
NEW: "SELECT * FROM backoffice.customers"

# Column name updates
OLD: "name"
NEW: "customer_name"
```

### **Step 4: Verify Database Access**

Test the connection to ensure the service can access the new database:

#### **A. Test Connection**
```python
# Add this test code temporarily to your Cloud Run service
import os
from supabase import create_client

def test_connection():
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    supabase = create_client(supabase_url, supabase_key)
    
    # Test query
    result = supabase.table('backoffice.customers').select('customer_name').limit(1).execute()
    print(f"Connection test successful: {len(result.data)} rows returned")
    return True
```

#### **B. Test Manual Sync**
After deployment, test the manual sync:
1. Go to: https://lengolf-forms.vercel.app/
2. Click: **"Update Customer Data"** button  
3. Verify: Success message appears
4. Check: New batch_id in database

---

## 🔍 **Verification Checklist**

### **✅ Environment Variables Updated**
- [ ] `SUPABASE_URL` points to `bisimqmtxjsptehhqpeg.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is from new project
- [ ] Cloud Run service deployed successfully

### **✅ Code Updates (If Applicable)**
- [ ] All table references use `backoffice.` schema prefix
- [ ] Column `name` changed to `customer_name` 
- [ ] No hardcoded old project references remain

### **✅ Functionality Testing**  
- [ ] Manual sync button works from lengolf-forms dashboard
- [ ] Customer data appears in `backoffice.customers` table
- [ ] New `batch_id` is generated after sync
- [ ] `update_time` is current after sync

### **✅ Automated Sync Testing**
- [ ] Cron job executes successfully (check next 2:00 AM Thailand time)
- [ ] Automated sync updates database
- [ ] No errors in Cloud Run logs

---

## 🚨 **Critical Warnings**

### **⚠️ Data Safety**
- **DO NOT** delete or modify data in the old `dujqvigihnlfnvmcdrko` project until migration is fully verified
- **BACKUP** any custom configurations before making changes
- **TEST** thoroughly in a staging environment if available

### **⚠️ Service Availability** 
- **EXPECT** brief downtime during Cloud Run deployment
- **COORDINATE** with team to avoid sync during peak usage
- **MONITOR** closely for 24-48 hours after migration

### **⚠️ Rollback Plan**
If issues occur, you can quickly rollback by:
1. Reverting environment variables to old values
2. Redeploying previous Cloud Run revision
3. Notifying development team of issues

---

## 📞 **Support & Troubleshooting**

### **Common Issues**

#### **1. Authentication Errors**
```
Error: Invalid JWT or insufficient permissions
```
**Solution**: Verify service role key is correct and from new project

#### **2. Table Not Found Errors**  
```
Error: relation "customers" does not exist
```
**Solution**: Add `backoffice.` schema prefix to table names

#### **3. Column Not Found Errors**
```  
Error: column "name" does not exist
```
**Solution**: Update column references `name` → `customer_name`

### **Emergency Contacts**
- **Development Team**: [Contact information]
- **Google Cloud Support**: [If enterprise support available]
- **Supabase Support**: [If applicable]

---

## 📝 **Documentation Updates Needed**

After successful migration, update:
- [ ] CRM architecture documentation
- [ ] Environment variable documentation  
- [ ] Monitoring and troubleshooting guides
- [ ] Backup and recovery procedures

---

**Last Updated**: January 2025  
**Migration Priority**: 🔴 **CRITICAL - IMMEDIATE ACTION REQUIRED**  
**Estimated Time**: 30-60 minutes  
**Risk Level**: Medium (with proper testing and backup) 