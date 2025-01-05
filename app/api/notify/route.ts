import { NextResponse } from 'next/server';
import { LINE_TOKENS } from '@/lib/constants';

async function sendLineNotification(message: string, token: string) {
  console.log('Sending LINE notification with data:', { message, token });
  const response = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${token}`,
    },
    body: new URLSearchParams({
      message,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LINE API Error:', errorText);
    throw new Error('LINE notification failed: ' + errorText);
  }

  return response;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Received notification request body:', body);

    const { message, bookingType } = body;
    console.log('Processing LINE notification for:', { message, bookingType });

    const notifications = [];

    // Always send to default group
    notifications.push(sendLineNotification(message, LINE_TOKENS.default));
    console.log('Queued default notification');

    // For coaching bookings, send additional notifications
    if (bookingType?.toLowerCase().includes('coaching')) {
      console.log('Booking is coaching type, sending to coaching group');
      notifications.push(sendLineNotification(message, LINE_TOKENS.coaching));

      if (bookingType?.toLowerCase().includes('ratchavin')) {
        console.log('Booking is Ratchavin coaching, sending to Ratchavin group');
        notifications.push(sendLineNotification(message, LINE_TOKENS.ratchavin));
      }
    }

    // Wait for all notifications to complete
    await Promise.all(notifications);
    console.log('All notifications sent successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('LINE notification error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send notification' },
      { status: 500 }
    );
  }
}