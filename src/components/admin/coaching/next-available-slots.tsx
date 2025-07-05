'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, User } from 'lucide-react';
import { CoachGroupedSlots } from '@/types/coaching';

interface NextAvailableSlotsProps {
  coachGroupedSlots: CoachGroupedSlots;
  selectedCoach: string;
  searchTerm: string;
  selectedStartDate: Date;
  selectedEndDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onBookingClick: () => void;
}

export function NextAvailableSlots({
  coachGroupedSlots,
  selectedCoach,
  searchTerm,
  selectedStartDate,
  selectedEndDate,
  onStartDateChange,
  onEndDateChange,
  onBookingClick
}: NextAvailableSlotsProps) {
  const filteredSlots = Object.entries(coachGroupedSlots)
    .filter(([coachId]) => selectedCoach === 'all' || coachId === selectedCoach)
    .filter(([, coachData]) => 
      searchTerm === '' || 
      coachData.coach_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next Available Coaching Slots</CardTitle>
        <CardDescription>
          Upcoming available time slots for all coaches within the selected date range (default: next 21 days)
        </CardDescription>
        <div className="flex gap-4 mt-4">
          <div>
            <label className="text-sm font-medium">From Date</label>
            <Input
              type="date"
              value={selectedStartDate.toLocaleDateString('en-CA')}
              onChange={(e) => onStartDateChange(new Date(e.target.value))}
              className="w-40"
            />
          </div>
          <div>
            <label className="text-sm font-medium">To Date</label>
            <Input
              type="date"
              value={selectedEndDate.toLocaleDateString('en-CA')}
              onChange={(e) => onEndDateChange(new Date(e.target.value))}
              className="w-40"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {filteredSlots.length > 0 ? (
            filteredSlots.map(([coachId, coachData]) => (
              <Card key={coachId} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    {coachData.coach_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.keys(coachData.dates)
                    .sort()
                    .filter(date => {
                      const slotDate = new Date(date);
                      return slotDate >= selectedStartDate && slotDate <= selectedEndDate;
                    })
                    .map(date => (
                      <div key={date} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">
                            {new Date(date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          {date === new Date().toLocaleDateString('en-CA') && (
                            <Badge variant="secondary" className="text-xs">Today</Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 ml-6">
                          {Object.keys(coachData.dates[date])
                            .sort()
                            .map(time => (
                              <Button
                                key={`${coachId}-${date}-${time}`}
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 hover:bg-blue-50 hover:border-blue-300"
                                onClick={onBookingClick}
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                {time}
                              </Button>
                            ))}
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Slots</h3>
              <p>No coaching slots are currently available. Check the weekly schedule for more details.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}