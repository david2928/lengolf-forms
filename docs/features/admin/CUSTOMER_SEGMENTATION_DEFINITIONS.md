# Customer Segmentation Definitions

## Overview

This document defines the customer segmentation logic used in the Lengolf Forms marketing analytics system. The segmentation is based on RFM (Recency, Frequency, Monetary) analysis, which categorizes customers based on their behavioral patterns.

## RFM Scoring System

### Recency Score (1-5)
- **Definition**: Days since last purchase
- **Scoring**: Higher score for more recent purchases (lower days)
- **Scale**: NTILE(5) with score 5 = most recent, score 1 = least recent

### Frequency Score (1-5) 
- **Definition**: Number of unique months with purchases
- **Scoring**: Higher score for more frequent purchases
- **Scale**: NTILE(5) with score 5 = most frequent, score 1 = least frequent

### Monetary Score (1-5)
- **Definition**: Total spending amount
- **Scoring**: Higher score for higher spending
- **Scale**: NTILE(5) with score 5 = highest spenders, score 1 = lowest spenders

## Customer Segments

### 1. Champions
- **Criteria**: 
  - Frequency ≥ 6 months active
  - Recency ≤ 30 days
- **Characteristics**: High-value, loyal customers who purchase frequently and recently
- **Business Action**: Reward, VIP treatment, referral programs
- **Example**: Glenn Kluse (246 transactions, last purchase 22 days ago)

### 2. Loyal Customers
- **Criteria**: 
  - Frequency ≥ 4 months active
  - Recency ≤ 60 days
- **Characteristics**: Consistent customers with good purchase frequency
- **Business Action**: Upsell, cross-sell, loyalty programs
- **Example**: Regular golfers with monthly visits

### 3. Potential Loyalists  
- **Criteria**: 
  - Frequency ≥ 2 months active
  - Recency ≤ 90 days
- **Characteristics**: Recent customers showing promise for loyalty
- **Business Action**: Convert to loyal through targeted packages and engagement
- **Example**: Customers with 2-3 visits in recent months

### 4. New Customers
- **Criteria**: 
  - Frequency = 1 month active
  - Recency ≤ 30 days
- **Characteristics**: First-time or very new customers
- **Business Action**: Onboarding, welcome packages, build relationship
- **Example**: Recent first-time visitors

### 5. At Risk
- **Criteria**: 
  - Frequency ≥ 4 months active
  - Recency between 91-180 days
- **Characteristics**: Previously loyal customers who haven't visited recently
- **Business Action**: Retention campaigns, win-back offers, personal outreach
- **Example**: Regular customers who haven't visited in 3-6 months

### 6. Can't Lose Them
- **Criteria**: 
  - Frequency ≥ 2 months active
  - Recency > 180 days
- **Characteristics**: High-value customers at high risk of churning
- **Business Action**: Immediate intervention, special offers, direct contact
- **Example**: Previously valuable customers absent for 6+ months

### 7. Lost
- **Criteria**: 
  - Recency > 180 days
- **Characteristics**: Customers who haven't visited in over 6 months
- **Business Action**: Reactivation campaigns, win-back offers
- **Example**: Former customers with no recent activity

### 8. Others
- **Criteria**: 
  - All customers not matching above criteria
- **Characteristics**: Edge cases with unusual patterns that don't fit standard segments
- **Examples**:
  - High-value single visits (corporate events, one-time large purchases)
  - Customers with moderate frequency (2-3 months) but moderate recency (60-90 days)
  - Irregular patterns that don't fit standard behavioral models
- **Business Action**: Individual assessment, custom approach based on value and potential

## Value Tiers

### High Value
- **Criteria**: Total spending ≥ ฿10,000
- **Color**: Green badges
- **Priority**: Highest retention and service priority

### Medium Value  
- **Criteria**: Total spending ≥ ฿3,000 but < ฿10,000
- **Color**: Yellow badges
- **Priority**: Standard retention efforts

### Low Value
- **Criteria**: Total spending < ฿3,000
- **Color**: Gray badges
- **Priority**: Basic service, growth potential focus

## Business Intelligence Insights

### Priority Matrix
1. **Champions + High Value**: VIP treatment, referral rewards
2. **At Risk + High Value**: Immediate retention intervention  
3. **Can't Lose Them**: Emergency win-back campaigns
4. **New Customers + High Value**: Premium onboarding experience
5. **Others + High Value**: Individual assessment and custom approach

### Common "Others" Patterns
- **Corporate/Event Customers**: Single large transactions (Matt, Kokuyo Company)
- **Seasonal Customers**: Irregular but valuable patterns
- **Package Purchasers**: Large upfront payments with different usage patterns
- **Transitional Customers**: Moving between segment categories

## Implementation Notes

- Analysis period: 365 days lookback from reference date
- Only customers with purchases > ฿0 are included in segmentation
- B2B customers can be excluded from B2C analysis using separate functions
- Segments are recalculated based on current behavioral patterns
- RFM scores use quintile distribution (NTILE(5)) for relative ranking

## Technical Reference

- **Database Function**: `calculate_customer_rfm_scores(reference_date, analysis_period_days)`
- **API Endpoint**: `/api/marketing/segments`
- **Frontend Component**: `CustomerSegmentation.tsx`
- **Related**: Customer Lifetime Value (CLV) analysis, retention cohorts