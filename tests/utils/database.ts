/**
 * Database utilities for Playwright tests
 * Provides direct database access for test data setup and cleanup
 */

import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_REFAC_SUPABASE_URL is not defined');
}

if (!process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('REFAC_SUPABASE_SERVICE_ROLE_KEY is not defined');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY
);

// Types for test data
export interface TestCustomer {
  id?: string;
  customer_code: string;
  customer_name: string;
  contact_number?: string;
  email?: string;
  address?: string;
}

export interface TestBooking {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  duration: number;
  bay?: string;
  status: string;
  number_of_people: number;
  customer_id?: string;
  user_id: string;
}

export interface TestStaff {
  id?: number;
  staff_name: string;
  clear_pin: string;
  pin_hash?: string;
  is_active?: boolean;
  staff_id?: string;
}

/**
 * Create a test customer
 */
export async function createTestCustomer(data: Partial<TestCustomer>): Promise<TestCustomer> {
  const customerData = {
    customer_code: `TEST_${Date.now()}`,
    customer_name: `TEST_Customer_${Date.now()}`,
    contact_number: '0999999999',
    email: 'test@example.com',
    ...data
  };

  const { data: customer, error } = await supabase
    .from('customers')
    .insert(customerData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test customer: ${error.message}`);
  }

  console.log(`✅ Created test customer: ${customer.customer_name} (${customer.customer_code})`);
  return customer;
}

/**
 * Create a test booking for today
 */
export async function createTestBooking(data: Partial<TestBooking>): Promise<TestBooking> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get an existing user_id to use for the booking (required field)
  const { data: existingUser } = await supabase
    .from('bookings')
    .select('user_id')
    .limit(1)
    .single();

  const bookingData = {
    id: `TEST_${Date.now()}`,
    name: `TEST_Customer_${Date.now()}`,
    email: 'test@example.com',
    phone_number: '0999999999',
    date: today,
    start_time: '10:00',
    duration: 1,
    bay: 'Bay 1',
    status: 'confirmed',
    number_of_people: 2,
    user_id: existingUser?.user_id || '27dd3ac6-a73c-4575-b6b9-dc89d134585a', // Use existing user_id or fallback
    ...data
  };

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test booking: ${error.message}`);
  }

  console.log(`✅ Created test booking: ${booking.name} for ${booking.date} at ${booking.start_time}`);
  return booking;
}

/**
 * Ensure test staff exists or create one
 */
