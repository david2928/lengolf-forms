const { DateTime } = require('luxon');

// Simulate the formatBookingForCalendar function
function formatBookingForCalendar(booking) {
  // Create start datetime with consistent timezone
  const startDateTime = DateTime.fromISO(`${booking.date}T${booking.start_time}:00`, { zone: 'Asia/Bangkok' });
  const endDateTime = startDateTime.plus({ hours: booking.duration });
  
  return {
    id: booking.id,
    start: startDateTime.toISO(),
    end: endDateTime.toISO(),
    customer_name: booking.name,
    booking_type: booking.booking_type || 'Bay Rate',
    package_name: booking.package_name || undefined,
    number_of_pax: booking.number_of_people.toString(),
    summary: `${booking.name} (${booking.phone_number}) (${booking.number_of_people}) - ${booking.booking_type || 'Bay Rate'}`
  };
}

// Simulate the calendar page processing
function processBookingForCalendar(calendarEvent) {
  const startTime = DateTime.fromISO(calendarEvent.start, { zone: 'Asia/Bangkok' });
  const endTime = DateTime.fromISO(calendarEvent.end, { zone: 'Asia/Bangkok' });
  
  const start_hour = startTime.hour + (startTime.minute / 60);
  const end_hour = endTime.hour + (endTime.minute / 60);
  
  return {
    ...calendarEvent,
    start_hour,
    end_hour,
    duration_hours: endTime.diff(startTime, 'hours').hours
  };
}

// Calculate position like the calendar does
function getPositionForHour(hour) {
  const START_HOUR = 10;
  const TOTAL_HOURS = 14; // 10:00 to 24:00
  return ((hour - START_HOUR) / TOTAL_HOURS) * 100;
}

// Test with Alson's ACTUAL booking data from the API
const alsonBooking = {
  "id": "BK250602YH8E",
  "name": "Alson",
  "user_id": "",
  "email": "tshalson95@gmail.com",
  "phone_number": "+66800759975",
  "date": "2025-06-09",
  "start_time": "14:00",  // 2:00 PM
  "duration": 3,          // 3 hours (2:00 PM - 5:00 PM)
  "number_of_people": 2,
  "status": "confirmed",
  "bay": "Bay 3",
  "customer_notes": "Will use Buy 1 Get 1 Free Promotion ",
  "booking_type": "Normal Bay Rate",
  "package_name": null,
  "google_calendar_sync_status": "synced"
};

console.log('=== DEBUGGING ALSON POSITIONING ===');
console.log('Original booking data:', alsonBooking);

// Step 1: Convert to calendar event format
const calendarEvent = formatBookingForCalendar(alsonBooking);
console.log('\nStep 1 - Calendar event format:');
console.log('Start ISO:', calendarEvent.start);
console.log('End ISO:', calendarEvent.end);

// Step 2: Process for calendar positioning
const processedBooking = processBookingForCalendar(calendarEvent);
console.log('\nStep 2 - Processed for positioning:');
console.log('Start hour (decimal):', processedBooking.start_hour);
console.log('End hour (decimal):', processedBooking.end_hour);
console.log('Duration hours:', processedBooking.duration_hours);

// Step 3: Calculate position
const startPosition = getPositionForHour(processedBooking.start_hour);
const endPosition = getPositionForHour(processedBooking.end_hour);

console.log('\nStep 3 - Position calculations:');
console.log('Start position (%):', startPosition);
console.log('End position (%):', endPosition);
console.log('Height (%):', endPosition - startPosition);

// Step 4: Verify expected positions
console.log('\nStep 4 - Expected positions:');
console.log('2:00 PM should be at hour 14 (4 hours from 10 AM start)');
console.log('Expected start position: 4/14 * 100 =', (4/14)*100, '%');
console.log('5:00 PM should be at hour 17 (7 hours from 10 AM start)');
console.log('Expected end position: 7/14 * 100 =', (7/14)*100, '%');

// Check if there's a mismatch
if (Math.abs(startPosition - (4/14)*100) > 0.1) {
  console.log('\n❌ ERROR: Start position mismatch!');
  console.log('Calculated:', startPosition);
  console.log('Expected:', (4/14)*100);
} else {
  console.log('\n✅ Start position is correct');
}

// Additional debugging for timezone issues
console.log('\n=== TIMEZONE DEBUGGING ===');
const testDateTime = DateTime.fromISO('2025-06-09T14:00:00', { zone: 'Asia/Bangkok' });
console.log('Test DateTime for 2:00 PM Bangkok:');
console.log('Hour:', testDateTime.hour);
console.log('Minute:', testDateTime.minute);
console.log('Full ISO:', testDateTime.toISO());

// Check what time 28.57% would actually be (since user said it appears at 4pm position)
const positionAt4PM = getPositionForHour(16); // 4 PM = hour 16
console.log('\n=== POSITION COMPARISON ===');
console.log('Position for 2:00 PM (hour 14):', getPositionForHour(14), '%');
console.log('Position for 4:00 PM (hour 16):', positionAt4PM, '%');
console.log('Calculated position for Alson:', startPosition, '%');

// Let's see what hour would give us the position we're seeing
function getHourForPosition(position) {
  const START_HOUR = 10;
  const TOTAL_HOURS = 14;
  return START_HOUR + (position / 100) * TOTAL_HOURS;
}

console.log('\nIf booking appears at ~', positionAt4PM, '% position, that would be hour:', getHourForPosition(positionAt4PM)); 