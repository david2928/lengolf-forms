# Meta Ads Optimization Framework for Offline Business
## LENGOLF-Specific Performance Analysis & Action Plan

*Tailored for Offline Golf Facility with Booking & POS Systems*

---

## 🎯 Executive Summary

This framework is specifically designed for LENGOLF's offline business model where customers book and pay in-person. It focuses on **proxy metrics** that correlate with actual bookings and revenue, rather than traditional e-commerce conversion tracking.

**Key Principle**: Since we can't track direct conversions, we optimize for **quality signals** that predict offline bookings:
- Phone calls & WhatsApp/LINE inquiries
- Direction requests & store locator clicks
- High-intent engagement (video views >75%, carousel swipes)
- Booking form starts (even if completed offline)

---

## 📊 Offline Business KPIs & Benchmarks

### Primary KPIs (What Actually Matters)
| Metric | Definition | LENGOLF Target | Why It Matters |
|--------|------------|----------------|----------------|
| **Cost per Booking** | Ad Spend ÷ Bookings from Meta | <฿300 | True ROI metric |
| **Booking Correlation** | % of bookings with Meta touchpoint | >20% | Attribution accuracy |
| **Phone Inquiry Rate** | Calls ÷ Impressions | >0.5% | High-intent signal |
| **Direction Clicks** | Get Directions ÷ Reach | >2% | Visit intent |
| **Message Starts** | WhatsApp/Messenger ÷ Reach | >1% | Direct inquiry intent |

### Secondary KPIs (Leading Indicators)
| Metric | Good | Better | Best | Signal Strength |
|--------|------|--------|------|-----------------|
| **ThruPlay Rate** | >15% | >25% | >35% | 🟡 Medium |
| **Landing Page Views** | >1% CTR | >1.5% | >2% | 🟡 Medium |
| **Engagement Rate** | >2% | >4% | >6% | 🟢 High |
| **Save/Share Rate** | >0.5% | >1% | >2% | 🟢 High |
| **Quality Score** | 6+ | 7+ | 8+ | 🔵 Quality |

### Offline Conversion Lag Metrics
- **Same Day**: 5-10% (walk-ins from ads)
- **1-3 Days**: 30-40% (immediate interest)
- **4-7 Days**: 25-35% (consideration period)
- **8-30 Days**: 20-30% (planned bookings)
- **30+ Days**: 5-10% (corporate/events)

---

## 🔄 Weekly Performance Analysis Workflow

### Phase 1: Offline Attribution Check (10 min)
```sql
-- Weekly Query to Run
1. Total bookings last 7 days
2. Bookings with referral_source = 'Meta/Facebook/Instagram'
3. New vs returning customer ratio
4. Average booking value by source
5. Day-of-week booking patterns
```

**Actions Based on Attribution Rate:**
- **<10% Meta attribution**: Improve tracking (ask "How did you hear about us?")
- **10-20%**: Normal range, focus on optimization
- **>20%**: Strong performance, scale winning campaigns

### Phase 2: Proxy Metric Analysis (15 min)

#### Engagement Quality Matrix
```
High Video Completion (>50%) + Low Bookings = Awareness Success
High CTR + Low Direction Clicks = Interest but Wrong Audience  
High Direction Clicks + Low Bookings = Location/Pricing Issue
High Message Starts + Low Bookings = Service/Availability Issue
```

#### Campaign Health Diagnostic
| Campaign Type | Success Metrics | Red Flags | Action |
|--------------|-----------------|-----------|---------|
| **Awareness** | Reach >100K/week<br>Frequency <3 | CPM >฿100<br>Frequency >4 | Broaden audience<br>Refresh creative |
| **Traffic** | CTR >1.5%<br>LPV >1% | Bounce >70%<br>Time <30s | Fix landing page<br>Match ad message |
| **Engagement** | ThruPlay >25%<br>Engagement >3% | Complete rate <15%<br>Shares <0.5% | Shorten video<br>Stronger hook |
| **Lead Gen** | Form starts >2%<br>Cost/lead <฿200 | Completion <50%<br>Quality score <6 | Simplify form<br>Better incentive |

### Phase 3: Creative Performance for Offline (20 min)

#### Creative Scoring for Offline Business
```python
Offline_Score = (
    (ThruPlay_Rate × 0.25) +     # Attention
    (Save_Rate × 0.20) +          # Intent to visit
    (Share_Rate × 0.15) +         # Word of mouth
    (Message_Click × 0.20) +      # Direct inquiry
    (Direction_Click × 0.20)      # Visit intent
) × 100
```

**Score Interpretation:**
- **70-100**: High offline impact potential
- **40-69**: Moderate, needs optimization
- **0-39**: Low impact, consider pausing

---

## 🎨 Creative Strategy for Offline Conversion

### What Works for Golf Facilities

