'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, X } from 'lucide-react';
import { StudentsData, Student, StudentPackage } from '@/types/coaching';

interface StudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StudentsData | null | undefined;
  loading: boolean;
}

export function StudentsModal({ isOpen, onClose, data, loading }: StudentsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) {
    return null;
  }

  const filteredStudents = data?.students?.filter(student =>
    student.student_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">My Students {data?.summary?.coach_name ? `(${data.summary.coach_name})` : ''}</h2>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading students...</p>
          </div>
        ) : data && data.students.length > 0 ? (
          <div>
            <div className="mb-4">
              <Input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="mb-4 bg-gray-50 p-3 rounded-lg">
              <h3 className="font-semibold">Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600 mt-2">
                <p>Total Students: <span className="font-bold text-gray-800">{data.summary.total_students}</span></p>
                <p>Active (L30D): <span className="font-bold text-gray-800">{data.summary.active_students_l30d}</span></p>
                <p>Inactive: <span className="font-bold text-gray-800">{data.summary.inactive_students}</span></p>
                <p>Total Lessons: <span className="font-bold text-gray-800">{data.summary.total_lessons}</span></p>
              </div>
            </div>

            <div className="space-y-4">
              {filteredStudents && filteredStudents.map((student: Student) => (
                <Card key={student.student_name}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span className="text-lg">{student.student_name}</span>
                    </CardTitle>
                    <CardDescription>
                      Last lesson on {new Date(student.last_lesson_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div><span className="font-semibold">Total Lessons:</span> {student.total_lessons}</div>
                    </div>

                    {student.packages && student.packages.length > 0 && (
                      <div className="space-y-6">
                        {/* Active Packages */}
                        {student.packages.filter((p: StudentPackage) => p.status === 'Active').length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">Active Packages</h4>
                            <div className="space-y-3">
                              {student.packages.filter((p: StudentPackage) => p.status === 'Active').map((pkg: StudentPackage) => (
                                <div key={`${pkg.package_name}-${pkg.purchase_date}`} className="p-3 bg-gray-50 rounded-lg">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-semibold">{pkg.package_name}</p>
                                    </div>
                                    <Badge variant="default">Active</Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                                    <p>Sessions: <span className="font-medium">{pkg.remaining_sessions} / {pkg.total_sessions}</span></p>
                                    <p>Expires: <span className="font-medium">{new Date(pkg.expiration_date).toLocaleDateString()}</span></p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Past Packages */}
                        {student.packages.filter((p: StudentPackage) => p.status === 'Past').length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">Past Packages</h4>
                            <div className="space-y-3">
                              {student.packages.filter((p: StudentPackage) => p.status === 'Past').map((pkg: StudentPackage) => (
                                <div key={`${pkg.package_name}-${pkg.purchase_date}`} className="p-3 bg-gray-50 rounded-lg opacity-70">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-semibold">{pkg.package_name}</p>
                                    </div>
                                    <Badge variant="outline">Inactive</Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                                    <p>Sessions Used: <span className="font-medium">{pkg.used_sessions} / {pkg.total_sessions}</span></p>
                                    <p>Expired on: <span className="font-medium">{new Date(pkg.expiration_date).toLocaleDateString()}</span></p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p>No students found.</p>
          </div>
        )}
      </div>
    </div>
  );
} 