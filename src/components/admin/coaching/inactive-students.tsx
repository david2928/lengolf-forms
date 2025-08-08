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
    <div className="space-y-3 tablet:space-y-4">
      {/* Header */}
      <div className="mb-3 tablet:mb-4">
        <h2 className="text-lg tablet:text-xl font-bold text-gray-900">Inactive Students with Active Packages</h2>
        <p className="text-xs tablet:text-sm text-gray-600 mt-1">Students who haven&apos;t had lessons in 30+ days but still have active coaching packages</p>
      </div>

      {hasAnyInactiveStudents ? (
        filteredData.map(({ coachId, coach, inactiveStudents }) => (
          <div key={coachId} className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Coach Header */}
            <div className="p-3 tablet:p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-25">
              <div className="flex items-center gap-2 tablet:gap-3">
                <UserX className="h-4 w-4 tablet:h-5 tablet:w-5 text-orange-600 flex-shrink-0" />
                <h3 className="text-sm tablet:text-base font-semibold text-gray-900">{coach?.coach_display_name}</h3>
                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 text-xs">
                  {inactiveStudents.length} inactive
                </Badge>
              </div>
            </div>

            {/* Students Content */}
            <div className="overflow-hidden">
              {/* Desktop/Tablet Table View */}
              <div className="hidden tablet:block">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs text-gray-600">
                      <th className="px-4 py-2 font-medium">Student Name</th>
                      <th className="px-4 py-2 font-medium">Last Lesson</th>
                      <th className="px-4 py-2 font-medium text-center">Total Lessons</th>
                      <th className="px-4 py-2 font-medium text-center">Sessions Left</th>
                      <th className="px-4 py-2 font-medium">Packages</th>
                    </tr>
                  </thead>
                  <tbody className="max-h-64 overflow-y-auto">
                    {inactiveStudents.map(student => {
                      const daysSinceLastLesson = calculateDaysSinceLastLesson(student.last_lesson_date);
                      const activePackages = student.packages?.filter(p => p.status === 'Active') || [];
                      const totalRemainingSessions = activePackages.reduce((sum, pkg) => sum + pkg.remaining_sessions, 0);

                      return (
                        <tr key={student.student_name} className="border-t border-gray-100 hover:bg-orange-25">
                          <td className="px-4 py-3">
                            <div className="font-medium text-sm text-gray-900">{student.student_name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-orange-700 font-medium">{daysSinceLastLesson} days ago</div>
                            <div className="text-[10px] text-gray-500">{new Date(student.last_lesson_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-center">{student.total_lessons}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 text-xs">
                              {totalRemainingSessions}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {activePackages.map((pkg, idx) => (
                                <div key={idx} className="text-[10px] text-gray-600">
                                  <div className="font-medium truncate max-w-32">{pkg.package_name}</div>
                                  <div className="text-gray-500">{pkg.remaining_sessions}/{pkg.total_sessions} left</div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="tablet:hidden p-3 space-y-3 max-h-64 overflow-y-auto">
                {inactiveStudents.map(student => {
                  const daysSinceLastLesson = calculateDaysSinceLastLesson(student.last_lesson_date);
                  const activePackages = student.packages?.filter(p => p.status === 'Active') || [];
                  const totalRemainingSessions = activePackages.reduce((sum, pkg) => sum + pkg.remaining_sessions, 0);

                  return (
                    <div key={student.student_name} className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-sm">{student.student_name}</div>
                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 text-xs">
                          {totalRemainingSessions} left
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div>
                          <div className="text-orange-700 font-medium">{daysSinceLastLesson} days ago</div>
                          <div className="text-gray-500">Last lesson</div>
                        </div>
                        <div>
                          <div className="font-medium">{student.total_lessons}</div>
                          <div className="text-gray-500">Total lessons</div>
                        </div>
                      </div>
                      {activePackages.length > 0 && (
                        <div className="text-xs">
                          <div className="text-gray-700 font-medium mb-1">Active Packages:</div>
                          {activePackages.map((pkg, idx) => (
                            <div key={idx} className="bg-white p-1.5 rounded border text-[10px] mb-1">
                              <div className="flex justify-between">
                                <span className="truncate">{pkg.package_name}</span>
                                <span className="font-medium">{pkg.remaining_sessions}/{pkg.total_sessions}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
          <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Inactive Students</h3>
          <p className="text-sm">All students with active packages have had recent lessons.</p>
        </div>
      )}
    </div>
  );
}