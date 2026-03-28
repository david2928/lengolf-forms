// AI Function Executor - Executes function calls from OpenAI
// Leverages existing APIs to perform actions

import { generateBookingId } from '@/lib/booking-utils';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { getOpeningHour } from '@/lib/opening-hours';

export interface FunctionCall {
  name: string;
  parameters: Record<string, any>;
}

export interface FunctionResult {
  success: boolean;
  data?: any;
  error?: string;
  requiresApproval?: boolean;
  approvalMessage?: string;
  functionName?: string;
}

/**
 * Format an ISO date (YYYY-MM-DD) into a natural language string.
 * e.g. "2026-02-26" → "tomorrow (Thursday)" or "Thursday, February 26"
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function formatDateNatural(isoDate: string): string {
  const thailandNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const today = thailandNow.toISOString().split('T')[0];

  const tomorrow = new Date(thailandNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const dateObj = new Date(isoDate + 'T12:00:00');
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  if (isoDate === today) return 'today';
  if (isoDate === tomorrowStr) return `tomorrow (${dayName})`;
  return `${dayName}, ${monthDay}`;
}

/**
 * Executes AI function calls by calling existing APIs
 */
export class AIFunctionExecutor {
  private dryRun: boolean;

  constructor(dryRun: boolean = false) {
    this.dryRun = dryRun;
  }

  /**
   * Execute a function call from OpenAI
   */
  async execute(functionCall: FunctionCall, customerId?: string): Promise<FunctionResult> {
    // Route to appropriate function (Zod schemas in tool() definitions validate parameters before execute runs)
    switch (functionCall.name) {
      case 'check_bay_availability':
        return await this.checkBayAvailability(functionCall.parameters);

      case 'get_coaching_availability':
        return await this.getCoachingAvailability(functionCall.parameters);

      case 'create_booking':
        return await this.prepareBookingForApproval(functionCall.parameters, customerId);

      case 'lookup_booking':
        return await this.lookupBooking(functionCall.parameters);

      case 'lookup_customer':
        return await this.lookupCustomer(functionCall.parameters);

      case 'cancel_booking':
        return this.prepareCancellationForApproval(functionCall.parameters);

      case 'modify_booking':
        return await this.prepareModificationForApproval(functionCall.parameters);

      case 'check_club_availability':
        return await this.checkClubAvailability(functionCall.parameters);

      default:
        return {
          success: false,
          error: `Unknown function: ${functionCall.name}`,
          functionName: functionCall.name
        };
    }
  }

  /**
   * Check bay availability using existing API
   * Reuses: /api/bookings/available-slots
   */
  private async checkBayAvailability(params: any): Promise<FunctionResult> {
    try {
      const { date, start_time, duration, bay_type = 'all', excludeBookingId } = params;

      // When modifying a booking, use RPC that excludes the current booking
      // so the customer's own booking doesn't block the time change
      if (excludeBookingId && start_time) {
        return await this.checkAvailabilityExcludingBooking(date, start_time, duration, bay_type, excludeBookingId);
      }

      // Get current time in Thailand timezone
      const thailandTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
      const currentHour = thailandTime.getHours();
      const currentMinute = thailandTime.getMinutes();

      // Determine start hour for availability check
      // If checking today, start from NEXT available 30-min slot (never show past times)
      // If checking future date, start from 10 AM
      const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"})).toISOString().split('T')[0];
      const isToday = date === today;
      // Always round up to next hour to avoid showing slots that have already started
      const openingHour = getOpeningHour(date);
      const startHour = isToday ? Math.max(currentHour + 1, openingHour) : openingHour;

      // Determine which bays to check based on type
      const bays =
        bay_type === 'social' ? ['Bay 1', 'Bay 2', 'Bay 3'] :
        bay_type === 'ai' ? ['Bay 4'] :
        ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4']; // 'all'

      // Fetch availability for each bay in parallel
      // If duration > 1, also fetch 1-hour slots as fallback options
      const durationsToCheck = duration > 1 ? [duration, 1] : [duration];

      const promises = bays.flatMap(bay =>
        durationsToCheck.map(async (dur) => {
          // Use absolute URL for server-side fetch (localhost during dev, actual domain in production)
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const url = `${baseUrl}/api/bookings/available-slots?date=${date}&bay=${encodeURIComponent(bay)}&duration=${dur}&startHour=${startHour}&endHour=22`;
          const response = await fetch(url);

          if (!response.ok) {
            console.error(`Failed to fetch availability for ${bay}:`, response.statusText);
            return { bay, duration: dur, slots: [] };
          }

          const data = await response.json();
          return { bay, duration: dur, slots: data.slots || [] };
        })
      );

      const allResults = await Promise.all(promises);

      // Group results by requested duration and 1-hour fallback
      const results = allResults.filter(r => r.duration === duration);
      const fallbackResults = duration > 1 ? allResults.filter(r => r.duration === 1) : [];

      // Find which bays are available
      let availableBays: string[];
      if (start_time) {
        // Check specific time slot
        availableBays = results
          .filter(r => r.slots.some((s: any) => s.time === start_time))
          .map(r => r.bay);
      } else {
        // Check general availability (any slots)
        availableBays = results
          .filter(r => r.slots.length > 0)
          .map(r => r.bay);
      }

      // Group by bay type for customer-friendly messaging
      const socialBaysAvailable = availableBays.filter(b =>
        ['Bay 1', 'Bay 2', 'Bay 3'].includes(b)
      );
      const aiBayAvailable = availableBays.includes('Bay 4');

      // OPTIMIZATION: Only include detailed slots if checking general availability
      // For specific time requests, return yes/no + nearest alternatives when unavailable
      if (start_time) {
        // IMPORTANT: Do NOT include internal bay names (Bay 1, Bay 2, Bay 4)
        // AI should only mention "Social bay" or "AI bay" to customers
        const responseData: Record<string, unknown> = {
          date: formatDateNatural(date),
          requested_time: start_time,
          duration,
          bay_type,
          available: availableBays.length > 0,
          social_bays_available: socialBaysAvailable.length > 0,
          ai_bay_available: aiBayAvailable,
          available_bay_count: availableBays.length
        };

        // When the requested time is unavailable, include nearest alternatives
        // (both before AND after) so the AI can suggest real nearby options
        if (availableBays.length === 0) {
          const allSlots = results
            .filter(r => r.slots.length > 0)
            .flatMap(r => {
              const isSocial = ['Bay 1', 'Bay 2', 'Bay 3'].includes(r.bay);
              return r.slots
                .filter((s: any) => s.time !== start_time)
                .map((s: any) => ({ time: s.time, bayType: isSocial ? 'social' : 'ai' }));
            });

          // Deduplicate by time
          const seen = new Set<string>();
          const unique = allSlots.filter(s => {
            if (seen.has(s.time)) return false;
            seen.add(s.time);
            return true;
          });

          // Sort by distance from requested time, then take closest 5
          const nearest = unique
            .sort((a, b) => {
              const minutesA = Math.abs(timeToMinutes(a.time) - timeToMinutes(start_time));
              const minutesB = Math.abs(timeToMinutes(b.time) - timeToMinutes(start_time));
              return minutesA - minutesB;
            })
            .slice(0, 5);

          if (nearest.length > 0) {
            responseData.nearest_available = nearest
              .sort((a, b) => a.time.localeCompare(b.time))
              .map(s =>
                `${s.time} (${s.bayType === 'social' ? 'Social bay' : 'AI bay'})`
              );
          } else {
            responseData.no_availability_remaining = true;
            responseData.suggestion = 'No more slots available today. Suggest checking tomorrow.';
          }
        }

        return {
          success: true,
          functionName: 'check_bay_availability',
          data: responseData
        };
      }

      // General availability request - group consecutive times into ranges
      const socialSlots = results
        .filter(r => ['Bay 1', 'Bay 2', 'Bay 3'].includes(r.bay) && r.slots.length > 0)
        .flatMap(r => r.slots.map((s: any) => s.time));

      const aiSlots = results
        .filter(r => r.bay === 'Bay 4' && r.slots.length > 0)
        .flatMap(r => r.slots.map((s: any) => s.time));

      // Helper to group consecutive time slots into ranges
      const groupIntoRanges = (times: string[]): string[] => {
        if (times.length === 0) return [];

        const uniqueTimes = Array.from(new Set(times)).sort();
        const ranges: string[] = [];
        let rangeStart = uniqueTimes[0];
        let lastTime = uniqueTimes[0];

        for (let i = 1; i < uniqueTimes.length; i++) {
          const currentTime = uniqueTimes[i];
          const lastHour = parseInt(lastTime.split(':')[0]);
          const lastMin = parseInt(lastTime.split(':')[1]);
          const currentHour = parseInt(currentTime.split(':')[0]);
          const currentMin = parseInt(currentTime.split(':')[1]);

          // Check if times are consecutive (30-min intervals)
          const lastMinutes = lastHour * 60 + lastMin;
          const currentMinutes = currentHour * 60 + currentMin;

          if (currentMinutes - lastMinutes > 30) {
            // Gap detected, close current range
            if (rangeStart === lastTime) {
              ranges.push(rangeStart);
            } else {
              ranges.push(`${rangeStart} to ${lastTime}`);
            }
            rangeStart = currentTime;
          }
          lastTime = currentTime;
        }

        // Close final range
        if (rangeStart === lastTime) {
          ranges.push(rangeStart);
        } else {
          ranges.push(`${rangeStart} to ${lastTime}`);
        }

        return ranges;
      };

      const socialRanges = groupIntoRanges(socialSlots);
      const aiRanges = groupIntoRanges(aiSlots);

      // If requested duration > 1 and no availability, check 1-hour fallback
      let fallbackInfo = {};
      if (duration > 1 && fallbackResults.length > 0) {
        const fallbackSocialSlots = fallbackResults
          .filter(r => ['Bay 1', 'Bay 2', 'Bay 3'].includes(r.bay) && r.slots.length > 0)
          .flatMap(r => r.slots.map((s: any) => s.time));

        const fallbackAiSlots = fallbackResults
          .filter(r => r.bay === 'Bay 4' && r.slots.length > 0)
          .flatMap(r => r.slots.map((s: any) => s.time));

        const fallbackSocialRanges = groupIntoRanges(fallbackSocialSlots);
        const fallbackAiRanges = groupIntoRanges(fallbackAiSlots);

        // Only include fallback if main duration has no availability
        if (socialBaysAvailable.length === 0 && aiBayAvailable === false && (fallbackSocialRanges.length > 0 || fallbackAiRanges.length > 0)) {
          fallbackInfo = {
            fallback_duration: 1,
            fallback_social_availability: fallbackSocialRanges.length > 0 ? fallbackSocialRanges.join(', ') : 'None',
            fallback_ai_availability: fallbackAiRanges.length > 0 ? fallbackAiRanges.join(', ') : 'None',
            fallback_message: `No ${duration}-hour slots available, but 1-hour slots are available`
          };
        }
      }

      return {
        success: true,
        functionName: 'check_bay_availability',
        data: {
          date: formatDateNatural(date),
          duration,
          bay_type,
          social_bays_available: socialBaysAvailable.length > 0,
          ai_bay_available: aiBayAvailable,
          social_availability: socialRanges.length > 0 ? socialRanges.join(', ') : 'None',
          ai_availability: aiRanges.length > 0 ? aiRanges.join(', ') : 'None',
          // Condensed availability summary
          availability_summary: `${socialBaysAvailable.length > 0 ? `Social bays (${socialBaysAvailable.length}): ${socialRanges[0] || 'available'}` : 'Social bays: None'} | ${aiBayAvailable ? `AI bay: ${aiRanges[0] || 'available'}` : 'AI bay: None'}`,
          ...fallbackInfo
        }
      };
    } catch (error) {
      console.error('Error checking bay availability:', error);
      return {
        success: false,
        error: 'Failed to check availability. Please try again.',
        functionName: 'check_bay_availability'
      };
    }
  }

