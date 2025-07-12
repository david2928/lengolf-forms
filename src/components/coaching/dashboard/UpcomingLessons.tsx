'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import { Session } from '@/types/coaching';

interface UpcomingLessonsProps {
  upcoming_sessions: Session[];
}

export function UpcomingLessons({ upcoming_sessions }: UpcomingLessonsProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          Upcoming Lessons
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="space-y-2 sm:space-y-3">
          {upcoming_sessions.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <CalendarDays className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm sm:text-base">No upcoming lessons</p>
              <p className="text-xs sm:text-sm text-gray-400">
                Check your booking system for new bookings
              </p>
            </div>
          ) : (
            upcoming_sessions.slice(0, 8).map((session) => (
              <div key={session.id} className="p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors border border-gray-100">
                <div className="space-y-1">
                  <div className="font-medium text-sm sm:text-base text-gray-900">
                    {new Date(session.session_date).toLocaleDateString('en-GB', { 
                      day: '2-digit', 
                      month: 'short',
                      weekday: 'short'
                    })} • {session.start_time} - {session.end_time}
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {session.customer_name}
                  </div>
                  {session.bay_number && (
                    <div className="text-xs text-blue-600 font-medium">
                      Bay {session.bay_number}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {upcoming_sessions.length > 8 && (
            <div className="text-center pt-2">
              <p className="text-xs text-gray-500">
                +{upcoming_sessions.length - 8} more lessons
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 