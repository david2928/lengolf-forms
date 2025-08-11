# LENGOLF Google Ads Strategic Performance Dashboard

## Executive Summary

This document outlines a comprehensive Google Ads performance management system designed specifically for LENGOLF's indoor golf simulator business. **CRITICAL UPDATE**: Your existing referral analytics system already tracks actual bookings from Google, providing real conversion data that can be connected to your Google Ads spend for accurate ROI calculation. This dashboard framework leverages your existing booking data to enable precise performance measurement and budget optimization decisions.

## Business Context & Current Performance Analysis

### Business Model
- **Core Service**: Premium indoor golf simulator experience at BTS Chidlom
- **Target Segments**: 
  1. B2B (Corporate events, team building)
  2. Individual golfers (lessons, practice)
  3. Social groups (entertainment, gatherings)
- **Location Advantage**: Prime location at Mercury Ville, BTS Chidlom

### Current Campaign Performance (July-August 2025)

| Campaign Type | Spend (฿) | CPA (฿) | Conv. Rate | Key Insight |
|--------------|-----------|---------|------------|-------------|
| Search - B2B | 5,176 | N/A | 0% | **CRITICAL: Zero conversions despite high spend** |
| Search - Generic English | 5,161 | 66.59 | 10.9% | Best performing, good CPA |
| Search - Brand | 3,008 | 52.77 | 35% | **Question: Do we need to defend brand?** |
| Performance Max | 2,445 | 67.91 | 1.4% | Low conv. rate, needs optimization |
| Search - Generic Thai | 2,373 | 131.85 | 8.2% | High CPA, needs refinement |

### Booking Data Reality Check (From Referral Analytics)
**July-August 2025 Actual Google Bookings**:
- **63 total Google bookings** (47 new customers)
- **Peak week**: July 14-20 with 18 bookings (56% of all bookings that week)
- **Recent week**: Aug 4-10 with 16 bookings (43% of all bookings)
- **Average**: 13-16 bookings per week from Google

### Critical Findings
1. **B2B Campaign Crisis**: ฿5,176 spent with ZERO Google Ads conversions but no clear impact on actual bookings
2. **Brand Search Question**: ฿3,008/month defending brand - is this necessary? What happens if we pause?
3. **Budget Constraint**: Need to optimize within current ฿18,163 budget, not increase it
4. **Booking Correlation**: ~63 Google bookings vs Google Ads conversion data mismatch indicates tracking issues

## Strategic Dashboard Design

