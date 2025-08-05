import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { CreateCashCheckRequest, CreateCashCheckResponse } from '@/types/cash-check';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as CreateCashCheckRequest;
    
    // Validate required fields
    if (!body.staff || body.amount === undefined || body.amount === null) {
      return NextResponse.json(
        { error: 'Missing required fields: staff and amount' },
        { status: 400 }
      );
    }

    // Validate staff is one of the allowed options
    const allowedStaff = ['Dolly', 'Net', 'May'];
    if (!allowedStaff.includes(body.staff)) {
      return NextResponse.json(
        { error: 'Invalid staff member. Must be one of: Dolly, Net, May' },
        { status: 400 }
      );
    }

    // Validate amount is a positive number
    if (typeof body.amount !== 'number' || body.amount < 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Insert cash check record
    const { data: cashCheck, error: insertError } = await supabase
      .from('cash_checks')
      .insert({
        staff: body.staff,
        amount: body.amount
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert cash check error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create cash check record' },
        { status: 500 }
      );
    }

    const response: CreateCashCheckResponse = {
      success: true,
      cash_check: cashCheck
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}