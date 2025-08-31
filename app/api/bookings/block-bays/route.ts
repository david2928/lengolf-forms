import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { generateBookingId } from '@/lib/booking-utils';
import { format, differenceInMinutes } from 'date-fns';
import type { BayBlockingData } from '@/types/booking-form';

export async function POST(req: Request) {
  try {
    const blockingData: BayBlockingData = await req.json();

    // Validate required fields
    if (!blockingData.bays || !Array.isArray(blockingData.bays) || blockingData.bays.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one bay must be selected' },
        { status: 400 }
      );
    }

    if (!blockingData.date || !blockingData.startTime || !blockingData.endTime || !blockingData.reason || !blockingData.employeeName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate duration in hours
    const startDate = new Date(`2000-01-01T${blockingData.startTime}:00`);
    const endDate = new Date(`2000-01-01T${blockingData.endTime}:00`);
    
    // Handle overnight scenario
    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    
    const durationHours = differenceInMinutes(endDate, startDate) / 60;

    if (durationHours <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid time range' },
        { status: 400 }
      );
    }

    // Format date for database
    const formattedDate = format(blockingData.date, 'yyyy-MM-dd');
    
    // Create booking records for each selected bay
    const bookingPromises = blockingData.bays.map(async (bay) => {
      const bookingId = generateBookingId();
      
      // Create booking record for blocked bay
      const bookingRecord = {
        id: bookingId,
        user_id: '059090f8-2d76-4f10-81de-5efe4d2d0fd8', // System user ID
        name: `BLOCKED - ${blockingData.reason}`,
        email: 'info@len.golf',
        phone_number: 'BLOCKED',
        customer_id: null, // NULL for blocked bays
        date: formattedDate,
        start_time: blockingData.startTime,
        duration: durationHours,
        number_of_people: 0, // 0 for blocked bays
        status: 'confirmed',
        bay: bay,
        customer_notes: `Bay blocked by ${blockingData.employeeName}: ${blockingData.reason}`,
        booking_type: 'Bay Block',
        stable_hash_id: null,
        package_id: null,
        package_name: null,
        referral_source: null
      };

      // Insert booking record
      const { data, error } = await refacSupabaseAdmin
        .from('bookings')
        .insert(bookingRecord)
        .select('id')
        .single();

      if (error) {
        console.error(`Error blocking ${bay}:`, error);
        throw new Error(`Failed to block ${bay}: ${error.message}`);
      }

      return {
        bay: bay,
        bookingId: data.id,
        reason: blockingData.reason,
        startTime: blockingData.startTime,
        endTime: blockingData.endTime,
        date: formattedDate,
        blockedBy: blockingData.employeeName
      };
    });

    // Execute all bay blocking operations
    const results = await Promise.all(bookingPromises);

    console.log(`Successfully blocked ${results.length} bays:`, results.map(r => r.bay).join(', '));

    return NextResponse.json({
      success: true,
      message: `Successfully blocked ${results.length} bay(s)`,
      blockedBays: results
    });

  } catch (error) {
    console.error('Bay blocking API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during bay blocking.';
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}