#### Hook Strategies (First 3 Seconds)
1. **Social Proof**: "Where 500+ Bangkok golfers improve weekly"
2. **Transformation**: "From 100 to 90 in 30 days"
3. **Exclusive Access**: "Members-only tee times now available"
4. **Local Relevance**: "Bangkok's only indoor TrackMan facility"
5. **Urgency**: "Last 3 spots for this weekend's clinic"

#### Content Types by Objective
| Objective | Best Format | Content Focus | CTA |
|-----------|------------|---------------|-----|
| **Awareness** | Video 15-30s | Facility tour, atmosphere | "See More" |
| **Consideration** | Carousel | Instructors, equipment, testimonials | "Get Directions" |
| **Booking Intent** | Collection | Packages, pricing, availability | "Send Message" |
| **Retention** | Stories | Events, member highlights | "Book Now" |

### Offline-Optimized Ad Copy Framework
```
[Hook - Local/Social Proof]
"Bangkok's favorite golf practice facility"

[Value Proposition - Specific Benefit]
"Professional instructors • Latest technology • Convenient location"

[Urgency/Offer - Time-Sensitive]
"Book this week: Free video analysis with first lesson"

[CTA - Low Commitment]
"Send us a message for available times ✉️"
```

---

## 📱 Offline Conversion Tracking Setup

### 1. Meta Offline Events Implementation
```javascript
// Upload offline conversions weekly
const offlineEvents = [
  {
    event_name: 'Purchase',
    event_time: booking.created_at,
    user_data: {
      ph: hashPhone(customer.phone),  // Hashed phone
      em: hashEmail(customer.email),   // Hashed email
      fn: customer.first_name,
      ln: customer.last_name
    },
    custom_data: {
      value: booking.total_amount,
      currency: 'THB',
      booking_type: booking.package_type,
      referral_source: booking.referral_source
    }
  }
];
```

### 2. Call Tracking Integration
- Use unique phone numbers per campaign
- Track WhatsApp Business clicks
- Monitor LINE Official Account messages
- Log all inquiries with timestamp

### 3. Store Visit Optimization
- Enable location extensions
- Set up store visit conversions
- Use radius targeting (5-15km)
- Peak hours dayparting

---

## 📈 Dashboard Design for Offline Business

### Executive Dashboard (Strategic View)
```
┌─────────────────────────────────────────┐
│  BOOKING PERFORMANCE (Last 30 Days)     │
├──────────────┬──────────────────────────┤
│ Total Books  │ Books w/ Meta Touch      │
│     847      │     186 (22%)            │
├──────────────┼──────────────────────────┤
│ Avg Value    │ Cost per Booking         │
│   ฿2,400     │     ฿287                │
└──────────────┴──────────────────────────┘

┌─────────────────────────────────────────┐
│  QUALITY SIGNALS TREND                  │
│  [Line chart showing:]                  │
│  - Phone inquiries                      │
│  - Direction clicks                     │
│  - Message starts                       │
│  - Booking correlation %                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  CAMPAIGN ROI MATRIX                    │
├──────────────┬────────┬─────────────────┤
│ Campaign     │ Spend  │ Attributed Books│
├──────────────┼────────┼─────────────────┤
│ Awareness    │ ฿15K   │ 32 (indirect)   │
│ Retargeting  │ ฿8K    │ 48 (direct)     │
│ Local Events │ ฿5K    │ 21 (direct)     │
└──────────────┴────────┴─────────────────┘
```

### Operational Dashboard (Daily Management)
```
┌─────────────────────────────────────────┐
│  TODAY'S PULSE                          │
├──────────────────────────────────────── │
│ ⚡ Real-time Signals (Last 24h)         │
│ • 12 phone clicks → 3 calls received   │
│ • 34 direction requests → 8 visits     │
│ • 19 messages sent → 5 replied         │
│ • 156 landing page views → 12 forms    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  CREATIVE PERFORMANCE                   │
├──────────────────────────────────────── │
│ [Thumbnail grid with offline scores]    │
│ Each showing:                           │
│ • Offline Score: 0-100                 │
│ • Key metric (saves, shares, messages) │
│ • Estimated offline impact              │
└─────────────────────────────────────────┘
```

---

## 🚀 Optimization Actions for Offline Business

### Immediate Wins (This Week)

#### 1. Improve Offline Attribution
- [ ] Add "How did you hear about us?" to booking form
- [ ] Set up unique promo codes per campaign
- [ ] Implement call tracking numbers
- [ ] Create campaign-specific landing pages

#### 2. Optimize for Quality Signals
- [ ] Add WhatsApp Business button to all ads
- [ ] Enable location extensions
- [ ] Create "Get Directions" focused campaigns
- [ ] Test Messenger ads with auto-replies

#### 3. Creative Adjustments
- [ ] Show real customers/testimonials
- [ ] Feature local landmarks in videos
- [ ] Add business hours prominently
- [ ] Include "Walk-ins Welcome" messaging

