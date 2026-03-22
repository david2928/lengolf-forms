/**
 * Shared pricing service — single source of truth for all product pricing.
 * Fetches from products.products + products.product_modifiers, cached 5 min.
 *
 * Consumers:
 * - AI suggestion system (via formatPricingForAI)
 * - GET /api/pricing (public endpoint)
 * - Website / booking apps (via API)
 */

import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PricingModifier {
  name: string;
  price: number;
}

export interface PricingProduct {
  name: string;
  price: number;
  modifiers?: PricingModifier[];
}

export interface PricingCatalog {
  bayRates: {
    morning: PricingProduct[];
    afternoon: PricingProduct[];
    evening: PricingProduct[];
  };
  packages: PricingProduct[];
  coaching: PricingProduct[];
  clubRental: {
    indoor: PricingProduct[];
    course: PricingProduct[];
    addons: PricingProduct[];
  };
  mixedPackages: PricingProduct[];
  drinksAndGolf: PricingProduct[];
  events: PricingProduct[];
  fetchedAt: string;
}

// ─── Categories we fetch from the DB ────────────────────────────────────────

const PRICING_CATEGORIES = [
  'Morning', 'Afternoon', 'Evening',
  'Monthly Packages', 'Coaching',
  'Indoor Rental', 'Course Rental', 'Clubs',
  'Mixed Packages', 'Drinks & Golf', 'Events',
] as const;

// ─── Cache ──────────────────────────────────────────────────────────────────

let pricingCache: { data: PricingCatalog; timestamp: number } | null = null;
const PRICING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Core fetch ─────────────────────────────────────────────────────────────

export async function getPricingCatalog(): Promise<PricingCatalog | null> {
  if (pricingCache && (Date.now() - pricingCache.timestamp) < PRICING_CACHE_TTL) {
    return pricingCache.data;
  }

  try {
    if (!refacSupabaseAdmin) return null;

    const { data: products, error } = await refacSupabaseAdmin
      .schema('products')
      .from('products')
      .select(`
        name,
        price,
        display_order,
        categories!inner(name),
        product_modifiers!left(name, price, is_active, display_order)
      `)
      .eq('is_active', true)
      .in('categories.name', [...PRICING_CATEGORIES])
      .order('display_order');

    if (error) {
      console.error('[PricingService] Error fetching products:', error.message);
      return null;
    }

    if (!products || products.length === 0) {
      console.warn('[PricingService] No products found for pricing categories');
      return null;
    }

    const catalog = buildCatalog(products);
    pricingCache = { data: catalog, timestamp: Date.now() };
    return catalog;
  } catch (err) {
    console.error('[PricingService] Unexpected error:', err);
    return null;
  }
}

// ─── Build structured catalog from flat DB rows ─────────────────────────────

interface RawProduct {
  name: string;
  price: string | number;
  display_order: number | null;
  categories: { name: string } | { name: string }[];
  product_modifiers: Array<{ name: string; price: string | number; is_active: boolean; display_order: number | null }> | null;
}

function getCategoryName(product: RawProduct): string {
  const cat = product.categories;
  if (Array.isArray(cat)) return (cat[0]?.name) || 'Unknown';
  return cat?.name || 'Unknown';
}

function toProduct(row: RawProduct): PricingProduct {
  const modifiers = (row.product_modifiers || [])
    .filter(m => m.is_active)
    .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))
    .map(m => ({ name: m.name, price: Number(m.price) }));

  return {
    name: row.name,
    price: Number(row.price),
    ...(modifiers.length > 0 ? { modifiers } : {}),
  };
}

function buildCatalog(products: RawProduct[]): PricingCatalog {
  const byCategory = new Map<string, RawProduct[]>();
  products.forEach(p => {
    const cat = getCategoryName(p);
    const list = byCategory.get(cat) || [];
    list.push(p);
    byCategory.set(cat, list);
  });

  const get = (cat: string): PricingProduct[] =>
    (byCategory.get(cat) || []).map(toProduct);

  // Bay rates: strip modifiers (they're just POS multi-hour billing items, not pricing tiers)
  const getBayRates = (cat: string): PricingProduct[] =>
    get(cat).map(({ modifiers: _modifiers, ...rest }) => rest);

  // Club addons: "Clubs" category items (delivery, etc.)
  const clubAddons = get('Clubs');

  return {
    bayRates: {
      morning: getBayRates('Morning'),
      afternoon: getBayRates('Afternoon'),
      evening: getBayRates('Evening'),
    },
    packages: get('Monthly Packages').filter(p => p.price > 0), // exclude "Package Used 1H" at ฿0
    coaching: get('Coaching').filter(p => p.price > 0), // exclude "Lesson Used" items at ฿0
    clubRental: {
      indoor: get('Indoor Rental'),
      course: get('Course Rental'),
      addons: clubAddons,
    },
    mixedPackages: get('Mixed Packages'),
    drinksAndGolf: get('Drinks & Golf'),
    events: get('Events').filter(p => p.price > 0),
    fetchedAt: new Date().toISOString(),
  };
}

// ─── AI prompt formatting ───────────────────────────────────────────────────

export function formatPricingForAI(catalog: PricingCatalog): { pricing: string; clubRental: string } {
  return {
    pricing: formatGeneralPricing(catalog),
    clubRental: formatClubRentalPricing(catalog),
  };
}

function fmt(price: number): string {
  // Manual formatting to avoid locale inconsistencies in serverless environments
  const rounded = Math.round(price);
  return `฿${rounded.toLocaleString('en-US')}`;
}

