// AI Function Executor - Executes function calls from OpenAI
// Leverages existing APIs to perform actions

import { validateFunctionCall } from './function-schemas';
import { generateBookingId } from '@/lib/booking-utils';

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
    // Validate parameters
    const validation = validateFunctionCall(functionCall.name, functionCall.parameters);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        functionName: functionCall.name
      };
    }

    // Route to appropriate function
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
      const { date, start_time, duration, bay_type = 'all' } = params;

      // Get current time in Thailand timezone
      const thailandTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
      const currentHour = thailandTime.getHours();
      const currentMinute = thailandTime.getMinutes();

      // Determine start hour for availability check
      // If checking today, start from current hour (or next hour if past 30 mins)
      // If checking future date, start from 10 AM
      const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"})).toISOString().split('T')[0];
      const isToday = date === today;
      const startHour = isToday ? (currentMinute >= 30 ? currentHour + 1 : currentHour) : 10;

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
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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
      // For specific time requests, only return yes/no availability
      if (start_time) {
        // Specific time request - minimal response
        // IMPORTANT: Do NOT include internal bay names (Bay 1, Bay 2, Bay 4)
        // AI should only mention "Social bay" or "AI bay" to customers
        return {
          success: true,
          functionName: 'check_bay_availability',
          data: {
            date,
            requested_time: start_time,
            duration,
            bay_type,
            available: availableBays.length > 0,
            social_bays_available: socialBaysAvailable.length > 0,
            ai_bay_available: aiBayAvailable,
            available_bay_count: availableBays.length
            // Removed: available_bays field - internal bay names should not be exposed to customers
          }
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
              ranges.push(`${rangeStart}-${lastTime}`);
            }
            rangeStart = currentTime;
          }
          lastTime = currentTime;
        }

        // Close final range
        if (rangeStart === lastTime) {
          ranges.push(rangeStart);
        } else {
          ranges.push(`${rangeStart}-${lastTime}`);
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
          date,
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
   * Returns detailed time slot information similar to bay availability
   */
  private async getCoachingAvailability(params: any): Promise<FunctionResult> {
    try {
      const { date, coach_name, preferred_time } = params;

      // Use absolute URL for server-side fetch
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const url = `${baseUrl}/api/coaching-assist/availability?date=${date}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract coach availability slots and weekly schedule
      let coaches = data.availability_slots || [];
      const weeklyAvailability = data.weekly_availability || {};
      const daySchedule = weeklyAvailability[date] || {};

      // Filter by specific coach if requested
      if (coach_name && coach_name !== 'any') {
        // Handle Boss/Ratchavin alias (they are the same person)
        const searchNames =
          (coach_name === 'Boss' || coach_name === 'Ratchavin')
            ? ['Boss', 'Ratchavin', 'Boss - Ratchavin']
            : [coach_name];

        coaches = coaches.filter((c: any) =>
          searchNames.some(name => c.coach_name && c.coach_name.includes(name))
        );
      }

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

          // Check if times are consecutive (1 hour apart)
          if (currentHour - lastHour > 1) {
            // Gap detected, close current range
            if (rangeStart === lastTime) {
              ranges.push(rangeStart);
            } else {
              ranges.push(`${rangeStart}-${lastTime}`);
            }
            rangeStart = currentTime;
          }
          lastTime = currentTime;
        }

        // Close final range
        if (rangeStart === lastTime) {
          ranges.push(rangeStart);
        } else {
          ranges.push(`${rangeStart}-${lastTime}`);
        }

        return ranges.join(', ');
      };

      // Build availability response - only include available coaches with time slots
      const availableCoaches = coaches
        .filter((c: any) => c.is_available_today) // Only include coaches who are available
        .map((c: any) => {
          // Find the coach's schedule for this specific date
          const coachSchedule = daySchedule[c.coach_id];

          let availableTimeSlots: string[] = [];

          if (coachSchedule && coachSchedule.status !== 'unavailable') {
            const startHour = parseInt(coachSchedule.start_time?.split(':')[0] || '0');
            const endHour = parseInt(coachSchedule.end_time?.split(':')[0] || '0');
            const bookedSlots = coachSchedule.bookings || [];

            // Generate available time slots (excluding booked times)
            for (let hour = startHour; hour < endHour; hour++) {
              const timeSlot = `${hour.toString().padStart(2, '0')}:00`;

              // Check if this hour is booked
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
            availability: groupIntoRanges(availableTimeSlots)
          };
        })
        .filter((c: any) => c.availability !== 'None'); // Only include coaches with available slots

      // Check if preferred time is available for any coach
      let preferredTimeAvailable = false;
      if (preferred_time && availableCoaches.length > 0) {
        preferredTimeAvailable = availableCoaches.some((c: { coach_name: string; availability: string }) =>
          c.availability.includes(preferred_time)
        );
      }

      // If no coaches are available, return simple response
      if (availableCoaches.length === 0) {
        return {
          success: true,
          functionName: 'get_coaching_availability',
          data: {
            date,
            coach_name: coach_name || 'any',
            preferred_time,
            has_availability: false,
            message: `No coaches available on ${date}`
          }
        };
      }

      return {
        success: true,
        functionName: 'get_coaching_availability',
        data: {
          date,
          coach_name: coach_name || 'any',
          preferred_time,
          preferred_time_available: preferredTimeAvailable,
          coaches: availableCoaches,
          has_availability: true
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
    const requestedBayType = params.bay_type || 'social';

    const availabilityCheck = await this.checkBayAvailability({
      date: params.date,
      start_time: params.start_time,
      duration: params.duration,
      bay_type: requestedBayType
    });

    if (!availabilityCheck.success || !availabilityCheck.data?.available) {
      // Bay not available - return error so AI can inform customer
      const socialAvailable = availabilityCheck.data?.social_bays_available;
      const aiAvailable = availabilityCheck.data?.ai_bay_available;

      let errorMessage = `Sorry, ${requestedBayType === 'social' ? 'social bays are' : 'the AI bay is'} not available at ${params.start_time} on ${params.date}.`;

      // Suggest alternative bay type if available
      if (requestedBayType === 'ai' && socialAvailable) {
        errorMessage += ' However, social bays are available at that time. Would you like to book a social bay instead?';
      } else if (requestedBayType === 'social' && aiAvailable) {
        errorMessage += ' However, the AI bay is available at that time. Would you like to book the AI bay instead?';
      } else {
        errorMessage += ' Would you like to check availability for a different time?';
      }

      return {
        success: false,
        error: errorMessage,
        functionName: 'create_booking',
        data: {
          requested_bay_type: requestedBayType,
          social_bays_available: socialAvailable,
          ai_bay_available: aiAvailable,
          requested_time: params.start_time,
          requested_date: params.date
        }
      };
    }

    console.log(`✅ Bay availability confirmed for ${requestedBayType} at ${params.start_time}`);

    // STEP 2: Clone params and prepare booking data
    const updatedParams = { ...params };

    // STEP 3: Auto-select package if customer has one
    let packageName: string | null = null;

    if (customerId) {
      try {
        const isCoachingBooking = params.booking_type && params.booking_type.toLowerCase().includes('coaching');

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/line/customers/${customerId}/details`);
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
    const endHour = parseInt(hours) + params.duration;
    const endTime = `${String(endHour).padStart(2, '0')}:${minutes}`;

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
  async executeApprovedBooking(params: any, customerId?: string): Promise<FunctionResult> {
    try {
      // Get requested bay type from params (already validated in prepare stage)
      const requestedBayType = params.bay_type || 'social';

      // If customer has packages, try to auto-select one
      let packageId: string | null = null;
      let packageName: string | null = null;

      if (customerId) {
        try {
          // Determine if this is a coaching booking
          const isCoachingBooking = params.booking_type && params.booking_type.toLowerCase().includes('coaching');

          // Fetch customer's active packages using the correct endpoint
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
          const response = await fetch(`${baseUrl}/api/line/customers/${customerId}/details`);
          if (response.ok) {
            const data = await response.json();
            const activePackages = data.packages?.filter((pkg: any) =>
              (pkg.remaining_hours !== '0' && pkg.remaining_hours !== 0) || pkg.package_type === 'Unlimited'
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
        customer_notes: `🤖 AI BOOKING`
      };

      // If customer ID is provided (existing customer), use it
      // Otherwise mark as new customer
      if (customerId) {
        bookingData.customer_id = customerId;
        bookingData.isNewCustomer = false;
      } else {
        bookingData.isNewCustomer = true; // API will check for duplicates
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
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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
        const endHour = parseInt(hours) + params.duration;
        const endTime = `${String(endHour).padStart(2, '0')}:${minutes}`;

        // Format booking type display (same as booking form)
        const bookingTypeDisplay = packageName ? `${bookingType} (${packageName})` : bookingType;

        // Build message in exact same format as booking form
        let message = 'Booking Notification';
        if (bookingId) {
          message += ` (ID: ${bookingId})`;
        }
        message += `\nName: ${params.customer_name}`;
        message += `\nPhone: ${params.phone_number}`;
        message += `\nDate: ${formattedDate}`;
        message += `\nTime: ${params.start_time} - ${endTime}`;
        message += `\nBay: ${bayAssigned}`;
        message += `\nType: ${bookingTypeDisplay}`;
        message += `\nPeople: ${params.number_of_people}`;
        message += `\nChannel: AI Chat`;
        message += `\nCreated by: AI Assistant`;

        // Add notes (AI booking indicator) - /api/notify will append this again, so we skip it here
        // The customer_notes parameter will be used by /api/notify to append notes

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
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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
