import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { validateOpenAIConfig } from '@/lib/ai/openai-client';
import { generateAISuggestion, GenerateSuggestionParams } from '@/lib/ai/suggestion-service';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

interface SuggestResponseRequest {
  customerMessage: string;
  conversationId: string;
  channelType: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp';
  customerId?: string;
  includeCustomerContext?: boolean;
}

/**
 * Generate AI-powered response suggestion for customer message
 * POST /api/ai/suggest-response
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
        error: 'AI suggestions not available',
        reason: configCheck.error
      }, { status: 503 });
    }

    // Parse request body
    const body: SuggestResponseRequest = await request.json();

    // Validate required fields
    if (!body.customerMessage || !body.conversationId || !body.channelType) {
      return NextResponse.json({
        error: 'Missing required fields: customerMessage, conversationId, channelType'
      }, { status: 400 });
    }

    // Get conversation context (recent messages)
    const conversationContext = await getConversationContext(
      body.conversationId,
      body.channelType
    );

    // Get customer context if requested and customerId provided
    let customerContext;
    if (body.includeCustomerContext && body.customerId) {
      customerContext = await getCustomerContext(body.customerId);
    }

    // Prepare parameters for AI suggestion
    const suggestionParams: GenerateSuggestionParams = {
      customerMessage: body.customerMessage,
      conversationContext,
      customerContext,
      staffUserEmail: session.user.email
    };

    // Generate AI suggestion
    const suggestion = await generateAISuggestion(suggestionParams);

    // Return suggestion
    return NextResponse.json({
      success: true,
      suggestion: {
        id: suggestion.id,
        suggestedResponse: suggestion.suggestedResponse,
        suggestedResponseThai: suggestion.suggestedResponseThai,
        confidenceScore: suggestion.confidenceScore,
        responseTime: suggestion.responseTimeMs,
        contextSummary: suggestion.contextSummary,
        templateUsed: suggestion.templateUsed,
        similarMessagesCount: suggestion.similarMessagesUsed.length
      }
    });

  } catch (error) {
    console.error('Error generating AI suggestion:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate suggestion',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get conversation context (recent messages)
async function getConversationContext(
  conversationId: string,
  channelType: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp'
) {
  try {
    if (!refacSupabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    // Get recent messages from the conversation
    const { data: messages, error } = await refacSupabaseAdmin
      .from('unified_messages')
      .select('content, sender_type, created_at')
      .eq('conversation_id', conversationId)
      .eq('channel_type', channelType)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.warn(`Warning fetching conversation messages: ${error.message}`);
      // For demo/testing purposes, continue with empty messages if conversation doesn't exist
    }

    return {
      id: conversationId,
      channelType,
      recentMessages: (messages || [])
        .reverse() // Reverse to get chronological order
        .map((msg: any) => ({
          content: msg.content || '',
          senderType: msg.sender_type || 'unknown',
          createdAt: msg.created_at
        }))
    };
  } catch (error) {
    console.error('Error getting conversation context:', error);
    return {
      id: conversationId,
      channelType,
      recentMessages: []
    };
  }
}

// Get customer context information
async function getCustomerContext(customerId: string) {
  try {
    if (!refacSupabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    // Get customer basic information
    const { data: customer, error: customerError } = await refacSupabaseAdmin
      .from('customers')
      .select('id, customer_name, email, contact_number')
      .eq('id', customerId)
      .single();

    if (customerError) {
      console.error('Error fetching customer:', customerError);
      return undefined;
    }

    // Get booking statistics
    const { data: bookingStats } = await refacSupabaseAdmin
      .from('bookings')
      .select('id, booking_date, bay_type')
      .eq('customer_id', customerId)
      .order('booking_date', { ascending: false })
      .limit(10);

    const totalBookings = bookingStats?.length || 0;
    const lastBookingDate = bookingStats?.[0]?.booking_date || null;

    // Determine preferred bay type
    const bayTypes = bookingStats?.map((b: any) => b.bay_type).filter(Boolean) || [];
    const bayTypeCounts = bayTypes.reduce((acc: Record<string, number>, type: string) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const preferredBayType = Object.entries(bayTypeCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0];

    return {
      id: customer.id,
      name: customer.customer_name,
      email: customer.email,
      phone: customer.contact_number,
      totalBookings,
      lastBookingDate,
      preferredBayType,
      language: 'auto' as 'auto' // Could be enhanced with language detection
    };
  } catch (error) {
    console.error('Error getting customer context:', error);
    return undefined;
  }
}