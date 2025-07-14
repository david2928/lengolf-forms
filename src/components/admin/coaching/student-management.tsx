'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { Coach, StudentsData } from '@/types/coaching';

interface StudentManagementProps {
  coaches: Coach[];
  selectedCoach: string;
  searchTerm: string;
  allStudentsData: { [coachId: string]: StudentsData };
  loadingStudents: boolean;
}

export function StudentManagement({
  coaches,
  selectedCoach,
  searchTerm,
  allStudentsData,
  loadingStudents
}: StudentManagementProps) {
  const filteredCoaches = coaches.filter(coach => 
    selectedCoach === 'all' || coach.coach_id === selectedCoach
  );

  if (loadingStudents) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Student Management by Coach</CardTitle>
          <CardDescription>
            Overview of students and package usage for each coach
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading student data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Student Management by Coach</CardTitle>
        <CardDescription className="text-xs sm:text-sm mt-1">
          Overview of students and package usage for each coach
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {filteredCoaches.map(coach => {
            const studentsData = allStudentsData[coach.coach_id];
            return (
              <Card key={coach.coach_id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    {coach.coach_display_name}
                  </CardTitle>
                  {studentsData && (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm mt-3">
                      <div>
                        <span className="text-gray-600">Total Students:</span>
                        <div className="font-bold text-base sm:text-lg">{studentsData.summary.total_students}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Active (L30D):</span>
                        <div className="font-bold text-base sm:text-lg text-green-600">{studentsData.summary.active_students_l30d}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Inactive:</span>
                        <div className="font-bold text-base sm:text-lg text-orange-600">{studentsData.summary.inactive_students}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Lessons:</span>
                        <div className="font-bold text-base sm:text-lg text-blue-600">{studentsData.summary.total_lessons}</div>
                      </div>
                    </div>
                  )}
                </CardHeader>
                {studentsData && studentsData.students.length > 0 && (
                  <CardContent>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {studentsData.students
                        .filter(student => 
                          searchTerm === '' || 
                          student.student_name.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .sort((a, b) => new Date(a.last_lesson_date).getTime() - new Date(b.last_lesson_date).getTime()) // Oldest lesson first
                        .map(student => (
                        <div key={student.student_name} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 rounded-lg gap-2">
                          <div>
                            <div className="font-medium text-sm sm:text-base">{student.student_name}</div>
                            <div className="text-xs sm:text-sm text-gray-600">
                              Last lesson: {new Date(student.last_lesson_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="text-xs sm:text-sm font-medium">{student.total_lessons} lessons</div>
                            {student.packages && (
                              <div className="text-xs text-gray-600">
                                {student.packages.filter(p => p.status === 'Active').length} active packages
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}