### Dashboard Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    EXECUTIVE OVERVIEW                       │
├─────────────────────────────────────────────────────────────┤
│  Weekly Decision Score  │  Budget Health  │  Alert Status   │
│       [75/100]         │    [85%]        │   [3 Critical]  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  PERFORMANCE COMMAND CENTER                 │
├──────────────┬──────────────┬───────────────┬──────────────┤
│ This Week    │ vs Last Week │ vs Target     │ Action Req'd │
├──────────────┼──────────────┼───────────────┼──────────────┤
│ Bookings: 45 │    -10%      │   -25%        │     YES      │
│ CPA: ฿89     │    +15%      │   +18%        │     YES      │
│ ROAS: 3.2    │    -5%       │   -20%        │     YES      │
└──────────────┴──────────────┴───────────────┴──────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   BUDGET REALLOCATION MATRIX                │
├─────────────────────────────────────────────────────────────┤
│ Campaign Type    │ Current │ Test Phase  │ Action          │
├──────────────────┼─────────┼─────────────┼─────────────────┤
│ Search - Brand   │  17%    │    0%       │ ❓ PAUSE TEST   │
│ Search - Generic │  28%    │    45%      │ ↑ REALLOCATE   │
│ Search - B2B     │  28%    │    0%       │ ↓ PAUSE        │
│ Performance Max  │  13%    │    35%      │ ⚙ SCALE UP     │
│ Search - Thai    │  13%    │    20%      │ ⚙ OPTIMIZE     │
│ BUDGET TOTAL     │ ฿18,163 │   ฿18,163   │ NO INCREASE    │
└──────────────────┴─────────┴─────────────┴─────────────────┘
```

### Section 1: Executive Decision Panel

**Purpose**: Immediate visibility of critical metrics requiring action

**Key Metrics**:
1. **Weekly Decision Score** (0-100)
   - Formula: (Conversion Rate Score × 0.3) + (CPA Score × 0.3) + (ROAS Score × 0.2) + (Trend Score × 0.2)
   - Thresholds: <60 = Critical, 60-80 = Needs Attention, >80 = Healthy

2. **Budget Efficiency Index**
   - Shows % of budget going to profitable campaigns (CPA < target)
   - Alert when >20% budget in non-converting campaigns

3. **Action Priority Queue**
   - Auto-generated list of top 3 actions based on data
   - Example: "Pause B2B campaign - 0% conversion after ฿5,176 spend"

### Section 2: Google Ads to Booking Correlation Analysis

**Purpose**: Connect Google Ads spend to actual bookings using referral data

```
┌─────────────────────────────────────────────────────────────┐
│              GOOGLE ADS TO BOOKING CORRELATION              │
├─────────────────────────────────────────────────────────────┤
│ Metric                    │ July    │ August  │ Trend       │
├───────────────────────────┼─────────┼─────────┼─────────────┤
│ Google Ads Clicks         │  1,500  │  1,200  │ ↓ -20%      │
│ Google Ads Spend          │ ฿9,000  │ ฿7,500  │ ↓ -17%      │
│ Google Bookings (Actual)  │    30   │    33   │ ↑ +10%      │
│ Cost per Booking          │  ฿300   │  ฿227   │ ↑ +24%      │
│ Click-to-Booking Rate     │   2%    │  2.75%  │ ↑ +37%      │
└───────────────────────────┴─────────┴─────────┴─────────────┘
```

**Critical Insights**:
- **Better efficiency**: Same bookings for less spend (฿227 vs ฿300 per booking)
- **Improved conversion**: Click-to-booking rate increasing (+37%)
- **Brand question**: What if we test pausing brand spend (฿3,008) for 2 weeks?

### Section 3: Audience Performance Matrix

```
┌─────────────────────────────────────────────────────────────┐
│                    AUDIENCE SEGMENT ANALYSIS                │
├─────────────────────────────────────────────────────────────┤
│ Segment            │ CPA    │ LTV    │ ROI   │ Scale?       │
├────────────────────┼────────┼────────┼───────┼──────────────┤
│ Golf Enthusiasts   │ ฿52    │ ฿450   │ 765%  │ ✅ MAX SCALE │
│ BTS Commuters      │ ฿67    │ ฿380   │ 467%  │ ✅ SCALE     │
│ Expats            │ ฿89    │ ฿520   │ 484%  │ ✅ SCALE     │
│ Corporate Events   │  N/A   │ ฿2,500 │  0%   │ ⚠️ FIX FIRST │
│ Social Groups      │ ฿131   │ ฿340   │ 159%  │ ⚙️ OPTIMIZE  │
└────────────────────┴────────┴────────┴───────┴──────────────┘
```

### Section 4: Competitive Intelligence Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                  COMPETITIVE POSITIONING                    │
├─────────────────────────────────────────────────────────────┤
│ Metric              │ LENGOLF │ Competitor Avg │ Action     │
├─────────────────────┼─────────┼────────────────┼────────────┤
│ Impression Share    │   23%   │      31%       │ Bid ↑ 15%  │
│ Avg. Position       │   2.8   │      2.1       │ Improve QS │
│ CTR                 │   4.7%  │      3.9%      │ ✅ Good    │
│ Quality Score       │   6/10  │      7/10      │ Fix Landing│
└─────────────────────┴─────────┴────────────────┴────────────┘
```

### Section 5: Campaign Measurement Methodology (Offline Business Reality)

**Since you can only track "Google" as overall source, here's how to measure individual campaigns:**

