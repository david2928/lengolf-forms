/**
 * Test data management fixtures
 * Provides easy setup and teardown of test data for E2E tests
 */

import {
  createTestCustomer,
  createTestBooking,
  ensureTestStaff,
  cleanupTestData,
  getTodayDate,
  type TestCustomer,
  type TestBooking,
  type TestStaff
} from '../utils/database';

/**
 * Test data manager for E2E tests
 */
export class TestDataManager {
  private createdCustomers: TestCustomer[] = [];
  private createdBookings: TestBooking[] = [];
  private createdStaff: TestStaff[] = [];

  /**
   * Create a complete test scenario with customer, booking, and staff
   */
  async createBookingScenario(options: {
    customerName?: string;
    bookingTime?: string;
    bay?: string;
    paxCount?: number;
    staffPin?: string;
  } = {}): Promise<{
    customer: TestCustomer;
    booking: TestBooking;
    staff: TestStaff;
  }> {
    const uniqueId = Date.now();
    
    // Create test customer
    const customer = await createTestCustomer({
      customer_code: `TEST_${uniqueId}`,
      customer_name: options.customerName || `TEST_Customer_${uniqueId}`,
      contact_number: '0999999999',
      email: `test${uniqueId}@example.com`,
    });
    this.createdCustomers.push(customer);

    // Create test booking
    const booking = await createTestBooking({
      id: `TEST_${uniqueId}`,
      name: customer.customer_name,
      email: customer.email!,
      phone_number: customer.contact_number!,
      date: getTodayDate(),
      start_time: options.bookingTime || '10:00',
      duration: 1,
      bay: options.bay || 'Bay 1',
      status: 'confirmed',
      number_of_people: options.paxCount || 2,
      customer_id: customer.id!,
    });
    this.createdBookings.push(booking);

    // Ensure test staff exists
    const staff = await ensureTestStaff({
      staff_name: 'TEST_Staff',
      clear_pin: options.staffPin || '111111',
      is_active: true,
    });
    this.createdStaff.push(staff);

    console.log(`📋 Created booking scenario:
      - Customer: ${customer.customer_name} (${customer.customer_code})
      - Booking: ${booking.date} at ${booking.start_time} for ${booking.number_of_people} people
      - Bay: ${booking.bay}
      - Staff PIN: ${staff.clear_pin}
    `);

    return { customer, booking, staff };
  }

  /**
   * Create just a test customer
   */
  async createCustomer(overrides: Partial<TestCustomer> = {}): Promise<TestCustomer> {
    const customer = await createTestCustomer(overrides);
    this.createdCustomers.push(customer);
    return customer;
  }

  /**
   * Create just a test booking
   */
  async createBooking(overrides: Partial<TestBooking> = {}): Promise<TestBooking> {
    const booking = await createTestBooking(overrides);
    this.createdBookings.push(booking);
    return booking;
  }

  /**
   * Get test staff (create if doesn't exist)
   */
  async getStaff(pin: string = '111111'): Promise<TestStaff> {
    const staff = await ensureTestStaff({
      staff_name: 'TEST_Staff',
      clear_pin: pin,
      is_active: true,
    });
    this.createdStaff.push(staff);
    return staff;
  }

  /**
   * Clean up all test data created by this manager
   */
  async cleanup(): Promise<void> {
    console.log('🧹 TestDataManager: Cleaning up created test data...');
    
    try {
      await cleanupTestData();
      
      // Clear tracking arrays
      this.createdCustomers = [];
      this.createdBookings = [];
      this.createdStaff = [];
      
      console.log('✅ TestDataManager: Cleanup completed');
    } catch (error) {
      console.error('❌ TestDataManager: Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get created data for test assertions
   */
  getCreatedData() {
    return {
      customers: this.createdCustomers,
      bookings: this.createdBookings,
      staff: this.createdStaff,
    };
  }
}

/**
 * Factory function for common test scenarios
 */
export const testScenarios = {
  /**
   * Simple booking scenario for POS testing
   */
  async simpleBooking(): Promise<{
    customer: TestCustomer;
    booking: TestBooking;
    staff: TestStaff;
  }> {
    const manager = new TestDataManager();
    return manager.createBookingScenario({
      customerName: 'John Test Customer',
      bookingTime: '14:00',
      bay: 'Bay 1',
      paxCount: 2,
      staffPin: '111111'
    });
  },

  /**
   * Large group booking scenario
   */
  async largeGroup(): Promise<{
    customer: TestCustomer;
    booking: TestBooking;
    staff: TestStaff;
  }> {
    const manager = new TestDataManager();
    return manager.createBookingScenario({
      customerName: 'Large Group Test',
      bookingTime: '16:00',
      bay: 'Bay 5',
      paxCount: 8,
      staffPin: '111111'
    });
  },

  /**
   * Morning booking scenario
   */
  async morningBooking(): Promise<{
    customer: TestCustomer;
    booking: TestBooking;
    staff: TestStaff;
  }> {
    const manager = new TestDataManager();
    return manager.createBookingScenario({
      customerName: 'Morning Customer',
      bookingTime: '09:00',
      bay: 'Bay 2',
      paxCount: 4,
      staffPin: '111111'
    });
  }
};