import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { AdminInventoryOverview } from '@/types/inventory'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Use the admin Supabase client for server-side operations
const supabase = refacSupabaseAdmin

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify admin permissions (assuming isAdmin field exists in session)
    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Execute the reorder analysis query
    const { data: reorderData, error: reorderError } = await supabase.rpc('get_inventory_overview_with_reorder_status')

    if (reorderError) {
      console.error('Reorder analysis query error:', reorderError)
      return NextResponse.json(
        { error: 'Failed to fetch inventory data' },
        { status: 500 }
      )
    }

    // Process the data into the required format
    const needsReorder = reorderData?.filter((item: any) => item.reorder_status === 'REORDER_NEEDED') || []
    const lowStock = reorderData?.filter((item: any) => item.reorder_status === 'LOW_STOCK') || []
    const sufficientStock = reorderData?.filter((item: any) => item.reorder_status === 'ADEQUATE') || []

    // Calculate summary statistics
    const totalInventoryValue = reorderData?.reduce((total: number, item: any) => {
      const value = (item.unit_cost || 0) * (item.current_stock || 0)
      return total + value
    }, 0) || 0

    const overview: AdminInventoryOverview = {
      summary: {
        total_inventory_value: Math.round(totalInventoryValue * 100) / 100, // Round to 2 decimal places
        needs_reorder_count: needsReorder.length,
        low_stock_count: lowStock.length,
        sufficient_stock_count: sufficientStock.length,
      },
      products: {
        needs_reorder: needsReorder.map(mapToAdminProduct),
        low_stock: lowStock.map(mapToAdminProduct),
        sufficient_stock: sufficientStock.map(mapToAdminProduct),
      }
    }

    return NextResponse.json(overview)

  } catch (error) {
    console.error('Admin inventory overview error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to map database result to AdminInventoryProductWithStatus
function mapToAdminProduct(item: any) {
  return {
    id: item.product_id || item.id,
    name: item.product_name || item.name,
    category_id: item.category_id,
    category_name: item.category_name,
    current_stock: item.current_stock,
    reorder_threshold: item.reorder_threshold,
    unit_cost: item.unit_cost,
    image_url: item.image_url,
    purchase_link: item.purchase_link,
    supplier: item.supplier,
    unit: item.unit,
    input_type: item.input_type,
    last_updated_by: item.last_updated_by || item.staff,
    last_updated_date: item.last_submission_date || item.date,
    reorder_status: item.reorder_status,
    stock_difference: item.stock_difference,
    inventory_value: item.unit_cost && item.current_stock 
      ? Math.round(item.unit_cost * item.current_stock * 100) / 100 
      : null,
  }
} 