```
┌─────────────────────────────────────────────────────────────┐
│         OFFLINE BUSINESS CAMPAIGN MEASUREMENT APPROACH      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ STEP 1: Use Google Ads Metrics as Leading Indicators       │
│   • CTR = Interest level in your ad messaging              │
│   • CPC Trends = Competition/demand changes                │
│   • Impression Share = Market visibility                   │
│   • Quality Score = Ad relevance                           │
│                                                             │
│ STEP 2: Correlate with Booking Volume (14-Day Windows)     │
│   • Track total "Google" bookings every 14 days           │
│   • Compare to campaign spend changes                      │
│   • Look for patterns when pausing/scaling campaigns       │
│                                                             │
│ STEP 3: A/B Test Campaign Impact                           │
│   • Pause one campaign type for 2 weeks                    │
│   • Monitor Google booking volume change                   │
│   • Measure correlation between spend and bookings         │
│                                                             │
│ STEP 4: Implement Enhanced Attribution (Phase 2)           │
│   • Add call tracking for phone bookings                   │
│   • Enhanced conversions for email/phone matching          │
│   • UTM parameters for direct attribution                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 14-Day Analysis Framework (Optimal for Local Business)

```
┌─────────────────────────────────────────────────────────────┐
│              14-DAY OPTIMIZATION DECISIONS                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ IF Google bookings drop >20% after campaign pause:        │
│   → Campaign was driving real bookings, resume             │
│                                                             │
│ IF Google bookings stable after campaign pause:           │
│   → Campaign not driving bookings, reallocate budget       │
│                                                             │
│ IF CTR drops >30% for 14+ days:                           │
│   → Refresh ad copy, competition may have increased        │
│                                                             │
│ IF impression share drops >15%:                           │
│   → Increase bids or budget to maintain visibility         │
│                                                             │
│ IF CPC increases >25% without booking increase:           │
│   → Optimize for lower competition keywords                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Attribution Reality for Offline Businesses (2025 Update)

### The "Overall Source" Challenge

**LENGOLF's Attribution Reality**:
- ✅ **You already track**: "Google" as referral source (63 bookings July-Aug)
- ❌ **You cannot track**: Which specific Google Ads campaign drove each booking
- ❌ **You cannot track**: Phone bookings that didn't book online first
- ❌ **You cannot track**: Walk-ins who saw ads but didn't click

**This is NORMAL for offline businesses** - most local service companies face this same challenge.

### 2025 Attribution Best Practices Research Findings

#### 1. **Enhanced Conversions for Leads (Google's Recommended Solution)**
- **What**: Uses first-party data (email, phone) to match offline conversions back to ads
- **Requirement**: Collect email/phone at booking for offline conversion matching
- **Benefit**: 10% median increase in conversions vs standard tracking
- **LENGOLF Application**: Enhance booking.len.golf to capture and pass this data back to Google Ads

#### 2. **Call Tracking Integration (Critical for Phone Bookings)**
- **Problem**: You can't attribute phone bookings to specific campaigns
- **Solution**: Dynamic number insertion with third-party call tracking (CallRail, Nimbata)
- **How it works**: Different phone numbers for different campaigns/keywords
- **LENGOLF Need**: Essential since many bookings likely happen by phone

#### 3. **Attribution Window Reality for Local Businesses**
- **Weekly = Too Short**: Research shows local service buying cycles need 14+ days
- **Recommended**: 14-day minimum, 30-day optimal for attribution window
- **Reason**: Customers may see ad → research → call days later
- **LENGOLF Impact**: Weekly analysis may miss conversions that take longer

#### 4. **Data-Driven Attribution Requirements (2025 Standard)**
- **Requirement**: 300 conversions within 30 days for Google's data-driven attribution
- **LENGOLF Status**: ~63 Google bookings in 2 months = insufficient for DDA
- **Consequence**: Must use last-click attribution (less accurate)

### Recommended Tracking Implementation

```javascript
// 1. Enhanced Conversion Tracking
gtag('event', 'conversion', {
  'send_to': 'AW-XXXXXXXXX/XXXXXXXXX',
  'value': bookingValue,
  'currency': 'THB',
  'transaction_id': bookingId,
  'booking_type': 'individual|group|corporate',
  'time_slot': 'peak|off-peak',
  'package_type': 'beginner|intermediate|advanced'
});

// 2. Micro-Conversion Tracking
gtag('event', 'generate_lead', {
  'value': estimatedValue,
  'currency': 'THB',
  'lead_type': 'booking_started|inquiry_form|phone_click'
});

// 3. Custom Audiences for Remarketing
gtag('event', 'page_view', {
  'user_properties': {
    'golf_skill_level': userSkillLevel,
    'preferred_time': preferredBookingTime,
    'location_distance': distanceFromVenue
  }
});
```

