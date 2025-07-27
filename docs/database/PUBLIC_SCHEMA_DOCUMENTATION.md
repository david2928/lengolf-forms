# Public Schema Documentation

## Overview
The `public` schema contains core application tables for managing bookings, customer data, inventory, competitive analytics, and system operations. This is the primary schema for user-facing functionality.

## Table Relationships Diagram

```mermaid
erDiagram
    profiles ||--o{ bookings : "creates"
    customers ||--o{ bookings : "has"
    customers ||--o{ crm_packages : "owns"
    profiles ||--o{ crm_profile_links : "links_to"
    customers ||--o{ vip_customer_data : "has_vip_profile"
    vip_tiers ||--o{ vip_customer_data : "belongs_to"
    bookings ||--o{ booking_history : "tracks_changes"
    bookings ||--o{ booking_process_logs : "logs_process"
    bookings ||--o{ scheduled_review_requests : "schedules_reviews"
    inventory_categories ||--o{ inventory_products : "contains"
    inventory_products ||--o{ inventory_submission : "tracks_submissions"
    profiles ||--o{ crm_customer_mapping : "maps_to"
```

## Tables

### 1. **bookings**
Core table for all booking records.

**Purpose**: Stores customer bookings for golf simulator sessions

**Key Relationships**:
- `user_id` → `profiles.id` (booking creator)
- `customer_id` → `customers.id` (customer record)

**Population**: Created through booking form, admin interfaces, or API

**Usage**: 
- Displayed in booking calendar
- Used for availability checking
- Drives notifications and reminders

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Unique booking identifier |
| user_id | uuid | NO | - | Profile ID of user who created booking |
| name | text | NO | - | Customer name for booking |
| email | text | NO | - | Contact email |
| phone_number | text | NO | - | Contact phone |
| date | date | NO | - | Booking date |
| start_time | text | NO | - | Session start time |
| duration | real | NO | - | Session duration in hours |
| number_of_people | integer | NO | - | Party size |
| status | text | NO | - | Booking status (confirmed/cancelled/etc) |
| bay | text | YES | - | Assigned simulator bay |
| customer_notes | text | YES | - | Notes from customer |
| booking_type | text | YES | - | Type of booking (walk-in/package/etc) |
| package_id | uuid | YES | - | Associated package if applicable |
| stable_hash_id | text | YES | - | CRM customer hash ID |
| referral_source | text | YES | - | How customer heard about us |
| is_new_customer | boolean | YES | false | First-time customer flag |
| created_at | timestamp | NO | now() | Record creation time |
| updated_at | timestamp | NO | now() | Last update time |

---

### 2. **customers**
Unified customer master data table.

**Purpose**: Central repository for all customer information across systems

**Key Relationships**:
- Referenced by `bookings`, `crm_packages`, `vip_customer_data`
- Links to POS system via `current_pos_customer_id`

**Population**: 
- Auto-created from bookings
- Synced from POS system
- Imported from CRM

**Usage**:
- Customer lookup and search
- Analytics and reporting
- Marketing communications

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| customer_code | varchar | NO | - | Unique customer code |
| customer_name | varchar | NO | - | Full name |
| contact_number | varchar | YES | - | Primary phone |
| email | varchar | YES | - | Primary email |
| normalized_phone | varchar | YES | - | Standardized phone format |
| stable_hash_id | varchar | YES | - | Unique hash for CRM linking |
| current_pos_customer_id | bigint | YES | - | Active POS customer ID |
| legacy_pos_customer_ids | bigint[] | YES | - | Historical POS IDs |
| total_lifetime_value | numeric | YES | 0.00 | Total spending |
| total_visits | integer | YES | 0 | Visit count |
| last_visit_date | date | YES | - | Most recent visit |
| marketing_opt_in | boolean | YES | false | Marketing consent |
| search_vector | tsvector | YES | - | Full-text search index |
| created_at | timestamp | YES | now() | Record creation |
| updated_at | timestamp | YES | now() | Last update |

---

### 3. **profiles**
User authentication profiles from NextAuth.

**Purpose**: Stores authenticated user profiles and links to customer records

**Key Relationships**:
- `customer_id` → `customers.id`
- `vip_customer_data_id` → `vip_customer_data.id`

**Population**: Created on first login via OAuth providers

**Usage**:
- User authentication
- Profile management
- Booking ownership

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | - | Auth user ID |
| email | text | YES | - | Login email |
| display_name | text | YES | - | Display name |
| phone_number | text | YES | - | Contact phone |
| provider | text | YES | - | OAuth provider (google/line) |
| provider_id | text | YES | - | Provider user ID |
| picture_url | text | YES | - | Profile picture URL |
| marketing_preference | boolean | NO | true | Email preferences |
| customer_id | uuid | YES | - | Linked customer record |
| vip_customer_data_id | uuid | YES | - | VIP profile link |

