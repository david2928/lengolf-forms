# Chat SLA Tracking System

## Overview

The Chat SLA Tracking System monitors staff response times across all customer communication channels (LINE, Website, Facebook, Instagram, WhatsApp) to ensure 10-minute SLA compliance during business hours (10am-10pm Bangkok Time). The system provides real-time analytics, staff performance metrics, and critical alerts when owner intervention is required.

## Business Requirements

### SLA Rules

**10-Minute Response Target**
- Staff must respond within 10 minutes of the customer's last message
- Timer starts from the LAST message in a sequence (messages within 3 minutes = one sequence)
- Only counted during business hours (10am-10pm Bangkok Time, UTC+7)

**Message Sequencing Logic**
```
Customer message 1: 14:00:00
Customer message 2: 14:01:30  (within 3 minutes)
Customer message 3: 14:02:45  (within 3 minutes)
→ SLA timer starts from 14:02:45 (last message)

Staff response: 14:07:00
→ Response time: 4.25 minutes ✓ SLA Met
```

**Outside Business Hours Handling**
- Messages sent outside business hours (before 10am or after 10pm) calculate SLA from when business hours begin
- Example: Message at 8:28am → SLA timer starts at 10:00am

**Owner Response Rules**
- Owner emails: `dgeiermann@gmail.com`, `dgeie@gmail.com`, `dev@lengolf.local`
- Owner responses are tracked SEPARATELY (not part of staff SLA)
- **Critical Alert**: If owner responds >10min after customer message = staff failure indicator

**Unanswered Messages**
- Messages with no staff response = "Unanswered"
- Do NOT count as SLA breaches (allows for natural conversation endings like "thanks", "ok")
- Tracked separately for visibility

### SLA Status Categories

| Status | Description | Counted in SLA? |
|--------|-------------|-----------------|
| **Met** | Staff responded within 10 minutes | ✓ Yes |
| **Breached** | Staff responded after 10 minutes | ✓ Yes |
| **Unanswered** | No response given | ✗ No (tracked separately) |

**SLA Compliance Formula:**
```
SLA Compliance % = (Met Messages) / (Met + Breached Messages) × 100
```

## System Architecture

### Database Layer

**Materialized View: `chat_sla_metrics`**
- Pre-calculated SLA metrics refreshed every 15 minutes
- Covers last 90 days of message history
- Indexes on: date, staff, status, category, channel, business hours

**Key Columns:**
```sql
- customer_message_time          -- Original message timestamp
- first_staff_response_time       -- First staff reply timestamp
- responding_staff_email          -- Staff who responded
- actual_response_seconds         -- Total elapsed time
- business_hours_response_seconds -- Business hours only
- sla_status                      -- met/breached/unanswered
- response_category               -- staff_response/owner_response/owner_forced_after_10min/historical_staff
- message_in_business_hours       -- Boolean flag
```

**Database Functions:**
1. `is_within_business_hours(timestamp)` - Check if time is 10am-10pm Bangkok
2. `calculate_business_hours_interval(start, end)` - Calculate seconds during business hours
3. `get_chat_sla_overview(start_date, end_date, channel)` - Overall SLA metrics
4. `get_chat_sla_by_staff(start_date, end_date, channel)` - Per-staff performance
5. `get_chat_sla_daily_trends(start_date, end_date, channel)` - Daily trend data
6. `get_chat_sla_conversation_details(start_date, end_date, status, channel, limit)` - Drill-down data
7. `refresh_chat_sla_metrics()` - Manual materialized view refresh

**Message Tracking Enhancement:**
- Added `staff_email` column to `line_messages`, `web_chat_messages`, `meta_messages`
- Captured automatically when staff sends messages via chat interface
- Backward compatible (NULL for historical messages)

### API Layer

**Endpoints:**
```
GET /api/chat-sla/overview
GET /api/chat-sla/staff-metrics
GET /api/chat-sla/daily-trends
GET /api/chat-sla/conversation-details
POST /api/chat-sla/refresh-metrics
```

**Common Query Parameters:**
- `start_date` (YYYY-MM-DD) - Required
- `end_date` (YYYY-MM-DD) - Required
- `channel` - Optional: line|website|facebook|instagram|whatsapp
- `sla_status` - Optional: met|breached|unanswered (conversation details only)
- `limit` - Optional: number of records (conversation details only)

### Frontend Layer

**Dashboard Page:** `/admin/chat-sla`

**Components:**
1. **KPI Cards** - Top-level metrics
   - SLA Compliance Rate (%)
   - Average Response Time
   - Total Messages Handled
   - Unanswered Messages

2. **Owner Response Metrics** - Special tracking card
   - Times owner had to respond after 10min (🚨 Critical)
   - Total owner responses
   - Owner response breakdown

3. **Staff Performance Table** - Sortable data table
   - Staff name, total responses, SLA met/breached, compliance %, avg time
   - Modern admin design with avatars and color-coded badges

