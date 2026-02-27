import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { validateOpenAIConfig } from '@/lib/ai/openai-client';
import { generateAISuggestion, GenerateSuggestionParams } from '@/lib/ai/suggestion-service';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// AI pipeline: embedding + intent classification + DB queries + LLM generation + function calling
export const maxDuration = 30;

// Allowlist of models permitted for overrideModel — prevents cost abuse
const ALLOWED_MODELS = new Set([
  'gpt-4o-mini', 'gpt-4o', 'gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4.1',
  'gpt-5-nano', 'gpt-5-mini', 'gpt-5',
  'o3-mini', 'o4-mini',
]);

const MAX_CUSTOMER_MESSAGE_LENGTH = 5000;

// Simple in-memory rate limiter per user (resets on cold start, which is acceptable)
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_PER_MINUTE = 15;

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(email);
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(email, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_PER_MINUTE) return false;
  entry.count++;
  return true;
}

interface SuggestResponseRequest {
  customerMessage: string;
  conversationId: string;
  channelType: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp';
  customerId?: string;
  messageId?: string; // Message ID for database storage
  imageUrl?: string; // Customer image URL for vision support
  includeCustomerContext?: boolean;
  dryRun?: boolean; // For evaluation/testing without side effects
  overrideModel?: string; // For model comparison testing (allowlisted models only)
  includeDebugContext?: boolean; // Include full AI context for transparency
  // Test mode: pass conversation context directly instead of fetching from DB
  conversationContext?: Array<{ content: string; senderType: string; createdAt: string }>;
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