---

### 4. **bay_availability_cache**
Performance optimization for bay availability checks.

**Purpose**: Caches Google Calendar API results to reduce API calls

**Population**: Auto-populated on availability checks

**Usage**: First-check for booking availability before hitting external APIs

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| cache_key | text | NO | - | Unique cache identifier |
| date | text | NO | - | Date checked |
| time | text | NO | - | Time slot |
| duration | integer | NO | - | Duration in minutes |
| available | boolean | NO | - | Availability status |
| bay | text | YES | - | Specific bay if assigned |
| all_available_bays | text[] | YES | - | List of available bays |
| valid_until | bigint | NO | - | Cache expiry timestamp |
| created_at | timestamp | YES | now() | Cache creation time |

---

### 5. **booking_history**
Audit trail for all booking changes.

**Purpose**: Tracks all modifications to bookings for audit and customer service

**Key Relationships**:
- `booking_id` → `bookings.id`

**Population**: Auto-created on any booking change via triggers

**Usage**:
- Customer service investigations
- Audit reporting
- Change tracking

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| history_id | uuid | NO | gen_random_uuid() | Primary key |
| booking_id | text | NO | - | Related booking |
| changed_at | timestamp | NO | now() | Change timestamp |
| action_type | text | NO | - | Type of change |
| changed_by_type | text | YES | - | Who made change (user/system/admin) |
| changed_by_identifier | text | YES | - | ID of changer |
| changes_summary | text | YES | - | Human-readable summary |
| old_booking_snapshot | jsonb | YES | - | Previous state |
| new_booking_snapshot | jsonb | YES | - | New state |
| notes | text | YES | - | Additional notes |

---

### 6. **crm_packages**
Customer package holdings from CRM system.

**Purpose**: Stores package information synced from external CRM

**Key Relationships**:
- `customer_id` → `customers.id`

**Population**: Synced from CRM via scheduled jobs

**Usage**:
- Package balance checking
- Booking eligibility
- Usage tracking

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| stable_hash_id | varchar | NO | - | CRM customer hash |
| crm_package_id | text | YES | - | CRM package ID |
| customer_name | text | YES | - | Customer name |
| package_name | text | YES | - | Package name |
| package_category | text | YES | - | Package type |
| total_hours | numeric | YES | - | Total package hours |
| used_hours | numeric | YES | - | Hours consumed |
| remaining_hours | numeric | YES | - | Hours available |
| first_use_date | date | YES | - | First usage date |
| expiration_date | date | YES | - | Package expiry |
| purchase_date | timestamp | YES | - | Purchase date |
| pax | integer | YES | - | People allowed |

---

### 7. **inventory_categories**
Categories for inventory management.

**Purpose**: Organizes inventory items into logical groups

**Key Relationships**:
- Referenced by `inventory_products`

**Population**: Admin-managed through inventory settings

**Usage**:
- Inventory organization
- Submission forms
- Reporting grouping

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | varchar | NO | - | Category name |
| display_order | integer | NO | 0 | Sort order |
| is_active | boolean | YES | true | Active status |
| created_at | timestamp | YES | now() | Creation time |
| updated_at | timestamp | YES | now() | Last update |

---

### 8. **inventory_products**
Product definitions for inventory tracking.

**Purpose**: Defines trackable inventory items

**Key Relationships**:
- `category_id` → `inventory_categories.id`

**Population**: Admin-managed through inventory settings

**Usage**:
- Inventory submission forms
- Stock level tracking
- Reorder management

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| category_id | uuid | YES | - | Product category |
| name | varchar | NO | - | Product name |
| unit | varchar | YES | - | Unit of measure |
| input_type | varchar | NO | - | Form input type |
| input_options | jsonb | YES | - | Input configuration |
| reorder_threshold | numeric | YES | - | Low stock alert level |
| supplier | varchar | YES | - | Supplier name |
| unit_cost | numeric | YES | - | Cost per unit |
| image_url | text | YES | - | Product image |
| purchase_link | text | YES | - | Reorder URL |
| display_order | integer | NO | 0 | Sort order |
| is_active | boolean | YES | true | Active status |

---

### 9. **inventory_submission**
Daily inventory count submissions.

**Purpose**: Records staff inventory counts

**Key Relationships**:
- `product_id` → `inventory_products.id`
- `category_id` → `inventory_categories.id`

**Population**: Staff daily submissions via inventory form

