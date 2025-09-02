import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface CustomerRFMData {
  customer_id: string;
  customer_name: string;
  recency_days: number;
  frequency: number;
  monetary_value: number;
  recency_score: number;
  frequency_score: number;
  monetary_score: number;
  rfm_score: string;
  customer_segment: string;
  value_tier: string;
  total_transactions: number;
  total_revenue: number;
  total_gross_profit: number;
  avg_transaction_value: number;
  first_purchase_date: string;
  last_purchase_date: string;
  active_months: number;
}

interface SegmentSummaryData {
  customer_segment: string;
  value_tier: string;
  customer_count: number;
  total_revenue: number;
  avg_revenue_per_customer: number;
  avg_frequency: number;
  avg_recency_days: number;
  total_transactions: number;
  revenue_percentage: number;
}

interface AtRiskCustomerData {
  customer_id: string;
  customer_name: string;
  customer_segment: string;
  value_tier: string;
  recency_days: number;
  total_revenue: number;
  last_purchase_date: string;
  avg_monthly_spend: number;
  risk_score: number;
  recommended_action: string;
  contact_priority: number;
}

interface SegmentMigrationData {
  customer_id: string;
  customer_name: string;
  previous_segment: string;
  current_segment: string;
  migration_type: string;
  revenue_change: number;
  frequency_change: number;
  recency_change: number;
}

interface CustomerSegmentationResponse {
  customerRFM: CustomerRFMData[];
  segmentSummary: SegmentSummaryData[];
  atRiskCustomers: AtRiskCustomerData[];
  segmentMigration: SegmentMigrationData[];
  summary: {
    totalCustomers: number;
    championsCount: number;
    atRiskCount: number;
    lostCount: number;
    newCustomersCount: number;
    avgCustomerValue: number;
    totalAtRiskValue: number;
    segmentDistribution: { [key: string]: number };
    reactivationOpportunity: number;
    dateRange: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const analysisType = searchParams.get('type') || 'all'; // all, rfm, summary, at-risk, migration
    const referenceDate = searchParams.get('referenceDate') || new Date().toISOString().split('T')[0];
    const analysisPeriod = parseInt(searchParams.get('analysisPeriod') || '365');
    const minValueThreshold = parseFloat(searchParams.get('minValueThreshold') || '1000');
    const limit = parseInt(searchParams.get('limit') || '5000');

    let customerRFM: CustomerRFMData[] = [];
    let segmentSummary: SegmentSummaryData[] = [];
    let atRiskCustomers: AtRiskCustomerData[] = [];
    let segmentMigration: SegmentMigrationData[] = [];

    // Get Customer RFM scores and segments
    if (analysisType === 'all' || analysisType === 'rfm') {
      const { data: rfmData, error: rfmError } = await supabase.rpc('calculate_customer_rfm_scores', {
        reference_date: referenceDate,
        analysis_period_days: analysisPeriod
      });

      if (rfmError) {
        console.error('RFM calculation error:', rfmError);
      } else {
        customerRFM = (rfmData || []).slice(0, limit);
      }
    }

    // Get Segment Summary
    if (analysisType === 'all' || analysisType === 'summary') {
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_customer_segment_summary', {
        reference_date: referenceDate,
        analysis_period_days: analysisPeriod
      });

      if (summaryError) {
        console.error('Segment summary error:', summaryError);
      } else {
        segmentSummary = summaryData || [];
      }
    }

    // Get At Risk Customers
    if (analysisType === 'all' || analysisType === 'at-risk') {
      const { data: atRiskData, error: atRiskError } = await supabase.rpc('get_at_risk_customers', {
        reference_date: referenceDate,
        min_value_threshold: minValueThreshold
      });

      if (atRiskError) {
        console.error('At risk customers error:', atRiskError);
      } else {
        atRiskCustomers = atRiskData || [];
      }
    }

    // Get Segment Migration (compare last 6 months to current)
    if (analysisType === 'all' || analysisType === 'migration') {
      const sixMonthsAgo = new Date(referenceDate);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data: migrationData, error: migrationError } = await supabase.rpc('get_customer_segment_migration', {
        start_date: sixMonthsAgo.toISOString().split('T')[0],
        end_date: referenceDate
      });

      if (migrationError) {
        console.error('Segment migration error:', migrationError);
      } else {
        segmentMigration = migrationData || [];
      }
    }

    // Calculate summary metrics
    const totalCustomers = customerRFM.length;
    const championsCount = customerRFM.filter(c => c.customer_segment === 'Champions').length;
    const atRiskCount = customerRFM.filter(c => c.customer_segment === 'At Risk').length;
    const lostCount = customerRFM.filter(c => c.customer_segment === 'Lost').length;
    const newCustomersCount = customerRFM.filter(c => c.customer_segment === 'New Customers').length;
    
    const avgCustomerValue = totalCustomers > 0 ? 
      customerRFM.reduce((sum, c) => sum + c.total_revenue, 0) / totalCustomers : 0;

    const totalAtRiskValue = atRiskCustomers.reduce((sum, c) => sum + c.total_revenue, 0);

    // Calculate segment distribution
    const segmentDistribution: { [key: string]: number } = {};
    customerRFM.forEach(customer => {
      segmentDistribution[customer.customer_segment] = 
        (segmentDistribution[customer.customer_segment] || 0) + 1;
    });

    // Calculate reactivation opportunity (lost customers with high historical value)
    const reactivationOpportunity = customerRFM
      .filter(c => c.customer_segment === 'Lost' && c.total_revenue > avgCustomerValue)
      .reduce((sum, c) => sum + c.total_revenue, 0);

    const response: CustomerSegmentationResponse = {
      customerRFM,
      segmentSummary,
      atRiskCustomers,
      segmentMigration,
      summary: {
        totalCustomers,
        championsCount,
        atRiskCount,
        lostCount,
        newCustomersCount,
        avgCustomerValue: Math.round(avgCustomerValue),
        totalAtRiskValue: Math.round(totalAtRiskValue),
        segmentDistribution,
        reactivationOpportunity: Math.round(reactivationOpportunity),
        dateRange: `Analysis as of ${referenceDate} (${analysisPeriod} days lookback)`
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Customer segmentation API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch customer segmentation data" },
      { status: 500 }
    );
  }
}

// POST endpoint for updating customer segments or creating targeted campaigns
export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, customerIds, campaignType, notes } = body;

    if (!action || !Array.isArray(customerIds)) {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
    }

    switch (action) {
      case 'create_campaign':
        // Log campaign creation (could integrate with marketing automation)
        const campaignLog = {
          created_at: new Date().toISOString(),
          created_by: session.user.email,
          campaign_type: campaignType || 'retention',
          customer_count: customerIds.length,
          customer_ids: customerIds,
          notes: notes || '',
          status: 'pending'
        };

        // For now, just return success - in production, this would integrate with email/SMS systems
        return NextResponse.json({
          success: true,
          campaignId: `campaign_${Date.now()}`,
          message: `Campaign created for ${customerIds.length} customers`,
          campaign: campaignLog
        });

      case 'mark_contacted':
        // Update customer last contacted date
        const { error: updateError } = await supabase
          .from('customers')
          .update({ 
            last_contacted: new Date().toISOString(),
            notes: notes 
          })
          .in('id', customerIds);

        if (updateError) {
          return NextResponse.json({ error: "Failed to update customer records" }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: `Updated ${customerIds.length} customer records`
        });

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

  } catch (error) {
    console.error('Customer segmentation POST error:', error);
    return NextResponse.json(
      { error: "Failed to process customer segmentation action" },
      { status: 500 }
    );
  }
}