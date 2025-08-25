/**
 * Audience Metrics API
 * Returns fast aggregate metrics for audience dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// GET /api/customer-outreach/audience/metrics - Get fast aggregate metrics
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  console.log('Session in metrics API:', { 
    hasSession: !!session, 
    hasUser: !!session?.user, 
    email: session?.user?.email,
    env: process.env.NODE_ENV 
  });
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log(`Getting audience metrics for user: ${session.user.email}`);
    
    // Get the selected audience ID from database
    const { data: selectedData, error: selectedError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('selected_audience')
      .select('audience_id')
      .eq('user_email', session.user.email)
      .single();

    if (selectedError && selectedError.code !== 'PGRST116') {
      console.error('Error fetching selected audience:', selectedError);
      throw selectedError;
    }

    const selectedAudienceId = selectedData?.audience_id || null;
    console.log(`Found selected audience ID: ${selectedAudienceId}`);
    
    if (!selectedAudienceId) {
      return NextResponse.json({
        success: false,
        message: "No audience selected",
        metrics: null
      });
    }

    // Get audience details
    const { data: audience, error: audienceError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('audiences')
      .select('*')
      .eq('id', selectedAudienceId)
      .single();

    if (audienceError) throw audienceError;
    if (!audience) {
      return NextResponse.json({ error: "Selected audience not found" }, { status: 404 });
    }

    // Get fast aggregate metrics using a single query
    const { data: metrics, error: metricsError } = await refacSupabaseAdmin
      .rpc('get_audience_metrics', {
        p_audience_id: selectedAudienceId
      });

    if (metricsError) {
      console.error('Error fetching audience metrics:', metricsError);
      throw metricsError;
    }

    const metricsData = metrics && metrics.length > 0 ? metrics[0] : {
      total_customers: 0,
      thai_customers: 0,
      total_lifetime_value: 0,
      avg_lifetime_value: 0,
      customers_with_packages: 0,
      customers_never_visited: 0
    };

    // Get count of customers already called (notes exist)
    const { data: calledCount, error: calledError } = await refacSupabaseAdmin
      .rpc('count_called_customers_in_audience', {
        p_audience_id: selectedAudienceId
      });

    const calledCustomers = calledError ? 0 : (calledCount || 0);

    return NextResponse.json({
      success: true,
      audienceId: selectedAudienceId,
      audienceName: audience.name,
      metrics: {
        totalCustomers: metricsData.total_customers,
        thaiCustomers: metricsData.thai_customers,
        uncalledCustomers: metricsData.thai_customers - calledCustomers,
        calledCustomers: calledCustomers,
        totalLifetimeValue: metricsData.total_lifetime_value,
        avgLifetimeValue: metricsData.avg_lifetime_value,
        customersWithPackages: metricsData.customers_with_packages,
        customersNeverVisited: metricsData.customers_never_visited
      },
      filters: audience.definition_json?.filters || {},
      createdAt: audience.created_at
    });

  } catch (error: any) {
    console.error('Error fetching audience metrics:', error);
    return NextResponse.json(
      { error: "Failed to fetch audience metrics", details: error.message },
      { status: 500 }
    );
  }
}