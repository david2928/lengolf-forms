import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!;
const supabaseServiceKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/notifications/:id/acknowledge
 *
 * Mark a notification as acknowledged (read) by the current user
 *
 * Note: In the current implementation, we use a staff_id from the request body
 * since authentication is handled at the API layer. In production, this would
 * come from the session.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { id } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid notification ID format' },
        { status: 400 }
      );
    }

    // Get staff_id from request body (in production, this would come from session)
    const body = await request.json();
    const { staff_id } = body;

    if (!staff_id || typeof staff_id !== 'number') {
      return NextResponse.json(
        { error: 'staff_id is required and must be a number' },
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
        acknowledged_by: staff_id,
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
      acknowledged_by: updated.acknowledged_by,
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
