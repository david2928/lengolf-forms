import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ count: 0, setNames: [] });
  }

  try {
    // Find active course rentals where the date falls within start_date..end_date
    const { data, error } = await refacSupabaseAdmin
      .from('club_rentals')
      .select('id, rental_club_sets(name, tier)')
      .eq('rental_type', 'course')
      .lte('start_date', date)
      .gte('end_date', date)
      .not('status', 'in', '("cancelled","no_show","returned")');

    if (error) {
      console.error('Error fetching course rental count:', error);
      return NextResponse.json({ count: 0, setNames: [] });
    }

    const count = data?.length || 0;
    const setNames = (data || []).map((r: any) => r.rental_club_sets?.name || 'Unknown set');

    return NextResponse.json(
      { count, setNames },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (e) {
    console.error('Error in course-count:', e);
    return NextResponse.json({ count: 0, setNames: [] });
  }
}
