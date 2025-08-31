import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Type definitions for the API
interface ProductTrendResponse {
  success: boolean;
  data: {
    product_id: string;
    product_name: string;
    current_stock: number | null;
    trend_data: Array<{
      date: string;
      value: number;
      staff: string;
    }>;
  };
  error?: string;
}

// Use the admin Supabase client for consistency with other admin endpoints
const supabase = refacSupabaseAdmin

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    
    // Development bypass check
    const shouldBypass = (
      process.env.NODE_ENV === 'development' &&
      process.env.SKIP_AUTH === 'true'
    );

    if (!shouldBypass) {
      // Check admin authentication
      const session = await getServerSession(authOptions)
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Verify admin permissions
      if (!session.user.isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        )
      }
    }
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    // Get trend data using the database function
    const { data: trendData, error: trendError } = await supabase.rpc(
      'get_product_trend_data', 
      { target_product_id: productId }
    )

    if (trendError) {
      console.error('Trend data query error:', trendError)
      return NextResponse.json(
        { error: 'Failed to fetch trend data' },
        { status: 500 }
      )
    }

    // Check if product exists (trend data will be empty array if product doesn't exist or has no data)
    if (!trendData || trendData.length === 0) {
      // Verify the product exists
      const { data: product, error: productError } = await supabase
        .from('inventory_products')
        .select('id, name, input_type')
        .eq('id', productId)
        .single()

      if (productError || !product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        )
      }

      // Product exists but has no numerical data or no submissions in last 14 days
      const response: ProductTrendResponse = {
        success: true,
        data: {
          product_id: productId,
          product_name: product.name,
          current_stock: null,
          trend_data: []
        }
      }

      return NextResponse.json(response)
    }

    // Process trend data
    const processedTrendData = trendData.map((entry: any) => ({
      date: entry.submission_date,
      value: parseFloat(entry.value_numeric) || 0,
      staff: entry.staff
    }))

    // Get current stock (most recent entry)
    const currentStock = processedTrendData.length > 0 
      ? processedTrendData[0].value 
      : null

    const response: ProductTrendResponse = {
      success: true,
      data: {
        product_id: productId,
        product_name: trendData[0].product_name,
        current_stock: currentStock,
        trend_data: processedTrendData.reverse() // Reverse to show oldest to newest for charting
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Product trend endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 