#!/usr/bin/env node

/**
 * Test script for the edit modal integration
 * Tests the GET /api/bookings/[bookingId] endpoint
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function testGetBookingEndpoint() {
  console.log('🧪 Testing GET /api/bookings/[bookingId] endpoint...\n');

  try {
    // First, get a list of bookings to find a valid booking ID
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Fetching bookings for today: ${today}`);
    
    const listResponse = await fetch(`${BASE_URL}/api/bookings/list-by-date?date=${today}`);
    
    if (!listResponse.ok) {
      throw new Error(`Failed to fetch bookings list: ${listResponse.status} ${listResponse.statusText}`);
    }
    
    const listData = await listResponse.json();
    
    if (!listData.bookings || listData.bookings.length === 0) {
      console.log('⚠️  No bookings found for today. Cannot test individual booking endpoint.');
      console.log('💡 Try running this test on a day with existing bookings.');
      return;
    }
    
    const testBooking = listData.bookings[0];
    console.log(`✅ Found ${listData.bookings.length} bookings. Testing with booking ID: ${testBooking.id}`);
    console.log(`   Customer: ${testBooking.name}`);
    console.log(`   Time: ${testBooking.start_time} (${testBooking.duration}h)`);
    console.log(`   Bay: ${testBooking.bay || 'Not assigned'}\n`);
    
    // Test the individual booking endpoint
    console.log(`🔍 Testing GET /api/bookings/${testBooking.id}...`);
    
    const getResponse = await fetch(`${BASE_URL}/api/bookings/${testBooking.id}`);
    
    if (!getResponse.ok) {
      throw new Error(`Failed to fetch individual booking: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    const getData = await getResponse.json();
    
    if (!getData.booking) {
      throw new Error('Response does not contain booking data');
    }
    
    console.log('✅ Successfully fetched individual booking!');
    console.log('📋 Booking details:');
    console.log(`   ID: ${getData.booking.id}`);
    console.log(`   Name: ${getData.booking.name}`);
    console.log(`   Phone: ${getData.booking.phone_number}`);
    console.log(`   Date: ${getData.booking.date}`);
    console.log(`   Time: ${getData.booking.start_time} - ${getData.booking.duration}h`);
    console.log(`   Bay: ${getData.booking.bay || 'Not assigned'}`);
    console.log(`   Status: ${getData.booking.status}`);
    console.log(`   Type: ${getData.booking.booking_type || 'Not specified'}`);
    console.log(`   Package: ${getData.booking.package_name || 'None'}`);
    console.log(`   People: ${getData.booking.number_of_people}`);
    console.log(`   Notes: ${getData.booking.customer_notes || 'None'}\n`);
    
    // Verify the data matches what we expect
    if (getData.booking.id !== testBooking.id) {
      throw new Error('Booking ID mismatch!');
    }
    
    console.log('🎉 Edit modal integration test PASSED!');
    console.log('✅ The GET endpoint is working correctly.');
    console.log('✅ Calendar click-to-edit should work properly.');
    
  } catch (error) {
    console.error('❌ Test FAILED:', error.message);
    process.exit(1);
  }
}

async function testInvalidBookingId() {
  console.log('\n🧪 Testing invalid booking ID...');
  
  try {
    const invalidId = 'BK_INVALID_ID_12345';
    const response = await fetch(`${BASE_URL}/api/bookings/${invalidId}`);
    
    if (response.status !== 404) {
      throw new Error(`Expected 404 for invalid booking ID, got ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Invalid booking ID correctly returns 404');
    console.log(`   Error message: ${data.error}`);
    
  } catch (error) {
    console.error('❌ Invalid ID test FAILED:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting Edit Modal Integration Tests\n');
  console.log(`🌐 Testing against: ${BASE_URL}\n`);
  
  await testGetBookingEndpoint();
  await testInvalidBookingId();
  
  console.log('\n🏁 All tests completed!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testGetBookingEndpoint, testInvalidBookingId }; 