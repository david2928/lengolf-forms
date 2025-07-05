'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCog } from 'lucide-react';
import { StudentsModal } from '@/components/coaching/StudentsModal';
import { BookingsModal } from '@/components/coaching/BookingsModal';
import { EarningsModal } from '@/components/coaching/EarningsModal';
import { useCoachDashboard } from '@/hooks/useCoachDashboard';
import { useCoachStudents } from '@/hooks/useCoachStudents';
import { DashboardHeader } from '@/components/coaching/dashboard/DashboardHeader';
import { DashboardStats } from '@/components/coaching/dashboard/DashboardStats';
import { DashboardActions } from '@/components/coaching/dashboard/DashboardActions';
import { UpcomingLessons } from '@/components/coaching/dashboard/UpcomingLessons';
import { RecentActivity } from '@/components/coaching/dashboard/RecentActivity';
import { EarningsSummary } from '@/components/coaching/dashboard/EarningsSummary';
import { CombinedCalendarView } from '@/components/coaching/dashboard/CombinedCalendarView';

export default function CoachDashboard() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [showEarningsModal, setShowEarningsModal] = useState(false);

  const { dashboardData, error, isLoading: loading } = useCoachDashboard(selectedYear, selectedMonth, selectedCoachId);
  const { studentsData, isLoading: loadingStudents } = useCoachStudents(dashboardData?.coach?.id, showStudentsModal);

  useEffect(() => {
    if (dashboardData) {
      if (dashboardData.isAdminView && dashboardData.availableCoaches && dashboardData.availableCoaches.length > 0 && !selectedCoachId && !dashboardData.requiresCoachSelection) {
        setSelectedCoachId(dashboardData.selectedCoachId);
      }
    }
  }, [dashboardData, selectedCoachId]);

  const handleCoachSelection = (coachId: string) => {
    setSelectedCoachId(coachId);
  };

  const handleShowStudents = () => {
    setShowStudentsModal(true);
  };

  const handleShowBookings = () => {
    setShowBookingsModal(true);
  };

  const handleShowEarnings = () => {
    setShowEarningsModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error.message || 'Failed to fetch dashboard data'}
        </div>
      </div>
    );
  }

  if (dashboardData?.requiresCoachSelection) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Select Coach to View
              </CardTitle>
              <CardDescription>
                As an admin, please select which coach&apos;s dashboard you&apos;d like to view.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select onValueChange={handleCoachSelection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a coach..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboardData.availableCoaches?.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{coach.coach_display_name}</span>
                          <span className="text-sm text-gray-500 ml-2">{coach.coach_email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">No Data Available</h1>
          <p className="text-gray-600 mt-2">Unable to load dashboard data</p>
        </div>
      </div>
    );
  }

  const { coach, earnings, monthly_earnings, upcoming_sessions, isAdminView, availableCoaches, recent_bookings } = dashboardData;
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          isAdminView={isAdminView}
          coachName={coach.display_name}
          availableCoaches={availableCoaches}
          selectedCoachId={selectedCoachId}
          onCoachChange={handleCoachSelection}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />

        <DashboardStats
          monthly_earnings={monthly_earnings}
          upcoming_sessions_count={upcoming_sessions.length}
        />

        <DashboardActions
          onShowStudents={handleShowStudents}
          onShowBookings={handleShowBookings}
          onShowEarnings={handleShowEarnings}
          selectedCoachId={selectedCoachId}
        />

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Weekly Schedule & Bookings</h2>
          <CombinedCalendarView coachId={selectedCoachId || dashboardData?.coach?.id} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <UpcomingLessons upcoming_sessions={upcoming_sessions} />
          <RecentActivity recent_bookings={recent_bookings} />
        </div>

        <EarningsSummary earnings={earnings} />
      </div>

      <StudentsModal
        isOpen={showStudentsModal}
        onClose={() => setShowStudentsModal(false)}
        data={studentsData || null}
        loading={loadingStudents}
      />

      <BookingsModal
        isOpen={showBookingsModal}
        onClose={() => setShowBookingsModal(false)}
        coachId={dashboardData?.coach?.id}
      />

      <EarningsModal
        isOpen={showEarningsModal}
        onClose={() => setShowEarningsModal(false)}
        coachId={dashboardData?.coach?.id}
      />
    </div>
  );
} 