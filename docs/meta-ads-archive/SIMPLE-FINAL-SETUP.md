# LENGOLF Meta Ads - Simple Final Setup

**Date:** 2025-10-16
**Using:** Only real Meta Ads objectives (Traffic, Engagement, Sales)

---

## Campaign Structure (4 Campaigns, 1 Objective Each)

### CAMPAIGN 1: Traffic - Direct Bookings (LPV)
**Budget:** ฿8,000/month (standard) | ฿6,000/month (year-end)

```
Objective: Traffic
Optimization: Landing Page Views
Destination: booking.len.golf
Platform: 70% Instagram, 30% Facebook
```

**Adsets:**
- 1.1 Lookalike - Past Bookers (฿3,000)
- 1.2 Broad - Golf Interests (฿3,500)
- 1.3 Retargeting - Website Visitors 7d (฿1,500)

**Expected:**
- 1,200-1,500 LPVs
- 120-150 bookings (via call/LINE/direct after viewing page)
- Cost per booking: ฿53-67

---

### CAMPAIGN 2: Engagement - Brand Awareness
**Budget:** ฿1,500/month (standard) | ฿1,000/month (year-end)

```
Objective: Engagement
Optimization: Post Engagement (Likes, Comments, Shares)
Destination: Facebook/Instagram posts (not booking page)
Platform: 60% Facebook, 40% Instagram
```

**Adsets:**
- 2.1 Broad Reach - Bangkok (฿1,500)

**Expected:**
- ~95,000 impressions at ฿16 CPM
- Feeds lookalike audiences
- Seeds retargeting pool
- NOT for direct bookings

---

### CAMPAIGN 3: Traffic - Messenger Conversations (B2C)
**Budget:** ฿3,500/month (standard) | ฿3,000/month (year-end)

```
Objective: Traffic
Optimization: Link Clicks
Destination: m.me/yourpagename (Facebook Messenger link)
Platform: 80% Instagram, 20% Facebook
```

**Adsets:**
- 3.1 First-Timers & Questions (฿3,500)

**How it works:**
- User clicks ad
- Opens Messenger app automatically
- Conversation starts
- Your staff responds from Facebook Page inbox

**Expected:**
- 175-185 link clicks
- 140-148 actual conversations (80% conversion)
- 42-59 bookings (30-40% of conversations)
- Cost per booking: ฿59-83

---

### CAMPAIGN 4: Traffic - B2B Corporate Events
**Budget:** ฿7,000/month (standard) | ฿15,000/month (year-end Oct-Dec)

```
Objective: Traffic
Optimization: Mix of Landing Page Views + Link Clicks
Destination: Mix of booking.len.golf + LINE link
Platform: 60% Facebook, 40% Instagram
```

**Adsets (Standard ฿7K budget):**
- 4.1 Traffic (LPV) - Corporate Landing Page (฿4,000)
  - Destination: booking.len.golf
  - Optimization: Landing Page Views

- 4.2 Traffic (Clicks) - LINE Conversations (฿2,000)
  - Destination: https://line.me/R/ti/p/@lengolf
  - Optimization: Link Clicks

- 4.3 Traffic (LPV) - Corporate Retargeting (฿1,000)
  - Destination: booking.len.golf
  - Optimization: Landing Page Views

**Expected (Standard ฿7K):**
- 28-42 corporate event bookings
- Revenue: ฿560K-1,260K
- ROI: 80x-180x

**Expected (Year-End ฿15K):**
- 70-100 corporate event bookings
- Revenue: ฿1.4M-3M
- ROI: 93x-200x

**Note:** All 3 adsets use same Traffic objective, just different optimization settings and destinations within the adsets.

---

## Budget Summary

### Standard (Jan-Sep): ฿20,000/month

| Campaign | Objective | Budget | % |
|----------|-----------|--------|---|
| 1. Traffic (LPV) | Traffic | ฿8,000 | 40% |
| 2. Engagement | Engagement | ฿1,500 | 8% |
| 3. Traffic (Messenger) | Traffic | ฿3,500 | 17% |
| 4. Traffic (B2B) | Traffic | ฿7,000 | 35% |
| **TOTAL** | - | **฿20,000** | **100%** |

### Year-End (Oct-Dec): ฿25,000/month

| Campaign | Objective | Budget | % |
|----------|-----------|--------|---|
| 1. Traffic (LPV) | Traffic | ฿6,000 | 24% |
| 2. Engagement | Engagement | ฿1,000 | 4% |
| 3. Traffic (Messenger) | Traffic | ฿3,000 | 12% |
| 4. Traffic (B2B) | **Traffic** | **฿15,000** | **60%** |
| **TOTAL** | - | **฿25,000** | **100%** |

---

## Objective Breakdown

**3 out of 4 campaigns use Traffic objective** (but different optimizations):
- Campaign 1: Traffic → Landing Page Views
- Campaign 3: Traffic → Link Clicks (to Messenger)
- Campaign 4: Traffic → Mix of Landing Page Views + Link Clicks (to LINE)

