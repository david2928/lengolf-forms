import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { Booking } from '@/types/booking';
import { customerMappingService } from '@/lib/customer-mapping-service';

export async function POST(req: Request) {
  try {
    const bookingDataForDb: Booking & {
      isNewCustomer?: boolean;
      customer_id?: string;
      bay_type?: 'social' | 'ai';
    } = await req.json();

    if (!bookingDataForDb.id || !bookingDataForDb.user_id || !bookingDataForDb.name || !bookingDataForDb.email || !bookingDataForDb.phone_number || !bookingDataForDb.date || !bookingDataForDb.start_time || !bookingDataForDb.duration || !bookingDataForDb.number_of_people || !bookingDataForDb.status) {
      console.error('Validation Error: Missing required fields in booking data', bookingDataForDb);
      return NextResponse.json(
        { success: false, error: 'Missing required booking fields.' },
        { status: 400 }
      );
    }

    // Validate booking time is between 9am and midnight (BKK time)
    const startTimeHour = parseInt(bookingDataForDb.start_time.split(':')[0], 10);
    if (startTimeHour < 9 || startTimeHour >= 24) {
      console.error('Time Validation Error: Booking time outside allowed hours', {
        start_time: bookingDataForDb.start_time,
        hour: startTimeHour
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Bookings can only be created for times between 09:00 and 23:59',
          selected_time: bookingDataForDb.start_time,
          allowed_hours: '09:00 - 23:59'
        },
        { status: 400 }
      );
    }

    // Handle customer creation/linking with public.customers
    let finalCustomerId: string | null = null;

    if (bookingDataForDb.isNewCustomer) {
      // Create new customer in public.customers table
      console.log('Creating new customer for booking:', bookingDataForDb.name);
      
      try {
        // Check for exact phone number duplicates first (same as POS system)
        const normalizedPhone = customerMappingService.normalizePhoneNumber(bookingDataForDb.phone_number);
        
        if (normalizedPhone) {
          const { data: exactPhoneMatch, error } = await refacSupabaseAdmin
            .from('customers')
            .select('id, customer_code, customer_name, contact_number, email')
            .eq('normalized_phone', normalizedPhone)
            .eq('is_active', true)
            .limit(1);

          if (!error && exactPhoneMatch && exactPhoneMatch.length > 0) {
            // Return error with duplicate customer information
            return NextResponse.json({
              success: false,
              error: "A customer with this phone number already exists",
              duplicate_customer: exactPhoneMatch[0],
              phone_number: bookingDataForDb.phone_number,
              normalized_phone: normalizedPhone,
              suggestion: "Please check if this is the same customer or use a different phone number",
              error_code: "DUPLICATE_PHONE"
            }, { status: 409 });
          }
        }

        const { data: newCustomer, error: customerError} = await refacSupabaseAdmin
          .from('customers')
          .insert({
            customer_name: bookingDataForDb.name,
            contact_number: bookingDataForDb.phone_number,
            // Set email only if it's not the default placeholder
            email: bookingDataForDb.email !== 'info@len.golf' ? bookingDataForDb.email : null,
            preferred_contact_method: 'Phone',
            is_active: true
          })
          .select('id, customer_code')
          .single();

        if (customerError) {
          console.error('Failed to create new customer:', customerError);
          // Handle unique constraint violation for phone numbers (same as POS system)
          if (customerError.code === '23505' && customerError.message.includes('normalized_phone')) {
            return NextResponse.json({
              success: false,
              error: "A customer with this phone number already exists",
              phone_number: bookingDataForDb.phone_number,
              suggestion: "Please check if this is the same customer or use a different phone number",
              error_code: "DUPLICATE_PHONE"
            }, { status: 409 });
          }
          throw new Error(`Customer creation failed: ${customerError.message}`);
        }

        if (newCustomer) {
          finalCustomerId = newCustomer.id;
          console.log(`Created new customer ${newCustomer.customer_code} with ID: ${finalCustomerId}`);
        }
      } catch (customerCreationError) {
        console.error('Error creating customer:', customerCreationError);
        // Continue with booking creation even if customer creation fails
        // This maintains backward compatibility
      }
    } else if (bookingDataForDb.customer_id) {
      // Use existing customer ID from selection
      finalCustomerId = bookingDataForDb.customer_id;
    } else if (bookingDataForDb.stable_hash_id) {
      // Fallback: Try to find customer by stable_hash_id (legacy compatibility)
      try {
        const { data: existingCustomer } = await refacSupabaseAdmin
          .from('customers')
          .select('id')
          .eq('stable_hash_id', bookingDataForDb.stable_hash_id)
          .single();
        
        if (existingCustomer) {
          finalCustomerId = existingCustomer.id;
        }
      } catch (lookupError) {
        console.warn('Could not find customer by stable_hash_id:', bookingDataForDb.stable_hash_id);
      }
    }

    // Determine if this is a new customer booking
    // A booking is marked as "new customer" if:
    // 1. The form explicitly says it's a new customer (isNewCustomer === true), OR
    // 2. The customer has no previous non-cancelled bookings
    let isNewCustomerBooking = bookingDataForDb.isNewCustomer ?? false;

    // If we have a customer_id and the form didn't explicitly mark as new customer,
    // check if this is their first booking
    if (finalCustomerId && !isNewCustomerBooking) {
      try {
        const { count, error: countError } = await refacSupabaseAdmin
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', finalCustomerId)
          .neq('status', 'cancelled');

        if (!countError && count === 0) {
          // This customer has no previous non-cancelled bookings
          isNewCustomerBooking = true;
          console.log(`Customer ${finalCustomerId} has no previous bookings - marking as new customer`);
        }
      } catch (checkError) {
        console.warn('Error checking customer booking history:', checkError);
        // Continue with the original isNewCustomer value
      }
    }

    // Update booking data with the customer_id and is_new_customer flag
    const finalBookingData = {
      ...bookingDataForDb,
      customer_id: finalCustomerId,
      is_new_customer: isNewCustomerBooking,
      // Remove temporary fields that don't exist in database
      isNewCustomer: undefined,
      bay_type: undefined // bay_type is for internal logic only, not a database column
    };

    // Clean up undefined fields
    Object.keys(finalBookingData).forEach(key => {
      if (finalBookingData[key as keyof typeof finalBookingData] === undefined) {
        delete finalBookingData[key as keyof typeof finalBookingData];
      }
    });

    // Log package_id for debugging
    if (finalBookingData.package_id) {
      console.log('Booking includes package_id:', finalBookingData.package_id);
    }

    // AUTO BAY ALLOCATION - Assign available bay if not already specified
    if (!finalBookingData.bay) {
      // Preserve bay_type before it gets deleted (needed for auto-assignment logic)
      const requestedBayType = bookingDataForDb.bay_type as 'social' | 'ai' | undefined;

      const assignedBay = await autoAssignBay(
        finalBookingData.date,
        finalBookingData.start_time,
        finalBookingData.duration,
        finalBookingData.number_of_people,
        requestedBayType // Pass bay_type preference if specified
      );

      if (assignedBay) {
        finalBookingData.bay = assignedBay;
        console.log(`Auto-assigned bay: ${assignedBay}`);
      } else {
        console.warn('No available bay found for auto-assignment');
      }
    }

    console.log('Creating booking with customer_id:', finalCustomerId);

    const { data: insertedData, error: insertError } = await refacSupabaseAdmin
      .from('bookings')
      .insert(finalBookingData)
      .select()
      .single();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      throw new Error(`Database insert error: ${insertError.message} (Code: ${insertError.code})`);
    }

    if (!insertedData) {
        console.error('Insert operation completed without error, but no data was returned.');
        throw new Error('Database insert failed: No data returned after insert.');
    }


    return NextResponse.json({
      success: true,
      bookingId: insertedData.id,
      booking: insertedData // Return full booking object including bay assignment
    });

  } catch (error) {
    console.error('Booking creation API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during booking creation.';
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: error instanceof Error && error.message.startsWith('Validation Error') ? 400 : 500 }
    );
  }
}

