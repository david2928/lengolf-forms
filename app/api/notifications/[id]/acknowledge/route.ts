import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!;
const supabaseServiceKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/notifications/:id/acknowledge
 *
 * Mark a notification as acknowledged (read) by the current authenticated user
 * Requires staff or admin authentication
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify staff/admin role and get user ID
    const { data: user } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, is_staff, is_admin')
      .eq('email', session.user.email)
      .single();

    if (!user?.is_staff && !user?.is_admin) {
      return NextResponse.json(
        { error: "Forbidden: Staff or admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid notification ID format' },
        { status: 400 }
      );
    }

    // Verify notification exists
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Update notification (idempotent - can acknowledge multiple times)
    const { data: updated, error: updateError } = await supabase
      .from('notifications')
      .update({
        acknowledged_by_user_id: user.id,
        acknowledged_at: new Date().toISOString(),
        read: true,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error acknowledging notification:', updateError);
      return NextResponse.json(
        { error: 'Failed to acknowledge notification', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      acknowledged_by_user_id: updated.acknowledged_by_user_id,
      acknowledged_at: updated.acknowledged_at,
      notification: updated,
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/notifications/:id/acknowledge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
