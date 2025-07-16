import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { platform, url } = await request.json();

    if (!platform || !url) {
      return NextResponse.json({ 
        error: "Platform and URL are required" 
      }, { status: 400 });
    }

    const scraperServiceUrl = process.env.SCRAPER_SERVICE_URL;
    if (!scraperServiceUrl) {
      return NextResponse.json({ 
        error: "Scraper service not configured" 
      }, { status: 500 });
    }

    console.log(`🧪 Testing ${platform} scraping for: ${url}`);

    // Call the scraper service test endpoint
    const response = await fetch(`${scraperServiceUrl}/test/${platform}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SCRAPER_API_KEY || ''}`
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Scraper service error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    console.log(`✅ Test completed for ${platform}: ${data.result?.success ? 'Success' : 'Failed'}`);

    return NextResponse.json({
      success: true,
      platform,
      url,
      result: data.result,
      timestamp: data.timestamp
    });

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      message: error.message
    }, { status: 500 });
  }
}