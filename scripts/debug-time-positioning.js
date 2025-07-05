#!/usr/bin/env node

/**
 * Debug script for time positioning issues
 * Tests the time calculations used in the calendar
 */

const { DateTime } = require('luxon');

// Calendar constants (matching the calendar page)
const START_HOUR = 10;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;

// Mock booking data
const mockBooking = {
  id: 'test',
  date: '2025-01-20',
  start_time: '14:00', // 2:00 PM
  duration: 3, // 3 hours
  name: 'Allison',
  bay: 'Bay 1'
};

function calculateEndTime(date, startTime, durationHours) {
  const startDateTime = DateTime.fromISO(`${date}T${startTime}:00`, { zone: 'Asia/Bangkok' });
  const endDateTime = startDateTime.plus({ hours: durationHours });
  return endDateTime.toISO() || '';
}

function getPositionForHour(hour) {
  return ((hour - START_HOUR) / TOTAL_HOURS) * 100;
}

function debugTimePositioning() {
  console.log('🔍 Debug: Time Positioning Calculation\n');
  
  console.log('📋 Mock Booking:');
  console.log(`   Date: ${mockBooking.date}`);
  console.log(`   Start Time: ${mockBooking.start_time}`);
  console.log(`   Duration: ${mockBooking.duration} hours`);
  console.log(`   Expected position: 2:00 PM (14:00)\n`);
  
  // Calculate end time
  const endTimeISO = calculateEndTime(mockBooking.date, mockBooking.start_time, mockBooking.duration);
  console.log('🔄 Time Conversion:');
  console.log(`   Start DateTime ISO: ${mockBooking.date}T${mockBooking.start_time}:00`);
  console.log(`   End DateTime ISO: ${endTimeISO}\n`);
  
  // Parse times as they would be in the calendar
  const startDateTime = DateTime.fromISO(`${mockBooking.date}T${mockBooking.start_time}:00`);
  const endDateTime = DateTime.fromISO(endTimeISO);
  
  console.log('⏰ Parsed DateTime Objects:');
  console.log(`   Start DateTime: ${startDateTime.toString()}`);
  console.log(`   Start Zone: ${startDateTime.zoneName}`);
  console.log(`   Start Hour: ${startDateTime.hour}`);
  console.log(`   Start Minute: ${startDateTime.minute}`);
  console.log(`   End DateTime: ${endDateTime.toString()}`);
  console.log(`   End Zone: ${endDateTime.zoneName}`);
  console.log(`   End Hour: ${endDateTime.hour}\n`);
  
  // Calculate start and end hours as used in calendar
  const startHour = startDateTime.hour + (startDateTime.minute / 60);
  const endHour = endDateTime.hour + (endDateTime.minute / 60);
  
  console.log('📊 Hour Calculations:');
  console.log(`   Start Hour (decimal): ${startHour}`);
  console.log(`   End Hour (decimal): ${endHour}`);
  console.log(`   Expected Start Hour: 14.0 (2:00 PM)\n`);
  
  // Calculate positions
  const startPosition = getPositionForHour(startHour);
  const endPosition = getPositionForHour(endHour);
  
  console.log('📐 Position Calculations:');
  console.log(`   Calendar starts at: ${START_HOUR}:00`);
  console.log(`   Calendar total hours: ${TOTAL_HOURS}`);
  console.log(`   Start position: ${startPosition}% (should be ~28.57% for 2PM)`);
  console.log(`   End position: ${endPosition}%`);
  console.log(`   Height: ${endPosition - startPosition}%\n`);
  
  // Calculate expected vs actual
  const expectedStartHour = 14; // 2 PM
  const expectedStartPosition = getPositionForHour(expectedStartHour);
  
  console.log('✅ Expected vs Actual:');
  console.log(`   Expected start hour: ${expectedStartHour}`);
  console.log(`   Actual start hour: ${startHour}`);
  console.log(`   Expected position: ${expectedStartPosition}%`);
  console.log(`   Actual position: ${startPosition}%`);
  console.log(`   Difference: ${Math.abs(expectedStartPosition - startPosition)}%\n`);
  
  if (Math.abs(expectedStartPosition - startPosition) > 0.1) {
    console.log('❌ TIME POSITIONING ERROR DETECTED!');
    console.log('🔧 Likely causes:');
    console.log('   1. Timezone mismatch between calendar-utils and calendar page');
    console.log('   2. DateTime parsing differences');
    console.log('   3. ISO string format inconsistencies\n');
  } else {
    console.log('✅ Time positioning appears correct\n');
  }
}

function testWithBangkokTimezone() {
  console.log('🧪 Testing with explicit Asia/Bangkok timezone:\n');
  
  const startDateTimeBangkok = DateTime.fromISO(`${mockBooking.date}T${mockBooking.start_time}:00`, { zone: 'Asia/Bangkok' });
  const endDateTimeBangkok = DateTime.fromISO(calculateEndTime(mockBooking.date, mockBooking.start_time, mockBooking.duration), { zone: 'Asia/Bangkok' });
  
  console.log('🌏 Bangkok Timezone Parsing:');
  console.log(`   Start: ${startDateTimeBangkok.toString()}`);
  console.log(`   Start Hour: ${startDateTimeBangkok.hour}`);
  console.log(`   End: ${endDateTimeBangkok.toString()}`);
  console.log(`   End Hour: ${endDateTimeBangkok.hour}\n`);
  
  const startHourBangkok = startDateTimeBangkok.hour + (startDateTimeBangkok.minute / 60);
  const positionBangkok = getPositionForHour(startHourBangkok);
  
  console.log(`   Position with Bangkok timezone: ${positionBangkok}%\n`);
}

function testSystemTimezone() {
  console.log('💻 Testing with system timezone:\n');
  
  const startDateTimeSystem = DateTime.fromISO(`${mockBooking.date}T${mockBooking.start_time}:00`);
  console.log('🖥️ System Timezone Parsing:');
  console.log(`   Start: ${startDateTimeSystem.toString()}`);
  console.log(`   Start Hour: ${startDateTimeSystem.hour}`);
  console.log(`   System Zone: ${startDateTimeSystem.zoneName}\n`);
  
  const startHourSystem = startDateTimeSystem.hour + (startDateTimeSystem.minute / 60);
  const positionSystem = getPositionForHour(startHourSystem);
  
  console.log(`   Position with system timezone: ${positionSystem}%\n`);
}

function main() {
  console.log('🚀 Time Positioning Debug Script\n');
  console.log('=' .repeat(50) + '\n');
  
  debugTimePositioning();
  testWithBangkokTimezone();
  testSystemTimezone();
  
  console.log('🏁 Debug completed!');
}

if (require.main === module) {
  main();
} 