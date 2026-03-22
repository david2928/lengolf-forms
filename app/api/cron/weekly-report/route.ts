import { NextRequest, NextResponse } from 'next/server';
import { createLineClient } from '@/lib/line-messaging';
import { LINE_MESSAGING } from '@/lib/constants';
import { fetchWeeklyData } from './fetch-weekly-data';
import { buildWeeklyReportCarousel } from './build-flex-message';

async function sendLineError(message: string): Promise<void> {
  try {
    const token = LINE_MESSAGING.channelAccessToken;
    const groupId = LINE_MESSAGING.groups.general;
    if (!token || !groupId) return;
    const client = createLineClient(token);
    await client.pushTextMessage(groupId, message);
  } catch (e) {
    console.error('Failed to send LINE error alert:', e);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Auth: CRON_SECRET for production, or test mode for development
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const { searchParams } = new URL(request.url);
    const testUserId = searchParams.get('testUserId');
    const isTest = !!testUserId;

    // In test mode with dev bypass, skip auth. Otherwise require CRON_SECRET.
    const isDevBypass = process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true';
    if (!isTest || !isDevBypass) {
      if (!cronSecret) {
        console.error('CRON_SECRET environment variable not set');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log(`[weekly-report] Starting${isTest ? ' (TEST MODE)' : ''}...`);

    // Fetch all data
    const data = await fetchWeeklyData();

    console.log(`[weekly-report] Data fetched: ${data.revenue.totalSales} THB revenue, ${data.bookings.total} bookings`);

    // Build flex message carousel
    const carouselContent = buildWeeklyReportCarousel(data);

    // Send via LINE
    const token = LINE_MESSAGING.channelAccessToken;
    if (!token) {
      console.error('[weekly-report] LINE credentials not configured');
      return NextResponse.json({ error: 'LINE credentials not configured' }, { status: 500 });
    }

    const client = createLineClient(token);
    const targetId = isTest ? testUserId : LINE_MESSAGING.groups.general;

    if (!targetId) {
      console.error('[weekly-report] No target ID (group or test user)');
      return NextResponse.json({ error: 'No target ID configured' }, { status: 500 });
    }

    const altText = `LENGOLF Weekly Report: ${data.week.start} to ${data.week.end} | Revenue: ${data.revenue.totalSales.toLocaleString()} THB | Bookings: ${data.bookings.total}`;

    await client.pushFlexMessage(targetId, altText, carouselContent);

    console.log(`[weekly-report] Sent to ${isTest ? 'test user' : 'general group'}`);

    return NextResponse.json({
      status: 'sent',
      target: isTest ? 'test_user' : 'general_group',
      week: data.week,
      summary: {
        revenue: data.revenue.totalSales,
        bookings: data.bookings.total,
        uniqueCustomers: data.bookings.uniqueCustomers,
        adSpend: data.googleAds.spend + data.metaAds.spend,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[weekly-report] Error:', errorMessage);

    await sendLineError(
      `\u26A0\uFE0F Weekly Report Cron Error\n\nThe weekly business report failed to generate.\nError: ${errorMessage}`
    );

    return NextResponse.json({ status: 'error', message: errorMessage }, { status: 500 });
  }
}
