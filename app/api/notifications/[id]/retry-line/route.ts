import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!;
const supabaseServiceKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/notifications/:id/retry-line
 *
 * Retry sending a failed LINE notification
 *
 * This endpoint:
 * 1. Fetches the notification from the database
 * 2. Calls the existing /api/notify endpoint to send LINE message
 * 3. Updates the notification record with success/failure status
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

    // Fetch notification
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

    // Check if notification has a LINE error (otherwise, no need to retry)
    if (notification.line_notification_sent && !notification.line_notification_error) {
      return NextResponse.json(
        {
          success: true,
          message: 'LINE notification already sent successfully',
          line_notification_sent: true,
        }
      );
    }

    // Reconstruct LINE message from notification data
    // Note: We use the original message stored in the database
    const lineMessage = notification.message;

    if (!lineMessage) {
      return NextResponse.json(
        { error: 'Cannot retry: notification message is missing' },
        { status: 400 }
      );
    }

    // Call /api/notify to send LINE message
    // We need to get the base URL for the current request
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    try {
      const notifyResponse = await fetch(`${baseUrl}/api/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: lineMessage,
          bookingType: notification.metadata?.bookingType || undefined,
          customer_notes: notification.metadata?.customer_notes || undefined,
        }),
      });

      if (!notifyResponse.ok) {
        const errorText = await notifyResponse.text();
        console.error('LINE retry failed:', errorText);

        // Update notification with failure
        await supabase
          .from('notifications')
          .update({
            line_notification_error: `Retry failed: ${errorText}`,
          })
          .eq('id', id);

        return NextResponse.json(
          {
            success: false,
            error: 'Failed to send LINE notification',
            details: errorText,
          },
          { status: 500 }
        );
      }

      // Success! Update notification
      const { data: updated, error: updateError } = await supabase
        .from('notifications')
        .update({
          line_notification_sent: true,
          line_notification_error: null,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating notification after LINE retry:', updateError);
      }

      return NextResponse.json({
        success: true,
        line_notification_sent: true,
        notification: updated,
      });
    } catch (lineError) {
      console.error('Error calling /api/notify for LINE retry:', lineError);

      // Update notification with error
      await supabase
        .from('notifications')
        .update({
          line_notification_error: `Retry error: ${lineError instanceof Error ? lineError.message : 'Unknown error'}`,
        })
        .eq('id', id);

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send LINE notification',
          details: lineError instanceof Error ? lineError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in POST /api/notifications/:id/retry-line:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
