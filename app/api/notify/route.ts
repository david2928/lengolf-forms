import { NextResponse } from 'next/server';
import { LINE_MESSAGING } from '@/lib/constants';
import { createLineClient } from '@/lib/line-messaging';

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
  try {
    const body = await req.json();
    console.log('Received notification request body:', body);

    const { message, bookingType, customer_notes } = body;
    console.log('Processing LINE notification for:', { message, bookingType, customer_notes });

    // Send message via LINE Messaging API
    await sendLineMessage(message, bookingType, customer_notes);
    console.log('LINE Messaging API notifications sent successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('LINE notification error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send notification' },
      { status: 500 }
    );
  }
}