export async function ensureTestStaff(data: Partial<TestStaff>): Promise<TestStaff> {
  const staffData = {
    staff_name: 'TEST_Staff',
    clear_pin: '111111',
    is_active: true,
    ...data
  };

  // Check if staff with this PIN already exists
  const { data: existing } = await supabase
    .schema('backoffice')
    .from('staff')
    .select('*')
    .eq('clear_pin', staffData.clear_pin)
    .eq('is_active', true)
    .single();

  if (existing) {
    console.log(`✅ Using existing test staff: ${existing.staff_name} (ID: ${existing.id})`);
    return existing;
  }

  // Create new staff member with hashed PIN
  const pin_hash = await bcrypt.hash(staffData.clear_pin, 12);
  
  const { data: staff, error } = await supabase
    .schema('backoffice')
    .from('staff')
    .insert({
      ...staffData,
      pin_hash,
      failed_attempts: 0
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test staff: ${error.message}`);
  }

  console.log(`✅ Created test staff: ${staff.staff_name} (ID: ${staff.id})`);
  return staff;
}

/**
 * Clean up all test data (anything with TEST_ prefix)
 */
export async function cleanupTestData(): Promise<void> {
  console.log('🧹 Cleaning up test data...');

  try {
    // First, close any active table sessions that might be associated with test bookings
    await closeTestTableSessions();

    // Clean up table sessions that reference test bookings (must be done before bookings)
    const { error: sessionError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .delete()
      .or('booking_id.like.TEST_%,notes.like.TEST_%');

    if (sessionError && sessionError.code !== 'PGRST116') {
      console.warn('Warning cleaning table sessions:', sessionError.message);
    } else {
      console.log('✅ Cleaned up test table sessions');
    }

    // Clean up booking history that references test bookings
    const { data: testBookingIds } = await supabase
      .from('bookings')
      .select('id')
      .or('name.like.TEST_%,name.like.%Test%,id.like.TEST_%');

    if (testBookingIds && testBookingIds.length > 0) {
      const bookingIds = testBookingIds.map(b => b.id);
      const { error: historyError } = await supabase
        .from('booking_history')
        .delete()
        .in('booking_id', bookingIds);

      if (historyError && historyError.code !== 'PGRST116') {
        console.warn('Warning cleaning booking history:', historyError.message);
      }
    }

    // Clean up test bookings - both by name pattern and by ID
    const { error: bookingError1 } = await supabase
      .from('bookings')
      .delete()
      .or('name.like.TEST_%,name.like.%Test%,id.like.TEST_%');

    if (bookingError1 && bookingError1.code !== 'PGRST116') {
      console.warn('Warning cleaning bookings by pattern:', bookingError1.message);
    } else {
      console.log('✅ Cleaned up test bookings');
    }

    // Clean up test customers
    const { error: customerError } = await supabase
      .from('customers')
      .delete()
      .like('customer_name', 'TEST_%');

    if (customerError && customerError.code !== 'PGRST116') {
      console.warn('Warning cleaning customers:', customerError.message);
    }

    // Clean up test staff
    const { error: staffError } = await supabase
      .schema('backoffice')
      .from('staff')
      .delete()
      .like('staff_name', 'TEST_%');

    if (staffError && staffError.code !== 'PGRST116') {
      console.warn('Warning cleaning staff:', staffError.message);
    }

    // Clean up any remaining test table sessions
    const { error: remainingSessionError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .delete()
      .like('notes', 'TEST_%');

    if (remainingSessionError && remainingSessionError.code !== 'PGRST116') {
      console.warn('Warning cleaning remaining table sessions:', remainingSessionError.message);
    }

    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.error('❌ Error during test data cleanup:', error);
    throw error;
  }
}

/**
 * Close active table sessions that might be associated with test data
 */
export async function closeTestTableSessions(): Promise<void> {
  try {
    console.log('🔐 Closing any active test table sessions...');

    // Get all sessions that might be test-related (not just 'active' status)
    const { data: testSessions, error: fetchError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('id, booking_id, status')
      .or('booking_id.like.TEST_%,status.in.(occupied)')
      .not('status', 'eq', 'closed');

    if (fetchError) {
      console.warn('Warning fetching test sessions:', fetchError.message);
      return;
    }

    if (testSessions && testSessions.length > 0) {
      // Close sessions that are definitely test-related or need cleanup
      const testSessionIds = testSessions
        .filter(session => {
          // Close if booking_id starts with TEST_ OR if status is occupied/active without proper closure
          return (session.booking_id && session.booking_id.startsWith('TEST_')) ||
                 (session.status === 'occupied' && session.booking_id && session.booking_id.startsWith('TEST_'));
        })
        .map(session => session.id);

      if (testSessionIds.length > 0) {
        const { error: updateError } = await supabase
          .schema('pos')
          .from('table_sessions')
          .update({
            status: 'closed',
            session_end: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', testSessionIds);

        if (updateError) {
          console.warn('Warning closing test sessions:', updateError.message);
        } else {
          console.log(`✅ Closed ${testSessionIds.length} test table sessions`);
        }
      } else {
        console.log('ℹ️ No test table sessions found to close');
      }

      // Also complete any pending orders associated with test sessions
      if (testSessionIds.length > 0) {
        const { error: ordersError } = await supabase
          .schema('pos')
          .from('orders')
          .update({ status: 'completed' })
          .in('table_session_id', testSessionIds)
          .not('status', 'in', '(completed,cancelled)');

        if (ordersError) {
          console.warn('Warning completing test orders:', ordersError.message);
        } else {
          console.log('✅ Completed pending test orders');
        }
      }
    }
  } catch (error) {
    console.error('❌ Error closing test table sessions:', error);
  }
}

/**
 * Close any open table sessions for testing
 */
export async function closeOpenTableSessions(): Promise<void> {
  const { error } = await supabase
    .schema('pos')
    .from('table_sessions')
    .update({
      status: 'closed',
      session_end: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('status', 'occupied');

  if (error && error.code !== 'PGRST116') {
    console.warn('Warning closing table sessions:', error.message);
  }
}

/**
 * Get current date in YYYY-MM-DD format (Bangkok timezone)
 */
export function getTodayDate(): string {
  const today = new Date();
  // Adjust for Bangkok timezone (UTC+7)
  const bangkokTime = new Date(today.getTime() + (7 * 60 * 60 * 1000));
  return bangkokTime.toISOString().split('T')[0];
}