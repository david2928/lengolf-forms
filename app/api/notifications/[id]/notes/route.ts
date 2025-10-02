import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!;
const supabaseServiceKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!;

const MAX_NOTES_LENGTH = 5000;

/**
 * PUT /api/notifications/:id/notes
 *
 * Update internal notes for a notification
 *
 * Request body:
 * - notes: string (max 5000 chars)
 * - staff_id: number (in production, this would come from session)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { id } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid notification ID format' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { notes, staff_id } = body;

    // Validate notes
    if (notes === undefined || notes === null) {
      return NextResponse.json(
        { error: 'notes field is required' },
        { status: 400 }
      );
    }

    if (typeof notes !== 'string') {
      return NextResponse.json(
        { error: 'notes must be a string' },
        { status: 400 }
      );
    }

    if (notes.length > MAX_NOTES_LENGTH) {
      return NextResponse.json(
        { error: `notes must not exceed ${MAX_NOTES_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Validate staff_id
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

    // Update notes
    const { data: updated, error: updateError } = await supabase
      .from('notifications')
      .update({
        internal_notes: notes,
        notes_updated_by: staff_id,
        notes_updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating notification notes:', updateError);
      return NextResponse.json(
        { error: 'Failed to update notes', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      internal_notes: updated.internal_notes,
      notes_updated_by: updated.notes_updated_by,
      notes_updated_at: updated.notes_updated_at,
      notification: updated,
    });
  } catch (error) {
    console.error('Unexpected error in PUT /api/notifications/:id/notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
