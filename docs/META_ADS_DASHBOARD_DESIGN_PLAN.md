# Meta Ads Dashboard Design Plan
## Comprehensive Analysis & Planning for Mixed Attribution Model

*Planning Document - December 2025*

---

## 🎯 Dashboard Design Philosophy

**"Hybrid Attribution Intelligence"** - Balance Meta's conversion tracking with LENGOLF's actual booking attribution, recognizing the strengths and limitations of each data source.

### Key Design Principles

1. **Start High-Level, Drill Down** - Overview → Campaign → Creative performance
2. **Dual Attribution Model** - Combine Meta conversions + manual referral attribution
3. **New vs Existing Customer Context** - Acknowledge offline attribution only tracks new customers
4. **Business Impact Focus** - Every metric connects to actual business outcomes

---

## 📊 Attribution Model Analysis

### **Current Tracking Capabilities**

#### **Meta Pixel Conversions (Online)**
- **Strength**: Precise attribution, detailed funnel tracking
- **Coverage**: Online bookings only
- **Attribution Window**: 1-day view, 7-day click (configurable)
- **Data Available**: Full campaign → ad set → ad level breakdowns

#### **Manual Referral Attribution (Offline)**  
- **Strength**: Captures offline booking intent
- **Limitation**: New customers only (existing customers may not specify referral source)
- **Attribution Method**: Customer selects "Facebook" or "Instagram" during booking
- **Data Available**: Platform level only (Facebook vs Instagram)

#### **The Attribution Gap**
- **Existing Customers**: May book offline without referral attribution
- **Campaign Mapping**: Offline bookings can't be traced to specific campaigns
- **Time Delay**: Offline booking decisions may have longer attribution windows

### **Proposed Hybrid Approach**

**Level 1: Account Overview**
- Use both Meta conversions + referral attribution for complete picture
- Show online vs offline booking contribution
- Calculate blended cost per booking

**Level 2: Campaign Performance**
- Meta conversion data for online performance
- Time-based correlation analysis for offline impact
- Campaign activity periods vs booking spikes

**Level 3: Creative Performance**
- Meta pixel data for online engagement
- Creative messaging analysis during high-booking periods
- Platform-specific creative effectiveness (FB vs IG)

---

## 🏗️ Dashboard Architecture Design

### **Tab 1: Performance Overview (Default)**
**Purpose**: High-level Meta performance with complete attribution picture

#### **Primary Metrics Section**
- **Total Bookings**: Meta conversions + manual referral attribution
- **Blended Cost per Booking**: Total spend / total attributed bookings
- **Attribution Split**: Online (pixel) vs Offline (referral) booking breakdown
- **Platform Performance**: Facebook vs Instagram effectiveness

#### **Trend Analysis Section**
- **Monthly Performance Trend**: Spend vs total bookings over time
- **Attribution Health**: Online/offline booking ratio stability
- **Efficiency Trends**: Cost per booking improvement over time
- **Seasonal Patterns**: Day-of-week and time-of-day booking patterns

#### **Key Performance Indicators**
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Total Bookings  │ Blended CPB     │ Attribution     │ Platform Winner │
│ 47 this month   │ ฿89 average     │ 60% online      │ Instagram +23%  │
│ ↗️ +31% vs prev  │ ↗️ +15% vs prev │ 40% offline     │ vs Facebook     │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

#### **Visualization Components**
- **Attribution Timeline**: Dual-line chart showing online vs offline bookings
- **Platform Comparison Matrix**: Facebook vs Instagram performance grid
- **Spend Efficiency Funnel**: Spend → Impressions → Clicks → Bookings
- **Attribution Health Score**: Gauge showing online/offline balance

---

### **Tab 2: Campaign Intelligence**
**Purpose**: Campaign-level performance using appropriate metrics for each attribution type