4. **Conversation Details Table** - Drill-down view
   - Time, customer name, channel, staff, response time, SLA status
   - Falls back to LINE/channel display names for unknown customers
   - Descending time sort (most recent first)

**React Query Hooks:**
```typescript
useChatSLAOverview(dateRange, channel)
useChatSLAByStaff(dateRange, channel)
useChatSLADailyTrends(dateRange, channel)
useChatSLAConversationDetails(dateRange, status, channel)
```

## Key Features

### 1. Real-Time Staff Tracking

**Implementation:**
```typescript
// useChatOperations.ts
const { data: session } = useSession();
const staffEmail = session?.user?.email || 'unknown@lengolf.local';

// Automatically captured when sending messages
.insert({
  conversation_id: conversationId,
  message_text: content.trim(),
  sender_type: 'staff',
  sender_name: session?.user?.name || 'Admin',
  staff_email: staffEmail  // NEW: Staff identity tracking
})
```

### 2. Message Sequencing

**Logic:**
- Use SQL LEAD() window function to detect message gaps
- Messages within 180 seconds (3 minutes) = same sequence
- Only track LAST message in sequence for SLA calculation

```sql
CASE
  WHEN LEAD(created_at) OVER (...) IS NULL THEN true
  WHEN EXTRACT(EPOCH FROM (LEAD(created_at) - created_at)) > 180 THEN true
  ELSE false
END AS is_last_in_sequence
```

### 3. Business Hours Calculation

**Outside Hours Handling:**
```sql
-- Message at 8:28am → Calculate from 10:00am
WHEN EXTRACT(HOUR FROM message_time AT TIME ZONE 'Asia/Bangkok') < 10 THEN
  calculate_business_hours_interval(
    (DATE(message_time) || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok',
    response_time
  )

-- Message at 11:00pm → Calculate from 10:00am next day
ELSE
  calculate_business_hours_interval(
    ((DATE(message_time) + 1) || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok',
    response_time
  )
```

### 4. Owner vs Staff Separation

**Critical Metric Tracking:**
```sql
CASE
  -- CRITICAL: Owner forced to respond after 10min
  WHEN staff_email IN ('dgeiermann@gmail.com', ...)
       AND business_hours_seconds > 600
  THEN 'owner_forced_after_10min'  -- 🚨 Staff failed

  -- Owner quick response (good)
  WHEN staff_email IN ('dgeiermann@gmail.com', ...)
  THEN 'owner_response'

  -- Regular staff
  ELSE 'staff_response'
END
```

### 5. Customer Name Fallback

**Join Strategy:**
```sql
-- Try customer record first, fallback to channel user info
COALESCE(
  customers.customer_name,          -- Linked customer
  line_users.display_name,          -- LINE user name
  web_chat_sessions.display_name,   -- Website visitor name
  meta_users.display_name,          -- Meta platform name
  'Unknown Customer'                -- Final fallback
)
```

## Dashboard Usage

### Date Range Filtering

**Preset Options:**
- Today
- Yesterday
- Last 7 Days
- Last 30 Days
- This Month
- Last Month
- Custom Range

### Channel Filtering

**Supported Channels:**
- All Channels
- LINE
- Website
- Facebook
- Instagram
- WhatsApp

### Performance Thresholds

**Color Coding:**
- 🟢 Green (Excellent): ≥95% compliance
- 🟡 Yellow (Good): 85-94% compliance
- 🔴 Red (Poor): <85% compliance

## Data Examples

### Example 1: Normal SLA Met
```
Customer message: 2025-12-07 14:00:00 Bangkok
Staff response:   2025-12-07 14:08:00 Bangkok
Result: SLA MET ✓ (8 minutes < 10 minutes)
```

### Example 2: SLA Breached
```
Customer message: 2025-12-07 15:30:00 Bangkok
Staff response:   2025-12-07 15:55:00 Bangkok
Result: SLA BREACHED ✗ (25 minutes > 10 minutes)
```

### Example 3: Outside Hours → Met
```
Customer message: 2025-12-08 08:28:39 Bangkok (outside hours)
Staff response:   2025-12-08 11:09:25 Bangkok
Business hours calculation: From 10:00:00 to 11:09:25 = 69.43 minutes
Result: SLA BREACHED ✗ (69.43 minutes > 10 minutes)
```

### Example 4: Owner Forced (Critical)
```
Customer message: 2025-12-07 17:00:00 Bangkok
(No staff response after 10 minutes...)
Owner response:   2025-12-07 17:15:00 Bangkok
Result: 🚨 OWNER_FORCED_TO_RESPOND_AFTER_10MIN
Dashboard: RED ALERT - Staff failed to respond
```

### Example 5: Message Sequence
```
Customer message 1: 14:00:00
Customer message 2: 14:01:00 (1 min after first)
Customer message 3: 14:02:00 (1 min after second)
Staff response:     14:07:00

SLA timer: Starts from LAST message (14:02:00)
Response time: 5 minutes from 14:02 to 14:07
Result: SLA MET ✓ (5 minutes < 10 minutes)
```

## Migration History