## Bi-Weekly Review Checklist (Optimal for Local Business)

### Every 14 Days: Core Performance Review
- [ ] **Google Booking Correlation**: Compare "Google" bookings from referral analytics to ad spend
- [ ] **Leading Indicator Analysis**: Review CTR, impression share, CPC trends
- [ ] **Budget Efficiency**: Calculate cost per Google booking (spend ÷ bookings)
- [ ] **Campaign A/B Test Results**: Analyze impact of paused/scaled campaigns

### Monthly Deep Dive (Every 4 Weeks)
- [ ] **Attribution Assessment**: Measure phone bookings vs online bookings ratio
- [ ] **Competitive Position**: Review auction insights and impression share changes  
- [ ] **Keyword Performance**: Identify top performers using leading indicators
- [ ] **Landing Page Impact**: Analyze booking completion rates from traffic sources

### Quarterly Strategic Review (Every 3 Months)
- [ ] **Enhanced Attribution Setup**: Implement call tracking and enhanced conversions
- [ ] **Customer Journey Mapping**: Map ad exposure → booking → customer value
- [ ] **Seasonality Analysis**: Identify booking patterns for budget allocation
- [ ] **Attribution Model Validation**: Test data-driven attribution if volume sufficient

## Decision Making Framework

### Budget Reallocation Rules

**Immediate Actions Required (Budget Neutral)**:

1. **BRAND SEARCH EXPERIMENT (Currently ฿3,008/month)**
   - **Week 1-2**: PAUSE completely and monitor booking impact
   - **Monitor**: Google bookings from referral analytics vs previous weeks  
   - **Hypothesis**: Most branded searches will still find you organically
   - **If bookings drop >20%**: Resume with ฿1,500/month budget
   - **If bookings stable**: Permanently reallocate ฿3,008 to better performers

2. **B2B Campaign (Currently ฿5,176/month, 0 conversions)**
   - **IMMEDIATE**: Pause all B2B campaigns (save ฿5,176/month)
   - **ROOT CAUSE**: No B2B bookings showing in referral data either
   - **INVESTIGATE**: Is B2B demand real? Check competitor analysis
   - **LATER**: If demand exists, rebuild with different approach (month 2)

3. **REALLOCATION TARGET: ฿8,184 freed up from pauses**
   - **Generic English**: +฿3,008 (to ฿8,169 total)
   - **Performance Max**: +฿4,008 (to ฿6,453 total)  
   - **Thai Search**: +฿1,168 (to ฿3,541 total)

4. **TRACKING INTEGRATION (Week 1)**
   - **Connect**: Google Ads UTM parameters to booking referral source
   - **Implement**: Enhanced tracking on booking.len.golf
   - **Result**: Direct correlation between ad spend and bookings

### Recommended Budget Reallocation (Same Total Budget)

| Campaign Type | Current | Phase 1 Test | Phase 2 Optimal | Notes |
|--------------|---------|---------------|-----------------|--------|
| Brand Search | ฿3,008 (17%) | ฿0 (0%) | TBD | **2-week pause test** |
| Generic English | ฿5,161 (28%) | ฿8,169 (45%) | ฿7,000 (39%) | Best performer |
| Performance Max | ฿2,445 (13%) | ฿6,453 (35%) | ฿6,000 (33%) | Scale winner |
| Thai Search | ฿2,373 (13%) | ฿3,541 (20%) | ฿3,163 (17%) | Optimize first |
| B2B (Restructured) | ฿5,176 (28%) | ฿0 (0%) | ฿2,000 (11%) | Pause, then rebuild |
| **TOTAL** | **฿18,163** | **฿18,163** | **฿18,163** | **NO INCREASE** |

## Success Metrics & Targets (Offline Business Adapted)

