import { NextRequest, NextResponse } from 'next/server'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'
import { refacSupabase } from '@/lib/refac-supabase'
import { UpdateProductMetadataRequest } from '@/types/inventory'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Response type for this API
interface UpdateProductMetadataResponse {
  success: boolean;
  product?: any;
  error?: string;
}

// Use the correct Supabase client
const supabase = refacSupabase

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    
    // Check admin authentication
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const updateData: UpdateProductMetadataRequest = await request.json()

    // Validate the update data
    const validationError = validateUpdateData(updateData)
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      )
    }

    // Prepare update object with only the fields that were provided
    const updateObject: any = {}
    if (updateData.unit_cost !== undefined) updateObject.unit_cost = updateData.unit_cost
    if (updateData.notes !== undefined) updateObject.notes = updateData.notes
    if (updateData.reorder_threshold !== undefined) updateObject.reorder_threshold = updateData.reorder_threshold

    // Add updated_at timestamp
    updateObject.updated_at = new Date().toISOString()

    // Update the product in the database
    const { data: updatedProduct, error: updateError } = await supabase
      .from('inventory_products')
      .update(updateObject)
      .eq('id', productId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Product update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      )
    }

    if (!updatedProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const response: UpdateProductMetadataResponse = {
      success: true,
      product: updatedProduct
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Product update endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    
    // Check admin authentication
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Fetch the product
    const { data: product, error } = await supabase
      .from('inventory_products')
      .select('*')
      .eq('id', productId)
      .single()

    if (error) {
      console.error('Product fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch product' },
        { status: 500 }
      )
    }

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, product })

  } catch (error) {
    console.error('Product fetch endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Validation helper function
function validateUpdateData(data: UpdateProductMetadataRequest): string | null {
  // Validate unit_cost
  if (data.unit_cost !== undefined) {
    if (typeof data.unit_cost !== 'number' || data.unit_cost < 0) {
      return 'Unit cost must be a non-negative number'
    }
  }

  // Validate notes
  if (data.notes !== undefined && data.notes !== null) {
    if (typeof data.notes !== 'string') {
      return 'Notes must be a string'
    }
    if (data.notes.length > 1000) {
      return 'Notes must be less than 1000 characters'
    }
  }

  // Validate reorder_threshold
  if (data.reorder_threshold !== undefined) {
    if (typeof data.reorder_threshold !== 'number' || data.reorder_threshold < 0) {
      return 'Reorder threshold must be a non-negative number'
    }
  }

  return null
} 