import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { processVendorNotification, VendorOrderItem } from '@/services/vendor-order-service';

interface VendorNotificationRequest {
  orderId: string;
  vendorItems: {
    vendor: string;
    items: VendorOrderItem[];
  }[];
  staffName?: string;
  customMessage?: string;
}

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orderId, vendorItems, staffName, customMessage }: VendorNotificationRequest = await request.json();

    // Validate request
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!vendorItems || !Array.isArray(vendorItems) || vendorItems.length === 0) {
      return NextResponse.json(
        { error: "Vendor items are required" },
        { status: 400 }
      );
    }

    // Validate each vendor item group
    for (const vendorGroup of vendorItems) {
      if (!vendorGroup.vendor || !vendorGroup.items || !Array.isArray(vendorGroup.items)) {
        return NextResponse.json(
          { error: "Each vendor group must have vendor name and items array" },
          { status: 400 }
        );
      }

      // Validate individual items
      for (const item of vendorGroup.items) {
        if (!item.productId || !item.productName || !item.quantity || item.quantity <= 0) {
          return NextResponse.json(
            { error: "Each item must have productId, productName, and positive quantity" },
            { status: 400 }
          );
        }
      }
    }

    console.log(`Processing vendor notifications for order ${orderId}:`, vendorItems.map(v => `${v.vendor} (${v.items.length} items)`));

    // Process vendor notifications
    await processVendorNotification(orderId, vendorItems, staffName || session.user.email, customMessage);

    return NextResponse.json({
      success: true,
      message: "Vendor notifications processed successfully",
      vendorCount: vendorItems.length,
      totalItems: vendorItems.reduce((sum, v) => sum + v.items.length, 0)
    });

  } catch (error) {
    console.error('Error processing vendor notifications:', error);
    
    // Return specific error message if available
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}