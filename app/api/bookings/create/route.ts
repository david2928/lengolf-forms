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

    // Handle customer creation/linking with public.customers
    let finalCustomerId: string | null = null;

    if (bookingDataForDb.isNewCustomer) {
      // Create new customer in public.customers table
      console.log('Creating new customer for booking:', bookingDataForDb.name);
      
      try {
        const { data: newCustomer, error: customerError } = await refacSupabaseAdmin
          .from('customers')
          .insert({
            customer_name: bookingDataForDb.name,
            contact_number: bookingDataForDb.phone_number,
            // Set email only if it's not the default placeholder
            email: bookingDataForDb.email !== 'info@len.golf' ? bookingDataForDb.email : null,
            preferred_contact_method: 'Phone',
            notes: `Created during booking ${bookingDataForDb.id} on ${new Date().toISOString().split('T')[0]}`,
            is_active: true
          })
          .select('id, customer_code')
          .single();

        if (customerError) {
          console.error('Failed to create new customer:', customerError);
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