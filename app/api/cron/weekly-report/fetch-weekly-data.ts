import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export interface WeekRange {
  start: string; // YYYY-MM-DD (Monday)
  end: string;   // YYYY-MM-DD (Sunday)
}

interface RevenueMetrics {
  totalSales: number;
  cashTotal: number;
  cardTotal: number;
  qrTotal: number;
  transactionCount: number;
  daysWithClosing: number;
  categoryBreakdown: CategoryRevenue;
}

export interface CategoryRevenue {
  bayRentals: number;   // Morning + Afternoon + Evening
  coaching: number;     // Coaching
  packages: number;     // Monthly Packages + Mixed Packages
  clubRentals: number;  // Course Rental + Indoor Rental
  fnb: number;          // All food & beverage categories
  other: number;        // Events, Other, etc.
}

interface BookingMetrics {
  total: number;
  uniqueCustomers: number;
  newCustomerBookings: number;
  returningBookings: number;
  totalHours: number;
  byType: Record<string, number>;
  coachingSessions: number;
  coachingStudents: number;
}

interface AdMetrics {
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  ctr: number;
  cpc: number;
}

interface MetaAdMetrics {
  spend: number;
  clicks: number;
  impressions: number;
  reach: number;
  conversions: number;
}

interface WebsiteMetrics {
  sessions: number;
  users: number;
  newUsers: number;
  pageViews: number;
  bookingConversions: number;
}

interface CompetitorSnapshot {
  name: string;
  googleRating: number | null;
  googleReviewCount: number;
  prevGoogleReviewCount: number;
  lineFriends: number;
  prevLineFriends: number;
}

export interface WeeklyData {
  week: WeekRange;
  prevWeek: WeekRange;
  revenue: RevenueMetrics;
  prevRevenue: RevenueMetrics;
  bookings: BookingMetrics;
  prevBookings: BookingMetrics;
  googleAds: AdMetrics;
  prevGoogleAds: AdMetrics;
  metaAds: MetaAdMetrics;
  prevMetaAds: MetaAdMetrics;
  website: WebsiteMetrics;
  prevWebsite: WebsiteMetrics;
  competitors: CompetitorSnapshot[];
  packagesSold: number;
  prevPackagesSold: number;
  newCustomers: number;
  prevNewCustomers: number;
}

/** Get the last complete Mon-Sun week and the one before it, in Bangkok time */
export function getWeekRanges(): { thisWeek: WeekRange; prevWeek: WeekRange } {
  const now = new Date();
  const bangkokOffset = 7 * 60 * 60 * 1000;
  const bangkokNow = new Date(now.getTime() + bangkokOffset + now.getTimezoneOffset() * 60 * 1000);

  // dayOfWeek: 0=Sun, 1=Mon, ... 6=Sat
  const dow = bangkokNow.getDay();
  // Days back to the most recent past Sunday
  const daysToLastSunday = dow === 0 ? 7 : dow;

  const lastSunday = new Date(bangkokNow);
  lastSunday.setDate(bangkokNow.getDate() - daysToLastSunday);

  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);

  const prevSunday = new Date(lastMonday);
  prevSunday.setDate(lastMonday.getDate() - 1);

  const prevMonday = new Date(prevSunday);
  prevMonday.setDate(prevSunday.getDate() - 6);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    thisWeek: { start: fmt(lastMonday), end: fmt(lastSunday) },
    prevWeek: { start: fmt(prevMonday), end: fmt(prevSunday) },
  };
}

const EMPTY_CATEGORIES: CategoryRevenue = { bayRentals: 0, coaching: 0, packages: 0, clubRentals: 0, fnb: 0, other: 0 };
const EMPTY_REVENUE: RevenueMetrics = { totalSales: 0, cashTotal: 0, cardTotal: 0, qrTotal: 0, transactionCount: 0, daysWithClosing: 0, categoryBreakdown: { ...EMPTY_CATEGORIES } };

