import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageText = searchParams.get('message') || 'Test34';

    // Check webhook logs for the message
    const { data: webhookLogs, error: webhookError } = await supabase
      .from('line_webhook_logs')
      .select('*')
      .ilike('raw_body', `%${messageText}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    // Check if message was stored
    const { data: messages, error: messageError } = await supabase
      .from('line_messages')
      .select('*')
      .ilike('message_text', `%${messageText}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    // Check recent conversations
    const { data: conversations, error: convError } = await supabase
      .from('line_conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5);

    // Check push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .schema('backoffice')
      .from('push_subscriptions')
      .select('user_email, is_active')
      .eq('is_active', true);

    // Environment check
    const envCheck = {
      hasLineToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
      hasVapidSubject: !!process.env.VAPID_SUBJECT,
      hasVapidPublic: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      hasVapidPrivate: !!process.env.VAPID_PRIVATE_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV
    };

    return NextResponse.json({
      success: true,
      debug: {
        searchMessage: messageText,
        webhookLogs: webhookLogs || [],
        storedMessages: messages || [],
        recentConversations: conversations || [],
        activePushSubscriptions: subscriptions?.length || 0,
        environmentCheck: envCheck,
        errors: {
          webhook: webhookError?.message,
          message: messageError?.message,
          conversation: convError?.message,
          subscription: subError?.message
        }
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}