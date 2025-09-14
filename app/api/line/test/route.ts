import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Test endpoint to check LINE data collection
 * GET /api/line/test
 */
export async function GET() {
  try {
    // Get recent LINE users
    const { data: users, error: usersError } = await supabase
      .from('line_users')
      .select(`
        line_user_id,
        display_name,
        picture_url,
        first_seen_at,
        last_seen_at
      `)
      .order('last_seen_at', { ascending: false })
      .limit(10);

    if (usersError) throw usersError;

    // Get recent messages
    const { data: messages, error: messagesError } = await supabase
      .from('line_messages')
      .select(`
        message_text,
        message_type,
        timestamp,
        created_at,
        line_users!inner(display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (messagesError) throw messagesError;

    // Get webhook logs
    const { data: webhooks, error: webhooksError } = await supabase
      .from('line_webhook_logs')
      .select(`
        event_type,
        processed,
        error_message,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (webhooksError) throw webhooksError;

    return NextResponse.json({
      status: 'success',
      data: {
        users: users || [],
        messages: messages || [],
        webhooks: webhooks || []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}