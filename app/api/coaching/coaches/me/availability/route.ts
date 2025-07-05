import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Retrieve coach availability patterns
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get coach ID from session
    const { data: coach, error: coachError } = await supabase
      .from('allowed_users')
      .select('id, coach_name, coach_display_name')
      .eq('email', session.user.email)
      .eq('is_coach', true)
      .single();

    if (coachError || !coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const availabilityType = searchParams.get('type'); // available, busy, unavailable
    const groupBy = searchParams.get('group_by'); // day_of_week, date, type

    let query = supabase
      .from('coach_availability')
      .select('*')
      .eq('coach_id', coach.id)
      .eq('is_active', true)
      .order('start_date', { ascending: true });

    // Apply filters
    if (startDate) {
      query = query.gte('start_date', startDate);
    }
    if (endDate) {
      query = query.lte('start_date', endDate);
    }
    if (availabilityType) {
      query = query.eq('availability_type', availabilityType);
    }

    const { data: availability, error } = await query;

    if (error) {
      console.error('Error fetching availability:', error);
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }

    // Group results if requested
    let result = availability;
    if (groupBy === 'day_of_week') {
      const grouped = availability.reduce((acc: any, item: any) => {
        const key = item.day_of_week ?? 'specific_dates';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});
      result = grouped;
    } else if (groupBy === 'type') {
      const grouped = availability.reduce((acc: any, item: any) => {
        const key = item.availability_type;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});
      result = grouped;
    }

    return NextResponse.json({
      success: true,
      coach: {
        id: coach.id,
        name: coach.coach_name,
        display_name: coach.coach_display_name
      },
      availability: result,
      total_patterns: availability.length
    });

  } catch (error) {
    console.error('Error in availability GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update existing availability patterns
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get coach ID from session
    const { data: coach, error: coachError } = await supabase
      .from('allowed_users')
      .select('id, coach_name')
      .eq('email', session.user.email)
      .eq('is_coach', true)
      .single();

    if (coachError || !coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    const body = await request.json();
    const { patterns } = body;

    if (!patterns || !Array.isArray(patterns)) {
      return NextResponse.json({ error: 'Invalid patterns data' }, { status: 400 });
    }

    const results = [];
    
    for (const pattern of patterns) {
      const { id, ...updateData } = pattern;
      
      // Validate required fields
      if (!id) {
        return NextResponse.json({ error: 'Pattern ID is required for updates' }, { status: 400 });
      }

      // Ensure coach owns this pattern
      const { data: existing, error: checkError } = await supabase
        .from('coach_availability')
        .select('id')
        .eq('id', id)
        .eq('coach_id', coach.id)
        .single();

      if (checkError || !existing) {
        return NextResponse.json({ error: `Pattern ${id} not found or unauthorized` }, { status: 404 });
      }

      // Update the pattern
      const { data, error } = await supabase
        .from('coach_availability')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('coach_id', coach.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating pattern:', error);
        return NextResponse.json({ error: `Failed to update pattern ${id}` }, { status: 500 });
      }

      results.push(data);
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${results.length} availability patterns`,
      updated_patterns: results
    });

  } catch (error) {
    console.error('Error in availability PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new availability patterns
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get coach ID from session
    const { data: coach, error: coachError } = await supabase
      .from('allowed_users')
      .select('id, coach_name')
      .eq('email', session.user.email)
      .eq('is_coach', true)
      .single();

    if (coachError || !coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    const body = await request.json();
    const { patterns } = body;

    if (!patterns || !Array.isArray(patterns)) {
      return NextResponse.json({ error: 'Invalid patterns data' }, { status: 400 });
    }

    const results = [];
    
    for (const pattern of patterns) {
      // Validate required fields
      const { availability_type, start_date } = pattern;
      
      if (!availability_type || !start_date) {
        return NextResponse.json({ 
          error: 'availability_type and start_date are required' 
        }, { status: 400 });
      }

      if (!['available', 'busy', 'unavailable'].includes(availability_type)) {
        return NextResponse.json({ 
          error: 'availability_type must be available, busy, or unavailable' 
        }, { status: 400 });
      }

      // Check for conflicts if creating an available slot
      if (availability_type === 'available' && pattern.start_time && pattern.end_time) {
        const { data: conflicts, error: conflictError } = await supabase
          .from('coach_availability')
          .select('*')
          .eq('coach_id', coach.id)
          .eq('is_active', true)
          .or(`
            and(start_date.eq.${start_date},day_of_week.is.null,start_time.lt.${pattern.end_time},end_time.gt.${pattern.start_time}),
            and(day_of_week.eq.${new Date(start_date).getDay()},is_recurring.eq.true,start_time.lt.${pattern.end_time},end_time.gt.${pattern.start_time})
          `);

        if (conflicts && conflicts.length > 0) {
          const conflictingSlots = conflicts.filter(c => c.availability_type === 'busy' || c.availability_type === 'unavailable');
          if (conflictingSlots.length > 0) {
            return NextResponse.json({ 
              error: 'Time slot conflicts with existing unavailable/busy periods',
              conflicts: conflictingSlots
            }, { status: 409 });
          }
        }
      }

      // Create the pattern
      const { data, error } = await supabase
        .from('coach_availability')
        .insert({
          coach_id: coach.id,
          ...pattern
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating pattern:', error);
        return NextResponse.json({ error: 'Failed to create availability pattern' }, { status: 500 });
      }

      results.push(data);
    }

    return NextResponse.json({
      success: true,
      message: `Created ${results.length} availability patterns`,
      created_patterns: results
    }, { status: 201 });

  } catch (error) {
    console.error('Error in availability POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 