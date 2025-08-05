import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: { discountId: string } }
) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { discountId } = params;

    if (!discountId) {
      return NextResponse.json({ error: "Discount ID is required" }, { status: 400 });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
      process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch discount details
    const { data: discount, error } = await supabase
      .schema('pos')
      .from('discounts')
      .select('*')
      .eq('id', discountId)
      .single();

    if (error) {
      console.error('Error fetching discount:', error);
      return NextResponse.json({ error: "Failed to fetch discount details" }, { status: 500 });
    }

    if (!discount) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 });
    }

    return NextResponse.json({ discount });

  } catch (error) {
    console.error('Error in discount details API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}