### Weekly Optimization Routine

**Monday: Attribution Analysis**
- Pull booking data from POS
- Match with Meta campaign periods
- Calculate true cost per booking
- Identify winning campaigns

**Wednesday: Signal Optimization**
- Review proxy metrics performance
- Adjust budgets toward high-signal campaigns
- Pause low-engagement ads
- Launch 2-3 new creative tests

**Friday: Creative Refresh**
- Identify creative fatigue (frequency >3)
- Prepare weekend-specific ads
- Update offers/availability
- Schedule next week's content

---

## 📊 Offline-Specific Testing Framework

### Test Hierarchy (Priority Order)
1. **Offer Testing** (Biggest impact on offline conversion)
   - Free trial vs discount
   - Package deals vs single sessions
   - Weekday vs weekend specials

2. **Call-to-Action Testing**
   - "Send Message" vs "Get Directions"
   - "Call Now" vs "Book Online"
   - "Visit Us" vs "Learn More"

3. **Local Relevance Testing**
   - Neighborhood mentions
   - Traffic/commute messaging
   - Local testimonials vs general

4. **Urgency Testing**
   - Limited spots messaging
   - Daily deals
   - Event countdown

### Success Measurement
```
Test Duration: 14 days minimum (account for offline lag)
Success Metric: Cost per attributed booking
Secondary: Quality signal improvements
Document: Both online signals AND offline results
```

---

## 🎯 Monthly Reporting Template

```markdown
## Meta Ads Offline Performance Report
### Month: [Month/Year]

### Executive Summary
- Total Ad Spend: ฿____
- Attributed Bookings: ____ 
- Cost per Booking: ฿____
- Booking Attribution Rate: ____%
- Month-over-Month Change: ____%

### Offline Conversion Analysis
- Total Bookings: ____
- With Meta Touchpoint: ____ (___%)
- Average Lag Time: ___ days
- New vs Returning: ___% / ___%

### Quality Signals Performance
- Phone Inquiries: ____ (฿___ per inquiry)
- Direction Requests: ____ (___% converted)
- Messages Sent: ____ (___% responded)
- Store Visits (estimated): ____

### Top Performing Elements
1. Best Campaign: [Name] - ___ bookings at ฿___ each
2. Best Creative: [Description] - Offline Score: ___
3. Best Audience: [Segment] - ___% attribution rate

### Learnings & Next Steps
- [Key learning from offline data]
- [Planned optimization based on signals]
- [Creative strategy for next month]
```

---

## 🔧 Technical Implementation

### Offline Conversions API Setup
```javascript
// Weekly offline conversion upload
async function uploadOfflineConversions() {
  const bookings = await getBookingsLastWeek();
  
  const events = bookings
    .filter(b => b.referral_source?.includes('Meta'))
    .map(booking => ({
      data: [{
        event_name: 'Purchase',
        event_time: Math.floor(booking.created_at / 1000),
        action_source: 'physical_store',
        user_data: {
          ph: sha256(booking.customer_phone),
          em: sha256(booking.customer_email),
          client_ip_address: booking.ip_address,
          fbc: booking.fb_click_id, // If available
          fbp: booking.fb_browser_id // If available
        },
        custom_data: {
          value: booking.total_amount,
          currency: 'THB',
          order_id: booking.id,
          contents: [{
            id: booking.package_id,
            quantity: 1
          }]
        }
      }]
    }));
  
  // Upload to Meta
  await uploadToMetaConversionsAPI(events);
}
```

### Booking Source Tracking
```sql
-- Add to booking form/POS
ALTER TABLE bookings ADD COLUMN attribution_data JSONB;

-- Track these fields
{
  "referral_source": "Meta",
  "campaign_name": "awareness_q1_2025",
  "first_touch": "2025-01-15",
  "last_touch": "2025-01-18",
  "touch_points": 3,
  "device": "mobile",
  "promo_code": "FB2025"
}
```

---

## ✅ Quick Decision Matrix

| Situation | Online Signal | Offline Result | Action |
|-----------|--------------|----------------|---------|
| High CTR, Low Bookings | >2% CTR | <10 books/week | Check price sensitivity, add offers |
| High Video Views, Low CTR | >50% completion | <1% CTR | Add stronger CTA, test direct response |
| High Messages, Low Bookings | >20 msgs/day | <30% convert | Improve response time, FAQ automation |
| High Direction Clicks, Low Visits | >50/day | <10 visits | Check location accuracy, parking info |
| Low Everything | All metrics low | No bookings | Rebuild campaign, new angle |

---

*Remember: For offline businesses, Meta Ads success = Quality Signals + Attribution Tracking + Local Relevance + Patience for Conversion Lag*

**Focus on building awareness and capturing high-intent signals, not forcing online conversions.**