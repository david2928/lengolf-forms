import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabase } from '@/lib/refac-supabase';

// GET /api/admin/products/export - Export products to CSV
export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all products with categories
    const { data: products, error } = await refacSupabase
      .schema('products')
      .from('products')
      .select(`
        *,
        category:category_id (
          name,
          parent:parent_id (
            name
          )
        )
      `)
      .order('name');

    if (error) {
      console.error('Error fetching products for export:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    // Generate CSV content with comprehensive fields
    const headers = [
      'Product ID',
      'Product Name',
      'Slug',
      'Tab (Parent Category)',
      'Category', 
      'Category ID',
      'SKU',
      'External Code',
      'Barcode',
      'Price (THB)',
      'Cost (THB)',
      'Profit Margin (%)',
      'Unit',
      'Status',
      'Is Sim Usage',
      'Is Custom Product',
      'Show in Staff UI',
      'Display Order',
      'POS Display Color',
      'Description',
      'Created At',
      'Updated At',
      'Legacy Qashier ID',
      'Legacy POS Name'
    ];

    const csvRows = [headers.join(',')];

    products?.forEach((product: any) => {
      const category = product.category as any;
      const tab = category?.parent?.name || '';
      const categoryName = category?.name || '';
      const profitMargin = product.profit_margin ? `${product.profit_margin.toFixed(2)}%` : '';
      
      const row = [
        `"${product.id}"`,
        `"${product.name || ''}"`,
        `"${product.slug || ''}"`,
        `"${tab}"`,
        `"${categoryName}"`,
        `"${product.category_id || ''}"`,
        `"${product.sku || ''}"`,
        `"${product.external_code || ''}"`,
        `"${product.barcode || ''}"`,
        product.price || 0,
        product.cost || 0,
        `"${profitMargin}"`,
        `"${product.unit || ''}"`,
        product.is_active ? 'Active' : 'Inactive',
        product.is_sim_usage ? 'Yes' : 'No',
        product.is_custom_product ? 'Yes' : 'No',
        product.show_in_staff_ui ? 'Yes' : 'No',
        product.display_order || 0,
        `"${product.pos_display_color || ''}"`,
        `"${product.description || ''}"`,
        `"${product.created_at || ''}"`,
        `"${product.updated_at || ''}"`,
        `"${product.legacy_qashier_id || ''}"`,
        `"${product.legacy_pos_name || ''}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="products-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}