  // Rate limit: prevent excessive API cost from rapid-fire requests
  if (!checkRateLimit(session.user.email)) {
    return NextResponse.json({
      error: 'Rate limit exceeded. Please wait a moment before requesting another suggestion.'
    }, { status: 429 });
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

    // Validate required fields (customerMessage can be empty if imageUrl is provided)
    if ((!body.customerMessage && !body.imageUrl) || !body.conversationId || !body.channelType) {
      return NextResponse.json({
        error: 'Missing required fields: customerMessage (or imageUrl), conversationId, channelType'
      }, { status: 400 });
    }

    // Validate message length to prevent excessive token usage
    if (body.customerMessage && body.customerMessage.length > MAX_CUSTOMER_MESSAGE_LENGTH) {
      return NextResponse.json({
        error: `Customer message too long (max ${MAX_CUSTOMER_MESSAGE_LENGTH} characters)`
      }, { status: 400 });
    }

    // Validate imageUrl if provided — restrict to trusted domains to prevent SSRF
    if (body.imageUrl) {
      try {
        const parsed = new URL(body.imageUrl);
        if (parsed.protocol !== 'https:') {
          return NextResponse.json({ error: 'Image URL must use HTTPS' }, { status: 400 });
        }
        const trustedHosts = ['bisimqmtxjsptehhqpeg.supabase.co', 'api-data.line.me'];
        if (!trustedHosts.some(host => parsed.hostname === host || parsed.hostname.endsWith('.supabase.co'))) {
          return NextResponse.json({ error: 'Image URL must be from a trusted source' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid image URL format' }, { status: 400 });
      }
    }

    // Validate conversationId format
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(body.conversationId)) {
      return NextResponse.json({
        error: 'Invalid conversationId format'
      }, { status: 400 });
    }

    // Server-side dedup: check if we already generated a suggestion for this message
    if (body.messageId && UUID_RE.test(body.messageId) && refacSupabaseAdmin) {
      const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();

      // Use separate queries instead of .or() to avoid filter injection risk
      const selectCols = 'id, suggested_response, suggested_response_thai, confidence_score, response_time_ms, similar_messages_count, context_used, suggested_images';
      const { data: existingLine } = await refacSupabaseAdmin
        .from('ai_suggestions')
        .select(selectCols)
        .eq('line_message_id', body.messageId)
        .gte('created_at', thirtySecondsAgo)
        .limit(1)
        .maybeSingle();

      let existing = existingLine;
      if (!existing) {
        const { data: existingWeb, error: webError } = await refacSupabaseAdmin
          .from('ai_suggestions')
          .select(selectCols)
          .eq('web_message_id', body.messageId)
          .gte('created_at', thirtySecondsAgo)
          .limit(1)
          .maybeSingle();
        if (webError) {
          console.warn('Dedup web query error:', webError.message);
        }
        existing = existingWeb;
      }

      if (existing) {
        return NextResponse.json({
          success: true,
          suggestion: {
            id: existing.id,
            suggestedResponse: existing.suggested_response,
            suggestedResponseThai: existing.suggested_response_thai,
            confidenceScore: existing.confidence_score,
            responseTime: existing.response_time_ms,
            contextSummary: 'Returned cached suggestion (dedup)',
            similarMessagesCount: existing.similar_messages_count || 0,
            suggestedImages: existing.suggested_images,
          }
        });
      }
    }

    // Get conversation context — use client-provided context in dry-run test mode,
    // otherwise fetch from database
    let conversationContext;
    let customerId: string | null = null;

    if (body.dryRun && body.conversationContext && body.conversationContext.length > 0) {
      // Test mode: use client-provided conversation history
      conversationContext = {
        id: body.conversationId,
        channelType: body.channelType,
        recentMessages: body.conversationContext.map(msg => ({
          content: msg.content,
          senderType: msg.senderType,
          createdAt: msg.createdAt,
        })),
      };
    } else {
      const dbContext = await getConversationContext(
        body.conversationId,
        body.channelType
      );
      conversationContext = dbContext.conversationContext;
      customerId = dbContext.customerId;
    }

    // Get customer context automatically if customer is linked to conversation
    // OR if explicitly requested with customerId
    let customerContext;
    const customerIdToUse = body.customerId || customerId;
    if (customerIdToUse) {
      customerContext = await getCustomerContext(customerIdToUse);
    }

    // Fetch business context (pricing, packages, coaching rates) - cached for 5 min
    const businessContext = await getBusinessContext();

    // Prepare parameters for AI suggestion
    const suggestionParams: GenerateSuggestionParams = {
      customerMessage: body.customerMessage || '',
      conversationContext,
      customerContext,
      businessContext: businessContext || undefined,
      staffUserEmail: session.user.email,
      messageId: body.messageId, // Pass message ID for database storage
      imageUrl: body.imageUrl, // Customer image URL for vision support
      dryRun: body.dryRun || false, // Support evaluation mode
      overrideModel: (body.overrideModel && ALLOWED_MODELS.has(body.overrideModel)) ? body.overrideModel : undefined,
      includeDebugContext: body.includeDebugContext || false // Support context transparency
    };

    // Generate AI suggestion
    const suggestion = await generateAISuggestion(suggestionParams);

    // Log suggestion details for debugging
    console.log(`[AI Suggestion] conv=${body.conversationId.slice(0, 8)} confidence=${suggestion.confidenceScore} time=${suggestion.responseTimeMs}ms response="${suggestion.suggestedResponse?.slice(0, 80)}..." mgmt=${suggestion.managementNote || 'none'}`);

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
        managementNote: suggestion.managementNote || null,
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
    // Use .maybeSingle() instead of .single() — the unified_conversations UNION ALL view
    // can intermittently fail with .single(), silently returning null and losing customer_id
    const { data: conversation, error: convError } = await refacSupabaseAdmin
      .from('unified_conversations')
      .select('customer_id')
      .eq('id', conversationId)
      .eq('channel_type', channelType)
      .maybeSingle();

    if (convError) {
      console.warn(`[AI] unified_conversations query failed for ${conversationId}: ${convError.message}`);
    }

    let customerId = conversation?.customer_id || null;

    // Fallback: if the view query returned no customer_id, query the underlying table directly
    if (!customerId) {
      const tableMap: Record<string, string> = {
        line: 'line_conversations',
        website: 'web_chat_conversations',
        facebook: 'meta_conversations',
        instagram: 'meta_conversations',
        whatsapp: 'meta_conversations',
      };
      const tableName = tableMap[channelType];
      if (tableName) {
        const { data: directConv, error: directError } = await refacSupabaseAdmin
          .from(tableName)
          .select('customer_id')
          .eq('id', conversationId)
          .maybeSingle();

        if (directError) {
          console.warn(`[AI] Direct ${tableName} query failed for ${conversationId}: ${directError.message}`);
        }
        if (directConv?.customer_id) {
          customerId = directConv.customer_id;
          console.warn(`[AI] Customer ID found via fallback (${tableName}) for ${conversationId}: ${customerId}`);
        }
      }
    }

    // Get recent messages from the conversation (last 7 days)
    const messageCutoff = new Date();
    messageCutoff.setDate(messageCutoff.getDate() - 7);

    const { data: messages, error } = await refacSupabaseAdmin
      .from('unified_messages')
      .select('content, sender_type, created_at, content_type, channel_metadata')
      .eq('conversation_id', conversationId)
      .eq('channel_type', channelType)
      .gte('created_at', messageCutoff.toISOString())
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
            createdAt: msg.created_at,
            contentType: msg.content_type || 'text',
            imageUrl: msg.content_type === 'image' ? msg.channel_metadata?.file_url : undefined,
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

// Business context shape returned from getBusinessContext
interface BusinessContext {
  packageTypes: Array<{ name: string; hours: number; validity_days: number; description: string; type: string }>;
  coachRates: Array<{ description: string; rate: number }>;
  bayPricing: {
    socialBay: { hourly: number; description: string };
    aiBay: { hourly: number; description: string };
    note: string;
  };
  operatingHours: { daily: string; note: string };
  promotions: Array<Record<string, unknown>>;
}

// Get business context (pricing, packages, coaching rates, operating hours)
// Cached in-memory for 5 minutes to avoid repeated DB queries
let businessContextCache: { data: BusinessContext; timestamp: number } | null = null;
const BUSINESS_CONTEXT_TTL = 5 * 60 * 1000; // 5 minutes

async function getBusinessContext() {
  // Return cached if fresh
  if (businessContextCache && (Date.now() - businessContextCache.timestamp) < BUSINESS_CONTEXT_TTL) {
    return businessContextCache.data;
  }

  try {
    if (!refacSupabaseAdmin) return null;

    // Fetch package types, coaching rates, and promotions in parallel
    // coach_rates: columns are rate_type (text) and rate (numeric)
    // package_types: columns are name, hours, type, validity_period, display_name, pax (no is_active, description, or validity_days)
    const [packageTypesResult, coachRatesResult, promotionsResult] = await Promise.all([
      refacSupabaseAdmin
        .schema('backoffice')
        .from('package_types')
        .select('name, hours, type, validity_period, display_name, pax')
        .order('display_order'),
      refacSupabaseAdmin
        .schema('backoffice')
        .from('coach_rates')
        .select('rate_type, rate'),
      refacSupabaseAdmin
        .from('promotions')
        .select('title_en, title_th, description_en, description_th, valid_until, promo_type, badge_en, terms_en')
        .eq('is_active', true)
        .eq('is_customer_facing', true)
        .eq('promo_type', 'discount') // Only real promotions, not general bundles/packages
        .or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`)
        .order('display_order')
    ]);

    // Map DB results to BusinessContext interface
    const packageTypes = (packageTypesResult.data || []).map((pkg: any) => ({
      name: pkg.display_name || pkg.name,
      hours: Number(pkg.hours) || 0,
      validity_days: 0, // Not available, use validity_period text
      description: `${pkg.type}${pkg.pax > 1 ? ` (${pkg.pax} PAX)` : ''}${pkg.validity_period ? `, valid ${pkg.validity_period}` : ''}`,
      type: pkg.type
    }));

    const coachRates = (coachRatesResult.data || []).map((rate: any) => ({
      description: rate.rate_type,
      rate: Number(rate.rate)
    }));

    const context = {
      packageTypes,
      coachRates,
      // Bay pricing from products.products (is_active=true) — verified Feb 2026
      bayPricing: {
        socialBay: { hourly: 500, description: 'Social Bay (up to 5 players): Weekday Morning ฿500/hr, Weekday Afternoon/Evening ฿700/hr, Weekend Morning ฿700/hr, Weekend Afternoon/Evening ฿900/hr' },
        aiBay: { hourly: 500, description: 'AI Bay (1-2 players, advanced analytics): Same pricing as Social Bay' },
        note: 'Prices vary by day/time. Standard club rental is FREE. Premium indoor clubs: ฿150/hr (Premium), ฿250/hr (Premium+).'
      },
      operatingHours: {
        daily: '10:00 - 23:00',
        note: 'Last booking at 22:00. Peak hours 18:00-21:00.'
      },
      promotions: promotionsResult.data || []
    };

    businessContextCache = { data: context, timestamp: Date.now() };
    return context;
  } catch (error) {
    console.error('Error fetching business context:', error);
    return null;
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