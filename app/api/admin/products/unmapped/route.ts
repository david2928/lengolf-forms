import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key for pos schema access
const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get unmapped products directly with SQL query
    const { data: unmappedData, error: unmappedError } = await supabase
      .schema('pos')
      .from('lengolf_sales_staging')
      .select('transaction_item')
      .not('transaction_item', 'is', null)
      .neq('transaction_item', '')
      .then(async (result) => {
        if (result.error) return result;
        
        // Get all mapped products
        const { data: mappedProducts, error: mappedError } = await supabase
          .schema('pos')
          .from('product_mappings')
          .select('pos_product_name');
        
        if (mappedError) return { data: null, error: mappedError };
        
        // Create a set of trimmed mapped product names for efficient lookup
        const mappedSet = new Set(mappedProducts.map(p => p.pos_product_name.trim().toLowerCase()));
        
        // Filter out mapped products and group by name
        const unmappedMap = new Map();
        
        result.data.forEach(item => {
          const trimmed = item.transaction_item.trim().toLowerCase();
          if (!mappedSet.has(trimmed)) {
            const original = item.transaction_item;
            if (unmappedMap.has(trimmed)) {
              unmappedMap.set(trimmed, {
                pos_product_name: original,
                usage_count: unmappedMap.get(trimmed).usage_count + 1,
                is_unmapped: true,
                suggested_price: 0
              });
            } else {
              unmappedMap.set(trimmed, {
                pos_product_name: original,
                usage_count: 1,
                is_unmapped: true,
                suggested_price: 0
              });
            }
          }
        });
        
        // Convert map to array and sort by usage count
        const unmappedArray = Array.from(unmappedMap.values())
          .sort((a, b) => b.usage_count - a.usage_count);
        
        return { data: unmappedArray, error: null };
      });

    if (unmappedError) {
      console.error('Error fetching unmapped products:', unmappedError);
      return NextResponse.json({ error: "Failed to fetch unmapped products" }, { status: 500 });
    }

    // Calculate stats
    const totalProducts = await supabase
      .schema('pos')
      .from('lengolf_sales_staging')
      .select('transaction_item', { count: 'exact' })
      .not('transaction_item', 'is', null)
      .neq('transaction_item', '')
      .then(result => {
        if (result.error) return 0;
        // Count distinct products
        const distinctProducts = new Set(result.data.map(item => item.transaction_item.trim().toLowerCase()));
        return distinctProducts.size;
      });

    const mappedProducts = await supabase
      .schema('pos')
      .from('product_mappings')
      .select('pos_product_name', { count: 'exact' })
      .then(result => result.count || 0);

    const stats = {
      total_pos_products: totalProducts,
      mapped_products: mappedProducts,
      unmapped_products: unmappedData.length
    };

    return NextResponse.json({
      success: true,
      data: unmappedData || [],
      stats: stats
    });

  } catch (error) {
    console.error('Error in unmapped products API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { pos_product_name, product_id, action, ...productData } = await request.json();

    if (!pos_product_name || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (action === 'map_existing') {
      if (!product_id) {
        return NextResponse.json({ error: "Product ID required for mapping" }, { status: 400 });
      }

      // Step 1: Create mapping in the product_mappings table
      const { error: mappingError } = await supabase
        .schema('pos')
        .from('product_mappings')
        .upsert({ 
          pos_product_name: pos_product_name,
          product_id: product_id,
          mapped_by: session.user.email
        }, {
          onConflict: 'pos_product_name'
        });

      if (mappingError) {
        console.error('Error creating product mapping:', mappingError);
        return NextResponse.json({ error: "Failed to create product mapping" }, { status: 500 });
      }

      // Step 2: Update historical sales data with the product_id
      const { error: salesUpdateError } = await supabase
        .schema('pos')
        .from('lengolf_sales')
        .update({ 
          product_id: product_id
        })
        .eq('product_name', pos_product_name);

      if (salesUpdateError) {
        console.error('Error updating sales data:', salesUpdateError);
        return NextResponse.json({ error: "Failed to update sales data" }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Successfully mapped "${pos_product_name}" to existing product and updated sales data`,
        action: 'mapped'
      });

    } else if (action === 'create_new') {
      const { name, category_id, price, cost, sku, description, is_sim_usage, show_in_staff_ui } = productData;

      if (!name || !category_id) {
        return NextResponse.json({ error: "Name and category required for new product" }, { status: 400 });
      }

      // Create slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      // Create new product
      const { data: newProduct, error } = await supabase
        .schema('products')
        .from('products')
        .insert({
          name,
          slug,
          category_id,
          price: price || 0,
          cost: cost || 0,
          sku: sku && sku.trim() ? sku.trim() : null,
          description: description && description.trim() ? description.trim() : null,
          is_sim_usage: is_sim_usage || false,
          show_in_staff_ui: show_in_staff_ui || false,
          is_custom_product: false,
          created_by: session.user.email
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating new product:', error);
        return NextResponse.json({ error: "Failed to create new product" }, { status: 500 });
      }

      // Step 2: Create mapping for the new product
      const { error: mappingError } = await supabase
        .schema('pos')
        .from('product_mappings')
        .insert({ 
          pos_product_name: pos_product_name,
          product_id: newProduct.id,
          mapped_by: session.user.email
        });

      if (mappingError) {
        console.error('Error creating product mapping:', mappingError);
        return NextResponse.json({ error: "Failed to create product mapping" }, { status: 500 });
      }

      // Step 3: Update historical sales data with the new product_id
      const { error: salesUpdateError } = await supabase
        .schema('pos')
        .from('lengolf_sales')
        .update({ 
          product_id: newProduct.id
        })
        .eq('product_name', pos_product_name);

      if (salesUpdateError) {
        console.error('Error updating sales data:', salesUpdateError);
        return NextResponse.json({ error: "Failed to update sales data" }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Successfully created new product "${name}" for "${pos_product_name}" and updated sales data`,
        action: 'created',
        product: newProduct
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error('Error in product mapping API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}