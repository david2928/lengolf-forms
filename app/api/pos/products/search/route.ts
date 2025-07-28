import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// Type definitions for product search
interface DatabaseProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
  category_id: string;
  sku: string;
  description: string;
  is_active: boolean;
  pos_display_color: string;
  categories: DatabaseCategory;
}

interface DatabaseCategory {
  id: string;
  name: string;
  parent_id: string | null;
}

interface ScoredProduct extends DatabaseProduct {
  relevanceScore: number;
  category: {
    id?: string;
    name?: string;
    posTabCategory: string;
  };
}

interface TransformedProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
  categoryId: string;
  categoryName?: string;
  posTabCategory?: string;
  sku: string;
  description: string;
  posDisplayColor: string;
  imageUrl: any;
  modifiers: any[];
  relevanceScore: number;
  isActive: boolean;
}

interface SuggestionProduct {
  name: string;
  sku: string;
}

// Helper function to map category names to POS tabs
function mapCategoryToPosTab(categoryName: string): string {
  const name = categoryName.toLowerCase();
  if (name.includes('drink') || name.includes('beverage')) return 'DRINK';
  if (name.includes('food') || name.includes('meal')) return 'FOOD';
  if (name.includes('golf') || name.includes('sport')) return 'GOLF';
  if (name.includes('package') || name.includes('event')) return 'PACKAGE';
  return 'OTHER';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sortBy') || 'relevance';

    if (!query || query.length < 2) {
      return NextResponse.json({
        products: [],
        suggestions: [],
        metadata: {
          query: query || '',
          totalResults: 0,
          searchTime: 0
        }
      });
    }

    const startTime = Date.now();

    // Advanced search with ranking
    let searchQuery = refacSupabaseAdmin
      .schema('products')
      .from('products')
      .select(`
        id,
        name,
        price,
        unit,
        category_id,
        sku,
        description,
        is_active,
        pos_display_color,
        categories!inner(
          id,
          name,
          parent_id
        )
      `)
      .eq('is_active', true);

    // Build search conditions with ranking
    const searchTerms = query.toLowerCase().split(' ').filter((term: string) => term.length > 1);
    
    // Create weighted search across multiple fields
    const searchConditions = [
      // Exact name match (highest priority)
      `name.ilike.${query}`,
      // SKU exact match (high priority)
      `sku.ilike.${query}`,
      // Name starts with (high priority)
      `name.ilike.${query}%`,
      // Name contains (medium priority)
      `name.ilike.%${query}%`,
      // Description contains (lower priority)
      `description.ilike.%${query}%`
    ];

    searchQuery = searchQuery.or(searchConditions.join(','));

    // Apply category filter
    if (category) {
      searchQuery = searchQuery.eq('categories.name', category);
    }

    // Apply price range filter
    if (minPrice) {
      searchQuery = searchQuery.gte('price', parseFloat(minPrice));
    }
    if (maxPrice) {
      searchQuery = searchQuery.lte('price', parseFloat(maxPrice));
    }

    // Apply sorting based on relevance or other criteria
    if (sortBy === 'price_asc') {
      searchQuery = searchQuery.order('price', { ascending: true });
    } else if (sortBy === 'price_desc') {
      searchQuery = searchQuery.order('price', { ascending: false });
    } else if (sortBy === 'name') {
      searchQuery = searchQuery.order('name', { ascending: true });
    } else {
      // Default relevance sorting (exact matches first)
      searchQuery = searchQuery.order('name', { ascending: true });
    }

    searchQuery = searchQuery.limit(limit);

    const { data: products, error: productsError } = await searchQuery;

    if (productsError) {
      console.error('Error searching products:', productsError);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    // Calculate relevance scores and sort by relevance if needed
    const scoredProducts = (products || []).map((product: DatabaseProduct): ScoredProduct => {
      let score = 0;
      const productName = product.name.toLowerCase();
      const productSku = (product.sku || '').toLowerCase();
      const queryLower = query.toLowerCase();

      // Exact name match
      if (productName === queryLower) score += 100;
      // Exact SKU match
      if (productSku === queryLower) score += 90;
      // Name starts with query
      if (productName.startsWith(queryLower)) score += 80;
      // SKU starts with query
      if (productSku.startsWith(queryLower)) score += 70;
      // Name contains query
      if (productName.includes(queryLower)) score += 50;
      // SKU contains query
      if (productSku.includes(queryLower)) score += 40;
      // Description contains query
      if ((product.description || '').toLowerCase().includes(queryLower)) score += 20;

      // Boost score for popular categories or special attributes
      const posTabCategory = mapCategoryToPosTab(product.categories?.name || '');
      if (posTabCategory === 'DRINK') score += 10;
      if (posTabCategory === 'FOOD') score += 5;

      return {
        ...product,
        relevanceScore: score,
        category: {
          id: product.categories?.id,
          name: product.categories?.name,
          posTabCategory: posTabCategory
        }
      };
    });

    // Sort by relevance if that's the selected sort method
    if (sortBy === 'relevance') {
      scoredProducts.sort((a: ScoredProduct, b: ScoredProduct) => b.relevanceScore - a.relevanceScore);
    }

    // Generate search suggestions for autocomplete
    const suggestions = await generateSearchSuggestions(query, category);

    const searchTime = Date.now() - startTime;

    // Transform products for POS interface
    const transformedProducts = scoredProducts.map((product: ScoredProduct): TransformedProduct => ({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      categoryId: product.category_id,
      categoryName: product.category?.name,
      posTabCategory: product.category?.posTabCategory,
      sku: product.sku,
      description: product.description,
      posDisplayColor: product.pos_display_color,
      imageUrl: (product as any).image_url,
      modifiers: (product as any).modifiers || [],
      relevanceScore: product.relevanceScore,
      isActive: product.is_active
    }));

    return NextResponse.json({
      products: transformedProducts,
      suggestions,
      metadata: {
        query,
        totalResults: transformedProducts.length,
        searchTime,
        appliedFilters: {
          category,
          minPrice,
          maxPrice,
          sortBy
        }
      }
    });

  } catch (error) {
    console.error('Error in product search API:', error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

async function generateSearchSuggestions(query: string, category?: string | null): Promise<string[]> {
  try {
    // Get products that start with or contain the query for suggestions
    let suggestionQuery = refacSupabaseAdmin
      .from('products')
      .select('name, sku')
      .eq('is_active', true)
      .or(`name.ilike.${query}%,sku.ilike.${query}%`)
      .limit(10);

    if (category) {
      suggestionQuery = suggestionQuery.eq('category_id', category);
    }

    const { data: suggestionProducts } = await suggestionQuery;

    const suggestions = new Set<string>();
    
    suggestionProducts?.forEach((product: SuggestionProduct) => {
      // Add product name if it matches
      if (product.name.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(product.name);
      }
      // Add SKU if it matches
      if (product.sku && product.sku.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(product.sku);
      }
    });

    return Array.from(suggestions).slice(0, 5);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return [];
  }
}