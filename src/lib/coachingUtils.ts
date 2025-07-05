export const formatCurrency = (amount: string | number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800';
    case 'scheduled': return 'bg-blue-100 text-blue-800';
    case 'confirmed': return 'bg-purple-100 text-purple-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'partial': return 'bg-orange-100 text-orange-800';
    case 'failed': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Admin Coaching Dashboard Utilities
import { Coach } from '@/types/coaching';

export const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
};

export const isToday = (date: Date) => {
  return date.toLocaleDateString('en-CA') === new Date().toLocaleDateString('en-CA');
};

export const getAvailabilityStatusIcon = (status: string) => {
  switch (status) {
    case 'available':
      return 'CheckCircle';
    case 'partially_booked':
      return 'AlertCircle';
    case 'fully_booked':
      return 'XCircle';
    default:
      return 'XCircle';
  }
};

export const getAvailabilityStatusColor = (status: string) => {
  switch (status) {
    case 'available':
      return 'bg-green-50 border-green-200 hover:bg-green-100';
    case 'partially_booked':
      return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
    case 'fully_booked':
      return 'bg-red-50 border-red-200 hover:bg-red-100';
    default:
      return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
  }
};

export const navigateWeek = (selectedWeek: Date, direction: 'prev' | 'next') => {
  const newWeek = new Date(selectedWeek);
  newWeek.setDate(selectedWeek.getDate() + (direction === 'next' ? 7 : -7));
  return newWeek;
};

export const goToCurrentWeek = () => {
  const today = new Date();
  const monday = new Date(today);
  // If today is Sunday (day 0), we want to show the week that just ended
  // Otherwise, show the week that contains today
  const dayOfWeek = today.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setDate(today.getDate() - daysToSubtract);
  return monday;
};

export const generateWeekDates = (selectedWeek: Date) => {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(selectedWeek);
    date.setDate(selectedWeek.getDate() + i);
    return date;
  });
};

export const filterCoachesBySearch = (coaches: Coach[], searchTerm: string, selectedCoach: string) => {
  return coaches.filter(coach => {
    const matchesSearch = searchTerm === '' || 
      coach.coach_display_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCoachFilter = selectedCoach === 'all' || coach.coach_id === selectedCoach;
    return matchesSearch && matchesCoachFilter;
  });
};

export const getCoachesWithoutScheduleTooltip = (coaches: Coach[], weeklySchedule: any) => {
  const coachesWithoutSchedules = coaches.filter(coach => {
    const hasSchedule = Object.values(weeklySchedule).some((daySchedule: any) => 
      daySchedule[coach.coach_id] && daySchedule[coach.coach_id].status !== 'unavailable'
    );
    return !hasSchedule;
  });
  
  if (coachesWithoutSchedules.length === 0) {
    return 'All coaches have schedules configured for this week';
  }
  
  return `Coaches missing schedules this week:\n${coachesWithoutSchedules.map(c => 
    `• ${c.coach_display_name}`
  ).join('\n')}\n\nThese coaches have no availability configured for any day in the current week.`;
};

export const getDayNames = () => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const calculateDaysSinceLastLesson = (lastLessonDate: string) => {
  return Math.floor(
    (new Date().getTime() - new Date(lastLessonDate).getTime()) / (1000 * 60 * 60 * 24)
  );
}; 