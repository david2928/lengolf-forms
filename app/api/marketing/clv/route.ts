import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface HistoricalCLVData {
  customer_id: string;
  customer_name: string;
  historical_clv: number;
  total_revenue: number;
  total_gross_profit: number;
  total_transactions: number;
  avg_transaction_value: number;
  customer_lifespan_days: number;
  monthly_avg_revenue: number;
  profit_margin_percent: number;
  purchase_frequency_per_month: number;
  first_purchase_date: string;
  last_purchase_date: string;
  clv_tier: string;
  customer_segment: string;
}

interface PredictiveCLVData {
  customer_id: string;
  customer_name: string;
  current_clv: number;
  predicted_clv: number;
  predicted_additional_value: number;
  retention_probability: number;
  expected_monthly_revenue: number;
  churn_risk_score: number;
  customer_segment: string;
  clv_growth_potential: string;
  recommended_investment: number;
}

interface PackageCLVData {
  product_category: string;
  customer_count: number;
  avg_package_value: number;
  avg_customer_clv: number;
  renewal_rate: number;
  cross_sell_rate: number;
  total_category_clv: number;
  clv_per_acquisition: number;
  category_ranking: number;
}

interface CLVBySourceData {
  acquisition_source: string;
  customer_count: number;
  avg_clv: number;
  total_clv: number;
  avg_cac: number;
  clv_to_cac_ratio: number;
  payback_period_months: number;
  source_roi_percent: number;
}

interface CLVAnalysisResponse {
  historicalCLV: HistoricalCLVData[];
  predictiveCLV: PredictiveCLVData[];
  packageCLV: PackageCLVData[];
  clvBySource: CLVBySourceData[];
  summary: {
    totalCustomers: number;
    avgHistoricalCLV: number;
    avgPredictedCLV: number;
    totalCLV: number;
    highValueCustomers: number;
    atRiskValue: number;
    topPerformingPackage: string;
    bestAcquisitionSource: string;
    overallCLVGrowth: number;
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
    const analysisType = searchParams.get('type') || 'all'; // all, historical, predictive, packages, sources
    const referenceDate = searchParams.get('referenceDate') || new Date().toISOString().split('T')[0];
    const predictionMonths = parseInt(searchParams.get('predictionMonths') || '12');
    const limit = parseInt(searchParams.get('limit') || '5000');
    const includeB2B = searchParams.get('includeB2B') === 'true'; // Default to B2C only (exclude B2B)

    let historicalCLV: HistoricalCLVData[] = [];
    let predictiveCLV: PredictiveCLVData[] = [];
    let packageCLV: PackageCLVData[] = [];
    let clvBySource: CLVBySourceData[] = [];

    // Get Historical CLV data
    if (analysisType === 'all' || analysisType === 'historical') {
      const functionName = includeB2B ? 'calculate_historical_clv' : 'calculate_historical_clv_b2c';
      const { data: historicalData, error: historicalError } = await supabase.rpc(functionName, {
        reference_date: referenceDate,
        analysis_period_days: 365
      });

      if (historicalError) {
        console.error('Historical CLV error:', historicalError);
      } else {
        historicalCLV = (historicalData || []).slice(0, limit);
      }
    }

    // Get Predictive CLV data
    if (analysisType === 'all' || analysisType === 'predictive') {
      const { data: predictiveData, error: predictiveError } = await supabase.rpc('calculate_predictive_clv', {
        reference_date: referenceDate,
        prediction_months: predictionMonths
      });

      if (predictiveError) {
        console.error('Predictive CLV error:', predictiveError);
      } else {
        predictiveCLV = (predictiveData || []).slice(0, limit);
      }
    }

    // Get Package CLV analysis
    if (analysisType === 'all' || analysisType === 'packages') {
      const { data: packageData, error: packageError } = await supabase.rpc('calculate_package_clv_analysis', {
        reference_date: referenceDate
      });

      if (packageError) {
        console.error('Package CLV error:', packageError);
      } else {
        packageCLV = packageData || [];
      }
    }

    // Get CLV by acquisition source
    if (analysisType === 'all' || analysisType === 'sources') {
      const { data: sourceData, error: sourceError } = await supabase.rpc('get_clv_by_acquisition_source', {
        reference_date: referenceDate
      });

      if (sourceError) {
        console.error('CLV by source error:', sourceError);
      } else {
        clvBySource = sourceData || [];
      }
    }

    // Calculate summary metrics
    const totalCustomers = historicalCLV.length;
    const avgHistoricalCLV = historicalCLV.length ? 
      historicalCLV.reduce((sum, customer) => sum + customer.historical_clv, 0) / historicalCLV.length : 0;
    const avgPredictedCLV = predictiveCLV.length ? 
      predictiveCLV.reduce((sum, customer) => sum + customer.predicted_clv, 0) / predictiveCLV.length : 0;
    const totalCLV = historicalCLV.reduce((sum, customer) => sum + customer.historical_clv, 0);
    
    const highValueCustomers = historicalCLV.filter(customer => 
      customer.clv_tier === 'Platinum' || customer.clv_tier === 'Gold'
    ).length;

    const atRiskValue = predictiveCLV
      .filter(customer => customer.churn_risk_score > 7)
      .reduce((sum, customer) => sum + customer.current_clv, 0);

    const topPerformingPackage = packageCLV.length > 0 ? packageCLV[0].product_category : 'N/A';
    
    const bestAcquisitionSource = clvBySource.length > 0 ? 
      clvBySource.reduce((best, source) => 
        source.clv_to_cac_ratio > best.clv_to_cac_ratio ? source : best
      ).acquisition_source : 'N/A';

    const overallCLVGrowth = avgPredictedCLV > 0 && avgHistoricalCLV > 0 ? 
      ((avgPredictedCLV - avgHistoricalCLV) / avgHistoricalCLV) * 100 : 0;

    const response: CLVAnalysisResponse = {
      historicalCLV,
      predictiveCLV,
      packageCLV,
      clvBySource,
      summary: {
        totalCustomers,
        avgHistoricalCLV: Math.round(avgHistoricalCLV),
        avgPredictedCLV: Math.round(avgPredictedCLV),
        totalCLV: Math.round(totalCLV),
        highValueCustomers,
        atRiskValue: Math.round(atRiskValue),
        topPerformingPackage,
        bestAcquisitionSource,
        overallCLVGrowth: Math.round(overallCLVGrowth * 100) / 100,
        dateRange: `Analysis as of ${referenceDate}`
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('CLV API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch CLV analysis data" },
      { status: 500 }
    );
  }
}