**1 campaign uses Engagement objective:**
- Campaign 2: Engagement → Post Engagement

---

## How to Set Up Campaign 4 (B2B) with ONE Objective

### In Meta Ads Manager:

**Campaign Level:**
```
Campaign Name: "LENGOLF - B2B Corporate Events"
Objective: Traffic ← ONE objective only
Buying Type: Auction
```

**Ad Set 4.1:**
```
Name: "Corporate - Landing Page"
Traffic Type: Website
Optimization: Landing Page Views ← Different optimization
Destination: booking.len.golf
Budget: ฿4,000/month
Audience: HR Managers, Event Coordinators, etc.
```

**Ad Set 4.2:**
```
Name: "Corporate - LINE Conversations"
Traffic Type: Website
Optimization: Link Clicks ← Different optimization
Destination: https://line.me/R/ti/p/@lengolf
Budget: ฿2,000/month
Audience: Same as 4.1 but broader
```

**Ad Set 4.3:**
```
Name: "Corporate - Retargeting"
Traffic Type: Website
Optimization: Landing Page Views ← Different optimization
Destination: booking.len.golf
Budget: ฿1,000/month
Audience: Website visitors (last 14 days)
```

**Key Point:** ONE objective (Traffic), but THREE different optimizations within adsets!

---

## Alternative: Should Campaign 4 Use Sales Objective Instead?

### Option: B2B as Sales Objective

**Only if you can track corporate event bookings:**

```
Campaign 4: Sales - B2B Corporate Events

Objective: Sales ← Different objective
Optimization: Purchase (or Lead event)
Destination: booking.len.golf only (no LINE mixing)
Conversion Event: Meta Pixel "Purchase" or custom "Corporate_Event_Inquiry"

Requirements:
- Meta Pixel installed
- Fire "Purchase" event when corporate event is booked
- OR create custom "Corporate_Event_Inquiry" event
- Need 50+ events/week for optimization (you won't have this initially)

Adsets:
- All target booking.len.golf
- Can't mix LINE link strategy
```

**Should you use Sales for Campaign 4?**

| Factor | Traffic Objective | Sales Objective |
|--------|------------------|-----------------|
| Can mix landing page + LINE | ✅ Yes | ❌ No |
| Optimizes for clicks/traffic | ✅ Yes | ❌ No |
| Optimizes for conversions | ❌ No | ✅ Yes |
| Needs conversion tracking | ❌ No | ✅ Yes (required) |
| Needs 50+ conversions/week | ❌ No | ✅ Yes (required) |
| Good for long sales cycle | ✅ Yes | ❌ No |
| Good for multi-channel | ✅ Yes | ❌ No |

**My Recommendation for Campaign 4: Use Traffic**

**Why:**
1. B2B has long sales cycle (inquiry → quote → site visit → booking)
2. You want flexibility (landing page + LINE)
3. Don't have 50+ corporate bookings/week yet for Sales optimization
4. Easier to manage and track

**Future Option:**
- Start with Traffic objective
- After 3-6 months, if you have consistent corporate bookings
- Consider testing Sales objective
- Compare performance

---

## Complete Setup (Only Real Objectives)

### Campaign 1: Traffic (LPV to Booking)
```
✅ Objective: Traffic
✅ Optimization: Landing Page Views
✅ Destination: booking.len.golf
✅ Pixel Event: ViewContent (fires on page load)
```

### Campaign 2: Engagement (Brand Awareness)
```
✅ Objective: Engagement
✅ Optimization: Post Engagement
✅ Destination: Facebook/Instagram posts
✅ No pixel needed
```

### Campaign 3: Traffic (Messenger Conversations)
```
✅ Objective: Traffic
✅ Optimization: Link Clicks
✅ Destination: m.me/yourpagename
✅ Pixel Event: Optional Lead event on click
```

### Campaign 4: Traffic (B2B Multi-Channel)
```
✅ Objective: Traffic (ONE objective for whole campaign)
✅ Adset 4.1 Optimization: Landing Page Views → booking.len.golf
✅ Adset 4.2 Optimization: Link Clicks → LINE link
✅ Adset 4.3 Optimization: Landing Page Views → booking.len.golf
✅ Pixel Event: ViewContent (for landing page adsets)
```

---

## Expected Results

### Total Performance (Standard ฿20K/month)

| Metric | Current | New | Improvement |
|--------|---------|-----|-------------|
| Monthly Spend | ฿20,330 | ฿20,000 | -฿330 saved |
| B2C Bookings | ~17 | 162-209 | 10x-12x |
| B2B Events | 0 | 28-42 | New channel |
| Total Bookings | 17 | 190-251 | **11x-15x** |
| Cost per Booking | ฿1,070 | ฿80-105 | **90% cheaper** |

