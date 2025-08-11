import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { GoogleAdsApi } from 'google-ads-api';

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('Testing Google Ads API connection...');
    console.log('Environment variables check:');
    console.log('CLIENT_ID:', process.env.GOOGLE_ADS_CLIENT_ID ? 'Set' : 'Missing');
    console.log('CLIENT_SECRET:', process.env.GOOGLE_ADS_CLIENT_SECRET ? 'Set' : 'Missing');
    console.log('DEVELOPER_TOKEN:', process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? 'Set' : 'Missing');
    console.log('CUSTOMER_ID:', process.env.GOOGLE_ADS_CUSTOMER_ID);
    console.log('REFRESH_TOKEN:', process.env.GOOGLE_ADS_REFRESH_TOKEN ? 'Set' : 'Missing');

    // Initialize Google Ads API client
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });

    console.log('Google Ads API client created successfully');

    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    });

    console.log('Customer object created successfully');

    // Test a simple query to get customer info
    console.log('Attempting to query customer info...');
    const customerInfo = await customer.query(`
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone
      FROM customer
      LIMIT 1
    `);

    console.log('Customer query successful:', customerInfo);

    return NextResponse.json({
      success: true,
      message: 'Google Ads API connection successful',
      customerInfo: customerInfo[0] || null,
      config: {
        customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
        has_client_id: !!process.env.GOOGLE_ADS_CLIENT_ID,
        has_client_secret: !!process.env.GOOGLE_ADS_CLIENT_SECRET,
        has_developer_token: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        has_refresh_token: !!process.env.GOOGLE_ADS_REFRESH_TOKEN
      }
    });

  } catch (error) {
    console.error('Google Ads API connection test failed:', error);
    
    // Get more detailed error information
    let errorDetails = 'Unknown error';
    if (error instanceof Error) {
      errorDetails = error.message;
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: "Google Ads API connection failed",
        details: errorDetails,
        errorType: error?.constructor?.name || 'Unknown'
      },
      { status: 500 }
    );
  }
}