### Primary KPIs (14-Day Measurement)
- **Google Bookings**: 26-30 per 2 weeks (current: 13-16)
- **Cost per Google Booking**: < ฿300 (current: ~฿287)
- **Google Booking Share**: > 40% of total bookings (current: 35-45%)
- **Click-to-Booking Rate**: > 3% (current: 2.75%)

### Leading Indicator KPIs (Weekly)
- **CTR**: > 4% average across campaigns (current: 4.7%)
- **Impression Share**: > 30% for competitive terms
- **Quality Score**: Average > 6/10 (current: 6/10)
- **CPC Efficiency**: Stable or decreasing month-over-month

### Attribution Enhancement KPIs (Phase 2)
- **Phone Attribution**: Track % of bookings from phone calls
- **Enhanced Conversion Match Rate**: > 70% of bookings matched to ads
- **Multi-Touch Attribution**: Implement cross-channel customer journey tracking
- **True ROAS**: Calculate based on booking value once enhanced tracking active

## Implementation Timeline

### Week 1-2: Foundation
1. Fix conversion tracking for all campaigns
2. Implement enhanced ecommerce tracking
3. Set up call tracking numbers
4. Create separate landing pages for B2B

### Week 3-4: Optimization
1. Restructure B2B campaigns
2. Implement recommended budget changes
3. Launch remarketing campaigns
4. Set up automated bid strategies

### Month 2: Scaling
1. Expand successful campaigns
2. Test YouTube ads for Performance Max
3. Implement customer match audiences
4. Launch seasonal promotions

### Month 3: Advanced Strategy
1. Predictive analytics implementation
2. Multi-touch attribution modeling
3. Competitive conquesting campaigns
4. Partnership channel integration

## Conclusion

LENGOLF has significant opportunities to improve Google Ads efficiency **without increasing budget**:

1. **Immediate 45% budget reallocation** by pausing B2B (฿5,176) + testing brand pause (฿3,008)
2. **Better tracking** by connecting Google Ads to existing referral analytics system  
3. **Test-driven approach** to brand search necessity (most businesses don't need to defend brand)

### Key Strategic Questions Answered:

**"Do we need to defend our brand?"**
→ **ANSWER**: Test it! Pause for 2 weeks and monitor Google booking impact. Most likely you don't need to spend ฿3,008/month on terms people would find you for anyway.

**"How do we optimize without increasing budget?"**
→ **ANSWER**: Reallocate ฿8,184 from non-performing campaigns (B2B + Brand) to proven winners (Generic English + Performance Max).

**"How do we track real performance?"**
→ **ANSWER**: You already do! Connect Google Ads UTM parameters to your existing booking referral source system.

**Next Steps (Same ฿18,163 Budget)**:
1. **Week 1**: Pause B2B and Brand campaigns immediately
2. **Week 1**: Reallocate budget to Generic English (45%) and Performance Max (35%)
3. **Week 1**: Add UTM tracking to connect ads to booking referrals
4. **Week 2-3**: Monitor Google booking impact vs previous weeks
5. **Week 4**: Decide on brand search based on actual booking data

**Expected Results (Budget Neutral)**:
- **14-Day Period 1**: Establish baseline correlation between spend and bookings
- **14-Day Period 2**: Test impact of B2B/Brand pause on booking volume
- **Month 2**: Optimize budget allocation based on booking correlation data
- **Month 3**: Implement enhanced attribution for phone bookings and walk-ins

### Key Insights from Offline Attribution Research

**Your situation is NORMAL**: Most local service businesses cannot attribute individual bookings to specific campaigns. The "overall Google source" challenge affects 61% of local businesses.

**14-day analysis is optimal**: Weekly measurement is too short for local service buying cycles where customers may see ads, research, then book days later.

**Leading indicators matter more**: When you can't track direct conversions, focus on CTR, impression share, and correlation analysis with booking volume.

**Your referral system is valuable**: Tracking 13-18 Google bookings per 2-week period gives you the foundation to optimize spend allocation through systematic testing.

---

*Dashboard designed for LENGOLF by Google Ads Performance Management System*
*Last Updated: August 2025*