'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, User, Copy, Check } from 'lucide-react';
import { CoachGroupedSlots } from '@/types/coaching';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';

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

function groupConsecutiveSlots(timeSlots: string[]): string[] {
  if (timeSlots.length === 0) return [];
  
  const slots = timeSlots.map(time => {
    const [start, end] = time.split('–');
    return { start, end, original: time };
  }).sort((a, b) => a.start.localeCompare(b.start));
  
  const grouped: string[] = [];
  let currentStart = slots[0].start;
  let currentEnd = slots[0].end;
  
  for (let i = 1; i < slots.length; i++) {
    const slot = slots[i];
    
    // Check if current slot starts where previous slot ends
    if (slot.start === currentEnd) {
      // Extend the current group
      currentEnd = slot.end;
    } else {
      // End current group and start new one
      grouped.push(`${currentStart}–${currentEnd}`);
      currentStart = slot.start;
      currentEnd = slot.end;
    }
  }
  
  // Add the last group
  grouped.push(`${currentStart}–${currentEnd}`);
  
  return grouped;
}

function formatAvailabilityForClipboard(
  coachGroupedSlots: CoachGroupedSlots,
  selectedCoach: string,
  searchTerm: string,
  selectedStartDate: Date,
  selectedEndDate: Date,
  singleCoachId?: string
): string {
  let filteredSlots = Object.entries(coachGroupedSlots)
    .filter(([coachId]) => selectedCoach === 'all' || coachId === selectedCoach)
    .filter(([, coachData]) => 
      searchTerm === '' || 
      coachData.coach_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // If single coach ID is provided, filter to only that coach
  if (singleCoachId) {
    filteredSlots = filteredSlots.filter(([coachId]) => coachId === singleCoachId);
  }

  if (filteredSlots.length === 0) {
    return 'No coaching slots available for the selected criteria.';
  }

  let output = filteredSlots.length === 1 ? '' : 'Coaching Availability Overview\n\n';

  filteredSlots.forEach(([coachId, coachData]) => {
    output += `Pro ${coachData.coach_name}'s Coaching Availability:\n`;
    
    // Get all dates for this coach and group by month
    const dateSlots = Object.entries(coachData.dates)
      .filter(([date]) => {
        const slotDate = new Date(date);
        return slotDate >= selectedStartDate && slotDate <= selectedEndDate;
      })
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());

    if (dateSlots.length === 0) {
      output += 'No available slots in the selected date range.\n\n';
      return;
    }

    // Group dates by month
    const monthGroups: { [month: string]: [string, any][] } = {};
    dateSlots.forEach(([date, slots]) => {
      const monthKey = new Date(date).toLocaleDateString('en-US', { month: 'long' });
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = [];
      }
      monthGroups[monthKey].push([date, slots]);
    });

    // Output by month
    Object.entries(monthGroups).forEach(([month, dates]) => {
      output += `${month}\n`;
      
      dates.forEach(([date, timeSlots]) => {
        const dateObj = new Date(date);
        const dayAbbrev = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const day = dateObj.getDate();
        
        // Get all time slots for this date and group them
        const times = Object.keys(timeSlots).sort();
        const timeRanges = times.map(time => {
          const formattedTime = time.replace(/:/g, '.');
          const endTime = timeSlots[time][0]?.end_time?.replace(/:/g, '.') || '';
          return `${formattedTime}–${endTime}`;
        });
        
        // Group consecutive slots
        const groupedRanges = groupConsecutiveSlots(timeRanges);
        
        // Combine multiple ranges for the same day with "/" separator
        output += `• ${dayAbbrev} ${day}: ${groupedRanges.join(' / ')}\n`;
      });
    });
    
    output += '\n';
  });

  return output.trim();
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
  const { toast } = useToast();
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({});
  
  const filteredSlots = Object.entries(coachGroupedSlots)
    .filter(([coachId]) => selectedCoach === 'all' || coachId === selectedCoach)
    .filter(([, coachData]) => 
      searchTerm === '' || 
      coachData.coach_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleCopyToClipboard = async (singleCoachId?: string) => {
    const stateKey = singleCoachId || 'all';
    
    try {
      const formattedText = formatAvailabilityForClipboard(
        coachGroupedSlots,
        selectedCoach,
        searchTerm,
        selectedStartDate,
        selectedEndDate,
        singleCoachId
      );
      
      await navigator.clipboard.writeText(formattedText);
      
      const coachName = singleCoachId 
        ? coachGroupedSlots[singleCoachId]?.coach_name 
        : 'All coaches';
      
      // Show visual feedback
      setCopiedStates(prev => ({ ...prev, [stateKey]: true }));
      
      // Show toast
      toast({
        title: "Copied to clipboard",
        description: `${coachName} availability copied successfully`,
      });
      
      // Reset visual feedback after 2 seconds
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [stateKey]: false }));
      }, 2000);
      
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      toast({
        title: "Copy failed",
        description: "Failed to copy availability to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Next Available Coaching Slots</CardTitle>
            <CardDescription>
              Upcoming available time slots for all coaches within the selected date range (default: next 21 days)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopyToClipboard()}
            className="flex items-center gap-2"
          >
            {copiedStates['all'] ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Availability
              </>
            )}
          </Button>
        </div>
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      {coachData.coach_name}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyToClipboard(coachId)}
                      className="flex items-center gap-1 text-gray-500 hover:text-blue-600"
                    >
                      {copiedStates[coachId] ? (
                        <>
                          <Check className="h-4 w-4 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
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