// Test the exact data flow from API response to calendar positioning
const { DateTime } = require('luxon');

// Alson's actual booking data from API
const alsonFromAPI = {
  "id": "BK250602YH8E",
  "name": "Alson",
  "start_time": "14:00",  // This is the critical field
  "duration": 3,
  "date": "2025-06-09",
  "bay": "Bay 3"
};

console.log('=== REAL DATA FLOW DEBUG ===');
console.log('1. Raw API data:', alsonFromAPI);

// Step 1: formatBookingForCalendar (from calendar-utils.ts)
console.log('\n2. formatBookingForCalendar processing:');
console.log('   Input start_time:', alsonFromAPI.start_time);
console.log('   Input date:', alsonFromAPI.date);

const startDateTime = DateTime.fromISO(`${alsonFromAPI.date}T${alsonFromAPI.start_time}:00`, { zone: 'Asia/Bangkok' });
console.log('   Created DateTime:', startDateTime.toISO());
console.log('   DateTime hour:', startDateTime.hour);
console.log('   DateTime minute:', startDateTime.minute);

const endDateTime = startDateTime.plus({ hours: alsonFromAPI.duration });
console.log('   End DateTime:', endDateTime.toISO());

const calendarEvent = {
  id: alsonFromAPI.id,
  start: startDateTime.toISO(),
  end: endDateTime.toISO(),
  customer_name: alsonFromAPI.name
};

console.log('   Calendar event start:', calendarEvent.start);
console.log('   Calendar event end:', calendarEvent.end);

// Step 2: Calendar page processing (bookings-calendar/page.tsx)
console.log('\n3. Calendar page processing:');
const startTimeForCalendar = DateTime.fromISO(calendarEvent.start, { zone: 'Asia/Bangkok' });
const endTimeForCalendar = DateTime.fromISO(calendarEvent.end, { zone: 'Asia/Bangkok' });

console.log('   Parsed start time:', startTimeForCalendar.toISO());
console.log('   Parsed start hour:', startTimeForCalendar.hour);
console.log('   Parsed start minute:', startTimeForCalendar.minute);

const start_hour = startTimeForCalendar.hour + (startTimeForCalendar.minute / 60);
const end_hour = endTimeForCalendar.hour + (endTimeForCalendar.minute / 60);

console.log('   Calculated start_hour:', start_hour);
console.log('   Calculated end_hour:', end_hour);

// Step 3: Position calculation
const START_HOUR = 10;
const TOTAL_HOURS = 14;

function getPositionForHour(hour) {
  return ((hour - START_HOUR) / TOTAL_HOURS) * 100;
}

const startPosition = getPositionForHour(start_hour);
const endPosition = getPositionForHour(end_hour);

console.log('\n4. Final positioning:');
console.log('   Start position:', startPosition.toFixed(2) + '%');
console.log('   End position:', endPosition.toFixed(2) + '%');
console.log('   Height:', (endPosition - startPosition).toFixed(2) + '%');

// Step 4: Let's test what would cause it to appear at 4:00 PM position
console.log('\n5. Diagnosis:');
console.log('   If booking appears at 4:00 PM position (42.86%):');
console.log('   That would mean start_hour was calculated as:', (10 + (42.86/100) * 14));
console.log('   Expected start_hour was:', start_hour);
console.log('   Difference:', (10 + (42.86/100) * 14) - start_hour, 'hours');

// Test potential causes
console.log('\n6. Testing potential causes:');

// Test 1: What if start_time was parsed as "16:00" instead of "14:00"?
console.log('   Test 1 - If start_time was "16:00":');
const test1DateTime = DateTime.fromISO(`${alsonFromAPI.date}T16:00:00`, { zone: 'Asia/Bangkok' });
const test1Position = getPositionForHour(test1DateTime.hour);
console.log('   Position would be:', test1Position.toFixed(2) + '%');

// Test 2: What if timezone was wrong?
console.log('   Test 2 - If no timezone specified:');
const test2DateTime = DateTime.fromISO(`${alsonFromAPI.date}T${alsonFromAPI.start_time}:00`);
console.log('   DateTime without timezone:', test2DateTime.toISO());
console.log('   Hour would be:', test2DateTime.hour);
console.log('   Position would be:', getPositionForHour(test2DateTime.hour).toFixed(2) + '%');

// Test 3: What if there's an offset in the grid itself?
console.log('   Test 3 - Grid offset analysis:');
console.log('   Current calculation puts 2:00 PM at 28.57%');
console.log('   Visual appearance seems to be at 42.86% (4:00 PM)');
console.log('   Offset:', (42.86 - 28.57).toFixed(2) + '% = ', ((42.86 - 28.57) / 100 * 14).toFixed(2), 'hours'); 