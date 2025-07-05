'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import { Session } from '@/types/coaching';

interface UpcomingLessonsProps {
  upcoming_sessions: Session[];
}

export function UpcomingLessons({ upcoming_sessions }: UpcomingLessonsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-gray-400" />
          Upcoming Lessons
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcoming_sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarDays className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No upcoming lessons</p>
              <p className="text-sm">Check your booking system for new bookings</p>
            </div>
          ) : (
            upcoming_sessions.slice(0, 8).map((session) => (
              <div key={session.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <div className="font-medium">{new Date(session.session_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} • {session.start_time} - {session.end_time}</div>
                  <div className="text-sm text-gray-600">
                    {session.customer_name}
                  </div>
                  {session.bay_number && (
                    <div className="text-xs text-gray-400">Bay {session.bay_number}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
} 