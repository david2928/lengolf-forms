import { NextRequest, NextResponse } from 'next/server';
import { validateOpenAIConfig } from '@/lib/ai/openai-client';
import { batchProcessHistoricalMessages } from '@/lib/ai/embedding-service';

/**
 * Generate embeddings for recent messages
 * Called by pg_cron daily to keep embeddings up-to-date
 * GET /api/ai/generate-embeddings
 */
export async function GET(request: NextRequest) {
  try {
    // Verify API secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.AI_EMBEDDING_SECRET}`;

    if (!authHeader || authHeader !== expectedAuth) {
      console.error('Unauthorized embedding generation attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate OpenAI is configured
    const configCheck = validateOpenAIConfig();
    if (!configCheck.valid) {
      console.error('OpenAI not configured:', configCheck.error);
      return NextResponse.json({
        error: 'OpenAI not configured',
        reason: configCheck.error
      }, { status: 503 });
    }

    // Process last 2 days of messages (ensures we don't miss anything)
    // Using small batch size to respect rate limits
    const startTime = Date.now();
    const result = await batchProcessHistoricalMessages(2, 10);
    const processingTime = Date.now() - startTime;

    console.log(`[AI Embeddings] Processed ${result.processed} messages with ${result.errors} errors in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in embedding generation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Manual trigger for embedding generation (with authentication)
 * POST /api/ai/generate-embeddings
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.AI_EMBEDDING_SECRET}`;

    if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate OpenAI is configured
    const configCheck = validateOpenAIConfig();
    if (!configCheck.valid) {
      return NextResponse.json({
        error: 'OpenAI not configured',
        reason: configCheck.error
      }, { status: 503 });
    }

    const body = await request.json();
    const daysBack = body.daysBack || 2;
    const batchSize = body.batchSize || 10;

    // Validate parameters
    if (daysBack < 1 || daysBack > 90) {
      return NextResponse.json({
        error: 'Invalid daysBack parameter. Must be between 1 and 90'
      }, { status: 400 });
    }

    const startTime = Date.now();
    const result = await batchProcessHistoricalMessages(daysBack, batchSize);
    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      daysBack,
      batchSize,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in manual embedding generation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