### Year-End Performance (Oct-Dec ฿25K/month)

| Metric | Expected |
|--------|----------|
| B2C Bookings | 135-173 |
| B2B Events | 70-100 |
| Total Bookings | 205-273 |
| Cost per Booking | ฿92-122 |
| B2B Revenue | ฿1.4M-3M |
| **ROI** | **56x-120x** |

---

## Technical Checklist

### 1. Meta Pixel Setup (30 min)

Add to booking.len.golf:

```javascript
// ViewContent - for Campaign 1 & 4
fbq('track', 'ViewContent', {
  content_name: 'Booking Page',
  value: 600,
  currency: 'THB'
});

// Optional: Lead event when Messenger button clicked
// For Campaign 3
fbq('track', 'Lead', {
  content_name: 'Messenger Click'
});
```

### 2. Get Messenger Link (5 min)

1. Go to facebook.com/[yourpage]
2. Click "About" → Edit Page Info
3. Create username (e.g., "lengolfbangkok")
4. Your link: **m.me/lengolfbangkok**

### 3. Set Up Messenger Auto-Response (15 min)

Facebook Page → Settings → Messaging → Instant Reply:

```
👋 Hi! Thanks for reaching out!

What would you like to know?
📅 Book a bay
💰 View packages
❓ Ask a question
📞 Call: 096-668-2335

Open 10AM-11PM daily!
```

### 4. Create Retargeting Audiences (15 min)

**For Campaign 1, Adset 1.3:**
```
Meta Ads Manager → Audiences → Custom Audience →
Website Traffic → All website visitors →
URL contains: booking.len.golf → Last 7 days
Name: "Website Visitors 7d"
```

**For Campaign 4, Adset 4.3:**
```
Same as above but:
Age: 28-55 (corporate demographic)
Last 14 days (longer window)
Name: "Corporate Website Visitors 14d"
```

### 5. LINE OA Auto-Response (Already Done)

Keep existing LINE setup, just ensure corporate auto-response:

```
🏢 Corporate Events Inquiry

Thanks for your interest!

We've hosted:
✅ Amazon Web Services
✅ Epson Thailand
✅ Bank of America

📧 events@len.golf
📞 096-668-2335

How many people for your event?
```

---

## Migration Timeline

### Week 1: Setup (Today - Day 7)
- [x] Pause 9 wasting creatives (save ฿10K/month)
- [ ] Add Meta Pixel ViewContent event (30 min)
- [ ] Get Messenger link m.me/yourpage (5 min)
- [ ] Set up Messenger auto-response (15 min)
- [ ] Create retargeting audiences (15 min)
- [ ] Brief staff on Messenger inquiries (30 min)

**Total time: ~2 hours**

### Week 2: Launch at 50% (Day 8-14)

**Launch new campaigns:**
- Campaign 1 (Traffic/LPV): ฿4,000
- Campaign 2 (Engagement): ฿1,500
- Campaign 3 (Traffic/Messenger): ฿1,750
- Campaign 4 (Traffic/B2B): ฿3,500
- **Total: ฿10,750**

**Keep old campaigns at 25% as backup**

### Week 3: Validate (Day 15-21)

**Monitor daily:**
- Landing page views
- Messenger conversations (count in Facebook inbox)
- Corporate inquiries (LINE + landing page)
- Actual bookings (ask: "How did you find us?")

**Success criteria:**
- Getting bookings at <฿100 each
- Messenger conversion >25%
- At least 2-3 corporate inquiries

### Week 4: Full Scale (Day 22-30)

**If successful:**
- Scale all to full budget (฿20,000 total)
- Pause old campaigns completely
- Continue optimizing

**If not successful:**
- Analyze what's wrong
- Fix issues
- Retest

---

## Summary: Correct Structure

✅ **4 Campaigns, Each with 1 Objective:**

1. **Campaign 1:** Traffic objective → Landing Page Views optimization
2. **Campaign 2:** Engagement objective → Post Engagement optimization
3. **Campaign 3:** Traffic objective → Link Clicks optimization (Messenger)
4. **Campaign 4:** Traffic objective → Mix of LPV + Link Clicks optimizations (multi-adset)

✅ **No "Messages" objective** (doesn't exist in Meta Ads Manager)

✅ **Use Traffic objective with m.me/link** for Messenger conversations

✅ **ONE objective per campaign** (but can have different optimizations per adset within that campaign)

---

## Ready to Implement?

**Next steps:**

1. **Get Messenger link** (5 min)
   - Go to Facebook Page → About → Create username
   - Result: m.me/[yourpage]

2. **Add Meta Pixel ViewContent** (30 min)
   - I can provide exact code for your site

3. **Create campaigns** (2 hours)
   - Campaign 1: Traffic (LPV)
   - Campaign 2: Engagement
   - Campaign 3: Traffic (Messenger)
   - Campaign 4: Traffic (B2B)

**What should we start with first?**
