import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tableSessionId = searchParams.get('tableSessionId');

    if (!tableSessionId) {
      return NextResponse.json({ error: "tableSessionId is required" }, { status: 400 });
    }

    // For now, return empty orders array until we implement the full order system
    // This fixes the 404 error in useOrderStore
    return NextResponse.json({
      orders: [],
      total: 0
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // For now, return a mock order response
    // This will be implemented properly with the full order system
    const mockOrder = {
      id: `order-${Date.now()}`,
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      tableSessionId: body.tableSessionId,
      customerId: body.customerId,
      items: body.items || [],
      status: 'draft',
      subtotal: 0,
      totalAmount: 0,
      vatAmount: 0,
      discountAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json(mockOrder);

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}