  /**
   * Get coaching availability using existing API
   * Reuses: /api/coaching-assist/availability
   * Returns detailed time slot information similar to bay availability.
   * Fetches a 45-day window so the AI can show a full schedule overview,
   * not just a single date (which often returns "no availability").
   */
  private async getCoachingAvailability(params: any): Promise<FunctionResult> {
    try {
      const { date, coach_name, preferred_time, view = 'date' } = params;
      const isScheduleView = view === 'schedule';

      // Schedule view: fetch 45-day range. Date view: single date only.
      const fromDate = date;
      const toDate = isScheduleView
        ? (() => { const d = new Date(date); d.setDate(d.getDate() + 44); return d.toLocaleDateString('en-CA'); })()
        : date;

      // Use absolute URL for server-side fetch with internal auth
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const dateParams = isScheduleView ? `&fromDate=${fromDate}&toDate=${toDate}` : '';
      const url = `${baseUrl}/api/coaching-assist/availability?date=${date}${dateParams}`;
      const response = await fetch(url, {
        headers: {
          'x-internal-secret': process.env.CRON_SECRET || '',
        },
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract coach availability slots and weekly schedule
      let coaches = data.availability_slots || [];
      const weeklyAvailability = data.weekly_availability || {};

      // Build search names for coach filtering
      let searchNames: string[] | null = null;
      if (coach_name && coach_name !== 'any') {
        // Handle Boss/Ratchavin alias (they are the same person)
        searchNames =
          (coach_name === 'Boss' || coach_name === 'Ratchavin')
            ? ['Boss', 'Ratchavin', 'Boss - Ratchavin']
            : [coach_name];

        coaches = coaches.filter((c: any) =>
          searchNames!.some(name => c.coach_name && c.coach_name.includes(name))
        );
      }

      // Get coach IDs that match the filter
      const matchedCoachIds = coaches.map((c: any) => c.coach_id);

      // Helper function to group consecutive time slots into ranges
      const groupIntoRanges = (times: string[]): string => {
        if (times.length === 0) return 'None';
        if (times.length === 1) return times[0];

        const ranges: string[] = [];
        let rangeStart = times[0];
        let lastTime = times[0];

        for (let i = 1; i < times.length; i++) {
          const currentTime = times[i];
          const lastHour = parseInt(lastTime.split(':')[0]);
          const currentHour = parseInt(currentTime.split(':')[0]);

          if (currentHour - lastHour > 1) {
            if (rangeStart === lastTime) {
              ranges.push(rangeStart);
            } else {
              ranges.push(`${rangeStart}-${lastTime}`);
            }
            rangeStart = currentTime;
          }
          lastTime = currentTime;
        }

        if (rangeStart === lastTime) {
          ranges.push(rangeStart);
        } else {
          ranges.push(`${rangeStart}-${lastTime}`);
        }

        return ranges.join(', ');
      };

      // Build today's availability (requested date)
      const daySchedule = weeklyAvailability[date] || {};
      const todayAvailableCoaches = coaches
        .filter((c: any) => c.is_available_today)
        .map((c: any) => {
          const coachSchedule = daySchedule[c.coach_id];
          let availableTimeSlots: string[] = [];

          if (coachSchedule && coachSchedule.status !== 'unavailable') {
            const startHour = parseInt(coachSchedule.start_time?.split(':')[0] || '0');
            const endHour = parseInt(coachSchedule.end_time?.split(':')[0] || '0');
            const bookedSlots = coachSchedule.bookings || [];

            for (let hour = startHour; hour < endHour; hour++) {
              const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
              const isBooked = bookedSlots.some((booking: any) => {
                const bookingStart = parseInt(booking.start_time.split(':')[0]);
                const bookingEnd = bookingStart + (booking.duration || 1);
                return hour >= bookingStart && hour < bookingEnd;
              });
              if (!isBooked) {
                availableTimeSlots.push(timeSlot);
              }
            }
          }

          return {
            coach_name: c.coach_name,
            availability: groupIntoRanges(availableTimeSlots),
            _rawSlots: availableTimeSlots
          };
        })
        .filter((c: any) => c.availability !== 'None');

      // Check if preferred time is available today
      // Use raw time slots (not grouped range strings) to avoid substring match bugs
      // e.g. "13:00-15:00".includes("14:00") is false, but 14:00 IS in the range
      let preferredTimeAvailable = false;
      if (preferred_time && todayAvailableCoaches.length > 0) {
        preferredTimeAvailable = todayAvailableCoaches.some((c: { coach_name: string; availability: string; _rawSlots: string[] }) =>
          c._rawSlots.includes(preferred_time)
        );
      }

      // Build upcoming schedule from weekly_availability (45-day window)
      // Shows all dates with available slots for the matched coaches
      const upcomingSchedule: Array<{ date: string; day: string; coaches: Array<{ coach_name: string; available_times: string }> }> = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      const sortedDates = Object.keys(weeklyAvailability).sort();
      for (const dateKey of sortedDates) {
        const dayData = weeklyAvailability[dateKey];
        const coachesForDay: Array<{ coach_name: string; available_times: string }> = [];

        for (const coachId of matchedCoachIds) {
          const schedule = dayData[coachId];
          if (!schedule || schedule.status === 'unavailable') continue;

          // Calculate available time slots
          const startHour = parseInt(schedule.start_time?.split(':')[0] || '0');
          const endHour = parseInt(schedule.end_time?.split(':')[0] || '0');
          const bookedSlots = schedule.bookings || [];
          const blockedPeriods = schedule.blocked_periods || [];
          const availableSlots: string[] = [];

          for (let hour = startHour; hour < endHour; hour++) {
            const isBooked = bookedSlots.some((booking: any) => {
              const bookingStart = parseInt(booking.start_time.split(':')[0]);
              const bookingEnd = bookingStart + (booking.duration || 1);
              return hour >= bookingStart && hour < bookingEnd;
            });
            const isBlocked = blockedPeriods.some((block: any) => {
              const blockStart = parseInt(block.start_time.split(':')[0]);
              const blockEnd = parseInt(block.end_time.split(':')[0]);
              return hour >= blockStart && hour < blockEnd;
            });

            if (!isBooked && !isBlocked) {
              availableSlots.push(`${hour.toString().padStart(2, '0')}:00`);
            }
          }

          if (availableSlots.length > 0) {
            const coachInfo = coaches.find((c: any) => c.coach_id === coachId);
            coachesForDay.push({
              coach_name: coachInfo?.coach_name || coachId,
              available_times: groupIntoRanges(availableSlots)
            });
          }
        }

        if (coachesForDay.length > 0) {
          const d = new Date(dateKey);
          upcomingSchedule.push({
            date: dateKey,
            day: dayNames[d.getDay()],
            coaches: coachesForDay
          });
        }
      }

      const hasTodayAvailability = todayAvailableCoaches.length > 0;
      const hasUpcomingAvailability = upcomingSchedule.length > 0;

      if (!hasTodayAvailability && !hasUpcomingAvailability) {
        return {
          success: true,
          functionName: 'get_coaching_availability',
          data: {
            date,
            coach_name: coach_name || 'any',
            preferred_time,
            has_availability: false,
            message: isScheduleView
              ? `No availability found for ${coach_name || 'any coach'} in the next 45 days (${fromDate} to ${toDate})`
              : `No coaches available on ${date}`
          }
        };
      }

      // Date view: compact response with just the requested date
      // Schedule view: full 45-day upcoming schedule
      // When date view has no availability on the requested date, include next available dates
      // so the AI can suggest alternatives instead of falsely claiming availability
      const nextAvailableDates = (!hasTodayAvailability && !isScheduleView && upcomingSchedule.length > 0)
        ? upcomingSchedule.slice(0, 5)
        : undefined;

      return {
        success: true,
        functionName: 'get_coaching_availability',
        data: {
          date,
          coach_name: coach_name || 'any',
          preferred_time,
          preferred_time_available: preferredTimeAvailable,
          requested_date_available: hasTodayAvailability,
          has_availability: true,
          today_availability: hasTodayAvailability
            ? todayAvailableCoaches.map(({ coach_name, availability }: { coach_name: string; availability: string }) => ({ coach_name, availability }))
            : null,
          ...(isScheduleView ? {
            upcoming_schedule: upcomingSchedule,
            schedule_range: { from: fromDate, to: toDate },
          } : {}),
          ...(nextAvailableDates ? {
            message: `No coaching available on ${date}, but available on other dates`,
            next_available_dates: nextAvailableDates,
          } : {}),
        }
      };
    } catch (error) {
      console.error('Error fetching coaching availability:', error);
      return {
        success: false,
        error: 'Failed to check coaching availability. Please try again.',
        functionName: 'get_coaching_availability'
      };
    }
  }

  /**
   * Prepare booking for staff approval
   * Does package selection and determines correct booking_type
   * so staff sees accurate information in the debug panel
   * Also checks bay availability BEFORE creating approval request
   */
  private async prepareBookingForApproval(params: any, customerId?: string): Promise<FunctionResult> {
    // STEP 1: Check bay availability FIRST - don't even create approval if bay not available
    // Coaching bookings prefer Bay 4 (AI bay) by default
    const isCoaching = params.booking_type && params.booking_type.toLowerCase().includes('coaching');
    const requestedBayType = params.bay_type || (isCoaching ? 'ai' : 'social');

    // Check ALL bay types so we can suggest alternatives if requested type is full
    const availabilityCheck = await this.checkBayAvailability({
      date: params.date,
      start_time: params.start_time,
      duration: params.duration,
      bay_type: 'all'
    });

    const socialAvailable = availabilityCheck.data?.social_bays_available ?? false;
    const aiAvailable = availabilityCheck.data?.ai_bay_available ?? false;
    let effectiveBayType = requestedBayType;
    const requestedTypeAvailable = requestedBayType === 'ai' ? aiAvailable : socialAvailable;

    // For coaching bookings: AI bay is a preference, not a requirement.
    // Auto-fallback to social bay if AI bay is unavailable.
    if (!requestedTypeAvailable && isCoaching && requestedBayType === 'ai' && socialAvailable) {
      console.log(`⚡ AI bay unavailable for coaching at ${params.start_time} on ${params.date}, falling back to social bay`);
      effectiveBayType = 'social';
      params.bay_type = 'social';
    } else if (!availabilityCheck.success || !requestedTypeAvailable) {

      let errorMessage = `Sorry, ${requestedBayType === 'social' ? 'social bays are' : 'the AI bay is'} not available at ${params.start_time} on ${formatDateNatural(params.date)}.`;

      // Suggest alternative bay type if available
      if (requestedBayType === 'ai' && socialAvailable) {
        errorMessage += ' However, social bays are available at that time. Would you like to book a social bay instead?';
      } else if (requestedBayType === 'social' && aiAvailable) {
        errorMessage += ' However, the AI bay is available at that time. Would you like to book the AI bay instead?';
      } else {
        errorMessage += ' Would you like to check availability for a different time?';
      }

      // Include nearest available slots from the availability check so AI doesn't hallucinate
      const nearestSlots = availabilityCheck.data?.nearest_available;

      return {
        success: false,
        error: errorMessage,
        functionName: 'create_booking',
        data: {
          requested_bay_type: requestedBayType,
          social_bays_available: socialAvailable,
          ai_bay_available: aiAvailable,
          requested_time: params.start_time,
          requested_date: params.date,
          ...(nearestSlots ? { nearest_available: nearestSlots } : {})
        }
      };
    }

    console.log(`✅ Bay availability confirmed for ${effectiveBayType} at ${params.start_time}`);

    // STEP 2: Clone params and prepare booking data
    const updatedParams = { ...params };

    // STEP 3: Auto-select package if customer has one
    let packageName: string | null = null;

    if (customerId) {
      try {
        const isCoachingBooking = params.booking_type && params.booking_type.toLowerCase().includes('coaching');

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/line/customers/${customerId}/details`, {
            headers: { 'x-internal-secret': process.env.CRON_SECRET || '' },
          });
        if (response.ok) {
          const data = await response.json();
          const activePackages = data.packages?.filter((pkg: any) =>
            (pkg.remaining_hours !== '0' && pkg.remaining_hours !== 0) || pkg.package_type === 'Unlimited'
          ) || [];

          let eligiblePackages;
          if (isCoachingBooking) {
            eligiblePackages = activePackages.filter((pkg: any) =>
              pkg.package_type_name?.toLowerCase().includes('coaching') ||
              pkg.package_type_name?.toLowerCase().includes('coach') ||
              pkg.package_type === 'Coaching'
            );
          } else {
            eligiblePackages = activePackages.filter((pkg: any) =>
              !pkg.package_type_name?.toLowerCase().includes('coaching') &&
              !pkg.package_type_name?.toLowerCase().includes('coach') &&
              pkg.package_type !== 'Coaching'
            );
          }

          if (eligiblePackages.length > 0) {
            packageName = eligiblePackages[0].package_type_name;
            console.log(`Will auto-select package: ${packageName}`);
          }
        }
      } catch (error) {
        console.warn('Could not check packages for approval display:', error);
      }
    }

    // Update booking_type to match what will actually be created
    if (params.booking_type && params.booking_type.toLowerCase().includes('coaching')) {
      // Keep coaching type
      updatedParams.booking_type = params.booking_type;
    } else if (packageName) {
      // Will use package
      updatedParams.booking_type = 'Package';
    } else {
      // Walk-in rate
      updatedParams.booking_type = 'Normal Bay Rate';
    }

    // Format date nicely matching the LINE confirmation style
    const dateObj = new Date(params.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    // Format time range
    const startTime = params.start_time;
    const [hours, minutes] = startTime.split(':');
    const totalMinutes = parseInt(hours) * 60 + parseInt(minutes) + Math.round(params.duration * 60);
    const endTime = `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;

    // Build approval message
    const summary = `${params.customer_name}

📅 ${formattedDate}
🕐 ${startTime} - ${endTime}

Bay: Will be auto-assigned
Duration: ${params.duration} ${params.duration === 1 ? 'hour' : 'hours'}${
      updatedParams.booking_type.includes('Coaching')
        ? `\n🏌️ ${updatedParams.booking_type}`
        : packageName
        ? `\n💳 ${packageName}`
        : ''
    }`;

    return {
      success: true,
      requiresApproval: true,
      approvalMessage: summary,
      functionName: 'create_booking',
      data: updatedParams // Return updated params with correct booking_type
    };
  }

  /**
   * Execute approved booking (called after staff approves)
   * Reuses: /api/bookings/create
   * Note: Availability is already checked in prepareBookingForApproval()
   */
  async executeApprovedBooking(params: any, customerId?: string, channelType?: string): Promise<FunctionResult> {
    try {
      // Get requested bay type from params (already validated in prepare stage)
      const requestedBayType = params.bay_type || 'social';

      // If customer has packages, try to auto-select one
      let packageId: string | null = null;
      let packageName: string | null = null;
      let packageNote: string | null = null; // Track why package wasn't applied

      if (customerId) {
        try {
          // Determine if this is a coaching booking
          const isCoachingBooking = params.booking_type && params.booking_type.toLowerCase().includes('coaching');

          // Fetch customer's active packages using the correct endpoint
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const response = await fetch(`${baseUrl}/api/line/customers/${customerId}/details`, {
            headers: { 'x-internal-secret': process.env.CRON_SECRET || '' },
          });
          if (response.ok) {
            const data = await response.json();
            // Only use activated packages (status === 'active'), not inactive/unactivated ones
            const activePackages = data.packages?.filter((pkg: any) =>
              pkg.status === 'active' &&
              ((pkg.remaining_hours !== '0' && pkg.remaining_hours !== 0) || pkg.package_type === 'Unlimited')
            ) || [];

            // Check if there are inactive (not yet activated) packages
            const inactivePackages = data.packages?.filter((pkg: any) =>
              pkg.status === 'inactive'
            ) || [];

            // Filter packages based on booking type
            let eligiblePackages;
            if (isCoachingBooking) {
              // For coaching: only use coaching packages
              eligiblePackages = activePackages.filter((pkg: any) =>
                pkg.package_type_name?.toLowerCase().includes('coaching') ||
                pkg.package_type_name?.toLowerCase().includes('coach') ||
                pkg.package_type === 'Coaching'
              );
            } else {
              // For non-coaching: use non-coaching packages only
              eligiblePackages = activePackages.filter((pkg: any) =>
                !pkg.package_type_name?.toLowerCase().includes('coaching') &&
                !pkg.package_type_name?.toLowerCase().includes('coach') &&
                pkg.package_type !== 'Coaching'
              );
            }

            // Select first eligible package
            if (eligiblePackages.length > 0) {
              const selectedPackage = eligiblePackages[0];
              packageId = selectedPackage.id;
              packageName = selectedPackage.package_type_name;
              console.log(`Auto-selected ${isCoachingBooking ? 'coaching' : 'regular'} package: ${packageName} (${selectedPackage.remaining_hours || selectedPackage.hours_remaining}h remaining)`);
            } else {
              console.log(`No eligible ${isCoachingBooking ? 'coaching' : 'regular'} packages found for customer`);
              // Add note about why package wasn't applied
              if (inactivePackages.length > 0) {
                const inactiveNames = inactivePackages.map((p: any) => p.package_type_name).join(', ');
                packageNote = `Package not applied: ${inactiveNames} not yet activated`;
              }
            }
          }
        } catch (error) {
          console.warn('Could not fetch customer packages for auto-selection:', error);
          // Continue without package
        }
      }

      // Determine correct booking_type
      // If package is selected → "Package"
      // If coaching → keep coaching type
      // Otherwise → "Normal Bay Rate"
      let bookingType: string;
      if (params.booking_type && params.booking_type.toLowerCase().includes('coaching')) {
        bookingType = params.booking_type; // Keep coaching type
      } else if (packageId) {
        bookingType = 'Package'; // Using a package
      } else {
        bookingType = 'Normal Bay Rate'; // Walk-in rate
      }

      // Map function parameters to booking API format
      const bookingData: any = {
        id: generateBookingId(), // Use same format as normal bookings: BK251023XXXX
        user_id: '059090f8-2d76-4f10-81de-5efe4d2d0fd8', // Same user_id as normal booking form
        name: params.customer_name,
        email: params.email || 'info@len.golf',
        phone_number: params.phone_number,
        date: params.date,
        start_time: params.start_time,
        duration: params.duration,
        number_of_people: params.number_of_people,
        status: 'confirmed',
        bay: null, // Will be auto-assigned by booking API
        bay_type: requestedBayType, // Pass the requested bay type for auto-assignment
        booking_type: bookingType,
        package_id: packageId, // Auto-selected package
        package_name: packageName, // Auto-selected package name
        customer_notes: packageNote || undefined
      };

      // If customer ID is provided (existing customer), use it
      // Otherwise mark as new customer and add Buy 1 Get 1 promotion (same as staff form)
      if (customerId) {
        bookingData.customer_id = customerId;
        bookingData.isNewCustomer = false;
      } else {
        bookingData.isNewCustomer = true; // API will check for duplicates
        // Auto-add Buy 1 Get 1 to notes for new customers, matching staff form behavior
        const promoNote = 'Buy 1 Get 1';
        if (bookingData.customer_notes) {
          if (!bookingData.customer_notes.includes(promoNote)) {
            bookingData.customer_notes = `${bookingData.customer_notes}; ${promoNote}`;
          }
        } else {
          bookingData.customer_notes = promoNote;
        }
      }

      // DRY RUN MODE: Return mock success without creating booking
      if (this.dryRun) {
        console.log('[DRY RUN] Would create booking:', bookingData);
        return {
          success: true,
          functionName: 'create_booking',
          data: {
            booking_id: 'dry-run-' + crypto.randomUUID(),
            booking_created: false, // Flag to indicate dry run
            dry_run: true,
            customer_name: params.customer_name,
            date: params.date,
            start_time: params.start_time,
            duration: params.duration,
            booking_data: bookingData // Include what would have been sent
          }
        };
      }

      // Use absolute URL for server-side fetch
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/bookings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Handle specific error cases
        if (result.error_code === 'DUPLICATE_PHONE') {
          return {
            success: false,
            error: `A customer with phone number ${params.phone_number} already exists. Please use the existing customer or contact them to verify.`,
            functionName: 'create_booking',
            data: { duplicate_customer: result.duplicate_customer }
          };
        }

        return {
          success: false,
          error: result.error || 'Failed to create booking',
          functionName: 'create_booking'
        };
      }

      // Booking created successfully - now send notifications
      const bookingId = result.booking?.id;
      // Get the bay from the result - it's in result.booking.bay
      const bayAssigned = result.booking?.bay;

      if (!bayAssigned) {
        console.warn('Bay not assigned in result:', result);
      }

      // Send booking confirmation to LINE customer (this will be handled by approve-booking endpoint)
      // The confirmation will be sent if conversationId is provided
      console.log('✅ Booking confirmation will be sent via approve-booking endpoint');

      try {
        // 2. Send staff channel notification
        const { format: formatDate, getDate, parseISO } = await import('date-fns');

        const dateObj = parseISO(params.date);
        const day = getDate(dateObj);
        const weekday = formatDate(dateObj, 'EEE');
        const month = formatDate(dateObj, 'MMMM');

        // Helper function for ordinal suffix
        const getOrdinalSuffix = (d: number): string => {
          const j = d % 10, k = d % 100;
          if (j == 1 && k != 11) return "st";
          if (j == 2 && k != 12) return "nd";
          if (j == 3 && k != 13) return "rd";
          return "th";
        };

        const formattedDate = `${weekday}, ${day}${getOrdinalSuffix(day)} ${month}`;

        // Calculate end time
        const [hours, minutes] = params.start_time.split(':');
        const totalMins = parseInt(hours) * 60 + parseInt(minutes) + Math.round(params.duration * 60);
        const endTime = `${String(Math.floor(totalMins / 60)).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`;

        // Format booking type display (same as booking form)
        const bookingTypeDisplay = packageName ? `${bookingType} (${packageName})` : bookingType;

        // Build message in exact same format as booking form
        const isNewCustomerBooking = result.booking?.is_new_customer === true;
        const customerNameDisplay = isNewCustomerBooking
          ? `${params.customer_name} (New Customer)`
          : params.customer_name;

        let message = 'Booking Notification';
        if (bookingId) {
          message += ` (ID: ${bookingId})`;
        }
        message += `\nName: ${customerNameDisplay}`;
        message += `\nPhone: ${params.phone_number}`;
        message += `\nDate: ${formattedDate}`;
        message += `\nTime: ${params.start_time} - ${endTime}`;
        message += `\nBay: ${bayAssigned}`;
        message += `\nType: ${bookingTypeDisplay}`;
        message += `\nPeople: ${params.number_of_people}`;
        // Show actual channel (LINE, Website, etc.) - LINE is all-caps
        const channelDisplayMap: Record<string, string> = {
          line: 'LINE', website: 'Website', facebook: 'Facebook',
          instagram: 'Instagram', whatsapp: 'WhatsApp'
        };
        const channelDisplay = channelType
          ? (channelDisplayMap[channelType] || channelType)
          : 'LINE';
        message += `\nChannel: ${channelDisplay}`;
        message += `\nCreated by: AI Assistant`;

        // Add package note if applicable
        if (packageNote) {
          message += `\nNote: ${packageNote}`;
        }


        // Send to LINE staff channel using the same endpoint
        // Note: /api/notify will append customer_notes to the message automatically
        const notifyResponse = await fetch(`${baseUrl}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message.trim(),
            bookingType: bookingType,
            customer_notes: bookingData.customer_notes
          })
        });

        if (notifyResponse.ok) {
          console.log('✅ LINE staff notification sent');
        } else {
          console.warn('⚠️ Failed to send LINE staff notification');
        }
      } catch (error) {
        console.error('Error sending LINE notification:', error);
        // Don't fail the booking creation if notification fails
      }

      return {
        success: true,
        functionName: 'create_booking',
        data: {
          booking_id: bookingId,
          booking_created: true,
          customer_name: params.customer_name,
          date: params.date,
          start_time: params.start_time,
          duration: params.duration
        }
      };
    } catch (error) {
      console.error('Error creating booking:', error);
      return {
        success: false,
        error: 'Failed to create booking. Please try again.',
        functionName: 'create_booking'
      };
    }
  }

  /**
   * Execute approved booking cancellation
   * Called after staff approves the cancellation
   */
  async executeApprovedCancellation(params: any): Promise<FunctionResult> {
    try {
      const { refacSupabaseAdmin } = await import('@/lib/refac-supabase');

      // First, find the booking to cancel
      let bookingId = params.booking_id;

      // If no booking_id provided, search for it
      if (!bookingId || bookingId === '') {
        const { date, customer_name, phone_number } = params;

        if (!date || date === '') {
          return {
            success: false,
            error: 'Need either booking_id or date to identify booking to cancel',
            functionName: 'cancel_booking'
          };
        }

        // Build query to find booking
        let query = refacSupabaseAdmin
          .from('bookings')
          .select('id, date, start_time, name, phone_number, status')
          .eq('date', date)
          .in('status', ['confirmed', 'pending']); // Only cancel active bookings

        // Add customer filters if provided
        if (phone_number && phone_number !== '') {
          query = query.eq('phone_number', phone_number);
        } else if (customer_name && customer_name !== '') {
          query = query.ilike('name', `%${customer_name}%`);
        }

        const { data: bookings, error: searchError } = await query;

        if (searchError) {
          return {
            success: false,
            error: 'Failed to search for booking',
            functionName: 'cancel_booking'
          };
        }

        if (!bookings || bookings.length === 0) {
          return {
            success: false,
            error: `No active booking found for ${date}${customer_name ? ` - ${customer_name}` : ''}`,
            functionName: 'cancel_booking'
          };
        }

        if (bookings.length > 1) {
          return {
            success: false,
            error: `Multiple bookings found for ${date}. Please specify booking_id.`,
            functionName: 'cancel_booking',
            data: { bookings: bookings.map((b: any) => ({ id: b.id, name: b.name, time: b.start_time })) }
          };
        }

        bookingId = bookings[0].id;
      }

      // DRY RUN MODE: Return mock success without cancelling
      if (this.dryRun) {
        console.log('[DRY RUN] Would cancel booking:', bookingId);
        return {
          success: true,
          functionName: 'cancel_booking',
          data: {
            booking_id: bookingId,
            booking_cancelled: false,
            dry_run: true,
            cancellation_reason: params.cancellation_reason
          }
        };
      }

      // Use absolute URL for server-side fetch
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_name: params.staff_name || 'AI Assistant',
          cancellation_reason: params.cancellation_reason || 'Customer requested via AI chat'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to cancel booking',
          functionName: 'cancel_booking'
        };
      }

      // Send LINE cancellation notification to customer (optional - may fail if customer not on LINE)
      try {
        await fetch(`${baseUrl}/api/line/bookings/${bookingId}/send-cancellation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageFormat: 'flex',
            senderName: params.staff_name || 'AI Assistant'
          })
        });
      } catch (lineError) {
        // LINE notification is optional, don't fail if it doesn't work
        console.log('LINE notification to customer skipped (customer may not have LINE linked)');
      }

      // Send staff channel notification (same format as manual cancellation)
      try {
        // Get the booking details for the notification
        const { data: booking } = await refacSupabaseAdmin
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single();

        if (booking) {
          const { format: formatDate } = await import('date-fns');

          // Format date same as client-side (e.g., "Wed, Oct 23")
          const bookingDate = formatDate(new Date(booking.date), 'EEE, MMM dd');

          // Build cancellation notification message (exact format from CancelBookingModal.tsx:111)
          let lineMessage = `🚫 BOOKING CANCELLED (ID: ${booking.id}) 🚫\n`;
          lineMessage += `----------------------------------\n`;
          lineMessage += `👤 Customer: ${booking.name}\n`;
          lineMessage += `📞 Phone: ${booking.phone_number}\n`;
          lineMessage += `🗓️ Date: ${bookingDate}\n`;
          lineMessage += `⏰ Time: ${booking.start_time} (Duration: ${booking.duration}h)\n`;
          lineMessage += `⛳ Bay: ${booking.bay || 'N/A'}\n`;
          lineMessage += `🧑‍🤝‍🧑 Pax: ${booking.number_of_people}\n`;
          lineMessage += `----------------------------------\n`;
          lineMessage += `🗑️ Cancelled By: ${params.staff_name || 'AI Assistant'}`;
          if (params.cancellation_reason) {
            lineMessage += `\n💬 Reason: ${params.cancellation_reason}`;
          }

          // Send to LINE staff channel
          const notifyResponse = await fetch(`${baseUrl}/api/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: lineMessage,
              bookingType: booking.booking_type,
              customer_notes: booking.customer_notes
            })
          });

          if (notifyResponse.ok) {
            console.log('✅ LINE staff cancellation notification sent');
          } else {
            console.warn('⚠️ Failed to send LINE staff cancellation notification');
          }
        }
      } catch (error) {
        console.error('Error sending staff cancellation notification:', error);
        // Don't fail the cancellation if notification fails
      }

      return {
        success: true,
        functionName: 'cancel_booking',
        data: {
          booking_id: bookingId,
          booking_cancelled: true,
          cancellation_reason: params.cancellation_reason
        }
      };
    } catch (error) {
      console.error('Error cancelling booking:', error);
      return {
        success: false,
        error: 'Failed to cancel booking. Please try again.',
        functionName: 'cancel_booking'
      };
    }
  }

  /**
   * Execute approved booking modification
   * Called after staff approves the modification
   * Calls PUT /api/bookings/{bookingId} with the changes
   */
  async executeApprovedModification(params: any): Promise<FunctionResult> {
    try {
      const {
        booking_id,
        date,
        start_time,
        duration,
        bay_type,
        modification_reason
      } = params;

      // DRY RUN MODE: Return mock success without modifying
      if (this.dryRun) {
        console.log('[DRY RUN] Would modify booking:', booking_id, params);
        return {
          success: true,
          functionName: 'modify_booking',
          data: {
            booking_id,
            booking_modified: false,
            dry_run: true,
            changes: params
          }
        };
      }

      // Prepare update payload for PUT /api/bookings/{bookingId}
      // IMPORTANT: Duration must be in MINUTES for the API
      const updatePayload: any = {
        employee_name: 'AI Assistant', // Required field for audit trail
        customer_notes: `🤖 AI MODIFICATION: ${modification_reason || 'Customer requested change'}`,
        availability_overridden: false // Don't skip availability checks
      };

      // Only include fields that are being changed
      if (date) {
        updatePayload.date = date;
      }
      if (start_time) {
        updatePayload.start_time = start_time;
      }
      if (duration && duration > 0) {
        // Convert hours to minutes for the API
        updatePayload.duration = duration * 60;
      }
      if (bay_type) {
        // Note: API expects specific bay name or null, but we'll let it auto-assign
        // by not including the bay field - the API will handle bay assignment based on bay_type
        updatePayload.bay_type = bay_type;
      }

      // Call PUT /api/bookings/{bookingId}
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/bookings/${booking_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          return {
            success: false,
            error: result.error || 'The proposed time slot is not available.',
            functionName: 'modify_booking'
          };
        }

        return {
          success: false,
          error: result.error || 'Failed to modify booking',
          functionName: 'modify_booking'
        };
      }

      console.log('✅ Booking modified successfully:', booking_id);

      // Note: Booking confirmation will be sent by approve-booking endpoint if conversationId is provided

      // Send staff channel notification
      try {
        const { refacSupabaseAdmin } = await import('@/lib/refac-supabase');
        const { format: formatDate } = await import('date-fns');

        // Get the updated booking details
        const { data: booking } = await refacSupabaseAdmin
          .from('bookings')
          .select('*')
          .eq('id', booking_id)
          .single();

        if (booking) {
          // Format date (e.g., "Wed, Oct 23")
          const bookingDate = formatDate(new Date(booking.date), 'EEE, MMM dd');

          // Build modification notification message
          let lineMessage = `🔄 BOOKING MODIFIED (ID: ${booking.id}) 🔄\n`;
          lineMessage += `----------------------------------\n`;
          lineMessage += `👤 Customer: ${booking.name}\n`;
          lineMessage += `📞 Phone: ${booking.phone_number}\n`;
          lineMessage += `🗓️ Date: ${bookingDate}\n`;
          lineMessage += `⏰ Time: ${booking.start_time} (Duration: ${booking.duration}h)\n`;
          lineMessage += `⛳ Bay: ${booking.bay || 'TBD'}\n`;
          lineMessage += `🧑‍🤝‍🧑 Pax: ${booking.number_of_people}\n`;
          lineMessage += `----------------------------------\n`;
          lineMessage += `✏️ Modified By: AI Assistant`;
          if (modification_reason) {
            lineMessage += `\n💬 Reason: ${modification_reason}`;
          }

          // Send to LINE staff channel
          const notifyResponse = await fetch(`${baseUrl}/api/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: lineMessage,
              bookingType: booking.booking_type,
              customer_notes: booking.customer_notes
            })
          });

          if (notifyResponse.ok) {
            console.log('✅ LINE staff modification notification sent');
          } else {
            console.warn('⚠️ Failed to send LINE staff modification notification');
          }
        }
      } catch (error) {
        console.error('Error sending staff modification notification:', error);
        // Don't fail the modification if notification fails
      }

      return {
        success: true,
        functionName: 'modify_booking',
        data: {
          booking_id,
          booking_modified: true,
          updated_booking: result.booking,
          changes: {
            date,
            start_time,
            duration,
            bay_type,
            modification_reason
          }
        }
      };
    } catch (error) {
      console.error('Error modifying booking:', error);
      return {
        success: false,
        error: 'Failed to modify booking. Please try again.',
        functionName: 'modify_booking'
      };
    }
  }

  /**
   * Look up booking(s) for a customer
   * Searches by booking ID, customer name, phone, or date
   */
  private async lookupBooking(params: any): Promise<FunctionResult> {
    try {
      const { booking_id, customer_name, phone_number, date, status = 'upcoming' } = params;

      // Import refacSupabaseAdmin here to avoid circular dependency
      const { refacSupabaseAdmin } = await import('@/lib/refac-supabase');

      if (!refacSupabaseAdmin) {
        throw new Error('Database client not available');
      }

      // Build query based on provided parameters
      // Note: Bookings table has both name/phone_number AND customer_id for backwards compatibility
      let query = refacSupabaseAdmin
        .from('bookings')
        .select('id, date, start_time, duration, bay, booking_type, status, package_name, name, phone_number, customer_id, customers(customer_name, contact_number)');

      // Filter by booking ID if provided
      if (booking_id) {
        query = query.eq('id', booking_id);
      }

      // Filter by customer name if provided (search in bookings.name directly)
      if (customer_name && !booking_id) {
        query = query.ilike('name', `%${customer_name}%`);
      }

      // Filter by phone number if provided (search in bookings.phone_number directly)
      if (phone_number && !booking_id && !customer_name) {
        query = query.eq('phone_number', phone_number);
      }

      // Filter by date if provided
      if (date) {
        query = query.eq('date', date);
      }

      // Filter by status
      const today = new Date().toISOString().split('T')[0];
      if (status === 'upcoming') {
        query = query.gte('date', today).in('status', ['confirmed', 'pending']);
      } else if (status === 'past') {
        query = query.lt('date', today).eq('status', 'completed');
      } else if (status === 'cancelled') {
        query = query.eq('status', 'cancelled');
      }
      // 'all' = no status filter

      // Order by date and time
      query = query.order('date', { ascending: status === 'upcoming' })
        .order('start_time', { ascending: true })
        .limit(10);

      const { data: bookings, error } = await query;

      if (error) {
        console.error('Error looking up bookings:', error);
        return {
          success: false,
          error: 'Failed to look up bookings',
          functionName: 'lookup_booking'
        };
      }

      if (!bookings || bookings.length === 0) {
        return {
          success: true,
          functionName: 'lookup_booking',
          data: {
            found: false,
            bookings: [],
            message: 'No bookings found matching the criteria'
          }
        };
      }

      // Format bookings for AI response
      // Use booking.name/phone_number as fallback if customer join doesn't work
      const formattedBookings = bookings.map((booking: any) => ({
        booking_id: booking.id,
        customer_name: booking.customers?.customer_name || booking.name,
        phone: booking.customers?.contact_number || booking.phone_number,
        date: booking.date,
        time: booking.start_time,
        duration: booking.duration,
        bay: booking.bay,
        bay_type: this.determineBayType(booking.bay),
        is_coaching: (booking.booking_type || '').toLowerCase().includes('coaching'),
        coach_name: this.extractCoachName(booking.booking_type),
        status: booking.status,
        package_name: booking.package_name
      }));

      return {
        success: true,
        functionName: 'lookup_booking',
        data: {
          found: true,
          bookings: formattedBookings,
          count: formattedBookings.length
        }
      };
    } catch (error) {
      console.error('Error in lookupBooking:', error);
      return {
        success: false,
        error: 'Failed to look up bookings',
        functionName: 'lookup_booking'
      };
    }
  }

  /**
   * Look up detailed customer information including packages
   */
  private async lookupCustomer(params: any): Promise<FunctionResult> {
    try {
      const { phone_number } = params;

      // Import refacSupabaseAdmin here to avoid circular dependency
      const { refacSupabaseAdmin } = await import('@/lib/refac-supabase');

      if (!refacSupabaseAdmin) {
        throw new Error('Database client not available');
      }

      // Find customer by phone number
      let customerQuery = refacSupabaseAdmin
        .from('customers')
        .select('id, customer_name, email, contact_number, notes')
        .limit(1);

      if (phone_number) {
        customerQuery = customerQuery.eq('contact_number', phone_number);
      }

      const { data: customers, error: customerError } = await customerQuery;

      if (customerError || !customers || customers.length === 0) {
        return {
          success: true,
          functionName: 'lookup_customer',
          data: {
            found: false,
            message: 'Customer not found'
          }
        };
      }

      const customer = customers[0];

      // Get active packages with details
      const { data: activePackages } = await refacSupabaseAdmin
        .from('customer_packages')
        .select('id, package_type_name, remaining_hours, used_hours, expiration_date, status')
        .eq('customer_id', customer.id)
        .eq('status', 'active')
        .order('expiration_date', { ascending: true });

      // Get lifetime stats from transactions
      const { data: transactionStats } = await refacSupabaseAdmin
        .schema('pos')
        .from('transactions')
        .select('total_amount')
        .eq('customer_id', customer.id)
        .eq('status', 'completed');

      const lifetimeValue = transactionStats?.reduce((sum: number, t: any) => sum + (t.total_amount || 0), 0) || 0;
      const totalVisits = transactionStats?.length || 0;

      // Get booking summary
      const { data: bookingCount } = await refacSupabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customer.id);

      // Format packages for response
      const formattedPackages = (activePackages || []).map((pkg: any) => {
        const isUnlimited = pkg.remaining_hours === 'Unlimited';
        const hoursLeft = isUnlimited ? 'Unlimited' : Number(pkg.remaining_hours) || 0;
        const totalHours = isUnlimited ? 'Unlimited' : (hoursLeft as number) + (pkg.used_hours || 0);

        return {
          package_name: pkg.package_type_name,
          hours_remaining: hoursLeft,
          hours_used: pkg.used_hours || 0,
          total_hours: totalHours,
          expiration_date: pkg.expiration_date,
          status: pkg.status
        };
      });

      return {
        success: true,
        functionName: 'lookup_customer',
        data: {
          found: true,
          customer: {
            name: customer.customer_name,
            phone: customer.contact_number,
            email: customer.email,
            notes: customer.notes,
            lifetime_value: lifetimeValue,
            total_visits: totalVisits,
            total_bookings: bookingCount?.length || 0
          },
          packages: {
            active_count: formattedPackages.length,
            details: formattedPackages
          }
        }
      };
    } catch (error) {
      console.error('Error in lookupCustomer:', error);
      return {
        success: false,
        error: 'Failed to look up customer information',
        functionName: 'lookup_customer'
      };
    }
  }

  /**
   * Prepare booking cancellation for staff approval
   * Unlike check_bay_availability, cancellations require explicit staff approval
   */
  private prepareCancellationForApproval(params: any): FunctionResult {
    const {
      booking_id,
      date,
      customer_name,
      phone_number,
      cancellation_reason,
      staff_name = 'AI Assistant'
    } = params;

    // Build cancellation summary
    let summary = 'Cancel booking';

    if (booking_id && booking_id !== '') {
      summary += ` (ID: ${booking_id})`;
    } else if (date && date !== '') {
      summary += ` for ${date}`;
      if (customer_name && customer_name !== '') {
        summary += ` - ${customer_name}`;
      }
    } else {
      // Not enough info to identify booking
      return {
        success: false,
        error: 'Cannot identify booking to cancel. Need either booking_id or date + customer info.',
        functionName: 'cancel_booking'
      };
    }

    if (cancellation_reason && cancellation_reason !== '') {
      summary += ` - Reason: ${cancellation_reason}`;
    }

    // Return approval request
    return {
      success: true,
      requiresApproval: true,
      functionName: 'cancel_booking',
      approvalMessage: summary,
      data: {
        action: 'cancel_booking',
        booking_id: booking_id || undefined,
        date: date || undefined,
        customer_name: customer_name || undefined,
        phone_number: phone_number || undefined,
        cancellation_reason: cancellation_reason || 'Customer requested',
        staff_name: staff_name
      }
    };
  }

  /**
   * Prepare booking modification for staff approval
   * Looks up existing booking, validates changes, checks availability if needed
   */
  private async prepareModificationForApproval(params: any): Promise<FunctionResult> {
    try {
      const {
        booking_id,
        date,
        start_time,
        duration,
        bay_type,
        modification_reason
      } = params;

      // STEP 1: Lookup existing booking to get current details
      const lookupResult = await this.lookupBooking({
        booking_id,
        customer_name: '',
        phone_number: '',
        date: '',
        status: 'upcoming'
      });

      if (!lookupResult.success || !lookupResult.data?.found || !lookupResult.data?.bookings?.length) {
        return {
          success: false,
          error: `Booking ${booking_id} not found. Cannot modify a non-existent booking.`,
          functionName: 'modify_booking'
        };
      }

      const existingBooking = lookupResult.data.bookings[0];

      // STEP 2: Determine what's changing
      const newDate = date && date !== '' ? date : existingBooking.date;
      const newTime = start_time && start_time !== '' ? start_time : existingBooking.time;
      const newDuration = duration && duration > 0 ? duration : existingBooking.duration;
      const newBayType = bay_type && bay_type !== '' ? bay_type : (existingBooking.bay_type === 'AI Bay' ? 'ai' : 'social');

      // STEP 3: Check if time/date/duration changes require availability check
      const timeChanged = newDate !== existingBooking.date ||
                         newTime !== existingBooking.time ||
                         newDuration !== existingBooking.duration ||
                         newBayType !== (existingBooking.bay_type === 'AI Bay' ? 'ai' : 'social');

      if (timeChanged) {
        // Check availability for ALL bay types, excluding the booking being modified
        // so the customer's own booking doesn't block the time change
        const availCheck = await this.checkBayAvailability({
          date: newDate,
          start_time: newTime,
          duration: newDuration,
          bay_type: 'all',
          excludeBookingId: booking_id
        });

        // Determine if the REQUESTED bay type is available
        const socialAvailable = availCheck.data?.social_bays_available ?? false;
        const aiAvailable = availCheck.data?.ai_bay_available ?? false;
        const requestedTypeAvailable = newBayType === 'ai' ? aiAvailable : socialAvailable;

        if (!availCheck.success || !requestedTypeAvailable) {

          let errorMessage = `Sorry, ${newBayType === 'social' ? 'social bays are' : 'the AI bay is'} not available at ${newTime} on ${formatDateNatural(newDate)}.`;

          // Suggest alternative bay type if available
          if (newBayType === 'ai' && socialAvailable) {
            errorMessage += ' However, social bays are available at that time.';
          } else if (newBayType === 'social' && aiAvailable) {
            errorMessage += ' However, the AI bay is available at that time.';
          } else {
            errorMessage += ' Would you like to try a different time?';
          }

          return {
            success: false,
            error: errorMessage,
            functionName: 'modify_booking',
            data: {
              booking_id,
              requested_date: newDate,
              requested_time: newTime,
              requested_duration: newDuration,
              social_bays_available: socialAvailable,
              ai_bay_available: aiAvailable
            }
          };
        }

        console.log(`✅ Availability confirmed for modification: ${newBayType} at ${newTime} on ${newDate}`);
      }

      // STEP 4: Build approval message showing old → new
      let approvalMessage = `Modify booking ${booking_id}\n`;
      approvalMessage += `Customer: ${existingBooking.customer_name}\n`;
      approvalMessage += `\n`;

      // Show what's changing
      if (newDate !== existingBooking.date) {
        approvalMessage += `📅 Date: ${existingBooking.date} → ${newDate}\n`;
      }
      if (newTime !== existingBooking.time) {
        approvalMessage += `🕐 Time: ${existingBooking.time} → ${newTime}\n`;
      }
      if (newDuration !== existingBooking.duration) {
        approvalMessage += `⏱️ Duration: ${existingBooking.duration}h → ${newDuration}h\n`;
      }
      if (newBayType !== (existingBooking.bay_type === 'AI Bay' ? 'ai' : 'social')) {
        const oldType = existingBooking.bay_type;
        const newType = newBayType === 'ai' ? 'AI Bay' : 'Social Bay';
        approvalMessage += `⛳ Bay Type: ${oldType} → ${newType}\n`;
      }

      if (modification_reason && modification_reason !== '') {
        approvalMessage += `\n💬 Reason: ${modification_reason}`;
      }

      // STEP 5: Return approval request
      return {
        success: true,
        requiresApproval: true,
        functionName: 'modify_booking',
        approvalMessage: approvalMessage.trim(),
        data: {
          booking_id,
          // Only include changed fields
          date: date && date !== '' ? date : undefined,
          start_time: start_time && start_time !== '' ? start_time : undefined,
          duration: duration && duration > 0 ? duration : undefined,
          bay_type: bay_type && bay_type !== '' ? bay_type : undefined,
          modification_reason: modification_reason || 'Customer requested',
          // Include current values for reference
          current_date: existingBooking.date,
          current_time: existingBooking.time,
          current_duration: existingBooking.duration,
          current_bay: existingBooking.bay
        }
      };

    } catch (error) {
      console.error('Error preparing modification for approval:', error);
      return {
        success: false,
        error: 'Failed to prepare booking modification. Please try again.',
        functionName: 'modify_booking'
      };
    }
  }

  /**
   * Check availability using the DB RPC that can exclude a specific booking.
   * Used during modify_booking so the customer's own booking doesn't block the check.
   */
  private async checkAvailabilityExcludingBooking(
    date: string, startTime: string, duration: number, bayType: string, excludeBookingId: string
  ): Promise<FunctionResult> {
    try {
      const { data, error } = await refacSupabaseAdmin.rpc('check_all_bays_availability', {
        p_date: date,
        p_start_time: startTime,
        p_duration: duration,
        p_exclude_booking_id: excludeBookingId
      });

      if (error) {
        console.error('Error checking availability with exclusion:', error);
        return { success: false, error: 'Failed to check availability', functionName: 'check_bay_availability' };
      }

      // RPC returns: { "Bay 1": true/false, "Bay 2": true/false, "Bay 3": true/false, "Bay 4": true/false }
      const bayAvailability = data as Record<string, boolean>;
      const socialBaysAvailable = ['Bay 1', 'Bay 2', 'Bay 3'].some(bay => bayAvailability[bay]);
      const aiBayAvailable = bayAvailability['Bay 4'] ?? false;

      const available = bayType === 'ai' ? aiBayAvailable :
                        bayType === 'social' ? socialBaysAvailable :
                        socialBaysAvailable || aiBayAvailable;

      return {
        success: true,
        functionName: 'check_bay_availability',
        data: {
          date: formatDateNatural(date),
          requested_time: startTime,
          duration,
          bay_type: bayType,
          available,
          social_bays_available: socialBaysAvailable,
          ai_bay_available: aiBayAvailable,
          available_bay_count: Object.values(bayAvailability).filter(Boolean).length
        }
      };
    } catch (error) {
      console.error('Error in checkAvailabilityExcludingBooking:', error);
      return { success: false, error: 'Failed to check availability', functionName: 'check_bay_availability' };
    }
  }

  /**
   * Check club set availability using the get_available_club_sets RPC
   */
  private async checkClubAvailability(params: any): Promise<FunctionResult> {
    try {
      const { rental_type, date, end_date, start_time, duration_hours } = params;

      if (!refacSupabaseAdmin) {
        return {
          success: false,
          error: 'Database connection not available',
          functionName: 'check_club_availability'
        };
      }

      const { data, error } = await refacSupabaseAdmin.rpc('get_available_club_sets', {
        p_rental_type: rental_type,
        p_start_date: date,
        p_end_date: end_date && end_date !== '' ? end_date : date,
        p_start_time: start_time && start_time !== '' ? start_time : null,
        p_duration_hours: duration_hours && duration_hours > 0 ? duration_hours : null,
      });

      if (error) {
        console.error('Error checking club availability:', error);
        return {
          success: false,
          error: `Failed to check club availability: ${error.message}`,
          functionName: 'check_club_availability'
        };
      }

      const sets = data || [];
      const dateLabel = formatDateNatural(date);

      if (sets.length === 0) {
        return {
          success: true,
          data: {
            available: false,
            message: `No club sets available for ${dateLabel}.`,
            rental_type,
            date,
          },
          functionName: 'check_club_availability'
        };
      }

      // Format results for the AI
      const formatted = sets.map((s: any) => ({
        name: s.name,
        tier: s.tier,
        gender: s.gender,
        brand: s.brand,
        model: s.model,
        available_count: s.available_count,
        // Include relevant pricing based on rental type
        ...(rental_type === 'course' ? {
          price_1d: s.course_price_1d,
          price_3d: s.course_price_3d,
          price_7d: s.course_price_7d,
          price_14d: s.course_price_14d,
        } : {
          price_1h: s.indoor_price_1h,
          price_2h: s.indoor_price_2h,
          price_4h: s.indoor_price_4h,
        }),
      }));

      const availableSets = formatted.filter((s: any) => s.available_count > 0);
      const unavailableSets = formatted.filter((s: any) => s.available_count === 0);

      return {
        success: true,
        data: {
          available: availableSets.length > 0,
          date: dateLabel,
          rental_type,
          available_sets: availableSets,
          unavailable_sets: unavailableSets.length > 0 ? unavailableSets.map((s: any) => s.name) : undefined,
        },
        functionName: 'check_club_availability'
      };
    } catch (error) {
      console.error('Error checking club availability:', error);
      return {
        success: false,
        error: `Error checking club availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
        functionName: 'check_club_availability'
      };
    }
  }

  // Helper methods
  private determineBayType(bayNumber: string | null): string {
    if (!bayNumber) return 'Unknown';
    if (bayNumber === 'Bay 1' || bayNumber === 'Bay 2' || bayNumber === 'Bay 3') {
      return 'Social Bay';
    } else if (bayNumber === 'Bay 4') {
      return 'AI Bay';
    }
    return 'Sim';
  }

  private extractCoachName(bookingType: string | null): string | undefined {
    if (!bookingType) return undefined;
    const match = bookingType.match(/\(([^)]+)\)/);
    return match?.[1] || undefined;
  }
}

// Export singleton instance
export const functionExecutor = new AIFunctionExecutor();
