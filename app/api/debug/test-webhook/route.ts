import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testMessage = 'Test Debug Message' } = await request.json();

    // Create a mock LINE webhook payload
    const mockPayload = {
      destination: "Uf5faf59f3dc1d43e73e4ff5f652da588",
      events: [
        {
          type: "message",
          message: {
            type: "text",
            id: `debug-${Date.now()}`,
            text: testMessage
          },
          webhookEventId: `DEBUG-${Date.now()}`,
          deliveryContext: {
            isRedelivery: false
          },
          timestamp: Date.now(),
          source: {
            type: "user",
            userId: "Uf4177a1781df7fd215e6d2749fd00296"
          },
          replyToken: `debug-token-${Date.now()}`,
          mode: "active"
        }
      ]
    };

    // Send to our webhook endpoint
    const webhookResponse = await fetch(`${process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://lengolf-forms.vercel.app'}/api/line/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': 'debug-signature',
        'X-Debug-Request': 'true' // Mark as debug request
      },
      body: JSON.stringify(mockPayload)
    });

    const webhookResult = await webhookResponse.json();

    return NextResponse.json({
      success: true,
      testMessage,
      webhookResponse: {
        status: webhookResponse.status,
        result: webhookResult
      },
      mockPayload
    });

  } catch (error) {
    console.error('Test webhook error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}