/**
 * Auto-assign an available bay based on booking requirements
 * Priority: Social bays (Bay 1-3) for <= 5 people, AI bay (Bay 4) for <= 2 people
 * Checks which bays are available for the requested time slot
 * Respects bay_type preference when specified
 */
async function autoAssignBay(
  date: string,
  startTime: string,
  duration: number,
  numberOfPeople: number,
  bayType?: 'social' | 'ai'
): Promise<string | null> {
  try {
    // Determine which bays are suitable based on bay_type preference and number of people
    // Social bays (Bay 1-3): up to 5 people
    // AI bay (Bay 4): up to 2 people
    const candidateBays: string[] = [];

    // If bay_type is explicitly specified, respect it
    if (bayType === 'ai') {
      // Customer wants AI bay specifically
      if (numberOfPeople > 2) {
        console.warn(`Cannot use AI bay: ${numberOfPeople} people exceeds AI bay capacity (max 2)`);
        return null;
      }
      candidateBays.push('Bay 4');
    } else if (bayType === 'social') {
      // Customer wants social bay specifically
      if (numberOfPeople > 5) {
        console.warn(`Cannot use social bay: ${numberOfPeople} people exceeds social bay capacity (max 5)`);
        return null;
      }
      candidateBays.push('Bay 1', 'Bay 2', 'Bay 3');
    } else {
      // No preference - use existing logic based on number of people
      if (numberOfPeople <= 2) {
        // Can use any bay - prefer social bays first, then AI bay
        candidateBays.push('Bay 1', 'Bay 2', 'Bay 3', 'Bay 4');
      } else if (numberOfPeople <= 5) {
        // Must use social bays only
        candidateBays.push('Bay 1', 'Bay 2', 'Bay 3');
      } else {
        // Too many people - no suitable bay
        console.warn(`Cannot auto-assign bay: ${numberOfPeople} people exceeds capacity`);
        return null;
      }
    }

    // Calculate end time
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const endHour = startHour + Math.floor(duration);
    const endMinute = startMinute + ((duration % 1) * 60);
    const endTime = `${String(endHour + Math.floor(endMinute / 60)).padStart(2, '0')}:${String(endMinute % 60).padStart(2, '0')}`;

    // Check each candidate bay for availability
    for (const bay of candidateBays) {
      const { data: conflicts } = await refacSupabaseAdmin
        .from('bookings')
        .select('id, start_time, duration')
        .eq('bay', bay)
        .eq('date', date)
        .eq('status', 'confirmed');

      // Check if there are any time conflicts
      let hasConflict = false;

      if (conflicts && conflicts.length > 0) {
        for (const booking of conflicts) {
          const existingStart = booking.start_time;
          const [existingHour, existingMinute] = existingStart.split(':').map(Number);
          const existingEndHour = existingHour + Math.floor(booking.duration);
          const existingEndMinute = existingMinute + ((booking.duration % 1) * 60);
          const existingEnd = `${String(existingEndHour + Math.floor(existingEndMinute / 60)).padStart(2, '0')}:${String(existingEndMinute % 60).padStart(2, '0')}`;

          // Check for overlap: (start1 < end2) AND (start2 < end1)
          if (startTime < existingEnd && existingStart < endTime) {
            hasConflict = true;
            break;
          }
        }
      }

      // If no conflict, assign this bay
      if (!hasConflict) {
        return bay;
      }
    }

    // No available bay found
    return null;
  } catch (error) {
    console.error('Error in autoAssignBay:', error);
    return null;
  }
}