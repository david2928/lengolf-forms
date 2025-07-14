import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

// GET /api/admin/payroll/public-holidays
export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Fetching public holidays...');

    // Get all public holidays, ordered by date
    const { data: holidays, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('public_holidays')
      .select('*')
      .order('holiday_date', { ascending: true });

    if (error) {
      console.error('Error fetching public holidays:', error);
      return NextResponse.json(
        { error: 'Failed to fetch public holidays' },
        { status: 500 }
      );
    }

    console.log(`✅ Found ${holidays.length} public holidays`);

    return NextResponse.json({
      holidays: holidays || [],
      total: holidays?.length || 0
    });

  } catch (error) {
    console.error('Public holidays API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/payroll/public-holidays
export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { holiday_date, holiday_name, action } = body;

    console.log('🔧 Processing public holiday action:', action, { holiday_date, holiday_name });

    // Validate inputs
    if (!holiday_date || !holiday_name) {
      return NextResponse.json(
        { error: 'Holiday date and name are required' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(holiday_date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validate date is valid
    const holidayDate = new Date(holiday_date);
    if (isNaN(holidayDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date' },
        { status: 400 }
      );
    }

    if (action === 'delete') {
      // Delete holiday
      const { error: deleteError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('public_holidays')
        .delete()
        .eq('holiday_date', holiday_date);

      if (deleteError) {
        console.error('Error deleting holiday:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete holiday' },
          { status: 500 }
        );
      }

      console.log('✅ Holiday deleted successfully');
      return NextResponse.json({
        success: true,
        message: 'Holiday deleted successfully'
      });
    }

    // Add or update holiday
    const { data: holidayData, error: upsertError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('public_holidays')
      .upsert(
        {
          holiday_date: holiday_date,
          holiday_name: holiday_name.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'holiday_date'
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting holiday:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save holiday' },
        { status: 500 }
      );
    }

    console.log('✅ Holiday saved successfully');
    return NextResponse.json({
      success: true,
      message: 'Holiday saved successfully',
      holiday: holidayData
    });

  } catch (error) {
    console.error('Public holidays POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/payroll/public-holidays - Initialize holidays
export async function PUT(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { holidays } = body;

    console.log('🔧 Initializing public holidays...');

    if (!Array.isArray(holidays)) {
      return NextResponse.json(
        { error: 'Holidays must be an array' },
        { status: 400 }
      );
    }

    // Validate each holiday
    for (const holiday of holidays) {
      if (!holiday.holiday_date || !holiday.holiday_name) {
        return NextResponse.json(
          { error: 'Each holiday must have date and name' },
          { status: 400 }
        );
      }
    }

    // Upsert all holidays
    const { data: holidaysData, error: upsertError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('public_holidays')
      .upsert(
        holidays.map((holiday: any) => ({
          holiday_date: holiday.holiday_date,
          holiday_name: holiday.holiday_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })),
        {
          onConflict: 'holiday_date'
        }
      )
      .select();

    if (upsertError) {
      console.error('Error upserting holidays:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save holidays' },
        { status: 500 }
      );
    }

    console.log(`✅ ${holidaysData.length} holidays initialized successfully`);
    return NextResponse.json({
      success: true,
      message: `${holidaysData.length} holidays initialized successfully`,
      holidays: holidaysData
    });

  } catch (error) {
    console.error('Public holidays PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 