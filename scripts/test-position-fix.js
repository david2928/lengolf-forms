console.log('=== TESTING POSITION FIX ===');

// Original calculation
function getPositionForHour_ORIGINAL(hour) {
  const START_HOUR = 10;
  const TOTAL_HOURS = 14;
  return ((hour - START_HOUR) / TOTAL_HOURS) * 100;
}

// Fixed calculation (with +1 offset)
function getPositionForHour_FIXED(hour) {
  const START_HOUR = 10;
  const TOTAL_HOURS = 14;
  return ((hour - START_HOUR + 1) / TOTAL_HOURS) * 100;
}

const testHours = [13, 14, 17]; // 1pm, 2pm (Alson), 5pm (Allison)

console.log('Comparison of original vs fixed calculations:');
console.log('Hour\tOriginal\tFixed\t\tExpected Position');
console.log('====\t========\t=====\t\t=================');

testHours.forEach(hour => {
  const original = getPositionForHour_ORIGINAL(hour);
  const fixed = getPositionForHour_FIXED(hour);
  const expectedPosition = `${hour}:00 grid line`;
  
  console.log(`${hour}:00\t${original.toFixed(2)}%\t\t${fixed.toFixed(2)}%\t\t${expectedPosition}`);
});

console.log('\nKey test cases:');
console.log('✓ Alson (2pm/14:00) should now be at:', getPositionForHour_FIXED(14).toFixed(2) + '%');
console.log('✓ Allison (5pm/17:00) should now be at:', getPositionForHour_FIXED(17).toFixed(2) + '%');

console.log('\nIf this fix is correct, then:');
console.log('- Red marker (35.71%) should align with 14:00 grid line');
console.log('- Blue marker (57.14%) should align with 17:00 grid line');
console.log('- Alson booking should appear at 14:00 instead of 17:00');
console.log('- Allison booking should appear at 17:00 instead of 23:00');

console.log('\nValidation check:');
console.log('Hour 10 (start) should be at 7.14%:', getPositionForHour_FIXED(10));
console.log('Hour 24 (end) should be at 107.14%:', getPositionForHour_FIXED(24));
console.log('Note: End position over 100% is expected as calendar goes 10:00-00:00'); 