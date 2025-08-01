import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Retrieve specific availability pattern
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Get the specific availability pattern
    const { data: availability, error } = await supabase
      .from('coach_availability')
      .select('*')
      .eq('id', id)
      .eq('coach_id', coach.id)
      .single();

    if (error) {
      console.error('Error fetching availability pattern:', error);
      return NextResponse.json({ error: 'Availability pattern not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      coach: {
        id: coach.id,
        name: coach.coach_name,
        display_name: coach.coach_display_name
      },
      availability: availability
    });

  } catch (error) {
    console.error('Error in availability GET by ID:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove availability pattern
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Check if the pattern exists and belongs to this coach
    const { data: existing, error: checkError } = await supabase
      .from('coach_availability')
      .select('id, availability_type, start_date, end_date, start_time, end_time')
      .eq('id', id)
      .eq('coach_id', coach.id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Availability pattern not found' }, { status: 404 });
    }

    // Check for any upcoming bookings that depend on this availability
    const { searchParams } = new URL(request.url);
    const forceDelete = searchParams.get('force') === 'true';

    if (!forceDelete && existing.availability_type === 'available') {
      // Check if there are any bookings in this time slot
      // This would require integration with the booking system
      // For now, we'll just warn about potential conflicts
      
      const currentDate = new Date();
      const patternDate = new Date(existing.start_date);
      
      if (patternDate >= currentDate) {
        // Pattern is in the future, check for potential booking conflicts
        return NextResponse.json({
          error: 'Cannot delete future availability pattern without force flag',
          message: 'This availability pattern may have associated bookings. Use ?force=true to delete anyway.',
          pattern: existing
        }, { status: 409 });
      }
    }

    // Soft delete by setting is_active to false (recommended)
    // Or hard delete if force is specified
    let deleteResult;
    
    if (forceDelete) {
      // Hard delete
      deleteResult = await supabase
        .from('coach_availability')
        .delete()
        .eq('id', id)
        .eq('coach_id', coach.id)
        .select()
        .single();
    } else {
      // Soft delete
      deleteResult = await supabase
        .from('coach_availability')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('coach_id', coach.id)
        .select()
        .single();
    }

    if (deleteResult.error) {
      console.error('Error deleting availability pattern:', deleteResult.error);
      return NextResponse.json({ error: 'Failed to delete availability pattern' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: forceDelete ? 'Availability pattern permanently deleted' : 'Availability pattern deactivated',
      deleted_pattern: deleteResult.data,
      deletion_type: forceDelete ? 'hard' : 'soft'
    });

  } catch (error) {
    console.error('Error in availability DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 