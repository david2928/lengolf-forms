console.log('=== DEBUGGING POSITION CALCULATION ===');

// Current implementation
function getPositionForHour_CURRENT(hour) {
  const START_HOUR = 10;
  const TOTAL_HOURS = 14;
  return ((hour - START_HOUR) / TOTAL_HOURS) * 100;
}

// Test what each hour should give us
const hours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];

console.log('Current calculation results:');
console.log('Hour\tPosition\tShould be at');
console.log('====\t========\t============');

hours.forEach(hour => {
  const position = getPositionForHour_CURRENT(hour);
  console.log(`${hour}:00\t${position.toFixed(2)}%\t\t${hour}:00 time slot`);
});

console.log('\nAnalyzing the visual mismatch:');
console.log('Red marker at 28.57% appears at 13:00 instead of 14:00');
console.log('This means 28.57% is actually pointing to hour 13, not hour 14');

console.log('\nIf 28.57% points to 13:00, then to point to 14:00 we need:');
// If 28.57% = 13:00, then what should 14:00 be?
const observed_13_position = 28.57;
const observed_14_position = observed_13_position + (100/14); // Add one hour's worth
console.log(`14:00 should be at: ${observed_14_position.toFixed(2)}%`);

console.log('\nLet\'s test if the issue is TOTAL_HOURS:');
// Maybe TOTAL_HOURS should be 15 instead of 14?
function getPositionForHour_TEST(hour) {
  const START_HOUR = 10;
  const TOTAL_HOURS = 15; // Test with 15 instead of 14
  return ((hour - START_HOUR) / TOTAL_HOURS) * 100;
}

console.log('\nWith TOTAL_HOURS = 15:');
hours.forEach(hour => {
  const position = getPositionForHour_TEST(hour);
  console.log(`${hour}:00\t${position.toFixed(2)}%`);
  if (hour === 14) {
    console.log('  ^ This is Alson (should match red line position)');
  }
  if (hour === 17) {
    console.log('  ^ This is Allison (should match blue line position)');
  }
});

console.log('\nAnother test - maybe the grid has padding/offset:');
console.log('If there\'s a container offset, positions might be shifted by a constant amount');

// Test what would cause the observed behavior
console.log('\nReverse engineering the observed positions:');
console.log('If red line (28.57%) appears at 13:00...');
console.log('And bookings appear 3 hours later than calculated...');

const alson_calculated = 28.57; // 14:00 calculated
const alson_visual = 50;        // 17:00 visual (approximated)
const offset = alson_visual - alson_calculated;
console.log(`Visual offset: ${offset.toFixed(2)}% (${(offset/100*14).toFixed(1)} hours)`); 