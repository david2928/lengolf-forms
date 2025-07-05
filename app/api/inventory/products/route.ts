import { NextResponse } from 'next/server'
import { refacSupabase as supabase } from '@/lib/refac-supabase'
import { ProductsApiResponse } from '@/types/inventory'

export async function GET() {
  try {
    // Fetch categories with their products
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('inventory_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (categoriesError) {
      console.error('Categories fetch error:', categoriesError)
      return NextResponse.json(
        { error: 'Failed to fetch inventory categories' },
        { status: 500 }
      )
    }

    // Fetch products for all categories
    const { data: productsData, error: productsError } = await supabase
      .from('inventory_products')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (productsError) {
      console.error('Products fetch error:', productsError)
      return NextResponse.json(
        { error: 'Failed to fetch inventory products' },
        { status: 500 }
      )
    }

    // Group products by category
    const categoriesWithProducts = categoriesData.map(category => ({
      id: category.id,
      name: category.name,
      display_order: category.display_order,
      products: productsData.filter(product => product.category_id === category.id)
    }))

    const response: ProductsApiResponse = {
      categories: categoriesWithProducts
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 