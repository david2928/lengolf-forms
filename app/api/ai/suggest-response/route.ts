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
  messageId?: string; // Message ID for database storage
  includeCustomerContext?: boolean;
  dryRun?: boolean; // For evaluation/testing without side effects
  overrideModel?: string; // For model comparison testing
  includeDebugContext?: boolean; // Include full AI context for transparency
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

    // Get conversation context (recent messages) and customer ID
    const { conversationContext, customerId } = await getConversationContext(
      body.conversationId,
      body.channelType
    );

    // Get customer context automatically if customer is linked to conversation
    // OR if explicitly requested with customerId
    let customerContext;
    const customerIdToUse = body.customerId || customerId;
    if (customerIdToUse) {
      customerContext = await getCustomerContext(customerIdToUse);
    }

    // Prepare parameters for AI suggestion
    const suggestionParams: GenerateSuggestionParams = {
      customerMessage: body.customerMessage,
      conversationContext,
      customerContext,
      staffUserEmail: session.user.email,
      messageId: body.messageId, // Pass message ID for database storage
      dryRun: body.dryRun || false, // Support evaluation mode
      overrideModel: body.overrideModel, // Support model comparison testing
      includeDebugContext: body.includeDebugContext || false // Support context transparency
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
        similarMessagesCount: suggestion.similarMessagesUsed.length,
        // Image suggestions for multi-modal responses
        suggestedImages: suggestion.suggestedImages,
        // Function calling metadata
        functionCalled: suggestion.functionCalled,
        functionResult: suggestion.functionResult,
        functionParameters: suggestion.functionResult?.data,
        requiresApproval: suggestion.requiresApproval,
        approvalMessage: suggestion.approvalMessage,
        // Full context for transparency (when enabled)
        ...(body.includeDebugContext && suggestion.debugContext && { debugContext: suggestion.debugContext })
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

// Get conversation context (recent messages) and customer ID
async function getConversationContext(
  conversationId: string,
  channelType: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp'
) {
  try {
    if (!refacSupabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    // Get conversation details including customer_id
    const { data: conversation } = await refacSupabaseAdmin
      .from('unified_conversations')
      .select('customer_id')
      .eq('id', conversationId)
      .eq('channel_type', channelType)
      .single();

    const customerId = conversation?.customer_id || null;

    // Get recent messages from the conversation (last 30 days for now, will optimize later)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 30); // Temporarily 30 days for testing with older data

    const { data: messages, error } = await refacSupabaseAdmin
      .from('unified_messages')
      .select('content, sender_type, created_at')
      .eq('conversation_id', conversationId)
      .eq('channel_type', channelType)
      .gte('created_at', twoDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100); // Safety limit

    if (error) {
      console.warn(`Warning fetching conversation messages: ${error.message}`);
      // For demo/testing purposes, continue with empty messages if conversation doesn't exist
    }

    return {
      conversationContext: {
        id: conversationId,
        channelType,
        recentMessages: (messages || [])
          .reverse() // Reverse to get chronological order
          .map((msg: any) => ({
            content: msg.content || '',
            senderType: msg.sender_type || 'unknown',
            createdAt: msg.created_at
          }))
      },
      customerId
    };
  } catch (error) {
    console.error('Error getting conversation context:', error);
    return {
      conversationContext: {
        id: conversationId,
        channelType,
        recentMessages: []
      },
      customerId: null
    };
  }
}

// Get enhanced customer context information
async function getCustomerContext(customerId: string) {
  try {
    if (!refacSupabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    // Get customer basic information with materialized stats
    const { data: customer, error: customerError } = await refacSupabaseAdmin
      .from('customers')
      .select('id, customer_name, email, contact_number, notes, total_lifetime_value, total_visits, last_visit_date')
      .eq('id', customerId)
      .single();

    if (customerError) {
      console.error('Error fetching customer:', customerError);
      return undefined;
    }

    // Use materialized columns for stats (these are automatically updated by database triggers)
    const lifetimeValue = customer.total_lifetime_value || 0;
    const totalVisits = customer.total_visits || 0;
    const lastVisitDate = customer.last_visit_date;

    // Get active packages summary (from backoffice schema, same as customer sidebar)
    const { data: packages } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .select(`
        id,
        package_types!inner(
          name,
          type,
          hours
        ),
        expiration_date
      `)
      .eq('customer_id', customerId)
      .gte('expiration_date', new Date().toISOString().split('T')[0]) // Not expired
      .order('expiration_date', { ascending: true });

    // Calculate usage for each package
    let processedPackages: any[] = [];
    if (packages) {
      const packageIds = packages.map((p: any) => p.id);
      const { data: usageData } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('package_usage')
        .select('package_id, used_hours')
        .in('package_id', packageIds);

      processedPackages = packages.map((pkg: any) => {
        const totalUsed = usageData
          ?.filter((usage: any) => usage.package_id === pkg.id)
          ?.reduce((sum: number, usage: any) => sum + Number(usage.used_hours || 0), 0) || 0;

        const totalHours = Number(pkg.package_types.hours || 0);
        const remainingHours = pkg.package_types.type === 'Unlimited'
          ? 'Unlimited'
          : Math.max(0, totalHours - totalUsed);

        return {
          name: pkg.package_types.name,
          type: pkg.package_types.type,
          remainingHours,
          expirationDate: pkg.expiration_date
        };
      }).filter((pkg: any) => {
        // Only show packages that have remaining hours or are unlimited
        return pkg.type === 'Unlimited' || pkg.remainingHours > 0;
      });
    }

    const packagesSummary = {
      count: processedPackages?.length || 0,
      totalHoursRemaining: processedPackages?.reduce((sum: number, pkg: any) => {
        const hours = pkg.type === 'Unlimited' ? 9999 : Number(pkg.remainingHours) || 0;
        return sum + hours;
      }, 0) || 0,
      hasUnlimited: processedPackages?.some((pkg: any) => pkg.type === 'Unlimited') || false,
      earliestExpiration: processedPackages?.[0]?.expirationDate || null,
      packages: processedPackages // Include individual package details
    };

    // Get upcoming bookings
    const today = new Date().toISOString().split('T')[0];
    const { data: upcomingBookings } = await refacSupabaseAdmin
      .from('bookings')
      .select('id, booking_date, start_time, bay_type, booking_type, bay_number')
      .eq('customer_id', customerId)
      .gte('booking_date', today)
      .in('status', ['confirmed', 'pending'])
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(5);

    const upcomingBookingsSummary = {
      count: upcomingBookings?.length || 0,
      nextBooking: upcomingBookings?.[0] ? {
        date: upcomingBookings[0].booking_date,
        time: upcomingBookings[0].start_time,
        bayType: upcomingBookings[0].bay_type || determineBayType(upcomingBookings[0].bay_number),
        isCoaching: (upcomingBookings[0].booking_type || '').toLowerCase().includes('coaching'),
        coachName: extractCoachName(upcomingBookings[0].booking_type)
      } : null
    };

    // Get recent bookings (last 3 completed or cancelled)
    const { data: pastBookings } = await refacSupabaseAdmin
      .from('bookings')
      .select('id, booking_date, start_time, bay_type, booking_type, bay_number, status, package_name')
      .eq('customer_id', customerId)
      .in('status', ['completed', 'cancelled'])
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(3);

    const recentBookings = pastBookings?.map((booking: any) => ({
      date: booking.booking_date,
      time: booking.start_time,
      bayType: booking.bay_type || determineBayType(booking.bay_number),
      isCoaching: (booking.booking_type || '').toLowerCase().includes('coaching'),
      coachName: extractCoachName(booking.booking_type),
      status: booking.status as 'completed' | 'cancelled',
      packageName: booking.package_name
    })) || [];

    return {
      id: customer.id,
      name: customer.customer_name,
      email: customer.email,
      phone: customer.contact_number,
      language: 'auto' as 'auto',

      // Lifetime stats
      totalVisits: totalVisits || 0,
      lifetimeValue,
      lastVisitDate,

      // Package summary
      activePackages: packagesSummary,

      // Upcoming bookings
      upcomingBookings: upcomingBookingsSummary,

      // Recent bookings
      recentBookings,

      // Customer notes
      notes: customer.notes
    };
  } catch (error) {
    console.error('Error getting customer context:', error);
    return undefined;
  }
}

// Helper function to determine bay type from bay number
function determineBayType(bayNumber: string | null): string {
  if (!bayNumber) return 'Unknown';
  if (bayNumber === 'Bay 1' || bayNumber === 'Bay 2' || bayNumber === 'Bay 3') {
    return 'Social Bay';
  } else if (bayNumber === 'Bay 4') {
    return 'AI Bay';
  }
  return 'Sim';
}

// Helper function to extract coach name from booking type
function extractCoachName(bookingType: string | null): string | undefined {
  if (!bookingType) return undefined;
  const match = bookingType.match(/\(([^)]+)\)/);
  return match?.[1] || undefined;
}