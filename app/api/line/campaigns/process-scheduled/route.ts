import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Process scheduled campaigns that are due to be sent.
 * Called by pg_cron every 5 minutes.
 *
 * POST /api/line/campaigns/process-scheduled
 */
export async function POST(request: NextRequest) {
  // Verify cron authorization
  if (!CRON_SECRET) {
    console.error('CRON_SECRET environment variable not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find campaigns that are scheduled and due
    const { data: campaigns, error } = await refacSupabaseAdmin
      .from('line_broadcast_campaigns')
      .select('id, name, scheduled_at')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching scheduled campaigns:', error);
      throw error;
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ success: true, message: 'No campaigns due', processed: 0 });
    }

    console.log(`Processing ${campaigns.length} scheduled campaign(s)`);

    let processed = 0;
    const results: Array<{ id: string; name: string; status: string }> = [];

    for (const campaign of campaigns) {
      try {
        // Call the send endpoint internally
        const baseUrl = process.env.NEXTAUTH_URL
          || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

        const sendRes = await fetch(`${baseUrl}/api/line/campaigns/${campaign.id}/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CRON_SECRET}`,
          },
        });

        const sendData = await sendRes.json();

        if (sendData.success) {
          processed++;
          results.push({ id: campaign.id, name: campaign.name, status: 'sent' });
          console.log(`Scheduled campaign "${campaign.name}" (${campaign.id}) sent successfully`);
        } else {
          results.push({ id: campaign.id, name: campaign.name, status: `error: ${sendData.error}` });
          console.error(`Failed to send scheduled campaign "${campaign.name}":`, sendData.error);
        }
      } catch (err) {
        results.push({ id: campaign.id, name: campaign.name, status: `error: ${err instanceof Error ? err.message : 'unknown'}` });
        console.error(`Error processing campaign "${campaign.name}":`, err);
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      total: campaigns.length,
      results,
    });
  } catch (error) {
    console.error('Error processing scheduled campaigns:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
