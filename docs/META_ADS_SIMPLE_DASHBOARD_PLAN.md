# Meta Ads Dashboard - Simple & Effective Plan
## Following Google Ads Pattern with Meta-Specific Metrics

*Simplified Planning Document - December 2025*

---

## 🎯 Dashboard Philosophy

**"Keep It Simple, Focus on Trends"** - Mirror the Google Ads dashboard structure but with Meta Ads data.

---

## 📊 High-Level Metrics (Dashboard Overview)

### **Primary KPI Cards (Top Row)**
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│   Total Spend   │ Meta Bookings   │  Impressions    │     Clicks      │
│   ฿12,450       │      36         │   2,145,000     │     8,500       │
│   ↗️ +15% (30d)  │   ↗️ +8% (30d)   │   ↗️ +22% (30d)  │   ↗️ +12% (30d)  │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│      CTR        │   Conversions   │  Cost/Booking   │  Cost/Convert   │
│     0.40%       │      47         │     ฿346        │     ฿265        │
│   ↘️ -5% (30d)   │   ↗️ +18% (30d)  │   ↗️ +7% (30d)   │   ↘️ -3% (30d)   │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### **Data Sources**
- **Total Spend**: Meta Marketing API campaign performance data
- **Meta Bookings**: Manual referral source "Facebook" + "Instagram" from bookings table
- **Impressions/Clicks**: Meta Marketing API campaign performance data  
- **CTR**: Clicks / Impressions * 100
- **Conversions**: Meta Marketing API conversion data (online bookings)
- **Cost/Booking**: Total Spend / Meta Bookings (referral source)
- **Cost/Convert**: Total Spend / Conversions (Meta pixel)

---

## 📈 Trend Charts (Similar to Google Ads)

### **Main Performance Chart**
- **X-axis**: Date range (default 30 days)
- **Primary Y-axis**: Spend (bar chart)
- **Secondary Y-axis**: Bookings (line chart)
- **Toggle options**: Impressions, Clicks, Conversions, CTR

### **Platform Breakdown Chart** 
- **Facebook vs Instagram** spend and booking split
- **Simple pie charts**: Spend distribution, Booking distribution
- **Side-by-side comparison** with trend arrows

---

## 🏗️ Tab Structure (Keep It Simple)

### **Tab 1: Overview (Default)**
- High-level KPI cards (shown above)
- Main trend chart (Spend vs Bookings over time)
- Platform breakdown (Facebook vs Instagram)
- Quick date range selector (7d, 30d, 90d, Custom)

### **Tab 2: Campaign Performance**
**Simple table with essential columns:**
- Campaign Name (parsed, not raw "marketyze" names)
- Spend 
- Impressions
- Clicks
- CTR
- Conversions (Meta pixel)
- Meta Bookings (time-correlated estimate)
- Cost per Booking

**Sort by**: Spend (default), Cost per Booking, Meta Bookings

### **Tab 3: Creative Performance**
**Creative gallery with basic metrics:**
- Creative thumbnail
- Creative name/type
- Spend allocated to this creative
- Impressions/Clicks/CTR
- Conversions (Meta pixel)
- Platform performance (FB vs IG)

**Filter by**: Platform, Creative type (image/video/carousel)

---

## 📊 Specific Metrics Definition

### **Meta Bookings Calculation**
```sql
-- Simple query, no complex correlation
SELECT COUNT(*) as meta_bookings
FROM bookings 
WHERE referral_source IN ('Facebook', 'Instagram')
  AND date >= start_date 
  AND date <= end_date
  AND status = 'confirmed'
```

### **Platform Split Logic**
```sql
-- Facebook bookings
WHERE referral_source = 'Facebook'

-- Instagram bookings  
WHERE referral_source = 'Instagram'
```

### **Campaign Booking Estimation**
```
-- Simple time-based estimate, no complex correlation
Campaign Booking Estimate = 
  Total Meta Bookings in Period × (Campaign Spend / Total Spend in Period)
```

---

## 🎨 UI Components (Simple Design)

### **KPI Cards**
- Large number display
- Clear trend indicator (↗️↘️ with percentage)
- Period comparison (30d default)
- Clean, consistent styling matching Google Ads dashboard

### **Charts**
- **Primary Chart**: Bar + Line combination (Spend + Bookings)
- **Platform Charts**: Simple pie charts for spend/booking distribution
- **Trend Lines**: 7-day rolling average for smoothing

### **Tables**
- **Sortable columns** with clear header indicators
- **Row highlighting** for top/bottom performers
- **Pagination** for large campaign lists
- **Export functionality** (CSV download)

---

## 🔄 Data Refresh Strategy

### **Real-time Updates**
- **Meta API data**: Refresh every 4 hours (API rate limits)
- **Booking data**: Real-time updates from database
- **Calculations**: On-demand when dashboard loads

### **Caching Strategy**
- **Meta API responses**: Cache for 2 hours
- **Aggregated metrics**: Cache for 1 hour  
- **Trend data**: Cache for 30 minutes

---

## 📱 Mobile Design

### **Mobile-First Approach**
- **KPI Cards**: Stack vertically on mobile
- **Charts**: Horizontal scroll for detailed view
- **Tables**: Simplified columns, horizontal scroll
- **Touch-friendly**: Large tap targets, easy scrolling

---

## 🚀 Implementation Order

### **Week 1: Foundation**
1. Create basic dashboard layout matching Google Ads
2. Implement 8 KPI cards with trend indicators
3. Add main performance chart (Spend vs Bookings)
4. Basic platform breakdown (Facebook vs Instagram)

### **Week 2: Campaign Level**
1. Campaign performance table
2. Campaign name parsing (fix "marketyze" display)
3. Simple booking estimation per campaign
4. Sorting and filtering

### **Week 3: Creative Level**
1. Creative performance gallery
2. Creative thumbnails and basic metrics
3. Platform-specific creative performance
4. Creative filtering by type/platform

### **Week 4: Polish**
1. Mobile responsiveness
2. Export functionality  
3. Performance optimizations
4. User testing and fixes

---

## 📊 API Endpoints Needed

### **Simple, focused endpoints:**

```
GET /api/meta-ads/overview-metrics
- Returns: 8 KPI values with trends

GET /api/meta-ads/performance-chart  
- Returns: Daily spend, bookings, impressions, clicks

GET /api/meta-ads/platform-breakdown
- Returns: Facebook vs Instagram metrics

GET /api/meta-ads/campaigns
- Returns: Campaign table data

GET /api/meta-ads/creatives
- Returns: Creative gallery data
```

---

## ✅ Success Criteria

### **User Experience**
1. **Load time**: Dashboard loads in < 3 seconds
2. **Intuitive navigation**: Similar to Google Ads dashboard
3. **Clear trends**: Easy to spot performance changes
4. **Mobile friendly**: Works well on tablets/phones

### **Business Value**
1. **Quick insights**: Immediate understanding of Meta performance
2. **Trend awareness**: Spot performance changes quickly
3. **Campaign optimization**: Identify top/bottom performers
4. **Platform strategy**: Facebook vs Instagram effectiveness

---

**Simple, effective, and focused on the metrics that matter. No complex attribution logic - just clear trends and actionable insights following the proven Google Ads dashboard pattern.**