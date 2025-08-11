import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { GoogleAdsApi } from 'google-ads-api';

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('Testing campaigns query...');

    // Initialize Google Ads API client
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });

    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    });

    // Test campaigns query
    console.log('Attempting to query campaigns...');
    const campaigns = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      LIMIT 10
    `);

    console.log('Campaigns query successful:', campaigns);

    return NextResponse.json({
      success: true,
      message: 'Campaigns query successful',
      campaignCount: campaigns.length,
      campaigns: campaigns.slice(0, 5), // Show first 5 campaigns
      sampleCampaign: campaigns[0] || null
    });

  } catch (error) {
    console.error('Campaigns query failed:', error);
    
    let errorDetails = 'Unknown error';
    if (error instanceof Error) {
      errorDetails = error.message;
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: "Campaigns query failed",
        details: errorDetails,
        errorType: error?.constructor?.name || 'Unknown'
      },
      { status: 500 }
    );
  }
}