'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Clock, Calendar as CalendarIcon, RefreshCw, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { DateTime } from 'luxon';
import { useAvailability } from '@/hooks/useAvailability';
import { useToast } from '@/components/ui/use-toast';

interface BayAvailabilitySectionProps {
  onClose: () => void;
  onSlotSelect?: (date: string, time: string, duration: number, availableBays: string[]) => void;
  conversationId?: string;
  customerId?: string;
  channelType?: string;
  channelUserId?: string;
  staffName?: string;
  userName?: string;
  onShareToInput?: (message: string) => void;
}

const BAYS = ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4'] as const;

// Bay groupings
const BAY_GROUPS = {
  'social': ['Bay 1', 'Bay 2', 'Bay 3'],
  'ai': ['Bay 4']
} as const;

const DURATIONS = [
  { value: 0.5, label: '30 min' },
  { value: 1, label: '1 hour' },
  { value: 1.5, label: '1.5 hours' },
  { value: 2, label: '2 hours' },
  { value: 2.5, label: '2.5 hours' },
  { value: 3, label: '3 hours' },
];

export function BayAvailabilitySection({
  onClose,
  onSlotSelect,
  conversationId,
  customerId,
  channelType,
  channelUserId,
  staffName,
  userName,
  onShareToInput
}: BayAvailabilitySectionProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBay, setSelectedBay] = useState<string>('all');
  const [duration, setDuration] = useState<number>(1);
  const [allBaysSlots, setAllBaysSlots] = useState<Array<{time: string, bay: string}>>([]);
  const [loadingAllBays, setLoadingAllBays] = useState(false);
  const [fetchedStaffName, setFetchedStaffName] = useState<string>('');
  const { toast } = useToast();

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Fetch staff name if not provided
  useEffect(() => {
    if (!staffName) {
      const fetchStaffName = async () => {
        try {
          const response = await fetch('/api/user/me');
          const data = await response.json();
          if (data.success && data.data.staffDisplayName) {
            setFetchedStaffName(data.data.staffDisplayName);
          } else {
            setFetchedStaffName('Staff');
          }
        } catch (error) {
          console.error('Error fetching staff name:', error);
          setFetchedStaffName('Staff');
        }
      };
      fetchStaffName();
    }
  }, [staffName]);

  // Get the list of bays to fetch based on selection
  const getBaysToFetch = useCallback(() => {
    if (selectedBay === 'all') return BAYS;
    if (selectedBay === 'social') return BAY_GROUPS.social;
    if (selectedBay === 'ai') return BAY_GROUPS.ai;
    return [];
  }, [selectedBay]);

  // Fetch availability for single bay (not used when group is selected)
  const {
    availableSlots,
    loading: singleBayLoading,
    error,
    refreshAvailability
  } = useAvailability({
    date: dateStr,
    bay: 'Bay 1', // Default bay (not used when groups are selected)
    duration,
    startHour: 10,
    endHour: 22,
    autoRefresh: false // Disabled to prevent constant API calls
  });

  // Fetch bays when "All Bays", "Social Bay", or "AI Bay" is selected
  const fetchAllBaysData = useCallback(async () => {
    const baysToFetch = getBaysToFetch();
    console.log('[BayAvailability] Fetching bay data:', {
      selectedBay,
      baysToFetch,
      date: dateStr,
      duration
    });

    if (baysToFetch.length > 0) {
      setLoadingAllBays(true);
      try {
        const promises = baysToFetch.map(async (bay) => {
          const response = await fetch(
            `/api/bookings/available-slots?date=${dateStr}&bay=${encodeURIComponent(bay)}&duration=${duration}&startHour=10&endHour=22`
          );
          const data = await response.json();
          return data.slots || [];
        });

        const results = await Promise.all(promises);
        const combined = results.flat();
        setAllBaysSlots(combined);
      } catch (err) {
        console.error('Error fetching bays:', err);
        setAllBaysSlots([]);
      } finally {
        setLoadingAllBays(false);
      }
    }
  }, [getBaysToFetch, dateStr, duration]);

  useEffect(() => {
    fetchAllBaysData();
  }, [fetchAllBaysData]);

  const loading = loadingAllBays;

  // Helper function to check if a time slot is in the past
  const isSlotInPast = useCallback((slotTime: string): boolean => {
    const now = DateTime.now().setZone('Asia/Bangkok');
    const selectedDateTime = DateTime.fromFormat(dateStr, 'yyyy-MM-dd', { zone: 'Asia/Bangkok' });

    // If selected date is in the future, no slots are in the past
    if (selectedDateTime.startOf('day') > now.startOf('day')) {
      return false;
    }

    // If selected date is in the past, all slots are in the past
    if (selectedDateTime.startOf('day') < now.startOf('day')) {
      return true;
    }

    // Selected date is today - check if slot time has passed
    const slotDateTime = DateTime.fromFormat(`${dateStr} ${slotTime}`, 'yyyy-MM-dd HH:mm', { zone: 'Asia/Bangkok' });
    return slotDateTime <= now;
  }, [dateStr]);

  // Convert slots to include bay information and filter out past slots
  const slotsWithBays = useMemo(() => {
    // Group all bay slots by time
    const slotsByTime: Record<string, string[]> = {};

    allBaysSlots.forEach(slot => {
      // Skip past time slots
      if (isSlotInPast(slot.time)) {
        return;
      }

      if (!slotsByTime[slot.time]) {
        slotsByTime[slot.time] = [];
      }
      slotsByTime[slot.time].push(slot.bay);
    });

    // Convert to array and sort by time
    return Object.entries(slotsByTime)
      .map(([time, bays]) => ({
        time,
        availableBays: bays
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [allBaysSlots, isSlotInPast]);

  const handleSlotClick = (time: string, availableBays: string[]) => {
    if (onSlotSelect) {
      onSlotSelect(dateStr, time, duration, availableBays);
    } else {
      // Default behavior: Open booking page with pre-filled data including customer/staff
      const params = new URLSearchParams({
        date: dateStr,
        time: time,
        duration: duration.toString(),
      });

      // Add chat context parameters if available (like Create Booking button)
      const currentStaffName = staffName || fetchedStaffName;
      if (conversationId) params.set('from', 'chat');
      if (conversationId) params.set('conversation', conversationId);
      if (customerId) params.set('customer', customerId);
      if (channelType) params.set('channel', channelType);
      if (currentStaffName) params.set('staff', currentStaffName);

      window.open(`/create-booking?${params.toString()}`, '_blank');
    }
  };

  // Function to group consecutive time slots into ranges
  const groupConsecutiveSlots = useCallback((slots: Array<{time: string, availableBays: string[]}>) => {
    if (slots.length === 0) return [];

    const ranges: Array<{start: string, end: string}> = [];
    let currentStart = slots[0].time;
    let previousTime = slots[0].time;

    for (let i = 1; i < slots.length; i++) {
      const currentTime = slots[i].time;
      const prevDateTime = DateTime.fromFormat(previousTime, 'HH:mm');
      const currDateTime = DateTime.fromFormat(currentTime, 'HH:mm');

      // Check if times are consecutive (30-minute increments)
      // The slots are returned in 30-minute increments regardless of duration
      const expectedNext = prevDateTime.plus({ minutes: 30 });
      const isConsecutive = currDateTime.equals(expectedNext);

      if (!isConsecutive) {
        // End current range and start new one
        ranges.push({ start: currentStart, end: previousTime });
        currentStart = currentTime;
      }

      previousTime = currentTime;
    }

    // Add the last range
    ranges.push({ start: currentStart, end: previousTime });

    return ranges;
  }, []);

  // Function to populate chat input with availability message
  const handleShareAvailability = useCallback(() => {
    if (slotsWithBays.length === 0) {
      toast({
        variant: "destructive",
        title: "No slots available",
        description: "There are no available slots to share"
      });
      return;
    }

    // Format the date
    const dateFormatted = DateTime.fromFormat(dateStr, 'yyyy-MM-dd').toFormat('EEEE, MMMM d');

    // Group slots by bay type (Social Bay: Bay 1-3, AI Bay: Bay 4)
    const socialBaySlots: Array<{time: string, availableBays: string[]}> = [];
    const aiBaySlots: Array<{time: string, availableBays: string[]}> = [];

    slotsWithBays.forEach(slot => {
      const hasSocialBay = slot.availableBays.some(bay => ['Bay 1', 'Bay 2', 'Bay 3'].includes(bay));
      const hasAiBay = slot.availableBays.some(bay => bay === 'Bay 4');

      if (hasSocialBay) {
        socialBaySlots.push(slot);
      }
      if (hasAiBay) {
        aiBaySlots.push(slot);
      }
    });

    // Build the message
    let message = `Bay Availability for ${dateFormatted}\n\n`;

    // Add Social Bay section if there are slots
    if (socialBaySlots.length > 0) {
      message += `Social Bay\n`;
      const socialRanges = groupConsecutiveSlots(socialBaySlots);
      socialRanges.forEach(range => {
        const startTime = DateTime.fromFormat(range.start, 'HH:mm').toFormat('h:mm a');

        if (range.start === range.end) {
          message += `• ${startTime}\n`;
        } else {
          const endTime = DateTime.fromFormat(range.end, 'HH:mm').plus({ minutes: 30 }).toFormat('h:mm a');
          message += `• ${startTime} - ${endTime}\n`;
        }
      });
      message += `\n`;
    }

    // Add AI Bay section if there are slots
    if (aiBaySlots.length > 0) {
      message += `AI Bay\n`;
      const aiRanges = groupConsecutiveSlots(aiBaySlots);
      aiRanges.forEach(range => {
        const startTime = DateTime.fromFormat(range.start, 'HH:mm').toFormat('h:mm a');

        if (range.start === range.end) {
          message += `• ${startTime}\n`;
        } else {
          const endTime = DateTime.fromFormat(range.end, 'HH:mm').plus({ minutes: 30 }).toFormat('h:mm a');
          message += `• ${startTime} - ${endTime}\n`;
        }
      });
    }

    // Populate the chat input
    if (onShareToInput) {
      onShareToInput(message.trim());
      toast({
        title: "Success",
        description: "Bay availability added to message input"
      });
    }
  }, [slotsWithBays, dateStr, groupConsecutiveSlots, onShareToInput, toast]);

  return (
    <Card className="border-b rounded-none shadow-md">
      <div className="p-3 md:p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-sm md:text-base">Bay Availability</h3>
            {availableSlots.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="hidden md:inline">Real-time</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          {/* Date Selector - Full width on mobile */}
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="w-full h-9 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>

          {/* Bay and Duration Selectors - Side by side on mobile */}
          <div className="grid grid-cols-2 gap-2">
            {/* Bay Selector */}
            <div className="space-y-1">
              <Label className="text-xs">Bay Type</Label>
              <Select value={selectedBay} onValueChange={setSelectedBay}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bays</SelectItem>
                  <SelectItem value="social">Social Bay</SelectItem>
                  <SelectItem value="ai">AI Bay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration Selector */}
            <div className="space-y-1">
              <Label className="text-xs">Duration</Label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(parseFloat(v))}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => (
                    <SelectItem key={d.value} value={d.value.toString()}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Refresh Button - Full width on mobile */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllBaysData}
            disabled={loading}
            className="w-full h-9"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Available Slots Grid */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">
            Available Time Slots ({slotsWithBays.length} slots found)
          </Label>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-500">Loading availability...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <p className="text-yellow-800 mb-2">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAllBaysData}
              >
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && slotsWithBays.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium mb-1">No available slots</p>
              <p className="text-xs">Try a different date, bay, or duration</p>
            </div>
          )}

          {!loading && !error && slotsWithBays.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareAvailability}
                  className="h-8 gap-1.5"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="text-xs">Share in Chat</span>
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 max-h-64 overflow-y-auto">
                {slotsWithBays.map((slot, index) => {
                  const bayCount = slot.availableBays.length;
                  // Only show yellow for "All Bays" mode when limited to 1 bay
                  const isLimited = selectedBay === 'all' && bayCount === 1;

                  // Parse time to DateTime for formatting
                  const timeObj = DateTime.fromFormat(slot.time, 'HH:mm');

                  return (
                    <button
                      key={`${slot.time}-${index}`}
                      onClick={() => handleSlotClick(slot.time, slot.availableBays)}
                      className={`
                        py-2 px-2 rounded-lg text-sm font-medium text-center
                        transition-all duration-200 relative
                        ${isLimited
                          ? 'bg-yellow-50 text-yellow-900 border-2 border-yellow-300 hover:bg-yellow-100'
                          : 'bg-blue-50 text-blue-900 border-2 border-blue-200 hover:bg-blue-100'
                        }
                        hover:shadow-md
                      `}
                      type="button"
                      title={`Available bays: ${slot.availableBays.join(', ')}`}
                    >
                      <div className="font-semibold">{timeObj.toFormat('h:mm a')}</div>
                      <div className="text-xs mt-0.5 opacity-75">
                        {bayCount === 1 ? slot.availableBays[0] : `${bayCount} Bays`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer Info */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          <p>Click a time slot to create a booking.</p>
          <p className="mt-1 text-gray-400">
            Social Bay: Bay 1-3 • AI Bay: Bay 4
          </p>
        </div>
      </div>
    </Card>
  );
}
