import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();
    
    if (!pin) {
      return NextResponse.json({ success: false, error: 'PIN required' }, { status: 400 });
    }

    // Simple direct lookup - no bcrypt, no complexity
    const { data: staff, error } = await supabase
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, staff_id, is_active, created_at, updated_at')
      .eq('clear_pin', pin)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }

    if (!staff) {
      return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
    }

    // Success - return staff info
    return NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        staff_name: staff.staff_name,
        staff_id: staff.staff_id,
        is_active: staff.is_active,
        created_at: staff.created_at,
        updated_at: staff.updated_at
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}