**Usage**:
- Stock level tracking
- Usage analytics
- Reorder alerts

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| date | date | NO | - | Count date |
| staff | varchar | NO | - | Staff member name |
| product_id | uuid | NO | - | Product counted |
| category_id | uuid | NO | - | Product category |
| value_numeric | numeric | YES | - | Numeric count |
| value_text | text | YES | - | Text value |
| value_json | jsonb | YES | - | Complex values |
| note | text | YES | - | Submission notes |

---

### 10. **vip_customer_data**
VIP customer profile information.

**Purpose**: Stores VIP-specific customer data and preferences

**Key Relationships**:
- `customer_id` → `customers.id`
- `vip_tier_id` → `vip_tiers.id`

**Population**: Created when customers join VIP program

**Usage**:
- VIP member portal
- Tier management
- Benefit tracking

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| vip_display_name | text | YES | - | VIP profile name |
| vip_email | text | YES | - | VIP contact email |
| vip_phone_number | text | YES | - | VIP phone |
| vip_marketing_preference | boolean | YES | true | Marketing consent |
| vip_tier_id | integer | YES | - | Membership tier |
| stable_hash_id | text | YES | - | CRM link hash |
| customer_id | uuid | YES | - | Customer record |

---

### 11. **vip_tiers**
VIP membership tier definitions.

**Purpose**: Defines VIP program tiers and benefits

**Population**: Admin-managed, rarely changes

**Usage**:
- Tier assignment
- Benefit determination
- Display in VIP portal

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval() | Primary key |
| tier_name | text | NO | - | Tier name (Bogey/Eagle/Masters) |
| description | text | YES | - | Tier description |
| status | text | NO | 'active' | Active/inactive |
| sort_order | integer | YES | - | Display order |

---

### 12. **processed_leads**
Facebook/Meta lead form submissions.

**Purpose**: Stores and tracks marketing leads from social media

**Population**: Auto-imported from Facebook Lead Ads via webhook

**Usage**:
- Lead follow-up
- Marketing analytics
- Conversion tracking

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| lead_id | text | NO | - | Facebook lead ID |
| lead_type | text | NO | - | Lead form type |
| full_name | text | YES | - | Lead name |
| email | text | YES | - | Lead email |
| phone_number | text | YES | - | Lead phone |
| company_name | text | YES | - | Company (for events) |
| event_type | text | YES | - | Event type interest |
| spam_score | integer | YES | 0 | Spam detection score |
| is_likely_spam | boolean | YES | false | Spam flag |
| created_at | timestamp | YES | now() | Import time |

---

### 13. **google_ads_spend**
Google Ads campaign spending data.

**Purpose**: Tracks advertising spend for ROI analysis

**Population**: Manual import or API sync

**Usage**:
- Marketing ROI analysis
- Budget tracking
- Campaign performance

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval() | Primary key |
| date | date | YES | - | Spend date |
| campaign_id | bigint | YES | - | Google campaign ID |
| campaign_name | text | YES | - | Campaign name |
| cost_thb | numeric | YES | - | Spend in THB |

---

### 14. **unified_referral_records**
Consolidated referral source tracking.

**Purpose**: Unified view of all referral sources across systems

**Population**: ETL from multiple sources (bookings, POS, forms)

**Usage**:
- Referral analytics
- Staff performance
- Marketing attribution

**Columns**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval() | Primary key |
| date | date | NO | - | Referral date |
| referral_source | text | NO | - | Normalized source |
| data_source | text | NO | - | System of origin |
| customer_name | text | YES | - | Customer name |
| customer_phone | text | YES | - | Customer phone |
| customer_id | uuid | YES | - | Customer record |
| staff_name | text | YES | - | Referring staff |
| raw_referral_source | text | YES | - | Original value |

---

## Views and Materialized Views

### customer_analytics
Aggregated customer metrics view combining data from multiple tables.

### customer_login_providers
Shows authentication methods used by customers.

### referral_data
Daily aggregated referral counts.

## Key Stored Procedures & Functions

- `update_customer_search_vector()` - Maintains full-text search index
- `log_booking_change()` - Trigger function for booking history
- `normalize_phone_number()` - Standardizes phone formats

## Security & Access Control

- Row Level Security (RLS) enabled on sensitive tables
- Profile-based access for user data
- Admin role bypass for backoffice operations

## Performance Considerations

1. **Indexes**:
   - `customers.stable_hash_id` - Fast CRM lookups
   - `bookings.date` - Date range queries
   - `customers.search_vector` - Full-text search

2. **Caching**:
   - `bay_availability_cache` reduces external API calls
   - 5-minute TTL on availability data

3. **Partitioning**:
   - Consider partitioning `booking_history` by month for large datasets