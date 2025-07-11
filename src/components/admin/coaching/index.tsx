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
  const [selectedWeek, setSelectedWeek] = useState<Date>(() => {
    return goToCurrentWeek();
  });
  const [selectedStartDate, setSelectedStartDate] = useState<Date>(() => {
    return goToCurrentWeek();
  });
  const [selectedEndDate, setSelectedEndDate] = useState<Date>(() => {
    const startDate = goToCurrentWeek();
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
      <div className="container mx-auto px-4 py-4">
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

        <Tabs defaultValue="next-available" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="next-available">Next Available</TabsTrigger>
            <TabsTrigger value="weekly-schedule">Weekly Schedule</TabsTrigger>
            <TabsTrigger value="all-bookings">All Bookings</TabsTrigger>
            <TabsTrigger value="student-management">Student Management</TabsTrigger>
            <TabsTrigger value="inactive-students">Inactive Students</TabsTrigger>
          </TabsList>

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