#### **Campaign Performance Table**
**Columns Design:**
- **Campaign Name** (parsed from Meta naming convention)
- **Online Conversions** (Meta pixel data) 
- **Estimated Offline Impact** (time-based correlation)
- **Blended Performance Score** (combined online + estimated offline)
- **Platform Distribution** (FB vs IG spend allocation)
- **Cost Efficiency** (cost per online conversion vs estimated total impact)

#### **Performance Scoring Methodology**
```
Campaign Score = (Online Conversions × 1.0) + (Estimated Offline Impact × 0.7)

Where Estimated Offline Impact = 
  Offline bookings during campaign active periods × 
  (Campaign spend / Total spend during period)
```

#### **Campaign Activity Timeline**
- **Campaign Periods**: Visual bars showing when campaigns were active
- **Booking Events**: Markers showing when offline bookings occurred
- **Correlation Indicators**: Visual strength indicators for time-based correlation
- **Spend Distribution**: Campaign budget allocation visualization

#### **Optimization Recommendations Engine**
- **High Online, Low Offline**: "Scale campaign - strong online performance"
- **Low Online, High Offline**: "Investigate offline attribution gap"
- **High Both**: "Top performer - increase budget allocation"
- **Low Both**: "Review targeting and creative strategy"

---

### **Tab 3: Creative Performance Analysis**
**Purpose**: Ad and creative-level insights using multi-attribution approach

#### **Creative Performance Framework**

**For Online Performance (Meta Pixel Data):**
- **Conversion Rate by Creative Type**: Image vs Video vs Carousel
- **Platform-Specific Performance**: Same creative on FB vs IG
- **Funnel Metrics**: CTR → Landing Page Views → Conversions
- **Creative Fatigue Indicators**: Performance decline over time

**For Offline Impact Estimation:**
- **Creative Active Periods**: When specific creatives were running
- **Booking Correlation Timeline**: Offline bookings during creative periods
- **Message Testing**: Copy themes during high-booking periods
- **Visual Performance**: Image/video styles during conversion spikes

#### **Creative Gallery with Performance Overlay**
```
┌─────────────────────────────────────────────────────────────┐
│ [Creative Thumbnail] │ Online: 12 conversions             │
│ Video: Golf Lesson   │ Offline Est: 8 bookings           │
│ Hook: "Perfect Swing"│ Platform: IG 73% vs FB 27%        │
│ Running: Dec 1-15    │ ROI Score: ★★★★☆ (8.2/10)        │
└─────────────────────────────────────────────────────────────┘
```

#### **Creative Insights Dashboard**
- **Top Performers**: Best creatives by blended attribution
- **Platform Winners**: Creatives that perform better on FB vs IG
- **Message Analysis**: Which hooks/offers drive both online and offline bookings
- **Visual Trends**: Image styles, video lengths, carousel effectiveness

#### **Creative Testing Framework**
- **A/B Testing Results**: Meta pixel results + offline correlation analysis
- **Creative Rotation Strategy**: Based on online performance + offline patterns
- **Seasonal Creative Performance**: Which creatives work during different periods
- **Cross-Platform Creative Adaptation**: How same creative performs FB vs IG

---

### **Tab 4: Attribution Intelligence & Optimization**
**Purpose**: Deep dive into attribution accuracy and optimization opportunities

#### **Attribution Analysis Dashboard**

**Attribution Accuracy Metrics:**
- **Pixel Coverage**: % of bookings captured by Meta pixel
- **Referral Attribution Rate**: % of offline bookings with proper attribution
- **Attribution Gaps**: Estimated untracked conversions
- **Time-Based Correlation Strength**: Statistical correlation between spend and offline bookings

#### **Customer Journey Analysis**
- **New vs Existing Customer Patterns**: Booking attribution differences
- **Multi-Touch Attribution**: Customers who engage online then book offline
- **Attribution Windows**: Time delay between ad exposure and offline booking
- **Platform Journey Differences**: FB vs IG customer behavior patterns

#### **Optimization Action Engine**

