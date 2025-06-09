const { DateTime } = require('luxon');

console.log('=== TIMEZONE PARSING DEBUG ===');

// Test data from API
const testBookings = [
  { name: "Alson", start_time: "14:00", date: "2025-06-09", expected_visual: "17:00" },
  { name: "Allison", start_time: "17:00", date: "2025-06-09", expected_visual: "23:00" }
];

testBookings.forEach(booking => {
  console.log(`\n${booking.name} booking analysis:`);
  console.log('='.repeat(30));
  
  // Test different timezone interpretations
  console.log('Raw data:', booking.start_time, booking.date);
  
  // Method 1: With Bangkok timezone (current implementation)
  const method1 = DateTime.fromISO(`${booking.date}T${booking.start_time}:00`, { zone: 'Asia/Bangkok' });
  console.log('Method 1 (Bangkok):', method1.toISO());
  console.log('  Hour:', method1.hour);
  console.log('  Offset from UTC:', method1.offset, 'minutes');
  
  // Method 2: Without timezone (local system time)
  const method2 = DateTime.fromISO(`${booking.date}T${booking.start_time}:00`);
  console.log('Method 2 (Local):', method2.toISO());
  console.log('  Hour:', method2.hour);
  console.log('  Offset from UTC:', method2.offset, 'minutes');
  
  // Method 3: UTC interpretation
  const method3 = DateTime.fromISO(`${booking.date}T${booking.start_time}:00`, { zone: 'UTC' });
  console.log('Method 3 (UTC):', method3.toISO());
  console.log('  Hour:', method3.hour);
  
  // Test what happens if we convert UTC to Bangkok
  const method3ToBangkok = method3.setZone('Asia/Bangkok');
  console.log('Method 3 → Bangkok:', method3ToBangkok.toISO());
  console.log('  Hour in Bangkok:', method3ToBangkok.hour);
  
  // Calculate positions for each method
  const START_HOUR = 10;
  const TOTAL_HOURS = 14;
  
  function getPosition(hour) {
    return ((hour - START_HOUR) / TOTAL_HOURS) * 100;
  }
  
  console.log('\nPositions:');
  console.log('  Method 1 position:', getPosition(method1.hour).toFixed(2) + '%');
  console.log('  Method 2 position:', getPosition(method2.hour).toFixed(2) + '%');
  console.log('  Method 3 position:', getPosition(method3.hour).toFixed(2) + '%');
  console.log('  Method 3→Bangkok position:', getPosition(method3ToBangkok.hour).toFixed(2) + '%');
  
  // Expected visual position
  const expectedHour = parseInt(booking.expected_visual.split(':')[0]);
  console.log('  Expected visual position:', getPosition(expectedHour).toFixed(2) + '%', `(${booking.expected_visual})`);
  
  // Find which method matches the visual
  const methods = [method1.hour, method2.hour, method3.hour, method3ToBangkok.hour];
  const methodNames = ['Bangkok', 'Local', 'UTC', 'UTC→Bangkok'];
  
  console.log('\nWhich method produces the visual result?');
  methods.forEach((hour, index) => {
    if (hour === expectedHour) {
      console.log(`  ✅ ${methodNames[index]} method matches visual (hour ${hour})`);
    }
  });
});

console.log('\n=== SYSTEM TIMEZONE INFO ===');
console.log('Current system timezone:', DateTime.now().zoneName);
console.log('Current system offset:', DateTime.now().offset, 'minutes');
console.log('Bangkok timezone offset:', DateTime.now().setZone('Asia/Bangkok').offset, 'minutes');

console.log('\n=== HYPOTHESIS ===');
console.log('If bookings appear shifted, it might be because:');
console.log('1. Database times are stored in UTC but interpreted as local');
console.log('2. Database times are stored in Bangkok but converted to local');
console.log('3. Calendar display timezone != data parsing timezone');
console.log('4. Browser timezone != server timezone'); 