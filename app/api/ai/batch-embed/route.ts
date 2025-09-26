import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { validateOpenAIConfig } from '@/lib/ai/openai-client';
import { batchProcessHistoricalMessages } from '@/lib/ai/embedding-service';

interface BatchEmbedRequest {
  daysBack?: number;
  batchSize?: number;
  dryRun?: boolean;
}

/**
 * Batch process historical messages to create embeddings
 * POST /api/ai/batch-embed
 */
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Validate OpenAI configuration
    const configCheck = validateOpenAIConfig();
    if (!configCheck.valid) {
      return NextResponse.json({
        error: 'AI services not available',
        reason: configCheck.error
      }, { status: 503 });
    }

    const body: BatchEmbedRequest = await request.json();
    const {
      daysBack = 30,
      batchSize = 10,
      dryRun = false
    } = body;

    // Validate parameters
    if (daysBack < 1 || daysBack > 365) {
      return NextResponse.json({
        error: 'Invalid daysBack parameter. Must be between 1 and 365'
      }, { status: 400 });
    }

    if (batchSize < 1 || batchSize > 50) {
      return NextResponse.json({
        error: 'Invalid batchSize parameter. Must be between 1 and 50'
      }, { status: 400 });
    }

    if (dryRun) {
      // For dry run, just count messages that would be processed
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `Would process historical messages from the last ${daysBack} days in batches of ${batchSize}`,
        parameters: {
          daysBack,
          batchSize,
          estimatedCost: 'Approximately $0.01-0.05 depending on message count and length'
        }
      });
    }

    // Start batch processing
    const startTime = Date.now();

    const result = await batchProcessHistoricalMessages(daysBack, batchSize);

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      result: {
        processed: result.processed,
        errors: result.errors,
        daysBack,
        batchSize,
        processingTimeMs: processingTime
      },
      message: `Successfully processed ${result.processed} messages with ${result.errors} errors in ${Math.round(processingTime / 1000)}s`
    });

  } catch (error) {
    console.error('Error in batch embed processing:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process batch embeddings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get batch processing status and recommendations
 * GET /api/ai/batch-embed
 */
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // This could be enhanced to show actual processing status
    // For now, just return configuration info
    const configCheck = validateOpenAIConfig();

    return NextResponse.json({
      success: true,
      aiEnabled: configCheck.valid,
      configuration: configCheck.valid ? {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        enabled: process.env.AI_SUGGESTION_ENABLED === 'true',
        confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.6')
      } : null,
      recommendations: {
        firstTimeSetup: [
          'Start with a dry run to estimate processing time and cost',
          'Process messages from the last 30 days initially',
          'Use batch size of 10 to respect rate limits',
          'Monitor for errors and adjust parameters if needed'
        ],
        costEstimate: 'Embeddings cost approximately $0.02 per 1M tokens. Most messages are 10-50 tokens.',
        performanceNotes: [
          'Processing includes rate limiting (1 second delay between batches)',
          'Large message histories may take several minutes',
          'Processing can be interrupted and resumed safely'
        ]
      }
    });

  } catch (error) {
    console.error('Error getting batch embed status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get batch processing status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}