**Immediate Actions:**
- Budget reallocation recommendations based on blended attribution
- Campaign pause/scale decisions using both online and offline data
- Creative refresh suggestions based on performance decline indicators
- Platform shift recommendations (FB vs IG optimization)

**Strategic Recommendations:**
- Meta Pixel enhancement opportunities for better online tracking
- Referral source tracking improvements for offline attribution
- Campaign structure optimization for attribution clarity
- Landing page optimization for online conversion improvement

#### **Performance Forecasting**
- **Booking Prediction Model**: Based on historical online + offline patterns
- **Budget Optimization Calculator**: Optimal spend allocation across campaigns
- **Seasonal Adjustment Factors**: Historical performance patterns
- **ROI Forecasting**: Expected return based on planned spend levels

---

## 📈 Metric Prioritization Framework

### **Primary Metrics (Dashboard Headlines)**
1. **Total Attributed Bookings** (Online + Offline)
2. **Blended Cost per Booking** (Total spend / Total bookings)
3. **Attribution Health Score** (Online vs offline balance)
4. **Platform Effectiveness** (Facebook vs Instagram performance)

### **Secondary Metrics (Drill-Down Analysis)**
1. **Online Conversion Metrics** (Meta pixel data)
2. **Offline Correlation Strength** (Statistical correlation analysis)
3. **Campaign Activity Correlation** (Time-based campaign impact)
4. **Creative Performance by Platform** (FB vs IG creative effectiveness)

### **Supporting Metrics (Context & Optimization)**
1. **Impression and Click Metrics** (Reach and engagement context)
2. **Cost Metrics** (CPC, CPM for efficiency context)
3. **Time-Based Patterns** (Day/hour performance for optimization)
4. **Creative Fatigue Indicators** (Performance decline signals)

---

## 🔍 Data Source Integration Plan

### **Primary Data Sources**

#### **Meta Marketing API**
- **Campaign Performance**: Spend, impressions, clicks, online conversions
- **Ad Set Performance**: Audience targeting effectiveness
- **Ad Creative Performance**: Individual ad and creative metrics
- **Platform Breakdown**: Facebook vs Instagram performance splits

#### **LENGOLF Booking Database**
- **Referral Attribution**: Manual "Facebook"/"Instagram" selections
- **Booking Timeline**: Date/time of booking events
- **Customer Classification**: New vs existing customer identification
- **Booking Value**: Revenue attribution for ROI calculations

#### **Correlation Analysis Engine**
- **Time-Based Correlation**: Statistical correlation between spend and offline bookings
- **Campaign Activity Mapping**: Active campaigns during booking periods
- **Attribution Window Analysis**: Time delays between ads and bookings
- **Seasonal Pattern Recognition**: Historical performance patterns

### **Data Processing Pipeline**

