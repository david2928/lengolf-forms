// Staff helper functions for normalized POS schema
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import bcrypt from 'bcryptjs';

/**
 * Get staff_id from PIN for foreign key population
 * Note: This assumes PIN is stored as staff_id in the staff table
 * If using hashed PINs, this function needs to be updated
 */
export async function getStaffIdFromPin(staffPin: string): Promise<number | null> {
  try {

    // Get all active staff with their PIN hashes
    const { data: staffMembers, error } = await supabase
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, pin_hash')
      .eq('is_active', true);
    
    if (error || !staffMembers) {
      console.log('Error fetching staff members:', error);
      return null;
    }
    
    // Check PIN against each staff member's hash
    for (const staff of staffMembers) {
      if (staff.pin_hash && await bcrypt.compare(staffPin, staff.pin_hash)) {
        console.log(`Found matching staff: ${staff.staff_name} (ID: ${staff.id})`);
        return staff.id;
      }
    }
    
    console.log('No staff found with matching PIN');
    return null;
  } catch (error) {
    console.error('Error resolving staff_id from PIN:', error);
    return null;
  }
}

/**
 * Get customer_id (UUID) from booking_id 
 */
export async function getCustomerIdFromBooking(bookingId: string): Promise<string | null> {
  try {
    console.log('Getting customer_id for booking:', bookingId);
    
    // Get the customer_id directly from the booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('customer_id')
      .eq('id', bookingId)
      .single();
    
    if (error) {
      console.error('Error fetching booking:', bookingId, error);
      return null;
    }
    
    if (!booking?.customer_id) {
      console.log('No customer_id found for booking:', bookingId);
      return null;
    }
    
    console.log('Successfully retrieved customer_id:', booking.customer_id, 'for booking:', bookingId);
    return booking.customer_id;
  } catch (error) {
    console.error('Error resolving customer_id from booking:', error);
    return null;
  }
}

/**
 * Resolve all context for a table session
 */
export async function resolveSessionContext(tableSessionId: string): Promise<{
  staff_id: number | null;
  customer_id: number | null;
  booking_id: string | null;
} | null> {
  try {
    const { data, error } = await supabase
      .rpc('pos.resolve_session_context', { p_table_session_id: tableSessionId });
    
    if (error || !data || data.length === 0) {
      console.log('Session context not found for:', tableSessionId);
      return null;
    }
    
    return data[0];
  } catch (error) {
    console.error('Error resolving session context:', error);
    return null;
  }
}