### Migration 1: Staff Tracking (`20251207100000_add_staff_tracking_to_messages.sql`)
- Added `staff_email VARCHAR(255)` to all message tables
- Created indexes for SLA queries
- Backward compatible (NULL for existing messages)

### Migration 2: Business Hours Functions (`20251207100001_create_chat_sla_tracking.sql`)
- Created `is_within_business_hours()` function
- Created `calculate_business_hours_interval()` function with timezone fix
- Created initial materialized view structure

### Migration 3: Analytics Functions (`20251207100002_create_chat_sla_analytics_functions.sql`)
- Created 4 analytics functions for dashboard
- Added refresh function for materialized view
- Fixed ROUND() type casting issues

### Migration 4: Customer Fallback & Outside Hours Fix (`20251208000000_fix_sla_customer_and_outside_hours.sql`)
- Added LINE/channel user name fallback joins
- Fixed outside hours SLA calculation to start from 10am
- Updated conversation details function with proper joins

## Technical Considerations

### Performance

**Materialized View Benefits:**
- Pre-calculated metrics = fast dashboard loads (<500ms)
- Refresh every 15 minutes via cron or manual
- Indexes on commonly filtered columns

**Query Optimization:**
```sql
-- Efficient filtering with indexes
WHERE message_date >= start_date
  AND message_date <= end_date
  AND message_in_business_hours = true
  AND (channel_filter IS NULL OR channel_type = channel_filter)
```

### Timezone Handling

**Critical: Always use Bangkok timezone for business hours**
```sql
-- Convert UTC to Bangkok for hour extraction
EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Bangkok')

-- Create Bangkok timestamp then convert to UTC
(date || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok'
```

### Data Retention

- Materialized view: 90 days of history
- Raw messages: Unlimited retention
- Can extend view window if needed

## Troubleshooting

### Issue: "Unknown Customer" showing in table

**Solution:** Updated function with fallback joins:
```sql
LEFT JOIN line_users lu ON lu.line_user_id = lc.line_user_id
LEFT JOIN web_chat_sessions wc ON wc.id = details.conversation_id
LEFT JOIN meta_users mu ON mu.platform_user_id = mc.platform_user_id
```

### Issue: Messages outside hours showing "Outside Hours" status

**Solution:** Changed logic to calculate SLA from next business hour start:
```sql
-- Before 10am: start from 10am same day
-- After 10pm: start from 10am next day
```

### Issue: Median response time showing 0.00

**Root Cause:** Timezone comparison bug
**Solution:** Create Bangkok timestamps then convert to UTC:
```sql
start_of_business := (loop_date || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok';
```

## Future Enhancements

### Potential Improvements

1. **Automated Alerts**
   - Send LINE notifications when SLA is breached
   - Daily summary reports for management
   - Real-time alerts for critical owner interventions

2. **Advanced Analytics**
   - Response time distribution charts
   - Peak hours analysis
   - Customer satisfaction correlation

3. **Predictive Features**
   - Machine learning for volume forecasting
   - Staffing recommendations based on historical patterns
   - Automated staff scheduling optimization

4. **Integration**
   - Connect with time clock system for staff availability
   - Link with package system for VIP customer prioritization
   - Integration with coaching schedules

## API Usage Examples

### Get SLA Overview
```typescript
const response = await fetch(
  `/api/chat-sla/overview?start_date=2025-12-01&end_date=2025-12-08&channel=line`
);
const { data } = await response.json();
// {
//   sla_met_count: 62,
//   sla_breached_count: 30,
//   sla_compliance_rate: 67.39,
//   avg_response_minutes: 8.5,
//   owner_forced_after_10min: 3  // 🚨
// }
```

### Get Staff Performance
```typescript
const { data } = await useChatSLAByStaff(
  { start_date: '2025-12-01', end_date: '2025-12-08' },
  'line'
);
// [
//   {
//     staff_email: 'aek@lengolf.com',
//     staff_name: 'Aek',
//     total_responses: 45,
//     sla_met: 38,
//     sla_breached: 7,
//     sla_compliance_rate: 84.44,
//     avg_response_minutes: 7.2
//   }
// ]
```

### Manual Refresh
```typescript
await fetch('/api/chat-sla/refresh-metrics', { method: 'POST' });
```

## References

- **Database Schema**: See `PUBLIC_SCHEMA_DOCUMENTATION.md` for complete schema
- **Chat System**: See `UNIFIED_CHAT_SYSTEM.md` for message flow
- **API Endpoints**: See `API_REFERENCE.md` for complete API documentation
- **Frontend Components**: See `STYLING_GUIDES.md` for component patterns

## Related Documentation

- [Unified Chat System](../../public/customer-chat/UNIFIED_CHAT_SYSTEM.md)
- [Sales Dashboard](./SALES_DASHBOARD.md)
- [Staff Management System](../system-management/STAFF_MANAGEMENT_SYSTEM.md)

---

**Last Updated**: December 2025
**Version**: 1.0
**Status**: Production Ready ✓
