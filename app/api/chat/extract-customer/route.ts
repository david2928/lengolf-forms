import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { extractCustomerFromMessages } from '@/lib/ai/customer-extraction-service';
import { customerMappingService, type CustomerMatch } from '@/lib/customer-mapping-service';

interface ExtractionRequest {
  messages: Array<{
    content: string;
    senderType: 'user' | 'staff' | 'admin' | 'assistant';
    createdAt?: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: ExtractionRequest = await request.json();

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array required' },
        { status: 400 }
      );
    }

    // Extract customer info from messages
    const extraction = await extractCustomerFromMessages(body.messages);

    // Check for potential duplicates if we extracted any info
    let duplicates: CustomerMatch[] = [];
    if (extraction.name || extraction.phone || extraction.email) {
      duplicates = await customerMappingService.findPotentialDuplicates({
        customerName: extraction.name || undefined,
        phone: extraction.phone || undefined,
        email: extraction.email || undefined
      });
    }

    // Return extraction results with duplicates
    return NextResponse.json({
      success: true,
      extraction: {
        name: extraction.name,
        phone: extraction.phone,
        email: extraction.email,
        confidence: extraction.confidence,
        sources: extraction.sources
      },
      duplicates: duplicates.map(dup => ({
        id: dup.id,
        customer_code: dup.customer_code,
        customer_name: dup.customer_name,
        contact_number: dup.contact_number,
        email: dup.email,
        match_method: dup.match_method,
        similarity: dup.similarity
      })),
      hasDuplicates: duplicates.length > 0
    });

  } catch (error) {
    console.error('Error in extract-customer API:', error);

    return NextResponse.json(
      {
        error: 'Failed to extract customer information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
