import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First fetch active categories
    const { data: activeCategories, error: catError } = await supabase
      .schema('products')
      .from('categories')
      .select('id, name, parent_id')
      .eq('is_active', true);

    if (catError) {
      console.error('Error fetching categories:', catError);
      return NextResponse.json({ error: catError.message }, { status: 500 });
    }

    const activeCategoryIds = activeCategories?.map((cat: any) => cat.id) || [];
    
    // Fetch products with category hierarchy, filtering by active categories
    const { data: productsData, error } = await supabase
      .schema('products')
      .from('products')
      .select(`
        id,
        name,
        sku,
        category_id,
        categories (
          id,
          name,
          parent_id,
          is_active,
          parent:parent_id (
            name,
            is_active
          )
        )
      `)
      .eq('is_active', true)
      .in('category_id', activeCategoryIds)
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format products with category hierarchy, only including those with active categories
    const formattedProducts = productsData?.filter((p: any) => 
      p.categories?.is_active && 
      (!p.categories?.parent || p.categories?.parent?.is_active)
    ).map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku || '',
      category_name: p.categories?.name || 'Uncategorized',
      parent_category_name: p.categories?.parent?.name || '',
      category_id: p.category_id
    })) || [];

    // Group into categories for easier selection
    const categoryMap = new Map();
    formattedProducts.forEach((product: any) => {
      const categoryKey = `${product.parent_category_name}::${product.category_name}`;
      if (!categoryMap.has(categoryKey)) {
        categoryMap.set(categoryKey, {
          id: categoryKey,
          name: product.category_name,
          parent_name: product.parent_category_name,
          category_id: product.category_id,
          products: []
        });
      }
      categoryMap.get(categoryKey).products.push(product);
    });

    // Filter to only include categories under the main parents or main parents themselves
    const validParents = ['Drink', 'Food', 'Golf', 'Packages'];
    const categories = Array.from(categoryMap.values()).filter(cat => 
      validParents.includes(cat.parent_name) || 
      (cat.parent_name === '' && validParents.includes(cat.name))
    );

    return NextResponse.json({ 
      products: formattedProducts,
      categories: categories
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}