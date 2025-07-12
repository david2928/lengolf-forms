'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import { getStatusColor } from '@/lib/coachingUtils';

interface RecentActivityProps {
  recent_bookings: any[];
}

export function RecentActivity({ recent_bookings }: RecentActivityProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
          Recent Activity
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Last completed or cancelled lessons
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {recent_bookings.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-gray-500">
            <BookOpen className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm sm:text-base">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {recent_bookings.slice(0, 8).map((b: any) => (
              <div key={b.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-green-50 transition-colors border border-gray-100">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm sm:text-base text-gray-900 truncate">
                    {b.customer_name}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">
                    {new Date(b.booking_date).toLocaleDateString('en-GB', { 
                      day: '2-digit', 
                      month: 'short',
                      weekday: 'short'
                    })} • {b.start_time} - {b.end_time}
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={`${getStatusColor(b.status)} text-xs flex-shrink-0 self-start sm:self-center`}
                >
                  {b.status}
                </Badge>
              </div>
            ))}
            {recent_bookings.length > 8 && (
              <div className="text-center pt-2">
                <p className="text-xs text-gray-500">
                  +{recent_bookings.length - 8} more activities
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 