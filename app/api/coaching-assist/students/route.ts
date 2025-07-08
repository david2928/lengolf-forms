import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface StudentPackage {
  package_name: string;
  total_sessions: number;
  purchase_date: string;
  expiration_date: string;
  status: 'Active' | 'Past';
  used_sessions: number;
  remaining_sessions: number;
}

interface Student {
  student_name: string;
  last_lesson_date: string;
  total_lessons: number;
  packages: StudentPackage[] | null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Staff access - all authenticated users can access coaching assistance data
    // No admin check required

    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get('coach_id');

    if (!coachId) {
      return NextResponse.json({ error: 'Coach ID is required' }, { status: 400 });
    }

    // Get coach information
    const { data: coach } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('coach_code, coach_display_name, coach_name')
      .eq('id', coachId)
      .eq('is_coach', true)
      .single();

    if (!coach || !coach.coach_code) {
      return NextResponse.json({ error: 'Coach not found or no coach code' }, { status: 404 });
    }

    // Call the RPC function to get the student coaching summary
    const { data, error } = await supabase
      .rpc('get_student_coaching_summary', { p_coach_code: coach.coach_code });

    if (error) {
      console.error('Error fetching student coaching summary:', error);
      return NextResponse.json({ error: 'Failed to fetch students data' }, { status: 500 });
    }

    const students: Student[] = data || [];

    // Sort students by last lesson date (most recent first)
    students.sort((a, b) => new Date(b.last_lesson_date).getTime() - new Date(a.last_lesson_date).getTime());
    
    // Calculate summary data
    const total_students = students.length;
    const total_lessons = students.reduce((sum, s) => sum + s.total_lessons, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const active_students_l30d = students.filter(s => new Date(s.last_lesson_date) >= thirtyDaysAgo).length;

    const inactive_students = students.filter(s => {
        const lastLessonIsOld = new Date(s.last_lesson_date) < thirtyDaysAgo;
        const hasActivePackage = s.packages?.some(p => p.status === 'Active');
        return lastLessonIsOld && hasActivePackage;
    }).length;

    return NextResponse.json({
      students: students,
      summary: {
        total_students: total_students,
        active_students_l30d: active_students_l30d,
        inactive_students: inactive_students,
        total_lessons: total_lessons,
        coach_name: coach.coach_display_name || coach.coach_name
      }
    });

  } catch (error) {
    console.error('Error in coaching-assist students API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}