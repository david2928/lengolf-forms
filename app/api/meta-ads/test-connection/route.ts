import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

// Meta Business SDK configuration
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;
const META_API_VERSION = process.env.META_API_VERSION || 'v23.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const testResults = {
      timestamp: new Date().toISOString(),
      environment_check: {
        meta_access_token: !!META_ACCESS_TOKEN,
        meta_ad_account_id: !!META_AD_ACCOUNT_ID,
        meta_api_version: META_API_VERSION
      },
      api_tests: [] as any[]
    };

    if (!META_ACCESS_TOKEN) {
      return NextResponse.json({
        success: false,
        error: "META_ACCESS_TOKEN not configured",
        results: testResults
      });
    }

    if (!META_AD_ACCOUNT_ID) {
      return NextResponse.json({
        success: false,
        error: "META_AD_ACCOUNT_ID not configured", 
        results: testResults
      });
    }

    // Test 1: Verify access token validity
    try {
      const tokenResponse = await fetch(`${META_BASE_URL}/me?access_token=${META_ACCESS_TOKEN}`);
      const tokenData = await tokenResponse.json();
      
      testResults.api_tests.push({
        test: "Access Token Validation",
        success: !tokenData.error,
        data: tokenData.error ? tokenData.error : { id: tokenData.id, name: tokenData.name },
        details: tokenData.error ? tokenData.error.message : "Token is valid"
      });

      if (tokenData.error) {
        return NextResponse.json({
          success: false,
          error: "Invalid access token",
          results: testResults
        });
      }
    } catch (error) {
      testResults.api_tests.push({
        test: "Access Token Validation",
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: "Failed to connect to Meta API"
      });
    }

    // Test 2: Verify ad account access
    try {
      const accountUrl = `${META_BASE_URL}/act_${META_AD_ACCOUNT_ID}`;
      const accountParams = new URLSearchParams({
        access_token: META_ACCESS_TOKEN,
        fields: 'id,name,account_status,currency,timezone_name,business'
      });

      const accountResponse = await fetch(`${accountUrl}?${accountParams}`);
      const accountData = await accountResponse.json();

      testResults.api_tests.push({
        test: "Ad Account Access",
        success: !accountData.error,
        data: accountData.error ? accountData.error : {
          id: accountData.id,
          name: accountData.name,
          status: accountData.account_status,
          currency: accountData.currency,
          timezone: accountData.timezone_name
        },
        details: accountData.error ? accountData.error.message : "Ad account accessible"
      });

      if (accountData.error) {
        return NextResponse.json({
          success: false,
          error: "Cannot access ad account",
          results: testResults
        });
      }
    } catch (error) {
      testResults.api_tests.push({
        test: "Ad Account Access",
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: "Failed to fetch ad account information"
      });
    }

    // Test 3: Fetch sample campaigns (last 5)
    try {
      const campaignsUrl = `${META_BASE_URL}/act_${META_AD_ACCOUNT_ID}/campaigns`;
      const campaignsParams = new URLSearchParams({
        access_token: META_ACCESS_TOKEN,
        fields: 'id,name,status,objective,created_time',
        limit: '5'
      });

      const campaignsResponse = await fetch(`${campaignsUrl}?${campaignsParams}`);
      const campaignsData = await campaignsResponse.json();

      testResults.api_tests.push({
        test: "Sample Campaigns Fetch",
        success: !campaignsData.error,
        data: campaignsData.error ? campaignsData.error : {
          count: campaignsData.data?.length || 0,
          campaigns: campaignsData.data?.map((c: any) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            objective: c.objective
          })) || []
        },
        details: campaignsData.error ? campaignsData.error.message : `Found ${campaignsData.data?.length || 0} campaigns`
      });
    } catch (error) {
      testResults.api_tests.push({
        test: "Sample Campaigns Fetch", 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: "Failed to fetch campaigns"
      });
    }

    // Test 4: Fetch sample insights (last 7 days)
    try {
      const insightsUrl = `${META_BASE_URL}/act_${META_AD_ACCOUNT_ID}/insights`;
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      
      const insightsParams = new URLSearchParams({
        access_token: META_ACCESS_TOKEN,
        fields: 'impressions,clicks,spend,conversions',
        time_range: JSON.stringify({
          since: last7Days,
          until: today
        }),
        level: 'account'
      });

      const insightsResponse = await fetch(`${insightsUrl}?${insightsParams}`);
      const insightsData = await insightsResponse.json();

      testResults.api_tests.push({
        test: "Sample Insights Fetch",
        success: !insightsData.error,
        data: insightsData.error ? insightsData.error : {
          records: insightsData.data?.length || 0,
          sample: insightsData.data?.[0] || null
        },
        details: insightsData.error ? insightsData.error.message : `Found ${insightsData.data?.length || 0} insight records`
      });
    } catch (error) {
      testResults.api_tests.push({
        test: "Sample Insights Fetch",
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: "Failed to fetch insights data"
      });
    }

    // Check if all tests passed
    const allTestsPassed = testResults.api_tests.every(test => test.success);

    return NextResponse.json({
      success: allTestsPassed,
      message: allTestsPassed ? "All Meta Ads API tests passed" : "Some tests failed",
      results: testResults
    });

  } catch (error) {
    console.error('Meta Ads test connection error:', error);
    return NextResponse.json({
      success: false,
      error: "Failed to test Meta Ads API connection",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}