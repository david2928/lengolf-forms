import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!;
const supabaseKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Extract subscription details
    const {
      endpoint,
      keys: { p256dh, auth }
    } = subscription;

    // Get user agent for debugging
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Store or update subscription in database
    const { data, error } = await supabase
      .schema('backoffice')
      .from('push_subscriptions')
      .upsert(
        {
          user_email: session.user.email,
          endpoint,
          p256dh_key: p256dh,
          auth_key: auth,
          user_agent: userAgent,
          is_active: true
        },
        {
          onConflict: 'user_email,endpoint',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error storing push subscription:', error);
      return NextResponse.json(
        { error: 'Failed to store subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Subscription saved successfully',
        subscriptionId: data.id
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in push subscription endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get user session
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    // Deactivate subscription
    const { error } = await supabase
      .schema('backoffice')
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_email', session.user.email)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('Error deactivating push subscription:', error);
      return NextResponse.json(
        { error: 'Failed to unsubscribe' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Unsubscribed successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in push unsubscribe endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's active subscriptions
    const { data, error } = await supabase
      .schema('backoffice')
      .from('push_subscriptions')
      .select('id, endpoint, created_at, user_agent')
      .eq('user_email', session.user.email)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching push subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        subscriptions: data || []
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in get subscriptions endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}