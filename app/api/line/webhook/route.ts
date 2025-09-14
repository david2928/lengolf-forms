import { NextRequest, NextResponse } from 'next/server';
import { validateAndGetBody } from '@/lib/line/signature-validator';
import {
  processWebhookPayload,
  logWebhookEvent,
  type LineWebhookPayload
} from '@/lib/line/webhook-handler';

/**
 * LINE Webhook endpoint
 * Receives webhook events from LINE Platform and processes them
 */
export async function POST(request: NextRequest) {
  console.log('LINE webhook received');

  try {
    // Step 1: Validate signature and get raw body
    const rawBody = await validateAndGetBody(request);
    const signature = request.headers.get('x-line-signature') || '';

    // Step 2: Parse JSON payload
    let payload: LineWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Failed to parse webhook JSON:', parseError);
      await logWebhookEvent('parse_error', signature, rawBody, false, 'Invalid JSON');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Step 3: Log the webhook event
    const eventTypes = payload.events.map(e => e.type).join(',');
    await logWebhookEvent(eventTypes, signature, rawBody, false);

    // Step 4: Return 200 immediately to prevent LINE from retrying
    // Process events asynchronously
    const response = NextResponse.json({ success: true }, { status: 200 });

    // Step 5: Process events asynchronously (don't await this)
    processWebhookPayload(payload)
      .then(async () => {
        console.log('Webhook events processed successfully');
        // Update log to mark as processed
        await logWebhookEvent(eventTypes, signature, rawBody, true);
      })
      .catch(async (error) => {
        console.error('Error processing webhook events:', error);
        // Update log with error
        await logWebhookEvent(eventTypes, signature, rawBody, false, error.message);
      });

    return response;

  } catch (error) {
    console.error('Webhook validation/processing error:', error);

    // Log error if we can get signature
    const signature = request.headers.get('x-line-signature') || '';
    try {
      const body = await request.text();
      await logWebhookEvent('validation_error', signature, body, false, error instanceof Error ? error.message : 'Unknown error');
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    if (error instanceof Error) {
      if (error.message.includes('signature')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('environment variable')) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle GET requests for webhook verification or health checks
 */
export async function GET() {
  return NextResponse.json({
    status: 'LINE webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}