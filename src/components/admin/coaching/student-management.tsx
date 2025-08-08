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
    <div className="space-y-3 tablet:space-y-4">
      {/* Header */}
      <div className="mb-3 tablet:mb-4">
        <h2 className="text-lg tablet:text-xl font-bold text-gray-900">Student Management by Coach</h2>
        <p className="text-xs tablet:text-sm text-gray-600 mt-1">Overview of students and package usage for each coach</p>
      </div>

      {/* Coach Sections */}
      {filteredCoaches.map(coach => {
        const studentsData = allStudentsData[coach.coach_id];
        const filteredStudents = studentsData?.students?.filter(student => 
          searchTerm === '' || 
          student.student_name.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => new Date(a.last_lesson_date).getTime() - new Date(b.last_lesson_date).getTime()) || [];

        return (
          <div key={coach.coach_id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Coach Header with Stats Bar */}
            <div className="p-3 tablet:p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-25">
              <div className="flex items-center gap-2 tablet:gap-3 mb-2 tablet:mb-3">
                <User className="h-4 w-4 tablet:h-5 tablet:w-5 text-blue-600 flex-shrink-0" />
                <h3 className="text-sm tablet:text-base font-semibold text-gray-900">{coach.coach_display_name}</h3>
              </div>
              
              {studentsData && (
                <div className="grid grid-cols-4 gap-2 tablet:gap-4">
                  <div className="text-center tablet:text-left">
                    <div className="text-lg tablet:text-xl font-bold text-gray-900">{studentsData.summary.total_students}</div>
                    <div className="text-[10px] tablet:text-xs text-gray-600">Total</div>
                  </div>
                  <div className="text-center tablet:text-left">
                    <div className="text-lg tablet:text-xl font-bold text-green-600">{studentsData.summary.active_students_l30d}</div>
                    <div className="text-[10px] tablet:text-xs text-gray-600">Active</div>
                  </div>
                  <div className="text-center tablet:text-left">
                    <div className="text-lg tablet:text-xl font-bold text-orange-600">{studentsData.summary.inactive_students}</div>
                    <div className="text-[10px] tablet:text-xs text-gray-600">Inactive</div>
                  </div>
                  <div className="text-center tablet:text-left">
                    <div className="text-lg tablet:text-xl font-bold text-blue-600">{studentsData.summary.total_lessons}</div>
                    <div className="text-[10px] tablet:text-xs text-gray-600">Lessons</div>
                  </div>
                </div>
              )}
            </div>

            {/* Students Table */}
            {filteredStudents.length > 0 && (
              <div className="overflow-hidden">
                {/* Desktop/Tablet Table View */}
                <div className="hidden tablet:block">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-xs text-gray-600">
                        <th className="px-4 py-2 font-medium">Student Name</th>
                        <th className="px-4 py-2 font-medium">Last Lesson</th>
                        <th className="px-4 py-2 font-medium text-center">Total Lessons</th>
                        <th className="px-4 py-2 font-medium text-center">Active Packages</th>
                      </tr>
                    </thead>
                    <tbody className="max-h-64 overflow-y-auto">
                      {filteredStudents.map(student => (
                        <tr key={student.student_name} className="border-t border-gray-100 hover:bg-gray-25">
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{student.student_name}</td>
                          <td className="px-4 py-2 text-xs text-gray-600">{new Date(student.last_lesson_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                          <td className="px-4 py-2 text-sm font-medium text-center">{student.total_lessons}</td>
                          <td className="px-4 py-2 text-sm text-center">
                            {student.packages ? student.packages.filter(p => p.status === 'Active').length : 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="tablet:hidden p-3 space-y-2 max-h-64 overflow-y-auto">
                  {filteredStudents.map(student => (
                    <div key={student.student_name} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium text-sm">{student.student_name}</div>
                        <div className="text-xs font-medium">{student.total_lessons} lessons</div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <div>Last: {new Date(student.last_lesson_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                        <div>{student.packages ? student.packages.filter(p => p.status === 'Active').length : 0} active pkg</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Students Message */}
            {filteredStudents.length === 0 && studentsData && (
              <div className="p-6 text-center text-gray-500 text-sm">
                {searchTerm ? 'No students match your search' : 'No students found for this coach'}
              </div>
            )}
          </div>
        );
      })}

      {/* No Coaches Message */}
      {filteredCoaches.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No coaches found matching your search criteria.</p>
        </div>
      )}
    </div>
  );
}