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
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Full-screen Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">My Students</h2>
            {data?.summary?.coach_name && (
              <p className="text-sm text-gray-600">{data.summary.coach_name}</p>
            )}
          </div>
          <Button variant="ghost" onClick={onClose} className="h-12 w-12 rounded-full touch-manipulation">
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 py-6">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading students...</p>
            </div>
          ) : data && data.students.length > 0 ? (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="max-w-md">
                <Input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-12"
                />
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-900">{data.summary.total_students}</div>
                  <div className="text-xs sm:text-sm text-blue-700">Total Students</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-900">{data.summary.active_students_l30d}</div>
                  <div className="text-xs sm:text-sm text-green-700">Active (30 days)</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-900">{data.summary.inactive_students}</div>
                  <div className="text-xs sm:text-sm text-orange-700">Inactive</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-900">{data.summary.total_lessons}</div>
                  <div className="text-xs sm:text-sm text-purple-700">Total Lessons</div>
                </div>
              </div>

              {/* Student Cards */}
              <div className="space-y-4">
                {filteredStudents && filteredStudents.map((student: Student) => (
                  <div key={student.student_name} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    {/* Student Header */}
                    <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{student.student_name}</h3>
                          <p className="text-sm text-gray-600">
                            Last lesson: {new Date(student.last_lesson_date).toLocaleDateString('en-GB', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div className="text-sm">
                          <Badge variant="outline" className="bg-white">
                            {student.total_lessons} lesson{student.total_lessons !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Student Content */}
                    <div className="px-4 sm:px-6 py-4">
                      {student.packages && student.packages.length > 0 ? (
                        <div className="space-y-4">
                          {/* Active Packages */}
                          {student.packages.filter((p: StudentPackage) => p.status === 'Active').length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                Active Packages
                              </h4>
                              <div className="grid gap-3">
                                {student.packages.filter((p: StudentPackage) => p.status === 'Active').map((pkg: StudentPackage) => (
                                  <div key={`${pkg.package_name}-${pkg.purchase_date}`} className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                      <div className="flex-1">
                                        <h5 className="font-medium text-green-900">{pkg.package_name}</h5>
                                        <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                                          <div>
                                            <span className="text-green-700">Sessions remaining:</span>
                                            <div className="font-semibold text-green-900">{pkg.remaining_sessions} / {pkg.total_sessions}</div>
                                          </div>
                                          <div>
                                            <span className="text-green-700">Expires:</span>
                                            <div className="font-semibold text-green-900">{new Date(pkg.expiration_date).toLocaleDateString('en-GB')}</div>
                                          </div>
                                        </div>
                                      </div>
                                      <Badge className="bg-green-600 hover:bg-green-700 self-start sm:self-center">Active</Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Past Packages */}
                          {student.packages.filter((p: StudentPackage) => p.status === 'Past').length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                                Past Packages
                              </h4>
                              <div className="grid gap-3">
                                {student.packages.filter((p: StudentPackage) => p.status === 'Past').slice(0, 3).map((pkg: StudentPackage) => (
                                  <div key={`${pkg.package_name}-${pkg.purchase_date}`} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                      <div className="flex-1">
                                        <h5 className="font-medium text-gray-700">{pkg.package_name}</h5>
                                        <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                                          <div>
                                            <span className="text-gray-600">Sessions used:</span>
                                            <div className="font-semibold text-gray-800">{pkg.used_sessions} / {pkg.total_sessions}</div>
                                          </div>
                                          <div>
                                            <span className="text-gray-600">Expired:</span>
                                            <div className="font-semibold text-gray-800">{new Date(pkg.expiration_date).toLocaleDateString('en-GB')}</div>
                                          </div>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="self-start sm:self-center">Expired</Badge>
                                    </div>
                                  </div>
                                ))}
                                {student.packages.filter((p: StudentPackage) => p.status === 'Past').length > 3 && (
                                  <div className="text-center py-2">
                                    <p className="text-sm text-gray-500">
                                      +{student.packages.filter((p: StudentPackage) => p.status === 'Past').length - 3} more expired packages
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No package information available</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
              <p className="text-gray-600">You don&apos;t have any students yet or they don&apos;t match your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 