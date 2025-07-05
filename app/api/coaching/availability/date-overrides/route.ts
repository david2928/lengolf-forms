import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get('coach_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Get current user information
    const { data: currentUser, error: userError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, email, is_admin, is_coach')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    // Determine which coach's overrides to fetch
    let targetCoachId = currentUser.id;
    if (currentUser.is_admin && coachId) {
      targetCoachId = coachId;
    } else if (!currentUser.is_coach && !currentUser.is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build query
    let query = supabase
      .from('coach_date_overrides')
      .select('*')
      .eq('coach_id', targetCoachId)
      .order('override_date')
      .order('start_time');

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('override_date', startDate);
    }
    if (endDate) {
      query = query.lte('override_date', endDate);
    }

    // If no date filters provided, get overrides for next 90 days
    if (!startDate && !endDate) {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      query = query.gte('override_date', today).lte('override_date', futureDateStr);
    }

    const { data: dateOverrides, error } = await query;

    if (error) {
      console.error('Error fetching date overrides:', error);
      return NextResponse.json({ error: 'Failed to fetch date overrides' }, { status: 500 });
    }

    return NextResponse.json({
      dateOverrides: dateOverrides || [],
      coachId: targetCoachId
    });

  } catch (error) {
    console.error('Error in date overrides API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { coachId, overrideDate, startTime, endTime, overrideType } = body;

    // Get current user information
    const { data: currentUser, error: userError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, email, is_admin, is_coach')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    // Check permissions
    let targetCoachId = currentUser.id;
    if (currentUser.is_admin && coachId) {
      targetCoachId = coachId;
    } else if (!currentUser.is_coach && !currentUser.is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    } else if (currentUser.is_coach && coachId && coachId !== currentUser.id) {
      return NextResponse.json({ error: 'Can only modify your own schedule' }, { status: 403 });
    }

    // Validate input
    if (!overrideDate) {
      return NextResponse.json({ error: 'Override date is required' }, { status: 400 });
    }

    const validOverrideTypes = ['unavailable', 'available'];
    if (!overrideType || !validOverrideTypes.includes(overrideType)) {
      return NextResponse.json({ error: 'Valid override type is required' }, { status: 400 });
    }

    // For unavailable and available types, start and end times are required
    if ((overrideType === 'unavailable' || overrideType === 'available') && (!startTime || !endTime)) {
      return NextResponse.json({ error: 'Start time and end time are required for this override type' }, { status: 400 });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(overrideDate)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }

    // Create date override
    const insertData: any = {
      coach_id: targetCoachId,
      override_date: overrideDate,
      override_type: overrideType,
      start_time: startTime,
      end_time: endTime
    };

    const { data, error } = await supabase
      .from('coach_date_overrides')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating date override:', error);
      
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json({ error: 'An override already exists for this date and time' }, { status: 409 });
      }
      
      return NextResponse.json({ error: 'Failed to create date override' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Date override created successfully',
      override: data
    });

  } catch (error) {
    console.error('Error in date overrides API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, overrideDate, startTime, endTime, overrideType } = body;

    if (!id) {
      return NextResponse.json({ error: 'Override ID is required' }, { status: 400 });
    }

    // Get current user information
    const { data: currentUser, error: userError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, email, is_admin, is_coach')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    // Check if user can modify this override
    const { data: existingOverride, error: overrideError } = await supabase
      .from('coach_date_overrides')
      .select('coach_id')
      .eq('id', id)
      .single();

    if (overrideError || !existingOverride) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 });
    }

    if (!currentUser.is_admin && existingOverride.coach_id !== currentUser.id) {
      return NextResponse.json({ error: 'Can only modify your own overrides' }, { status: 403 });
    }

    // Validate input
    const updateData: any = {};

    if (overrideDate !== undefined) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(overrideDate)) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
      }
      updateData.override_date = overrideDate;
    }

    if (overrideType !== undefined) {
      const validOverrideTypes = ['unavailable', 'available'];
      if (!validOverrideTypes.includes(overrideType)) {
        return NextResponse.json({ error: 'Invalid override type' }, { status: 400 });
      }
      updateData.override_type = overrideType;
    }

    if (startTime !== undefined) {
      updateData.start_time = startTime;
    }

    if (endTime !== undefined) {
      updateData.end_time = endTime;
    }


    updateData.updated_at = new Date().toISOString();

    // Update date override
    const { data, error } = await supabase
      .from('coach_date_overrides')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating date override:', error);
      
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json({ error: 'An override already exists for this date and time' }, { status: 409 });
      }
      
      return NextResponse.json({ error: 'Failed to update date override' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Date override updated successfully',
      override: data
    });

  } catch (error) {
    console.error('Error in date overrides API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Override ID is required' }, { status: 400 });
    }

    // Get current user information
    const { data: currentUser, error: userError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, email, is_admin, is_coach')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    // Check if user can delete this override
    const { data: existingOverride, error: overrideError } = await supabase
      .from('coach_date_overrides')
      .select('coach_id')
      .eq('id', id)
      .single();

    if (overrideError || !existingOverride) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 });
    }

    if (!currentUser.is_admin && existingOverride.coach_id !== currentUser.id) {
      return NextResponse.json({ error: 'Can only delete your own overrides' }, { status: 403 });
    }

    // Delete date override
    const { error } = await supabase
      .from('coach_date_overrides')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting date override:', error);
      return NextResponse.json({ error: 'Failed to delete date override' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Date override deleted successfully'
    });

  } catch (error) {
    console.error('Error in date overrides API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}