```
┌─── Meta API Data ───┐    ┌─── Booking Database ───┐
│ • Campaign metrics  │    │ • Referral sources     │
│ • Online conversions│    │ • Booking timeline     │
│ • Platform breakdown│    │ • Customer types       │
└─────────┬───────────┘    └─────────┬──────────────┘
          │                          │
          ▼                          ▼
┌─────────────────────────────────────────────────────┐
│         Attribution Intelligence Engine             │
│ • Blended performance calculation                   │
│ • Time-based correlation analysis                   │
│ • Campaign impact estimation                        │
│ • Platform effectiveness analysis                   │
└─────────┬───────────────────────────────────────────┘
          ▼
┌─────────────────────────────────────────────────────┐
│              Dashboard Presentation Layer           │
│ • Overview metrics & trends                         │
│ • Campaign performance analysis                     │
│ • Creative performance insights                     │
│ • Optimization recommendations                      │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 User Experience Design Strategy

### **Dashboard Navigation Flow**
1. **Land on Overview** - Immediate high-level performance picture
2. **Drill into Campaigns** - Identify top and bottom performers  
3. **Analyze Creatives** - Understand what messaging/visuals work
4. **Review Optimization** - Get actionable recommendations

### **Visual Design Principles**
- **Color Coding**: Green (strong performance), Yellow (needs attention), Red (underperforming)
- **Metric Hierarchy**: Large numbers for primary metrics, smaller for supporting context
- **Trend Indicators**: Clear up/down arrows with percentage changes
- **Platform Distinction**: Facebook blue vs Instagram gradient for easy identification

### **Mobile-First Considerations**
- **Responsive Tables**: Horizontal scroll for detailed campaign data
- **Touch-Friendly**: Large tap targets for filters and drill-downs
- **Simplified Mobile View**: Focus on primary metrics only
- **Quick Actions**: Easy access to pause/scale campaigns

---

## 🚀 Implementation Phases

### **Phase 1: Foundation (Week 1-2)**
- Build attribution intelligence engine
- Create overview dashboard with blended metrics
- Implement time-based correlation analysis
- Set up platform performance comparison

### **Phase 2: Campaign Intelligence (Week 3)**
- Develop campaign performance scoring methodology
- Build campaign activity timeline correlation
- Create optimization recommendations engine
- Implement budget allocation suggestions

### **Phase 3: Creative Intelligence (Week 4)**
- Build creative performance analysis framework
- Implement creative gallery with performance overlay
- Create platform-specific creative insights
- Develop creative testing and rotation strategies

### **Phase 4: Advanced Analytics (Week 5-6)**
- Implement predictive booking modeling
- Create customer journey analysis
- Build automated optimization alerts
- Develop performance forecasting capabilities

---

## 📊 Success Metrics for Dashboard

### **Business Impact Metrics**
1. **Attribution Accuracy**: Correlation improvement between dashboard insights and actual business outcomes
2. **Decision Speed**: Time from dashboard insight to marketing action
3. **ROI Improvement**: Booking cost reduction through dashboard-driven optimizations
4. **Budget Efficiency**: Better allocation between campaigns and platforms

### **Usage Analytics**
1. **Daily Active Users**: Team members using dashboard regularly
2. **Action Implementation Rate**: % of dashboard recommendations implemented
3. **Drill-Down Engagement**: How deep users explore campaign and creative data
4. **Mobile Usage**: Dashboard accessibility across devices

---

## 💡 Key Innovations in This Design

### **1. Hybrid Attribution Model**
- First dashboard to properly balance Meta's online conversion tracking with offline referral attribution
- Acknowledges and works with the limitation that offline attribution only covers new customers
- Creates "blended performance" metrics that give complete business impact picture

### **2. Platform Intelligence**
- Deep Facebook vs Instagram performance analysis using both online and offline data
- Platform-specific creative performance insights
- Budget allocation recommendations based on platform effectiveness

### **3. Time-Based Correlation Analysis**
- Statistical correlation between campaign activity and offline booking patterns
- Estimated offline impact scoring for campaigns that drive offline bookings
- Campaign timing optimization based on historical booking patterns

### **4. Business-Focused Metrics**
- Every metric connects back to actual booking generation and business revenue
- Cost per booking calculations using complete attribution picture
- ROI forecasting based on both online conversions and offline booking patterns

---

**This dashboard design transforms Meta Ads reporting from purely online metrics to complete business impact measurement, specifically designed for LENGOLF's mixed online/offline booking model and attribution limitations.**

---

## 📋 Next Steps for Review

1. **Metric Validation**: Review if the proposed blended metrics accurately represent business performance
2. **Attribution Logic**: Validate the time-based correlation methodology for offline impact estimation  
3. **User Workflow**: Confirm the dashboard navigation matches daily optimization workflow
4. **Technical Feasibility**: Ensure all proposed data correlations are technically achievable
5. **Success Criteria**: Define specific benchmarks for measuring dashboard effectiveness

*Ready for user feedback and refinement before implementation begins.*