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

    const scraperServiceUrl = process.env.SCRAPER_SERVICE_URL;
    if (!scraperServiceUrl) {
      return NextResponse.json({ 
        error: "Scraper service not configured" 
      }, { status: 500 });
    }

    console.log('🔄 Triggering competitor sync via scraper service...');

    // Call the scraper service
    const response = await fetch(`${scraperServiceUrl}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SCRAPER_API_KEY || ''}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Scraper service error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    console.log(`✅ Sync completed: ${data.results?.success || 0} successful, ${data.results?.failed || 0} failed`);

    return NextResponse.json({
      success: true,
      message: 'Sync triggered successfully',
      results: data.results
    });

  } catch (error: any) {
    console.error('❌ Sync trigger failed:', error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger sync',
      message: error.message
    }, { status: 500 });
  }
}