# Lapsed Customer LINE Re-engagement Campaign

## Overview

Send personalized LINE flex messages to customers who haven't visited LENGOLF in 90+ days, offering a returning-customer-exclusive Buy 1 Get 1 hour + free soft drinks promotion. Messages are personalized with customer name and sent in their preferred language (Thai or English).

## Target Audience

- **132 customers** with LINE user IDs who last visited 90-180 days ago
- Language split: 42 Thai / 90 English (auto-detected from conversation history)
- Segments: 27 regulars (5+ visits), 31 occasional (2-4), 74 one-timers
- Value: 20 high-value (>10K THB), 26 mid (3-10K), 86 lower (<3K)
- 1 duplicate to handle (Jackie Zhang — 2 LINE conversations)

## Offer

- **Buy 1 hour, get 1 hour free** (exclusive to returning customers)
- **Free soft drinks** during the session
- **Valid for 30 days** from message send date

## Message Format

### Flex Message Design — "Warm & Personal"

Structure (LINE flex bubble):
1. **Header**: Green (#005a32) background — "ยินดีต้อนรับกลับ LENGOLF" (TH) / "WELCOME BACK TO LENGOLF" (EN)
2. **Body**:
   - Personalized greeting with customer name: "สวัสดีค่ะ คุณ{{customer_name}} 😊 คิดถึงนะคะ!" (TH) / "Hi {{customer_name}}! 😊 We've missed you!" (EN)
   - Green highlight box with B1G1 offer
   - Soft drink icon row with description
   - Urgency badge: "⏰ ใช้ได้ภายใน 30 วัน" / "⏰ Valid for 30 days"
3. **Footer**: Two action buttons + opt-out
   - Primary: "จองเลย →" / "Book Now →" → LIFF booking page (`https://liff.line.me/2007027277-ShDmuSHO`)
   - Secondary: "ดูโปรโมชั่นทั้งหมด" / "View All Promotions" → LIFF promotions page (`https://liff.line.me/2007027277-cC9YrZwM`)
   - Opt-out: Small link-style button — "ยกเลิกการแจ้งเตือน" / "Unsubscribe" (postback with `action=opt_out`)

### Personalization

- **Customer name**: From `customers.customer_name` via `{{customer_name}}` variable — substituted per-recipient by the broadcast campaign system
- **Language**: Two separate campaigns — Thai audience and English audience

## Technical Implementation

### Approach: Reuse Existing Broadcast Campaign System

The project already has a complete broadcast campaign infrastructure at `/admin/line-campaigns`. Instead of building custom sending logic, we reuse it entirely.

**Existing infrastructure used:**
- **Audience management**: `line_audiences` + `line_audience_members` tables
- **Campaign sending**: `/api/line/campaigns/[id]/send` with rate limiting, retries, per-recipient logging
- **Flex templates**: `line_flex_templates` table with `{{variable}}` substitution
- **Delivery tracking**: `line_broadcast_logs` with per-recipient status (success/failed/blocked/opted_out)
- **Opt-out handling**: Postback-based opt-out via webhook handler, PDPA compliant
- **Admin UI**: `/admin/line-campaigns` — create, send, monitor, view logs

### Implementation Steps

#### Step 1: Create Targeting Query & Populate Audiences

Run SQL to identify lapsed customers and split by language:

```sql
-- Thai-speaking lapsed customers
WITH lapsed AS (
  SELECT DISTINCT ON (c.id)
    c.id as customer_id,
    c.customer_name,
    uc.channel_user_id as line_user_id,
    c.last_visit_date,
    c.total_visits,
    c.total_lifetime_value
  FROM public.customers c
  JOIN unified_conversations uc ON uc.customer_id = c.id
  WHERE uc.channel_user_id IS NOT NULL
    AND uc.channel_type = 'line'
    AND COALESCE(uc.is_spam, false) = false
    AND c.last_visit_date BETWEEN CURRENT_DATE - INTERVAL '180 days' AND CURRENT_DATE - INTERVAL '90 days'
    AND uc.last_message_text ~ '[\u0E00-\u0E7F]'
  ORDER BY c.id, uc.last_message_at DESC
)
SELECT * FROM lapsed ORDER BY total_lifetime_value DESC;

-- English-speaking: same query but with NOT ~ '[\u0E00-\u0E7F]'
```

Create two audiences via API or direct DB insert:
1. `"Lapsed Customers — Thai (Mar 2026)"` — ~42 members
2. `"Lapsed Customers — English (Mar 2026)"` — ~90 members

Add members to each audience via `line_audience_members` with their `line_user_id` and `customer_id`.

#### Step 2: Create Flex Templates

Create two `line_flex_templates` entries:

1. **Thai template**: `"welcome-back-th"` — with `variables: ["customer_name", "campaign_id", "audience_id"]`
2. **English template**: `"welcome-back-en"` — same variables

Both use the "Warm & Personal" design with `{{customer_name}}` substitution. Include opt-out postback button using `{{campaign_id}}` and `{{audience_id}}` variables.

#### Step 3: Create & Send Campaigns

Via the existing `/admin/line-campaigns/new` UI:

1. **Campaign 1**: "Welcome Back — Thai (Mar 2026)"
   - Audience: Thai lapsed customers
   - Template: `welcome-back-th`
   - Send: Immediate or scheduled

2. **Campaign 2**: "Welcome Back — English (Mar 2026)"
   - Audience: English lapsed customers
   - Template: `welcome-back-en`
   - Send: Immediate or scheduled

#### Step 4: Monitor & Track

Use existing `/admin/line-campaigns/[id]` page to:
- Monitor delivery status (success/failed/blocked/opted_out)
- View per-recipient logs
- Check overall success rate

Track conversions manually by querying bookings made by targeted customers within 30 days.

### What Needs to Be Built

1. **Two flex message templates** (Thai + English JSON) — the "Warm & Personal" design as LINE flex JSON with `{{customer_name}}` variable
2. **Audience population script/query** — SQL to identify targets, split by language, insert into `line_audience_members`
3. **Nothing else** — all sending, tracking, opt-out, and UI is already built

### Language Detection

Two approaches, use whichever is more reliable:

1. **Last message text** (simple): Check `unified_conversations.last_message_text` for Thai characters
2. **Customer message history** (more accurate): Query `unified_messages` where `sender_type = 'user'` and check Thai character frequency across their messages

Recommendation: Use approach 1 for simplicity, then manually review the ~10 borderline cases. The language assignment does not need to be perfect — a Thai customer receiving an English message is not harmful, just suboptimal.

## Recurring Schedule

**Run monthly** (1st of each month):
- New customers lapse into the 90+ day window each month
- 30-day offer validity means no overlap between runs
- Gives time to measure results before next batch

### Excluding Previous Recipients

Add this exclusion to the targeting query to avoid re-sending within 90 days:

```sql
AND c.id NOT IN (
  SELECT lbl.customer_id
  FROM line_broadcast_logs lbl
  JOIN line_broadcast_campaigns lbc ON lbc.id = lbl.campaign_id
  WHERE lbc.name LIKE 'Welcome Back%'
    AND lbl.status = 'success'
    AND lbl.sent_at > CURRENT_DATE - INTERVAL '90 days'
)
```

Customers who received an offer 3+ months ago and still haven't returned become eligible again.

## Rollout Plan

### Step 0: Test Send to David
1. Create a test audience `"Welcome Back — Test"` with 1 member:
   - Customer: David G. (`customer_id: 07566f42-dfcd-4230-aa8e-ef8e00125739`)
   - LINE user ID: `Uf4177a1781df7fd215e6d2749fd00296`
2. Send both Thai and English campaigns to this test audience
3. Verify on phone: layout, personalization ("Hi David G.!"), buttons work, opt-out works
4. Iterate if needed

### Step 1: Production Send
1. **Prep**: Create audiences + templates (~1 hour of work)
2. **Campaign 1**: Send Thai version to ~42 customers
3. **Campaign 2**: Send English version to ~90 customers
4. **Monitor**: Check delivery logs in admin UI over next 48 hours
5. **Review at Day 7**: Check response rates, bookings from targeted customers
6. **Review at Day 30**: Final conversion analysis

Can optionally split into smaller batches by sending to a subset of each audience first (e.g., regulars only), then expanding.

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Delivery rate | >95% | Campaign logs (success / total) |
| Response rate | >15% | Customer replies within 7 days |
| Booking rate | >8% | Bookings by targeted customers within 30 days |
| Opt-out rate | <5% | Campaign opt-out count |

## Edge Cases

- **Jackie Zhang**: 2 LINE conversations — `DISTINCT ON (c.id)` picks most recent, only added to audience once
- **F_TR**: Unusual name — will display as "Hi F_TR!" in English template, acceptable
- **Customers who return before campaign sends**: Re-run targeting query on send day to get fresh data
- **Customers who block/unfriend**: LINE API returns error — logged as `blocked` in broadcast logs
- **Opt-outs**: Handled automatically by existing postback webhook handler
