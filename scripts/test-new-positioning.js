console.log('=== TESTING NEW POSITIONING CALCULATION ===');

const START_HOUR = 10;
const TOTAL_SLOTS = 15;

// Old calculation (using TOTAL_HOURS = 14)
function getPositionForHour_OLD(hour) {
  const TOTAL_HOURS = 14;
  return ((hour - START_HOUR) / TOTAL_HOURS) * 100;
}

// New calculation (using TOTAL_SLOTS - 1 = 14)
function getPositionForHour_NEW(hour) {
  return ((hour - START_HOUR) / (TOTAL_SLOTS - 1)) * 100;
}

console.log('Comparing old vs new positioning:');
console.log('==================================');

// Test key hours
const testHours = [10, 11, 12, 13, 14, 15, 16, 17, 18];

testHours.forEach(hour => {
  const oldPos = getPositionForHour_OLD(hour);
  const newPos = getPositionForHour_NEW(hour);
  const timeLabel = hour < 24 ? `${hour}:00` : '00:00';
  
  console.log(`${timeLabel} (hour ${hour}):`);
  console.log(`  Old: ${oldPos.toFixed(2)}%`);
  console.log(`  New: ${newPos.toFixed(2)}%`);
  console.log(`  Diff: ${(newPos - oldPos).toFixed(2)}%`);
  
  if (hour === 14) {
    console.log('  ★ This is Alson\'s 2:00 PM booking');
  }
  if (hour === 16) {
    console.log('  ★ This is 4:00 PM (where it appears visually)');
  }
  console.log('');
});

console.log('Analysis:');
console.log('=========');
console.log('Old calculation: Uses TOTAL_HOURS = 14');
console.log('New calculation: Uses (TOTAL_SLOTS - 1) = 14');
console.log('Both should be identical since both use 14 as divisor.');
console.log('');
console.log('If the calculations are the same, the issue is likely:');
console.log('1. Grid line positioning vs booking positioning mismatch');
console.log('2. CSS layout issue');
console.log('3. Different reference points for visual vs calculated positions'); 