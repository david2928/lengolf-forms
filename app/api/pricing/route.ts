import { NextRequest, NextResponse } from 'next/server';
import { getPricingCatalog, PricingCatalog } from '@/lib/pricing-service';

/**
 * GET /api/pricing — Public pricing endpoint.
 * Returns current product pricing from the POS database.
 *
 * Query params:
 *   ?category=bayRates,packages  — optional, comma-separated list of categories to return
 *
 * No authentication required (prices are public).
 */
export async function GET(request: NextRequest) {
  try {
    const catalog = await getPricingCatalog();

    if (!catalog) {
      return NextResponse.json(
        { error: 'Unable to fetch pricing data' },
        { status: 503 }
      );
    }

    // Optional category filter
    const categoryParam = request.nextUrl.searchParams.get('category');
    let responseData: Partial<PricingCatalog> & { fetchedAt: string } = catalog;

    if (categoryParam) {
      const requested = new Set(categoryParam.split(',').map(c => c.trim()));
      const validKeys: (keyof Omit<PricingCatalog, 'fetchedAt'>)[] = [
        'bayRates', 'packages', 'coaching', 'clubRental',
        'mixedPackages', 'drinksAndGolf', 'events',
      ];

      const filtered: Record<string, unknown> = { fetchedAt: catalog.fetchedAt };
      validKeys.forEach(key => {
        if (requested.has(key)) {
          filtered[key] = catalog[key];
        }
      });
      responseData = filtered as Partial<PricingCatalog> & { fetchedAt: string };
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 min
      },
    });
  } catch (error) {
    console.error('[API /pricing] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
