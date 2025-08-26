/**
 * Dashboard Statistics API
 * Returns real-time statistics for the lead feedback dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1); // Start of month
    
    // Cutoff date for filtering out old leads (30 days back from feedback date)
    // This prevents extremely old leads from skewing the metrics
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    // Helper function to format speed to lead
    const formatSpeedToLead = (seconds: number): string => {
      if (!seconds || seconds <= 0) return '0m';
      const hours = seconds / 3600;
      if (hours < 1) {
        const minutes = Math.round(seconds / 60);
        return `${minutes}m`;
      } else if (hours < 24) {
        return `${hours.toFixed(1)}h`;
      } else {
        const days = Math.floor(hours / 24);
        const remainingHours = Math.round(hours % 24);
        return `${days}d ${remainingHours}h`;
      }
    };

    // Get Speed-to-Lead metrics from feedback (time between lead received and feedback submitted)
    
    // Today's speed to lead from feedback
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const { data: todayFeedback, error: todayError } = await refacSupabaseAdmin
      .from('lead_feedback')
      .select(`
        created_at,
        processed_leads!inner(meta_submitted_at)
      `)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    // This week's speed to lead from feedback
    const { data: weekFeedback, error: weekError } = await refacSupabaseAdmin
      .from('lead_feedback')
      .select(`
        created_at,
        processed_leads!inner(meta_submitted_at)
      `)
      .gte('created_at', thisWeekStart.toISOString())
      .lte('created_at', today.toISOString());

    // This month's speed to lead from feedback  
    const { data: monthFeedback, error: monthError } = await refacSupabaseAdmin
      .from('lead_feedback')
      .select(`
        created_at,
        processed_leads!inner(meta_submitted_at)
      `)
      .gte('created_at', thisMonthStart.toISOString())
      .lte('created_at', today.toISOString());

    // Helper function to convert UTC date to Bangkok timezone
    const toBangkokTime = (utcDate: Date): Date => {
      // Convert UTC to Bangkok time (+7 hours)
      return new Date(utcDate.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
    };

    // Helper function to calculate business hours between two dates in Bangkok timezone
    // Working hours: 10am to 9pm Bangkok time, exclude Mondays entirely
    const calculateBusinessHours = (startDateUTC: Date, endDateUTC: Date): number => {
      // Convert to Bangkok timezone first
      const startDate = toBangkokTime(startDateUTC);
      const endDate = toBangkokTime(endDateUTC);
      
      if (startDate >= endDate) return 0;
      
      let businessSeconds = 0;
      let current = new Date(startDate);
      
      // Process day by day to handle business hours properly
      while (current < endDate) {
        const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Skip Mondays entirely
        if (dayOfWeek === 1) {
          current.setDate(current.getDate() + 1);
          current.setHours(10, 0, 0, 0);
          continue;
        }
        
        // Set business hours for current day (in Bangkok time)
        const dayStart = new Date(current);
        dayStart.setHours(10, 0, 0, 0);
        
        const dayEnd = new Date(current);
        dayEnd.setHours(21, 0, 0, 0);
        
        // Calculate intersection with our time range for this day
        const effectiveStart = new Date(Math.max(current.getTime(), dayStart.getTime()));
        const effectiveEnd = new Date(Math.min(endDate.getTime(), dayEnd.getTime()));
        
        // If there's overlap with business hours on this day
        if (effectiveStart < effectiveEnd) {
          const dayBusinessSeconds = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 1000);
          businessSeconds += dayBusinessSeconds;
        }
        
        // Move to next day at 10am
        current.setDate(current.getDate() + 1);
        current.setHours(10, 0, 0, 0);
      }
      
      return businessSeconds;
    };

    // Calculate averages for feedback-based metrics with business hours logic
    const calculateFeedbackAverage = (data: any[]): { average_seconds: number; count: number; formatted: string } => {
      if (!data || data.length === 0) {
        return { average_seconds: 0, count: 0, formatted: '0m' };
      }
      
      const validData = data.filter(item => {
        if (!item.processed_leads?.meta_submitted_at || !item.created_at) return false;
        
        const leadTime = new Date(item.processed_leads.meta_submitted_at);
        const feedbackTime = new Date(item.created_at);
        
        // Exclude leads that are more than 30 days old when feedback was submitted
        const daysDiff = (feedbackTime.getTime() - leadTime.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30;
      });
      
      if (validData.length === 0) {
        return { average_seconds: 0, count: 0, formatted: '0m' };
      }
      
      const total = validData.reduce((sum, item) => {
        const leadTime = new Date(item.processed_leads.meta_submitted_at);
        const feedbackTime = new Date(item.created_at);
        
        // Calculate business hours between lead received and feedback submitted
        const businessHours = calculateBusinessHours(leadTime, feedbackTime);
        return sum + businessHours;
      }, 0);
      
      const average = total / validData.length;
      return {
        average_seconds: Math.round(average),
        count: validData.length,
        formatted: formatSpeedToLead(average)
      };
    };

    const todaySpeedStats = calculateFeedbackAverage(todayFeedback || []);
    const weekSpeedStats = calculateFeedbackAverage(weekFeedback || []);
    const monthSpeedStats = calculateFeedbackAverage(monthFeedback || []);

    // Get OB Calls count (total log button clicks this week)
    const { data: obCallsData, error: obCallsError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('ob_sales_notes')
      .select('id', { count: 'exact' })
      .gte('created_at', thisWeekStart.toISOString())
      .lte('created_at', today.toISOString());

    if (obCallsError) {
      console.error('Error fetching OB calls:', obCallsError);
    }

    // Get Sales count (log and create booking clicks this week)
    const { data: salesData, error: salesError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('ob_sales_notes')
      .select('id', { count: 'exact' })
      .eq('booking_submitted', true)
      .gte('created_at', thisWeekStart.toISOString())
      .lte('created_at', today.toISOString());

    if (salesError) {
      console.error('Error fetching sales:', salesError);
    }

    // Get Lead-to-Booking conversions (leads that resulted in actual bookings) - ALL TIME
    // Match phone numbers between leads with feedback and subsequent bookings
    // Apply same 30-day filter as speed-to-lead calculation
    const { data: leadConversions, error: leadConversionError } = await refacSupabaseAdmin
      .from('lead_feedback')
      .select(`
        created_at,
        processed_leads!inner(phone_number, meta_submitted_at)
      `);

    let leadSalesCount = 0;
    let leadContactsCount = 0;
    
    if (leadConversions && !leadConversionError) {
      // Apply same 30-day filter as speed-to-lead calculation
      const validLeadConversions = leadConversions.filter((item: any) => {
        if (!item.processed_leads?.meta_submitted_at || !item.created_at) return false;
        
        const leadTime = new Date(item.processed_leads.meta_submitted_at);
        const feedbackTime = new Date(item.created_at);
        
        // Exclude leads that are more than 30 days old when feedback was submitted
        const daysDiff = (feedbackTime.getTime() - leadTime.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30;
      });
      
      leadContactsCount = validLeadConversions.length;
      
      // For each valid lead with feedback, check if there was a subsequent booking
      const phoneNumbers = validLeadConversions
        .map((item: any) => item.processed_leads?.phone_number)
        .filter((phone: any) => phone);

      if (phoneNumbers.length > 0) {
        const { data: bookingsData, error: bookingsError } = await refacSupabaseAdmin
          .from('bookings')
          .select('phone_number, created_at, name')
          .not('phone_number', 'is', null);

        if (!bookingsError && bookingsData) {
          // Normalize phone numbers for proper matching
          const normalizePhone = (phone: string): string | null => {
            if (!phone || phone.trim() === '') return null;
            let normalized = phone.replace(/[^0-9]/g, '');
            if (normalized.length >= 11 && normalized.startsWith('66')) {
              normalized = normalized.substring(2);
            }
            if (normalized.length === 10 && normalized.startsWith('0')) {
              normalized = normalized.substring(1);
            }
            return normalized.slice(-9);
          };

          // Create normalized booking phone lookup
          const bookingsByNormalizedPhone = new Map();
          bookingsData.forEach((booking: any) => {
            const normalizedPhone = normalizePhone(booking.phone_number);
            if (normalizedPhone) {
              if (!bookingsByNormalizedPhone.has(normalizedPhone)) {
                bookingsByNormalizedPhone.set(normalizedPhone, []);
              }
              bookingsByNormalizedPhone.get(normalizedPhone).push({
                created_at: booking.created_at,
                name: booking.name
              });
            }
          });

          // Count leads that converted to bookings (phone matching only)
          leadSalesCount = validLeadConversions.reduce((count: number, leadFeedback: any) => {
            const leadPhone = leadFeedback.processed_leads?.phone_number;
            const leadName = leadFeedback.processed_leads?.full_name;
            const feedbackDate = new Date(leadFeedback.created_at);
            
            let hasConversion = false;
            
            // Method 1: Phone number matching
            if (leadPhone) {
              const normalizedLeadPhone = normalizePhone(leadPhone);
              if (normalizedLeadPhone) {
                const matchingBookings = bookingsByNormalizedPhone.get(normalizedLeadPhone) || [];
                const hasPhoneBookingAfterFeedback = matchingBookings.some((booking: any) => 
                  new Date(booking.created_at) >= feedbackDate
                );
                if (hasPhoneBookingAfterFeedback) {
                  hasConversion = true;
                }
              }
            }
            
            // Method 2: Name matching (if no phone match found)
            if (!hasConversion && leadName) {
              const nameMatches = bookingsData.filter((booking: any) => {
                if (!booking.name || new Date(booking.created_at) < feedbackDate) return false;
                
                const leadNameLower = leadName.toLowerCase().trim();
                const bookingNameLower = booking.name.toLowerCase().trim();
                
                // Check if names contain each other or share significant parts
                if (leadNameLower.includes(bookingNameLower) || bookingNameLower.includes(leadNameLower)) {
                  return true;
                }
                
                // Check for shared words (longer than 2 characters)
                const leadWords = leadNameLower.split(' ').filter((w: any) => w.length > 2);
                const bookingWords = bookingNameLower.split(' ').filter((w: any) => w.length > 2);
                const hasSharedWords = leadWords.some((lw: any) => 
                  bookingWords.some((bw: any) => bw.includes(lw) || lw.includes(bw))
                );
                
                return hasSharedWords;
              });
              
              if (nameMatches.length > 0) {
                hasConversion = true;
              }
            }
            
            return count + (hasConversion ? 1 : 0);
          }, 0);
        }
      }
    }

    if (leadConversionError) {
      console.error('Error fetching lead conversions:', leadConversionError);
    }

    const stats = {
      speedToLead: todaySpeedStats.formatted,
      weekAverage: weekSpeedStats.formatted, 
      monthAverage: monthSpeedStats.formatted,
      obCalls: obCallsData?.length || 0,
      obSales: salesData?.length || 0,
      leadSales: leadSalesCount,
      leadContacts: leadContactsCount
    };

    return NextResponse.json({
      success: true,
      stats,
      speedToLeadDetails: {
        today: todaySpeedStats,
        week: weekSpeedStats,
        month: monthSpeedStats
      },
      lastUpdated: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Dashboard Stats API Error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message
      },
      { status: 500 }
    );
  }
}