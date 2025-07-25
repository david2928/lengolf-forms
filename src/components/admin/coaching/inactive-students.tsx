'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserX, Activity } from 'lucide-react';
import { Coach, StudentsData } from '@/types/coaching';
import { calculateDaysSinceLastLesson } from '@/lib/coachingUtils';

interface InactiveStudentsProps {
  coaches: Coach[];
  selectedCoach: string;
  searchTerm: string;
  allStudentsData: { [coachId: string]: StudentsData };
  loadingStudents: boolean;
}

export function InactiveStudents({
  coaches,
  selectedCoach,
  searchTerm,
  allStudentsData,
  loadingStudents
}: InactiveStudentsProps) {
  if (loadingStudents) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inactive Students with Active Packages</CardTitle>
          <CardDescription>
            Students who haven&apos;t had lessons in 30+ days but still have active coaching packages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
            <p>Loading inactive students...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredData = Object.entries(allStudentsData)
    .filter(([coachId]) => selectedCoach === 'all' || coachId === selectedCoach)
    .map(([coachId, studentsData]) => {
      const coach = coaches.find(c => c.coach_id === coachId);
      const inactiveStudents = studentsData.students.filter(student => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const lastLessonIsOld = new Date(student.last_lesson_date) < thirtyDaysAgo;
        const hasActivePackage = student.packages?.some(p => p.status === 'Active');
        const matchesSearch = searchTerm === '' || student.student_name.toLowerCase().includes(searchTerm.toLowerCase());
        return lastLessonIsOld && hasActivePackage && matchesSearch;
      });

      return { coachId, coach, inactiveStudents };
    })
    .filter(({ inactiveStudents }) => inactiveStudents.length > 0);

  const hasAnyInactiveStudents = filteredData.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Inactive Students with Active Packages</CardTitle>
        <CardDescription className="text-xs sm:text-sm mt-1">
          Students who haven&apos;t had lessons in 30+ days but still have active coaching packages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {hasAnyInactiveStudents ? (
            filteredData.map(({ coachId, coach, inactiveStudents }) => (
              <Card key={coachId} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-base sm:text-lg">
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                      {coach?.coach_display_name}
                    </div>
                    <span className="text-sm text-orange-600">- {inactiveStudents.length} Inactive Student{inactiveStudents.length > 1 ? 's' : ''}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {inactiveStudents.map(student => {
                      const daysSinceLastLesson = calculateDaysSinceLastLesson(student.last_lesson_date);
                      const activePackages = student.packages?.filter(p => p.status === 'Active') || [];
                      const totalRemainingSessions = activePackages.reduce((sum, pkg) => sum + pkg.remaining_sessions, 0);

                      return (
                        <div key={student.student_name} className="p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                            <div className="space-y-1">
                              <div className="font-medium text-base sm:text-lg">{student.student_name}</div>
                              <div className="text-xs sm:text-sm text-orange-700">
                                Last lesson: {daysSinceLastLesson} days ago
                                <span className="hidden sm:inline"> ({new Date(student.last_lesson_date).toLocaleDateString()})</span>
                              </div>
                              <div className="text-xs sm:text-sm text-gray-600">
                                Total lessons: {student.total_lessons}
                              </div>
                            </div>
                            <div className="self-start">
                              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 text-xs sm:text-sm">
                                {totalRemainingSessions} sessions left
                              </Badge>
                            </div>
                          </div>
                          
                          {activePackages.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <div className="text-xs sm:text-sm font-medium text-gray-700">Active Packages:</div>
                              {activePackages.map((pkg, idx) => (
                                <div key={idx} className="text-xs bg-white p-2 rounded border">
                                  <div className="flex justify-between gap-2">
                                    <span className="truncate">{pkg.package_name}</span>
                                    <span className="font-medium whitespace-nowrap">{pkg.remaining_sessions}/{pkg.total_sessions} left</span>
                                  </div>
                                  <div className="text-gray-500 mt-1">
                                    Expires: {new Date(pkg.expiration_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Inactive Students</h3>
              <p>All students with active packages have had recent lessons.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}