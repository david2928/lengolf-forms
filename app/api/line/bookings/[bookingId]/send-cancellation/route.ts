import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { createBookingCancellationMessage } from '@/lib/line/flex-templates';

interface CancellationConfirmationRequest {
  messageFormat?: 'text' | 'flex' | 'both';
  senderName?: string;
}

/**
 * Send booking cancellation confirmation to LINE user
 * POST /api/line/bookings/[bookingId]/send-cancellation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is staff or admin
    const { data: user, error: userError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('is_admin, is_staff')
      .eq('email', session.user.email)
      .single();

    if (userError || (!user?.is_admin && !user?.is_staff)) {
      return NextResponse.json({ error: "Staff access required" }, { status: 403 });
    }

    const { bookingId } = await params;
    const { messageFormat = 'flex', senderName = 'Admin' }: CancellationConfirmationRequest = await request.json();

    // Fetch booking details with customer information
    const { data: booking, error: bookingError } = await refacSupabaseAdmin
      .from('bookings')
      .select(`
        id,
        name,
        email,
        phone_number,
        date,
        start_time,
        duration,
        bay,
        number_of_people,
        booking_type,
        customer_notes,
        status,
        customer_id,
        customers(
          id,
          customer_name,
          contact_number,
          email
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({
        error: "Booking not found",
        details: bookingError?.message,
        bookingId
      }, { status: 404 });
    }

    // Check if booking is cancelled
    const status = booking.status?.toLowerCase();
    if (status !== 'cancelled') {
      return NextResponse.json({
        error: `Cannot send cancellation confirmation for booking with status: ${booking.status}. Only cancelled bookings can have cancellation confirmations sent.`,
        bookingStatus: booking.status
      }, { status: 400 });
    }

    // Find linked LINE user for this customer
    let lineUserId: string | null = null;
    let conversationId: string | null = null;

    if (booking.customer_id) {
      // Check if customer has a linked LINE user
      const { data: lineUser } = await refacSupabaseAdmin
        .from('line_users')
        .select('line_user_id')
        .eq('customer_id', booking.customer_id)
        .single();

      if (lineUser) {
        lineUserId = lineUser.line_user_id;

        // Get or create conversation
        const { data: conversation } = await refacSupabaseAdmin
          .from('line_conversations')
          .select('id')
          .eq('line_user_id', lineUserId)
          .single();

        if (conversation) {
          conversationId = conversation.id;
        }
      }
    }

    // If no LINE user found, try to find by phone number
    if (!lineUserId && booking.phone_number) {
      const { data: customerWithLineUser } = await refacSupabaseAdmin
        .from('customers')
        .select(`
          line_users(line_user_id, line_conversations(id))
        `)
        .eq('contact_number', booking.phone_number)
        .eq('is_active', true)
        .single();

      if (customerWithLineUser?.line_users) {
        lineUserId = (customerWithLineUser.line_users as any).line_user_id;
        conversationId = (customerWithLineUser.line_users as any).line_conversations?.id;
      }
    }

    if (!lineUserId) {
      return NextResponse.json({
        error: "Customer does not have a linked LINE account",
        suggestion: "Please link the customer's LINE account first"
      }, { status: 400 });
    }

    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json({
        error: "LINE messaging not configured"
      }, { status: 500 });
    }

    // Format booking data for message generation
    const bookingDate = new Date(booking.date);

    // Calculate end time from start time and duration
    const startTime = booking.start_time;
    const [hours, minutes] = startTime.split(':').map(Number);

    // Convert duration (in hours) to minutes and add to start time
    const totalMinutes = hours * 60 + minutes + (booking.duration * 60);
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = Math.floor(totalMinutes % 60);
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

    // Format bay display with proper labels
    let bayDisplay = booking.bay;
    if (booking.bay === 'Bay 1' || booking.bay === 'Bay 2' || booking.bay === 'Bay 3') {
      bayDisplay = 'Social Bay';
    } else if (booking.bay === 'Bay 4') {
      bayDisplay = 'AI Bay';
    }

    // Check if it's a coaching booking and extract coach name
    const bookingType = booking.booking_type || '';
    const isCoaching = bookingType.toLowerCase().includes('coaching');
    let coachName = '';

    if (isCoaching) {
      // Extract coach name from booking type - get text within parentheses
      const match = bookingType.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        coachName = match[1];
      }
    }

    // Prepare flex data for cancellation message
    const flexData = {
      bookingId: booking.id,
      customerName: booking.name,
      date: bookingDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: `${booking.start_time} - ${endTime}`,
      bay: bayDisplay,
      duration: `${booking.duration} hours`,
      isCoaching,
      coachName,
      bookingType
    };

    // Create cancellation flex message
    const flexMessage = createBookingCancellationMessage(flexData);
    const messagesToSend = [flexMessage];

    // Send messages via LINE API
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: messagesToSend
      })
    });

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text();
      console.error(`LINE API error: ${lineResponse.status} ${lineResponse.statusText} - ${errorText}`);

      let errorMessage = 'Failed to send cancellation confirmation';
      if (lineResponse.status === 401) {
        errorMessage = 'LINE API authentication failed';
      } else if (lineResponse.status === 400) {
        errorMessage = 'Customer may not be reachable via LINE';
      }

      return NextResponse.json({
        error: errorMessage,
        details: errorText
      }, { status: lineResponse.status });
    }

    // Store cancellation confirmation message in database if we have a conversation
    if (conversationId) {
      const messageText = isCoaching
        ? '❌ Coaching session cancelled'
        : '❌ Booking cancelled';

      const { data: storedMessage, error: messageError } = await refacSupabaseAdmin
        .from('line_messages')
        .insert({
          conversation_id: conversationId,
          line_user_id: lineUserId,
          message_type: 'flex',
          message_text: messageText,
          sender_type: 'admin',
          sender_name: senderName,
          timestamp: Date.now(),
          is_read: true,
          raw_event: {
            type: 'booking_cancellation',
            booking_id: bookingId,
            message_format: 'flex',
            booking_details: flexData
          }
        })
        .select()
        .single();

      if (messageError) {
        console.error('Error storing cancellation message:', messageError);
      }

      // Update conversation
      await refacSupabaseAdmin
        .from('line_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_text: messageText,
          last_message_by: 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
    }

    return NextResponse.json({
      success: true,
      message: 'Cancellation confirmation sent successfully',
      booking: {
        id: booking.id,
        customerName: booking.name,
        date: booking.date,
        time: booking.start_time,
        bay: booking.bay
      },
      messageFormat: 'flex',
      lineUserId
    });

  } catch (error: any) {
    console.error('Error sending cancellation confirmation:', error);
    return NextResponse.json({
      error: "Failed to send cancellation confirmation",
      details: error.message
    }, { status: 500 });
  }
}
