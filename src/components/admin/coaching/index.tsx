'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CoachingDashboardHeader } from './coaching-dashboard-header';
import { CoachingKPICards } from './coaching-kpi-cards';
import { CoachingSearchFilters } from './coaching-search-filters';
import { NextAvailableSlots } from './next-available-slots';
import { WeeklySchedule } from './weekly-schedule';
import { StudentManagement } from './student-management';
import { InactiveStudents } from './inactive-students';
import { BookingsView } from '@/components/coaching/BookingsView';
import { useCoachingDashboard } from '@/hooks/useCoachingDashboard';
import { navigateWeek, goToCurrentWeek, generateWeekDates } from '@/lib/coachingUtils';

export default function CoachingDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoach, setSelectedCoach] = useState<string>('all');
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('next-available');
  const [selectedWeek, setSelectedWeek] = useState<Date>(() => {
    return goToCurrentWeek();
  });
  const [selectedStartDate, setSelectedStartDate] = useState<Date>(() => {
    const date = goToCurrentWeek();
    date.setHours(0, 0, 0, 0); // Reset to midnight for accurate date comparisons
    return date;
  });
  const [selectedEndDate, setSelectedEndDate] = useState<Date>(() => {
    const startDate = goToCurrentWeek();
    startDate.setHours(0, 0, 0, 0); // Reset to midnight
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 21);
    return endDate;
  });

  const {
    coaches,
    weeklySchedule,
    nextAvailableSlots,
    loading,
    error,
    packageHoursRemaining,
    allStudentsData,
    loadingStudents,
    totalAvailableSlots,
    coachesWithoutSchedule,
    groupedSlots,
    coachGroupedSlots,
    refetch
  } = useCoachingDashboard({ selectedWeek, selectedStartDate, selectedEndDate });

  const weekDates = generateWeekDates(selectedWeek);

  const handleWeekNavigate = (direction: 'prev' | 'next') => {
    const newWeek = navigateWeek(selectedWeek, direction);
    // Only update if the date actually changed
    if (newWeek.getTime() !== selectedWeek.getTime()) {
      setSelectedWeek(newWeek);
    }
  };

  const handleCurrentWeek = () => {
    const currentWeek = goToCurrentWeek();
    // Only update if we're not already on the current week
    if (currentWeek.getTime() !== selectedWeek.getTime()) {
      setSelectedWeek(currentWeek);
    }
  };

  const handleNewBooking = () => {
    window.location.href = '/create-booking';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full py-20">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="container mx-auto px-2 tablet:px-4 py-2 tablet:py-3">
        <CoachingDashboardHeader onNewBooking={handleNewBooking} />

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <CoachingKPICards
          packageHoursRemaining={packageHoursRemaining}
          totalAvailableSlots={totalAvailableSlots}
          coachesWithoutSchedule={coachesWithoutSchedule}
          coaches={coaches}
          weeklySchedule={weeklySchedule}
        />

        <CoachingSearchFilters
          searchTerm={searchTerm}
          selectedCoach={selectedCoach}
          coaches={coaches}
          onSearchChange={setSearchTerm}
          onCoachChange={setSelectedCoach}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2 tablet:space-y-4">
          <div className="space-y-2">
            <TabsList className="grid w-full grid-cols-3 tablet:grid-cols-3 lg:grid-cols-5 h-auto gap-1 tablet:gap-2">
              <TabsTrigger value="next-available" className="text-xs tablet:text-sm lg:text-sm px-1 tablet:px-2 lg:px-3 py-2">
                <span className="hidden tablet:inline lg:inline">Next Available</span>
                <span className="tablet:hidden lg:hidden">Available</span>
              </TabsTrigger>
              <TabsTrigger value="weekly-schedule" className="text-xs tablet:text-sm lg:text-sm px-1 tablet:px-2 lg:px-3 py-2">
                <span className="hidden tablet:inline lg:inline">Weekly Schedule</span>
                <span className="tablet:hidden lg:hidden">Schedule</span>
              </TabsTrigger>
              <TabsTrigger value="all-bookings" className="text-xs tablet:text-sm lg:text-sm px-1 tablet:px-2 lg:px-3 py-2">
                <span className="hidden tablet:inline lg:inline">All Bookings</span>
                <span className="tablet:hidden lg:hidden">Bookings</span>
              </TabsTrigger>
              <TabsTrigger value="student-management" className="text-xs tablet:text-sm lg:text-sm px-1 tablet:px-2 lg:px-3 py-2 hidden lg:block">
                Student Management
              </TabsTrigger>
              <TabsTrigger value="inactive-students" className="text-xs tablet:text-sm lg:text-sm px-1 tablet:px-2 lg:px-3 py-2 hidden lg:block">
                Inactive Students
              </TabsTrigger>
            </TabsList>
            
            {/* Additional navigation for tablet/mobile - styled as connected buttons */}
            <div className="lg:hidden flex gap-1 tablet:gap-2">
              <button
                onClick={() => setActiveTab('student-management')}
                className={`flex-1 px-2 tablet:px-3 py-2 text-xs tablet:text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'student-management' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Student Management
              </button>
              <button
                onClick={() => setActiveTab('inactive-students')}
                className={`flex-1 px-2 tablet:px-3 py-2 text-xs tablet:text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'inactive-students' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Inactive Students
              </button>
            </div>
          </div>

          <TabsContent value="next-available" className="space-y-4">
            <NextAvailableSlots
              coachGroupedSlots={coachGroupedSlots}
              selectedCoach={selectedCoach}
              searchTerm={searchTerm}
              selectedStartDate={selectedStartDate}
              selectedEndDate={selectedEndDate}
              onStartDateChange={setSelectedStartDate}
              onEndDateChange={setSelectedEndDate}
              onBookingClick={handleNewBooking}
            />
          </TabsContent>

          <TabsContent value="weekly-schedule" className="space-y-4">
            <WeeklySchedule
              coaches={coaches}
              weeklySchedule={weeklySchedule}
              selectedCoach={selectedCoach}
              weekDates={weekDates}
              hoveredSlot={hoveredSlot}
              onWeekNavigate={handleWeekNavigate}
              onCurrentWeek={handleCurrentWeek}
              onSlotHover={setHoveredSlot}
            />
          </TabsContent>

          <TabsContent value="all-bookings" className="space-y-4">
            <BookingsView 
              coachId={selectedCoach === 'all' ? undefined : selectedCoach} 
              searchTerm={searchTerm}
            />
          </TabsContent>

          <TabsContent value="student-management" className="space-y-4">
            <StudentManagement
              coaches={coaches}
              selectedCoach={selectedCoach}
              searchTerm={searchTerm}
              allStudentsData={allStudentsData}
              loadingStudents={loadingStudents}
            />
          </TabsContent>

          <TabsContent value="inactive-students" className="space-y-4">
            <InactiveStudents
              coaches={coaches}
              selectedCoach={selectedCoach}
              searchTerm={searchTerm}
              allStudentsData={allStudentsData}
              loadingStudents={loadingStudents}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}