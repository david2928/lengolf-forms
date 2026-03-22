/**
 * Shared helpers for AI suggest-response routes (JSON and streaming).
 * Extracted to avoid duplication between /api/ai/suggest-response and /api/ai/suggest-response/stream.
 */

import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { BusinessContext } from '@/lib/ai/suggestion-service';
import { getPricingCatalog } from '@/lib/pricing-service';

// ─── Request / validation constants ──────────────────────────────────────────

/** Allowlist of models permitted for overrideModel — prevents cost abuse */
export const ALLOWED_MODELS = new Set([
  'gpt-4o-mini', 'gpt-4o', 'gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4.1',
  'gpt-5-nano', 'gpt-5-mini', 'gpt-5',
  'o3-mini', 'o4-mini',
]);

export const MAX_CUSTOMER_MESSAGE_LENGTH = 5000;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SuggestResponseRequest {
  customerMessage: string;
  conversationId: string;
  channelType: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp';
  customerId?: string;
  messageId?: string;
  imageUrl?: string;
  includeCustomerContext?: boolean;
  dryRun?: boolean;
  overrideModel?: string;
  includeDebugContext?: boolean;
  conversationContext?: Array<{ content: string; senderType: string; createdAt: string }>;
}

// ─── Rate limiter ────────────────────────────────────────────────────────────

const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_PER_MINUTE = 15;

