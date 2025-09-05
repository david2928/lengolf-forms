import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { getNextDailyOrderNumber } from '@/services/vendor-order-service';

interface VendorOrderNumberRequest {
  vendor: string;
}

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { vendor }: VendorOrderNumberRequest = await request.json();

    // Validate request
    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor name is required" },
        { status: 400 }
      );
    }

    // Get next daily order number for the vendor
    const nextOrderNumber = await getNextDailyOrderNumber(vendor);

    return NextResponse.json({
      success: true,
      vendor,
      nextOrderNumber
    });

  } catch (error) {
    console.error('Error getting next order number:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}