function formatGeneralPricing(c: PricingCatalog): string {
  const lines: string[] = [];

  // Bay rates — check if evening differs from afternoon
  lines.push('BAY RATES (per hour, same for Social and AI Bay):');
  const morningWD = c.bayRates.morning.find(p => /weekday/i.test(p.name));
  const morningWE = c.bayRates.morning.find(p => /weekend/i.test(p.name));
  const afternoonWD = c.bayRates.afternoon.find(p => /weekday/i.test(p.name));
  const afternoonWE = c.bayRates.afternoon.find(p => /weekend/i.test(p.name));
  const eveningWD = c.bayRates.evening.find(p => /weekday/i.test(p.name));
  const eveningWE = c.bayRates.evening.find(p => /weekend/i.test(p.name));

  const eveningSameAsAfternoon =
    eveningWD?.price === afternoonWD?.price && eveningWE?.price === afternoonWE?.price;

  if (morningWD && afternoonWD) {
    if (eveningSameAsAfternoon || !eveningWD) {
      lines.push(`- Weekday before 1PM: ${fmt(morningWD.price)} | Afternoon/Evening: ${fmt(afternoonWD.price)}`);
    } else {
      lines.push(`- Weekday before 1PM: ${fmt(morningWD.price)} | Afternoon: ${fmt(afternoonWD.price)} | Evening: ${fmt(eveningWD.price)}`);
    }
  }
  if (morningWE && afternoonWE) {
    if (eveningSameAsAfternoon || !eveningWE) {
      lines.push(`- Weekend before 1PM: ${fmt(morningWE.price)} | Afternoon/Evening: ${fmt(afternoonWE.price)}`);
    } else {
      lines.push(`- Weekend before 1PM: ${fmt(morningWE.price)} | Afternoon: ${fmt(afternoonWE.price)} | Evening: ${fmt(eveningWE.price)}`);
    }
  }
  lines.push('- Standard club rental: FREE');
  lines.push('');

  // Packages
  if (c.packages.length > 0) {
    lines.push('SIMULATOR PACKAGES:');
    const pkgParts = c.packages.map(p => `${p.name}: ${fmt(p.price)}`);
    // Group into lines of 3 for readability
    for (let i = 0; i < pkgParts.length; i += 3) {
      lines.push('- ' + pkgParts.slice(i, i + 3).join(' | '));
    }
    lines.push('');
  }

  // Coaching
  if (c.coaching.length > 0) {
    lines.push('COACHING (bay fee included):');
    c.coaching.forEach(p => {
      lines.push(`- ${p.name}: ${fmt(p.price)}`);
    });
    lines.push('');
  }

  // Mixed packages (Food & Play, Starter)
  if (c.mixedPackages.length > 0) {
    const foodPlay = c.mixedPackages.filter(p => /food.*play|set [a-c]/i.test(p.name));
    const starters = c.mixedPackages.filter(p => /starter/i.test(p.name));
    const others = c.mixedPackages.filter(p => !foodPlay.includes(p) && !starters.includes(p));

    if (foodPlay.length > 0) {
      lines.push('FOOD & PLAY: ' + foodPlay.map(p => `${p.name}: ${fmt(p.price)}`).join(', '));
    }
    if (starters.length > 0) {
      lines.push('STARTER PACKAGES: ' + starters.map(p => `${p.name}: ${fmt(p.price)}`).join(', '));
    }
    if (others.length > 0) {
      others.forEach(p => lines.push(`- ${p.name}: ${fmt(p.price)}`));
    }
  }

  // Drinks & Golf
  if (c.drinksAndGolf.length > 0) {
    lines.push('DRINKS & GOLF: ' + c.drinksAndGolf.map(p => `${p.name}: ${fmt(p.price)}`).join(', '));
  }

  // Events (only named packages like Small/Medium)
  const eventPackages = c.events.filter(p => /small|medium|large|package/i.test(p.name));
  if (eventPackages.length > 0) {
    lines.push('EVENTS: ' + eventPackages.map(p => `${p.name}: ${fmt(p.price)}`).join(', '));
  }

  return lines.join('\n');
}

function formatClubRentalPricing(c: PricingCatalog): string {
  const lines: string[] = [];

  // Indoor rental with modifiers
  lines.push('INDOOR RENTAL (hourly, use at Lengolf during bay session):');
  c.clubRental.indoor.forEach(product => {
    if (product.modifiers && product.modifiers.length > 0) {
      const tiers = product.modifiers.map(m => `${m.name} ${fmt(m.price)}`).join(', ');
      lines.push(`${product.name}: ${tiers}`);
    } else {
      lines.push(`${product.name}: ${fmt(product.price)}/hr`);
    }
  });
  lines.push('');

  // Course rental with modifiers
  lines.push('COURSE RENTAL (take to any golf course, multi-day):');
  c.clubRental.course.forEach(product => {
    if (product.modifiers && product.modifiers.length > 0) {
      const tiers = product.modifiers.map(m => `${m.name}: ${fmt(m.price)}`).join(' | ');
      lines.push(`${product.name}: ${tiers}`);
    } else {
      lines.push(`${product.name}: ${fmt(product.price)}/day`);
    }
  });
  lines.push('No half-day rates. Minimum rental is 1 full day.');
  lines.push('');

  // Add-ons
  if (c.clubRental.addons.length > 0) {
    lines.push('ADD-ONS:');
    c.clubRental.addons.forEach(p => {
      lines.push(`- ${p.name}: ${fmt(p.price)}`);
    });
  }

  return lines.join('\n');
}
