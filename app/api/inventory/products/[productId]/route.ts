import { NextRequest, NextResponse } from 'next/server'
import { refacSupabase as supabase } from '@/lib/refac-supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = params.productId
    const body = await request.json()
    
    // Validate that we have an update payload
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No update data provided' },
        { status: 400 }
      )
    }

    // Update the product
    const { data, error } = await supabase
      .from('inventory_products')
      .update(body)
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('Product update error:', error)
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      product: data 
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 