const BAY_CATEGORIES = new Set(['Morning', 'Afternoon', 'Evening']);
const COACHING_CATEGORIES = new Set(['Coaching']);
const PACKAGE_CATEGORIES = new Set(['Monthly Packages', 'Mixed Packages']);
const CLUB_RENTAL_CATEGORIES = new Set(['Course Rental', 'Indoor Rental']);
const FNB_CATEGORIES = new Set([
  'Bottle beer', 'Non alcohol', 'Pizza', 'Appetizer', 'Cocktail',
  'Mixed Drinks', 'Highball', 'Burgers', 'Sliders', 'Snack',
  'Butter Rolls', 'Toasts', 'Wine', 'Salad', 'Draft beer',
  'Spirits', 'Mocktail', 'Fries', 'Dessert',
]);
const EMPTY_BOOKINGS: BookingMetrics = { total: 0, uniqueCustomers: 0, newCustomerBookings: 0, returningBookings: 0, totalHours: 0, byType: {}, coachingSessions: 0, coachingStudents: 0 };
const EMPTY_ADS: AdMetrics = { spend: 0, clicks: 0, impressions: 0, conversions: 0, ctr: 0, cpc: 0 };
const EMPTY_META: MetaAdMetrics = { spend: 0, clicks: 0, impressions: 0, reach: 0, conversions: 0 };
const EMPTY_WEBSITE: WebsiteMetrics = { sessions: 0, users: 0, newUsers: 0, pageViews: 0, bookingConversions: 0 };

async function fetchRevenue(start: string, end: string): Promise<RevenueMetrics> {
  const { data } = await refacSupabaseAdmin
    .schema('pos')
    .from('daily_reconciliations')
    .select('closing_date, total_sales, expected_cash, expected_credit_card, qr_payments_total, transaction_count')
    .gte('closing_date', start)
    .lte('closing_date', end);

  if (!data || data.length === 0) return EMPTY_REVENUE;

  const totals = data.reduce((acc: RevenueMetrics, row: Record<string, number | null>) => {
    acc.totalSales += Number(row.total_sales) || 0;
    acc.cashTotal += Number(row.expected_cash) || 0;
    acc.cardTotal += Number(row.expected_credit_card) || 0;
    acc.qrTotal += Number(row.qr_payments_total) || 0;
    acc.transactionCount += Number(row.transaction_count) || 0;
    acc.daysWithClosing += 1;
    return acc;
  }, { ...EMPTY_REVENUE });

  // Get category breakdown from lengolf_sales
  const { data: salesData } = await refacSupabaseAdmin
    .schema('pos')
    .from('lengolf_sales')
    .select('product_category, item_price_incl_vat')
    .gte('date', start)
    .lte('date', end)
    .or('is_voided.is.null,is_voided.eq.false');

  const cats: CategoryRevenue = { ...EMPTY_CATEGORIES };
  if (salesData) {
    salesData.forEach((row: Record<string, string | number | null>) => {
      const amount = Number(row.item_price_incl_vat) || 0;
      const cat = String(row.product_category || '');
      if (BAY_CATEGORIES.has(cat)) cats.bayRentals += amount;
      else if (COACHING_CATEGORIES.has(cat)) cats.coaching += amount;
      else if (PACKAGE_CATEGORIES.has(cat)) cats.packages += amount;
      else if (CLUB_RENTAL_CATEGORIES.has(cat)) cats.clubRentals += amount;
      else if (FNB_CATEGORIES.has(cat)) cats.fnb += amount;
      else cats.other += amount;
    });
  }

  // Round all values
  totals.totalSales = Math.round(totals.totalSales * 100) / 100;
  cats.bayRentals = Math.round(cats.bayRentals * 100) / 100;
  cats.coaching = Math.round(cats.coaching * 100) / 100;
  cats.packages = Math.round(cats.packages * 100) / 100;
  cats.clubRentals = Math.round(cats.clubRentals * 100) / 100;
  cats.fnb = Math.round(cats.fnb * 100) / 100;
  cats.other = Math.round(cats.other * 100) / 100;
  totals.categoryBreakdown = cats;

  return totals;
}

async function fetchBookings(start: string, end: string): Promise<BookingMetrics> {
  const { data } = await refacSupabaseAdmin
    .from('bookings')
    .select('booking_type, customer_id, is_new_customer, duration')
    .gte('date', start)
    .lte('date', end)
    .neq('status', 'cancelled');

  if (!data || data.length === 0) return EMPTY_BOOKINGS;

  const uniqueCustomerIds = new Set<string>();
  const byType: Record<string, number> = {};
  let newBookings = 0;
  let returningBookings = 0;
  let totalHours = 0;
  let coachingSessions = 0;
  const coachingStudentIds = new Set<string>();

  data.forEach((row: Record<string, string | number | boolean | null>) => {
    if (row.customer_id) uniqueCustomerIds.add(String(row.customer_id));
    totalHours += Number(row.duration) || 0;

    const type = String(row.booking_type || 'Unknown');
    byType[type] = (byType[type] || 0) + 1;

    if (row.is_new_customer === true) {
      newBookings++;
    } else {
      returningBookings++;
    }

    if (type.toLowerCase().includes('coaching') || type.toLowerCase().includes('coach')) {
      coachingSessions++;
      if (row.customer_id) coachingStudentIds.add(String(row.customer_id));
    }
  });

  return {
    total: data.length,
    uniqueCustomers: uniqueCustomerIds.size,
    newCustomerBookings: newBookings,
    returningBookings,
    totalHours: Math.round(totalHours * 10) / 10,
    byType,
    coachingSessions,
    coachingStudents: coachingStudentIds.size,
  };
}

