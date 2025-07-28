import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

// Type definitions for category hierarchy
interface DatabaseCategory {
  id: string;
  name: string;
  parent_id: string | null;
  display_order: number | null;
  color_code: string | null;
  icon: string | null;
  description: string | null;
  is_active: boolean;
}

interface ProductCountData {
  category_id: string;
}

interface CategoryHierarchy {
  id: string;
  name: string;
  parentId: string | null;
  posTabCategory: string;
  displayOrder: number | null;
  colorTheme: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  productCount?: number;
  totalProductCount?: number;
  children: CategoryHierarchy[];
  level: number;
  path: string[];
}

interface TabStats {
  categories: number;
  totalProducts: number;
  maxDepth: number;
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
    const includeProductCount = searchParams.get('includeProductCount') === 'true';
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    // Fetch all categories
    let query = refacSupabaseAdmin
      .schema('products')
      .from('categories')
      .select('*');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    query = query.order('display_order').order('name');

    const { data: categories, error: categoriesError } = await query;

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }

    // Get product counts per category if requested
    let productCounts: Record<string, number> = {};
    if (includeProductCount) {
      const { data: productCountData, error: countError } = await refacSupabaseAdmin
        .schema('products')
        .from('products')
        .select('category_id')
        .eq('is_active', true);

      if (!countError && productCountData) {
        productCounts = productCountData.reduce((acc: Record<string, number>, product: ProductCountData) => {
          acc[product.category_id] = (acc[product.category_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Build category hierarchy tree
    const categoryMap = new Map<string, CategoryHierarchy>((categories || []).map((cat: DatabaseCategory): [string, CategoryHierarchy] => [cat.id, {
      id: cat.id,
      name: cat.name,
      parentId: cat.parent_id,
      posTabCategory: mapCategoryToPosTab(cat.name),
      displayOrder: cat.display_order,
      colorTheme: cat.color_code || '#6B7280',
      icon: cat.icon,
      description: cat.description,
      isActive: cat.is_active,
      productCount: includeProductCount ? (productCounts[cat.id] || 0) : undefined,
      children: [] as CategoryHierarchy[],
      level: 0,
      path: [] as string[]
    }]));

    // Build tree structure with levels and paths
    const buildHierarchy = (parentId: string | null = null, level: number = 0, parentPath: string[] = []): CategoryHierarchy[] => {
      const categoriesArray = Array.from(categoryMap.values()) as CategoryHierarchy[];
      return categoriesArray
        .filter((cat: CategoryHierarchy) => cat.parentId === parentId)
        .map((cat: CategoryHierarchy) => {
          const currentPath = [...parentPath, cat.name];
          const categoryWithHierarchy = {
            ...cat,
            level,
            path: currentPath,
            children: buildHierarchy(cat.id, level + 1, currentPath)
          };

          // Calculate total product count including children
          if (includeProductCount) {
            const calculateTotalProducts = (category: CategoryHierarchy): number => {
              let total = category.productCount || 0;
              category.children.forEach((child: CategoryHierarchy) => {
                total += calculateTotalProducts(child);
              });
              return total;
            };
            categoryWithHierarchy.totalProductCount = calculateTotalProducts(categoryWithHierarchy);
          }

          return categoryWithHierarchy;
        })
        .sort((a: CategoryHierarchy, b: CategoryHierarchy) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.name.localeCompare(b.name));
    };

    const hierarchyTree = buildHierarchy();

    // Create tab-based organization for POS interface
    const tabHierarchy = {
      DRINK: hierarchyTree.filter((cat: CategoryHierarchy) => cat.posTabCategory === 'DRINK'),
      FOOD: hierarchyTree.filter((cat: CategoryHierarchy) => cat.posTabCategory === 'FOOD'),
      GOLF: hierarchyTree.filter((cat: CategoryHierarchy) => cat.posTabCategory === 'GOLF'),
      PACKAGES: hierarchyTree.filter((cat: CategoryHierarchy) => cat.posTabCategory === 'PACKAGES'),
      OTHER: hierarchyTree.filter((cat: CategoryHierarchy) => !cat.posTabCategory || cat.posTabCategory === 'OTHER')
    };

    // Create flat list for easy lookup
    const flatCategories: CategoryHierarchy[] = Array.from(categoryMap.values());

    // Get category navigation breadcrumbs for each category
    const getCategoryBreadcrumbs = (categoryId: string): string[] => {
      const category: CategoryHierarchy | undefined = categoryMap.get(categoryId);
      if (!category) return [];
      
      if (!category.parentId) return [category.name];
      
      return [...getCategoryBreadcrumbs(category.parentId), category.name];
    };

    const categoryBreadcrumbs = Object.fromEntries(
      flatCategories.map((cat: CategoryHierarchy) => [cat.id, getCategoryBreadcrumbs(cat.id)])
    );

    // Calculate tab statistics
    const tabStats = Object.entries(tabHierarchy).reduce((acc: Record<string, TabStats>, [tab, cats]: [string, CategoryHierarchy[]]) => {
      const calculateTabStats = (categories: CategoryHierarchy[]): TabStats => {
        let categoryCount = categories.length;
        let totalProducts = 0;
        let maxDepth = 0;

        categories.forEach((cat: CategoryHierarchy) => {
          // Count this category
          categoryCount += cat.children.length;
          
          // Count products (including children)
          if (includeProductCount) {
            totalProducts += cat.totalProductCount || 0;
          }
          
          // Calculate max depth
          const getDepth = (category: CategoryHierarchy, currentDepth: number = 1): number => {
            if (category.children.length === 0) return currentDepth;
            return Math.max(...category.children.map((child: CategoryHierarchy) => getDepth(child, currentDepth + 1)));
          };
          
          maxDepth = Math.max(maxDepth, getDepth(cat));
          
          // Recursively count children
          if (cat.children.length > 0) {
            const childStats = calculateTabStats(cat.children);
            categoryCount += childStats.categories;
            totalProducts += childStats.totalProducts;
            maxDepth = Math.max(maxDepth, childStats.maxDepth + 1);
          }
        });

        return { categories: categoryCount, totalProducts, maxDepth };
      };

      acc[tab] = calculateTabStats(cats);
      return acc;
    }, {} as Record<string, TabStats>);

    return NextResponse.json({
      hierarchy: hierarchyTree,
      tabHierarchy,
      flatCategories,
      categoryBreadcrumbs,
      tabStats,
      metadata: {
        totalCategories: flatCategories.length,
        maxDepth: Math.max(...Object.values(tabStats).map((stat: TabStats) => stat.maxDepth)),
        tabCount: Object.keys(tabHierarchy).filter(tab => tabHierarchy[tab as keyof typeof tabHierarchy].length > 0).length,
        includeProductCount,
        activeOnly,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in category hierarchy API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}