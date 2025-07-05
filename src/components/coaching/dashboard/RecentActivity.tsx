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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-gray-400" />
          Recent Activity
        </CardTitle>
        <CardDescription>Last completed or cancelled lessons</CardDescription>
      </CardHeader>
      <CardContent>
        {recent_bookings.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recent_bookings.slice(0, 8).map((b: any) => (
              <div key={b.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <span className="font-medium">{b.customer_name}</span>
                  <div className="text-sm text-gray-500">
                    {new Date(b.booking_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} • {b.start_time} - {b.end_time}
                  </div>
                </div>
                <Badge variant="outline" className={getStatusColor(b.status)}>
                  {b.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 