import { NextResponse } from 'next/server';
import { LINE_MESSAGING } from '@/lib/constants';
import { createLineClient } from '@/lib/line-messaging';
import { createClient } from '@supabase/supabase-js';
import { parseLineMessage } from '@/lib/notification-parser';

const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!;
const supabaseServiceKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!;

// LINE Messaging API function
async function sendLineMessage(message: string, bookingType?: string, customerNotes?: string) {
  if (!LINE_MESSAGING.channelAccessToken) {
    console.error('Missing LINE Messaging API credentials');
    throw new Error('LINE Messaging API configuration is incomplete');
  }

  // Determine which groups should receive the message
  const groups = [];
  
  // Always send to default group
  if (LINE_MESSAGING.groups.default) {
    groups.push(LINE_MESSAGING.groups.default);
    console.log('Will send to default group');
  } else {
    console.warn('Default group ID not configured');
  }
  
  // Handle specific coaching notifications
  if (bookingType === "Coaching (Boss - Ratchavin)" && LINE_MESSAGING.groups.ratchavin) {
    console.log('Booking is Ratchavin coaching, will send to Ratchavin group');
    groups.push(LINE_MESSAGING.groups.ratchavin);
  } else if (bookingType === "Coaching (Boss)" && LINE_MESSAGING.groups.coaching) {
    console.log('Booking is regular coaching, will send to coaching group');
    groups.push(LINE_MESSAGING.groups.coaching);
  } else if (bookingType === "Coaching (Noon)" && LINE_MESSAGING.groups.noon) {
    console.log('Booking is Noon coaching, will send to Noon group');
    groups.push(LINE_MESSAGING.groups.noon);
  }
  
  if (groups.length === 0) {
    console.error('No valid group IDs configured');
    throw new Error('No LINE group IDs available to send message');
  }
  
  try {
    const client = createLineClient(LINE_MESSAGING.channelAccessToken);
    
    let finalMessage = message;
    if (customerNotes && customerNotes.trim() !== "") {
      finalMessage += `\n\nNote: ${customerNotes}`;
    }

    const promises = groups.map(groupId => {
      console.log(`Sending LINE message to group: ${groupId}`);
      return client.pushTextMessage(groupId, finalMessage);
    });
    
    // Wait for all messages to be sent
    await Promise.all(promises);
    console.log(`LINE messages sent successfully to ${groups.length} groups`);
    return true;
  } catch (error) {
    console.error('LINE Messaging API Error:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  let notificationId: string | null = null;

  try {
    const body = await req.json();
    console.log('Received notification request body:', body);

    const { message, bookingType, customer_notes } = body;
    console.log('Processing notification for:', { bookingType, hasMessage: !!message });

    // STEP 1: Parse LINE message to extract booking data
    const parseResult = parseLineMessage(message);
    console.log('Parsed notification type:', parseResult.type);

    // STEP 2: Insert notification into database FIRST (dual-write)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Note: booking_date is stored as the formatted string from LINE message
    // In a future enhancement, we could parse it to YYYY-MM-DD format
    // For now, we store it as-is in metadata and leave the date field null
    //
    // IMPORTANT: booking_id is set to null because foreign key constraint requires
    // the booking to exist in the bookings table. Since we're processing LINE messages
    // that may reference non-existent or test bookings, we store the booking ID
    // in metadata instead for reference purposes.
    const notificationData = {
      type: parseResult.type,
      message: parseResult.cleanMessage, // Clean, emoji-free message
      customer_name: parseResult.data.customerName || 'Unknown Customer',
      customer_phone: parseResult.data.customerPhone || null,
      customer_id: null, // We don't have customer_code from LINE messages
      booking_id: null, // Set to null to avoid FK constraint issues
      booking_date: null, // Will be null until we implement date parsing
      booking_time: parseResult.data.time || null,
      bay: parseResult.data.bay || null,
      metadata: {
        bookingType,
        customer_notes,
        bookingId: parseResult.data.bookingId, // Store here for reference
        numberOfPeople: parseResult.data.numberOfPeople,
        packageName: parseResult.data.packageName,
        isNewCustomer: parseResult.data.isNewCustomer,
        referralSource: parseResult.data.referralSource,
        formattedDate: parseResult.data.date, // Store the formatted date string
        originalLineMessage: message, // Store original for retry
      },
      line_notification_sent: false, // Will update after LINE send
      line_notification_error: null,
    };

    const { data: insertedNotification, error: insertError } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert notification into database:', insertError);
      // Continue with LINE send even if DB insert fails
      // This ensures backward compatibility
    } else {
      notificationId = insertedNotification.id;
      console.log('Notification inserted into database:', notificationId);
    }

    // STEP 3: Send message via LINE Messaging API
    let lineSuccess = false;
    let lineError: string | null = null;

    try {
      await sendLineMessage(message, bookingType, customer_notes);
      console.log('LINE Messaging API notifications sent successfully');
      lineSuccess = true;
    } catch (error) {
      console.error('LINE notification error:', error);
      lineError = error instanceof Error ? error.message : 'Failed to send LINE notification';
      lineSuccess = false;
    }

    // STEP 4: Update notification with LINE send result
    if (notificationId) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          line_notification_sent: lineSuccess,
          line_notification_error: lineError,
        })
        .eq('id', notificationId);

      if (updateError) {
        console.error('Failed to update notification LINE status:', updateError);
      } else {
        console.log('Notification LINE status updated:', { lineSuccess, lineError });
      }
    }

    // STEP 5: Return response
    // We return success even if LINE fails, as long as in-app notification succeeded
    return NextResponse.json({
      success: true,
      notificationId,
      lineNotificationSent: lineSuccess,
      error: lineError,
    });
  } catch (error) {
    console.error('Notification error:', error);

    // If we created a notification, mark it as failed
    if (notificationId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('notifications')
          .update({
            line_notification_error: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', notificationId);
      } catch (updateError) {
        console.error('Failed to update notification error status:', updateError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification',
        notificationId,
      },
      { status: 500 }
    );
  }
}