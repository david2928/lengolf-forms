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
        <CardTitle>Student Management by Coach</CardTitle>
        <CardDescription>
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
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {coach.coach_display_name}
                  </CardTitle>
                  {studentsData && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Students:</span>
                        <div className="font-bold text-lg">{studentsData.summary.total_students}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Active (L30D):</span>
                        <div className="font-bold text-lg text-green-600">{studentsData.summary.active_students_l30d}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Inactive:</span>
                        <div className="font-bold text-lg text-orange-600">{studentsData.summary.inactive_students}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Lessons:</span>
                        <div className="font-bold text-lg text-blue-600">{studentsData.summary.total_lessons}</div>
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
                        .slice(0, 5)
                        .map(student => (
                        <div key={student.student_name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{student.student_name}</div>
                            <div className="text-sm text-gray-600">
                              Last lesson: {new Date(student.last_lesson_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{student.total_lessons} lessons</div>
                            {student.packages && (
                              <div className="text-xs text-gray-600">
                                {student.packages.filter(p => p.status === 'Active').length} active packages
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {studentsData.students.length > 5 && (
                        <div className="text-center text-sm text-gray-500 pt-2">
                          +{studentsData.students.length - 5} more students
                        </div>
                      )}
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