async function fetchGoogleAds(start: string, end: string): Promise<AdMetrics> {
  const { data } = await refacSupabaseAdmin
    .schema('marketing')
    .from('google_ads_campaign_performance')
    .select('impressions, clicks, cost_micros, conversions')
    .gte('date', start)
    .lte('date', end);

  if (!data || data.length === 0) return EMPTY_ADS;

  let impressions = 0, clicks = 0, costMicros = 0, conversions = 0;
  data.forEach((row: Record<string, number | null>) => {
    impressions += Number(row.impressions) || 0;
    clicks += Number(row.clicks) || 0;
    costMicros += Number(row.cost_micros) || 0;
    conversions += Number(row.conversions) || 0;
  });

  const spend = Math.round(costMicros / 10000) / 100; // micros to THB with 2 decimals
  return {
    spend,
    clicks,
    impressions,
    conversions: Math.round(conversions * 100) / 100,
    ctr: impressions > 0 ? Math.round(clicks / impressions * 10000) / 100 : 0,
    cpc: clicks > 0 ? Math.round(spend / clicks * 100) / 100 : 0,
  };
}

async function fetchMetaAds(start: string, end: string): Promise<MetaAdMetrics> {
  const { data } = await refacSupabaseAdmin
    .schema('marketing')
    .from('meta_ads_campaign_performance')
    .select('impressions, clicks, spend_cents, reach, conversions')
    .gte('date', start)
    .lte('date', end);

  if (!data || data.length === 0) return EMPTY_META;

  let impressions = 0, clicks = 0, spendCents = 0, reach = 0, conversions = 0;
  data.forEach((row: Record<string, number | null>) => {
    impressions += Number(row.impressions) || 0;
    clicks += Number(row.clicks) || 0;
    spendCents += Number(row.spend_cents) || 0;
    reach += Number(row.reach) || 0;
    conversions += Number(row.conversions) || 0;
  });

  return {
    spend: Math.round(spendCents) / 100,
    clicks,
    impressions,
    reach,
    conversions: Math.round(conversions * 100) / 100,
  };
}

async function fetchWebsite(start: string, end: string): Promise<WebsiteMetrics> {
  const { data } = await refacSupabaseAdmin
    .schema('marketing')
    .from('google_analytics_traffic')
    .select('sessions, users, new_users, page_views, booking_conversions')
    .gte('date', start)
    .lte('date', end);

  if (!data || data.length === 0) return EMPTY_WEBSITE;

  let sessions = 0, users = 0, newUsers = 0, pageViews = 0, bookingConversions = 0;
  data.forEach((row: Record<string, number | null>) => {
    sessions += Number(row.sessions) || 0;
    users += Number(row.users) || 0;
    newUsers += Number(row.new_users) || 0;
    pageViews += Number(row.page_views) || 0;
    bookingConversions += Number(row.booking_conversions) || 0;
  });

  return { sessions, users, newUsers, pageViews, bookingConversions };
}

