import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { Booking } from '@/types/booking';
import { customerMappingService } from '@/lib/customer-mapping-service';

export async function POST(req: Request) {
  try {
    const bookingDataForDb: Booking & {
      isNewCustomer?: boolean;
      customer_id?: string;
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

    // Update booking data with the customer_id
    const finalBookingData = {
      ...bookingDataForDb,
      customer_id: finalCustomerId,
      // Remove temporary fields
      isNewCustomer: undefined
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
      bookingId: insertedData.id
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