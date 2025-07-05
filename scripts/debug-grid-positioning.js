console.log('=== COMPREHENSIVE GRID POSITIONING DEBUG ===');

// Calendar constants (matching the app)
const START_HOUR = 10;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR; // 14 hours
const TOTAL_SLOTS = 15; // Number of hour slots

function getPositionForHour(hour) {
  return ((hour - START_HOUR) / TOTAL_HOURS) * 100;
}

function generateTimeSlots() {
  return Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const hour = START_HOUR + i;
    return hour < 24 
      ? `${hour.toString().padStart(2, '0')}:00` 
      : '00:00';
  });
}

// Generate all time slots and their positions
const timeSlots = generateTimeSlots();

console.log('Time slots and their positions:');
console.log('=====================================');

timeSlots.forEach((timeSlot, index) => {
  const hour = index + START_HOUR;
  const actualHour = hour >= 24 ? 0 : hour; // Handle 24:00 -> 00:00
  const position = getPositionForHour(hour);
  
  console.log(`${timeSlot} (hour ${hour}) -> ${position.toFixed(2)}%`);
  
  // Highlight specific times
  if (hour === 14) {
    console.log('  ★ This is 2:00 PM - Alson\'s start time');
  }
  if (hour === 16) {
    console.log('  ★ This is 4:00 PM - Where booking appears to be');
  }
  if (hour === 17) {
    console.log('  ★ This is 5:00 PM - Alson\'s end time');
  }
});

console.log('\n=== SPECIFIC CALCULATIONS ===');
console.log('Start Hour:', START_HOUR);
console.log('Total Hours:', TOTAL_HOURS);
console.log('Total Slots:', TOTAL_SLOTS);

console.log('\nAlson booking (2:00 PM - 5:00 PM):');
console.log('Start: 14:00 -> Position:', getPositionForHour(14).toFixed(2) + '%');
console.log('End: 17:00 -> Position:', getPositionForHour(17).toFixed(2) + '%');
console.log('Height:', (getPositionForHour(17) - getPositionForHour(14)).toFixed(2) + '%');

console.log('\nIf booking appears at 4:00 PM position:');
console.log('4:00 PM position:', getPositionForHour(16).toFixed(2) + '%');
console.log('Difference from calculated:', (getPositionForHour(16) - getPositionForHour(14)).toFixed(2) + '%');

console.log('\n=== GRID PATTERN ANALYSIS ===');
console.log('Position differences between consecutive hours:');
for (let i = 0; i < TOTAL_SLOTS - 1; i++) {
  const hour1 = START_HOUR + i;
  const hour2 = START_HOUR + i + 1;
  const pos1 = getPositionForHour(hour1);
  const pos2 = getPositionForHour(hour2);
  const diff = pos2 - pos1;
  
  console.log(`${hour1}:00 to ${hour2}:00 -> ${diff.toFixed(2)}% gap`);
}

// Check if there might be an off-by-one error
console.log('\n=== POTENTIAL OFF-BY-ONE CHECK ===');
console.log('If we had an off-by-one error in time slot calculation:');
console.log('Slot 0 (10:00) -> Position:', getPositionForHour(10).toFixed(2) + '%');
console.log('Slot 1 (11:00) -> Position:', getPositionForHour(11).toFixed(2) + '%');
console.log('Slot 4 (14:00) -> Position:', getPositionForHour(14).toFixed(2) + '%');
console.log('Slot 6 (16:00) -> Position:', getPositionForHour(16).toFixed(2) + '%');

// If booking is visually at position 6 instead of position 4
console.log('\nIf position index was off by +2:');
console.log('Visual position 6 (16:00) when expecting position 4 (14:00)');
console.log('This would suggest booking is offset by:', getPositionForHour(16) - getPositionForHour(14), '%'); 