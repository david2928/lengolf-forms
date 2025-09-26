import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import {
  validateAndGetBody,
  validateWebhookChallenge
} from '@/lib/meta/signature-validator';
import {
  processMetaWebhookPayload,
  logWebhookEvent,
  detectPlatform,
  type MetaWebhookPayload
} from '@/lib/meta/webhook-handler';

/**
 * Meta Webhook endpoint
 * Receives webhook events from Meta Platform (Facebook, Instagram, WhatsApp) and processes them
 * Follows the same pattern as LINE webhook handler
 */
export async function POST(request: NextRequest) {
  console.log('Meta webhook received');

  try {
    // Step 1: Validate signature and get raw body (skip validation for debug requests)
    const isDebugRequest = request.headers.get('X-Debug-Request') === 'true';
    const signature = request.headers.get('x-hub-signature-256') || '';

    let rawBody: string;
    if (isDebugRequest) {
      rawBody = await request.text();
    } else {
      rawBody = await validateAndGetBody(request);
    }

    // Step 2: Parse JSON payload
    let payload: MetaWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Failed to parse webhook JSON:', parseError);

      // Detect platform from the first entry for logging
      const platform = 'unknown';
      await logWebhookEvent('parse_error', platform, signature, rawBody, false, 'Invalid JSON');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Step 3: Detect platform and create event types string
    const platforms = payload.entry.map(entry => detectPlatform(entry));
    const eventTypes = platforms.join(',');

    // Step 4: Log the webhook event and return immediately (same as LINE pattern)
    await logWebhookEvent(eventTypes, platforms[0] || 'unknown', signature, rawBody, false);

    // Step 5: Return 200 immediately to prevent Meta from retrying
    const response = NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });

    // Step 6: Process events in background using waitUntil (same as LINE)
    waitUntil(
      processMetaWebhookPayload(payload)
        .then(async () => {
          // Update log to mark as processed
          await logWebhookEvent(eventTypes, platforms[0] || 'unknown', signature, rawBody, true);
        })
        .catch(async (error) => {
          console.error('Error processing Meta webhook events:', error);
          // Update log with error
          await logWebhookEvent(eventTypes, platforms[0] || 'unknown', signature, rawBody, false, error.message);
        })
    );

    return response;

  } catch (error) {
    console.error('Meta webhook validation/processing error:', error);

    // Log error if we can get signature
    const signature = request.headers.get('x-hub-signature-256') || '';
    try {
      const body = await request.text();
      await logWebhookEvent('validation_error', 'unknown', signature, body, false, error instanceof Error ? error.message : 'Unknown error');
    } catch (logError) {
      console.error('Failed to log Meta webhook error:', logError);
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
 * Handle GET requests for webhook verification
 * Meta requires webhook verification during setup
 */
export async function GET(request: NextRequest) {
  console.log('Meta webhook verification request');

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    console.log('Webhook verification params:', { mode, token: token?.substring(0, 10) + '...' });

    // Validate the verification challenge
    const validChallenge = validateWebhookChallenge(mode, token, challenge);

    if (validChallenge) {
      console.log('Webhook verification successful');
      return new Response(validChallenge);
    }

    console.log('Webhook verification failed');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  } catch (error) {
    console.error('Webhook verification error:', error);
    return NextResponse.json({
      error: 'Verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}