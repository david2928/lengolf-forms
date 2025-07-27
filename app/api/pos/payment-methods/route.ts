import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get payment methods from the enum table
    const { data: paymentMethods, error } = await supabase
      .schema('pos')
      .from('payment_methods_frontend')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching payment methods:', error);
      return NextResponse.json({ 
        error: "Failed to fetch payment methods" 
      }, { status: 500 });
    }

    // Group by group_code for organized frontend consumption
    const groupedMethods = paymentMethods.reduce((acc, method) => {
      if (!acc[method.group_code]) {
        acc[method.group_code] = {
          group_code: method.group_code,
          group_name: method.group_name,
          methods: []
        };
      }
      acc[method.group_code].methods.push({
        code: method.code,
        display_name: method.display_name,
        database_value: method.database_value,
        requires_amount_input: method.requires_amount_input,
        supports_split_payment: method.supports_split_payment,
        icon_name: method.icon_name,
        color_class: method.color_class,
        instructions: method.instructions
      });
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      payment_methods: paymentMethods,
      grouped_methods: Object.values(groupedMethods)
    });

  } catch (error) {
    console.error('Payment methods API error:', error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}