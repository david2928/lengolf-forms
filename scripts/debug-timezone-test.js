const { createClient } = require('@supabase/supabase-js');

// Test timezone issues
console.log('=== TIMEZONE DEBUG TEST ===');

// Current times in different timezones
const now = new Date();
console.log('System time:', now.toString());
console.log('UTC time:', now.toISOString());

// Bangkok timezone (UTC+7)
const bangkokTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
console.log('Bangkok time:', bangkokTime.toISOString().replace('Z', '+07:00'));

// What "today" means in different timezones
const todayUTC = now.toISOString().split('T')[0];
const todayBangkok = bangkokTime.toISOString().split('T')[0];

console.log('\n=== DATE COMPARISON ===');
console.log('Today (UTC):', todayUTC);
console.log('Today (Bangkok):', todayBangkok);
console.log('Are they different?', todayUTC !== todayBangkok);

// Test different date parsing methods
const testDateString = '2025-06-12';
console.log('\n=== DATE PARSING TEST ===');
console.log('Date string:', testDateString);

// Method 1: Parse as local time
const localParsed = new Date(testDateString + 'T00:00:00');
console.log('Local parsing:', localParsed.toISOString());

// Method 2: Parse as UTC
const utcParsed = new Date(testDateString + 'T00:00:00Z');
console.log('UTC parsing:', utcParsed.toISOString());

// Method 3: Parse as Bangkok time
const bangkokParsed = new Date(testDateString + 'T00:00:00+07:00');
console.log('Bangkok parsing:', bangkokParsed.toISOString());

console.log('\n=== POTENTIAL ISSUE ===');
console.log('If frontend sends "today" as:', todayBangkok);
console.log('But server expects UTC date:', todayUTC);
console.log('This could cause data mismatches');

// API date format test
console.log('\n=== API DATE FORMAT TEST ===');
const apiDate = (date) => date.toISOString().split('T')[0];
console.log('API format (local):', apiDate(now));
console.log('API format (UTC):', apiDate(new Date(now.toISOString())));

// Test what happens when we format dates from different timezones
const bangkokToday = new Date(now.getTime() + (7 * 60 * 60 * 1000));
console.log('Bangkok today as API date:', apiDate(bangkokToday)); 