export function checkRateLimit(email: string): boolean {
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

// ─── Conversation context ────────────────────────────────────────────────────

export async function getConversationContext(
  conversationId: string,
  channelType: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp'
) {
  try {
    if (!refacSupabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

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

    // Fallback: query underlying table directly if view returned no customer_id
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

    // Get recent messages (last 7 days)
    const messageCutoff = new Date();
    messageCutoff.setDate(messageCutoff.getDate() - 7);

    const { data: messages, error } = await refacSupabaseAdmin
      .from('unified_messages')
      .select('content, sender_type, created_at, content_type, channel_metadata')
      .eq('conversation_id', conversationId)
      .eq('channel_type', channelType)
      .gte('created_at', messageCutoff.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn(`Warning fetching conversation messages: ${error.message}`);
    }

    return {
      conversationContext: {
        id: conversationId,
        channelType,
        recentMessages: (messages || [])
          .reverse()
          .map((msg: Record<string, unknown>) => ({
            content: (msg.content as string) || '',
            senderType: (msg.sender_type as string) || 'unknown',
            createdAt: msg.created_at as string,
            contentType: (msg.content_type as string) || 'text',
            imageUrl: msg.content_type === 'image' ? (msg.channel_metadata as Record<string, unknown>)?.file_url : undefined,
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

// ─── Customer context ────────────────────────────────────────────────────────

export async function getCustomerContext(customerId: string) {
  try {
    if (!refacSupabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    const { data: customer, error: customerError } = await refacSupabaseAdmin
      .from('customers')
      .select('id, customer_name, email, contact_number, notes, total_lifetime_value, total_visits, last_visit_date')
      .eq('id', customerId)
      .single();

    if (customerError) {
      console.error('Error fetching customer:', customerError);
      return undefined;
    }

    const lifetimeValue = customer.total_lifetime_value || 0;
    const totalVisits = customer.total_visits || 0;
    const lastVisitDate = customer.last_visit_date;

    // Get active packages (backoffice schema)
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
      .gte('expiration_date', new Date().toISOString().split('T')[0])
      .order('expiration_date', { ascending: true });

    let processedPackages: Array<{ name: string; type: string; remainingHours: number | string; expirationDate: string }> = [];
    if (packages) {
      const packageIds = packages.map((p: Record<string, unknown>) => p.id);
      const { data: usageData } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('package_usage')
        .select('package_id, used_hours')
        .in('package_id', packageIds);

      processedPackages = packages.map((pkg: Record<string, unknown>) => {
        const pkgType = pkg.package_types as Record<string, unknown>;
        const totalUsed = usageData
          ?.filter((usage: Record<string, unknown>) => usage.package_id === pkg.id)
          ?.reduce((sum: number, usage: Record<string, unknown>) => sum + Number(usage.used_hours || 0), 0) || 0;

        const totalHours = Number(pkgType.hours || 0);
        const remainingHours = pkgType.type === 'Unlimited'
          ? 'Unlimited'
          : Math.max(0, totalHours - totalUsed);

        return {
          name: pkgType.name as string,
          type: pkgType.type as string,
          remainingHours,
          expirationDate: pkg.expiration_date as string,
        };
      }).filter((pkg: { type: string; remainingHours: number | string }) => {
        return pkg.type === 'Unlimited' || (typeof pkg.remainingHours === 'number' && pkg.remainingHours > 0);
      });
    }

    const packagesSummary = {
      count: processedPackages?.length || 0,
      totalHoursRemaining: processedPackages?.reduce((sum: number, pkg) => {
        const hours = pkg.type === 'Unlimited' ? 9999 : Number(pkg.remainingHours) || 0;
        return sum + hours;
      }, 0) || 0,
      hasUnlimited: processedPackages?.some((pkg) => pkg.type === 'Unlimited') || false,
      earliestExpiration: processedPackages?.[0]?.expirationDate || null,
      packages: processedPackages,
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

    // Get recent bookings (last 3)
    const { data: pastBookings } = await refacSupabaseAdmin
      .from('bookings')
      .select('id, booking_date, start_time, bay_type, booking_type, bay_number, status, package_name')
      .eq('customer_id', customerId)
      .in('status', ['completed', 'cancelled'])
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(3);

    const recentBookings = pastBookings?.map((booking: Record<string, unknown>) => ({
      date: booking.booking_date as string,
      time: booking.start_time as string,
      bayType: (booking.bay_type as string) || determineBayType(booking.bay_number as string | null),
      isCoaching: ((booking.booking_type as string) || '').toLowerCase().includes('coaching'),
      coachName: extractCoachName(booking.booking_type as string | null),
      status: booking.status as 'completed' | 'cancelled',
      packageName: booking.package_name as string,
    })) || [];

    return {
      id: customer.id,
      name: customer.customer_name,
      email: customer.email,
      phone: customer.contact_number,
      language: 'auto' as const,
      totalVisits: totalVisits || 0,
      lifetimeValue,
      lastVisitDate,
      activePackages: packagesSummary,
      upcomingBookings: upcomingBookingsSummary,
      recentBookings,
      notes: customer.notes,
    };
  } catch (error) {
    console.error('Error getting customer context:', error);
    return undefined;
  }
}

// ─── Business context (cached 5 min) ─────────────────────────────────────────
// BusinessContext type imported from suggestion-service.ts

export type { BusinessContext } from '@/lib/ai/suggestion-service';

let businessContextCache: { data: BusinessContext; timestamp: number } | null = null;
const BUSINESS_CONTEXT_TTL = 5 * 60 * 1000;

export async function getBusinessContext() {
  if (businessContextCache && (Date.now() - businessContextCache.timestamp) < BUSINESS_CONTEXT_TTL) {
    return businessContextCache.data;
  }

  try {
    if (!refacSupabaseAdmin) return null;

    const [packageTypesResult, coachRatesResult, promotionsResult, productCatalog] = await Promise.all([
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
        .select('title_en, title_th, description_en, description_th, valid_until, promo_type, badge_en, terms_en, conditions')
        .eq('is_active', true)
        .eq('is_customer_facing', true)
        .eq('promo_type', 'discount')
        .or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`)
        .order('display_order'),
      // Note: getPricingCatalog() has its own 5-min cache (shared with /api/pricing).
      // This means pricing data is cached in two places (here + pricing-service) but both
      // use the same TTL so drift is bounded to one cache cycle.
      getPricingCatalog()
    ]);

    const packageTypes = (packageTypesResult.data || []).map((pkg: Record<string, unknown>) => ({
      name: (pkg.display_name as string) || (pkg.name as string),
      hours: Number(pkg.hours) || 0,
      validity_days: 0,
      description: `${pkg.type}${(pkg.pax as number) > 1 ? ` (${pkg.pax} PAX)` : ''}${pkg.validity_period ? `, valid ${pkg.validity_period}` : ''}`,
      type: pkg.type as string,
    }));

    const coachRates = (coachRatesResult.data || []).map((rate: Record<string, unknown>) => ({
      description: rate.rate_type as string,
      rate: Number(rate.rate),
    }));

    const context: BusinessContext = {
      packageTypes,
      coachRates,
      productCatalog: productCatalog ?? undefined,
      operatingHours: {
        daily: '10:00 - 23:00',
        note: 'Last booking at 22:00. Peak hours 18:00-21:00.'
      },
      promotions: (promotionsResult.data || []) as NonNullable<BusinessContext['promotions']>
    };

    businessContextCache = { data: context, timestamp: Date.now() };
    return context;
  } catch (error) {
    console.error('Error fetching business context:', error);
    return null;
  }
}

// ─── Small helpers ───────────────────────────────────────────────────────────

export function determineBayType(bayNumber: string | null): string {
  if (!bayNumber) return 'Unknown';
  if (bayNumber === 'Bay 1' || bayNumber === 'Bay 2' || bayNumber === 'Bay 3') {
    return 'Social Bay';
  } else if (bayNumber === 'Bay 4') {
    return 'AI Bay';
  }
  return 'Sim';
}

export function extractCoachName(bookingType: string | null): string | undefined {
  if (!bookingType) return undefined;
  const match = bookingType.match(/\(([^)]+)\)/);
  return match?.[1] || undefined;
}
