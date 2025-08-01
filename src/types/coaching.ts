export interface CoachDashboardData {
  isAdminView: boolean;
  requiresCoachSelection?: boolean;
  coach: {
    id: string;
    name: string;
    display_name: string;
    email: string;
    experience_years: number;
    specialties: string[];
  };
  earnings: {
    current_month_earnings: string;
    previous_month_earnings: string;
    total_earnings: string;
    current_month_sessions: number;
    total_sessions: number;
    average_session_rate: string;
  };
  monthly_earnings: {
    total_earnings: string;
    session_count: number;
    average_rate: string;
    paid_sessions: number;
    pending_sessions: number;
  };
  recent_sessions: Session[];
  upcoming_sessions: Session[];
  selected_period: {
    year: number;
    month: number;
  };
  availableCoaches: AvailableCoach[];
  selectedCoachId: string;
  currentUser: {
    id: string;
    email: string;
    isAdmin: boolean;
    isCoach: boolean;
  };
  recent_bookings: any[];
}

export interface AvailableCoach {
  id: string;
  coach_name: string;
  coach_display_name: string;
  coach_email: string;
  is_active_coach: boolean;
}

export interface Session {
  id: string;
  customer_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  lesson_type: string;
  session_rate: string;
  total_amount: string;
  payment_status: string;
  session_status: string;
  number_of_participants: number;
  bay_number?: string;
}

export interface StudentPackage {
  package_name: string;
  total_sessions: number;
  purchase_date: string;
  expiration_date: string;
  status: 'Active' | 'Past';
  used_sessions: number;
  remaining_sessions: number;
}

export interface Student {
  student_name: string;
  last_lesson_date: string;
  total_lessons: number;
  packages: StudentPackage[] | null;
}

export interface StudentsData {
  students: Student[];
  summary: {
    total_students: number;
    active_students_l30d: number;
    inactive_students: number;
    total_lessons: number;
    coach_name: string;
  };
}

export interface Booking {
  id: string;
  customer_name: string;
  contact_number: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  number_of_pax: number;
  bay_number: string;
  package_name?: string;
  notes?: string;
  status?: string;
  booking_type?: string;
}

export interface BookingsData {
  bookings: Booking[];
  summary: {
    total_bookings: number;
    upcoming_bookings: number;
    completed_bookings: number;
  };
}

export interface Earning {
  receipt_number: string;
  date: string;
  customer_name: string;
  customer_phone_number?: string;
  stable_hash_id?: string;
  coach: string;
  rate_type: string;
  hour_cnt: number;
  rate: string;
  coach_earnings: string;
}

export interface RateType {
  rate_type: string;
  rate: string;
}

export interface EarningsData {
  earnings: Earning[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: {
    total_revenue: number;
    avg_per_lesson: number;
    total_lessons: number;
    rate_type_breakdown: Record<string, { count: number; revenue: number }>;
  };
  available_rate_types: RateType[];
  period_info: {
    start_date?: string;
    end_date?: string;
    period?: string;
  };
}

// Admin Coaching Dashboard Types
export interface Coach {
  coach_id: string;
  coach_name: string;
  coach_display_name: string;
  coach_email: string;
}

export interface AvailableSlot {
  coach_id: string;
  coach_name: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  is_today: boolean;
  is_booked: boolean;
  booking_customer?: string;
}

export interface WeeklySchedule {
  [date: string]: {
    [coachId: string]: {
      status: 'available' | 'partially_booked' | 'fully_booked' | 'unavailable';
      slots: AvailableSlot[];
      total_hours: number;
      booked_hours: number;
      next_available?: string;
    };
  };
}

export interface GroupedAvailableSlots {
  [date: string]: {
    [time: string]: AvailableSlot[];
  };
}

export interface CoachGroupedSlots {
  [coachId: string]: {
    coach_name: string;
    dates: {
      [date: string]: {
        [time: string]: AvailableSlot[];
      };
    };
  };
}

export interface CoachingKPIs {
  packageHoursRemaining: number;
  totalAvailableSlots: number;
  coachesWithoutSchedule: number;
}

export interface CoachingDashboardState {
  coaches: Coach[];
  weeklySchedule: WeeklySchedule;
  nextAvailableSlots: AvailableSlot[];
  loading: boolean;
  error: string | null;
  selectedWeek: Date;
  searchTerm: string;
  selectedCoach: string;
  hoveredSlot: string | null;
  packageHoursRemaining: number;
  allStudentsData: { [coachId: string]: StudentsData };
  loadingStudents: boolean;
  totalAvailableSlots: number;
  coachesWithoutSchedule: number;
  groupedSlots: GroupedAvailableSlots;
  coachGroupedSlots: CoachGroupedSlots;
  selectedStartDate: Date;
  selectedEndDate: Date;
} 