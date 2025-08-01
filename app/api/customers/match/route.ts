/**
 * Customer Matching API Endpoint
 * CMS-006: Customer Mapping Service API
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { customerMappingService } from '@/lib/customer-mapping-service';

interface CustomerMatchRequest {
  phone?: string;
  customerName?: string;
  email?: string;
}

// POST /api/customers/match - Find matching customer
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: CustomerMatchRequest = await request.json();

    if (!body.phone && !body.customerName && !body.email) {
      return NextResponse.json(
        { error: "At least one search parameter (phone, customerName, or email) is required" },
        { status: 400 }
      );
    }

    const match = await customerMappingService.findCustomerMatch(body);

    return NextResponse.json({
      match: match,
      found: !!match,
      matchMethod: match?.match_method || null
    });

  } catch (error: any) {
    console.error('Error matching customer:', error);
    return NextResponse.json(
      { error: "Failed to match customer", details: error.message },
      { status: 500 }
    );
  }
}