async function fetchCompetitors(thisWeekEnd: string, prevWeekEnd: string): Promise<CompetitorSnapshot[]> {
  // Get latest metrics (current snapshot)
  const { data: latestGoogle } = await refacSupabaseAdmin
    .schema('marketing')
    .from('competitor_latest_metrics')
    .select('competitor_id, competitor_name, platform, google_rating, google_review_count')
    .eq('platform', 'google_reviews');

  const { data: latestLine } = await refacSupabaseAdmin
    .schema('marketing')
    .from('competitor_latest_metrics')
    .select('competitor_id, competitor_name, platform, line_friends_count')
    .eq('platform', 'line');

  if (!latestGoogle || latestGoogle.length === 0) return [];

  // Get historical metrics closest to prev week end for WoW comparison
  // Google reviews history
  const { data: prevGoogleMetrics } = await refacSupabaseAdmin
    .schema('marketing')
    .from('competitor_metrics')
    .select('competitor_id, google_review_count, recorded_at')
    .eq('platform', 'google_reviews')
    .gte('recorded_at', `${prevWeekEnd}T00:00:00`)
    .lte('recorded_at', `${prevWeekEnd}T23:59:59`);

  // LINE friends history
  const { data: prevLineMetrics } = await refacSupabaseAdmin
    .schema('marketing')
    .from('competitor_metrics')
    .select('competitor_id, line_friends_count, recorded_at')
    .eq('platform', 'line')
    .gte('recorded_at', `${prevWeekEnd}T00:00:00`)
    .lte('recorded_at', `${prevWeekEnd}T23:59:59`);

  // Build lookup maps for prev week data
  const prevGoogleMap = new Map<number, number>();
  (prevGoogleMetrics || []).forEach((r: Record<string, number | null>) => {
    prevGoogleMap.set(Number(r.competitor_id), Number(r.google_review_count) || 0);
  });

  const prevLineMap = new Map<number, number>();
  (prevLineMetrics || []).forEach((r: Record<string, number | null>) => {
    prevLineMap.set(Number(r.competitor_id), Number(r.line_friends_count) || 0);
  });

  // Build LINE friends lookup from latest
  const lineMap = new Map<number, number>();
  (latestLine || []).forEach((r: Record<string, number | null>) => {
    lineMap.set(Number(r.competitor_id), Number(r.line_friends_count) || 0);
  });

  return latestGoogle.map((row: Record<string, string | number | null>) => {
    const compId = Number(row.competitor_id);
    return {
      name: String(row.competitor_name),
      googleRating: row.google_rating != null ? Number(row.google_rating) : null,
      googleReviewCount: Number(row.google_review_count) || 0,
      prevGoogleReviewCount: prevGoogleMap.get(compId) ?? (Number(row.google_review_count) || 0),
      lineFriends: lineMap.get(compId) ?? 0,
      prevLineFriends: prevLineMap.get(compId) ?? (lineMap.get(compId) ?? 0),
    };
  });
}

async function fetchPackagesSold(start: string, end: string): Promise<number> {
  const { data } = await refacSupabaseAdmin
    .schema('backoffice')
    .from('packages')
    .select('id')
    .gte('created_at', `${start}T00:00:00`)
    .lte('created_at', `${end}T23:59:59`);

  return data?.length || 0;
}

async function fetchNewCustomers(start: string, end: string): Promise<number> {
  const { data } = await refacSupabaseAdmin
    .from('customers')
    .select('id')
    .gte('customer_create_date', start)
    .lte('customer_create_date', end);

  return data?.length || 0;
}

export async function fetchWeeklyData(): Promise<WeeklyData> {
  const { thisWeek, prevWeek } = getWeekRanges();

  console.log(`[weekly-report] Fetching data for ${thisWeek.start} to ${thisWeek.end} (prev: ${prevWeek.start} to ${prevWeek.end})`);

  const [
    revenue, prevRevenue,
    bookings, prevBookings,
    googleAds, prevGoogleAds,
    metaAds, prevMetaAds,
    website, prevWebsite,
    competitors,
    packagesSold, prevPackagesSold,
    newCustomers, prevNewCustomers,
  ] = await Promise.all([
    fetchRevenue(thisWeek.start, thisWeek.end),
    fetchRevenue(prevWeek.start, prevWeek.end),
    fetchBookings(thisWeek.start, thisWeek.end),
    fetchBookings(prevWeek.start, prevWeek.end),
    fetchGoogleAds(thisWeek.start, thisWeek.end),
    fetchGoogleAds(prevWeek.start, prevWeek.end),
    fetchMetaAds(thisWeek.start, thisWeek.end),
    fetchMetaAds(prevWeek.start, prevWeek.end),
    fetchWebsite(thisWeek.start, thisWeek.end),
    fetchWebsite(prevWeek.start, prevWeek.end),
    fetchCompetitors(thisWeek.end, prevWeek.end),
    fetchPackagesSold(thisWeek.start, thisWeek.end),
    fetchPackagesSold(prevWeek.start, prevWeek.end),
    fetchNewCustomers(thisWeek.start, thisWeek.end),
    fetchNewCustomers(prevWeek.start, prevWeek.end),
  ]);

  return {
    week: thisWeek,
    prevWeek,
    revenue, prevRevenue,
    bookings, prevBookings,
    googleAds, prevGoogleAds,
    metaAds, prevMetaAds,
    website, prevWebsite,
    competitors,
    packagesSold, prevPackagesSold,
    newCustomers, prevNewCustomers,
  };
}
