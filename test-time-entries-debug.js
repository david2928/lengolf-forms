const { DateTime } = require('luxon');

// Test configuration
const BASE_URL = 'http://localhost:3000';

async function testTimeEntriesDebug() {
  console.log('🕐 TIME ENTRIES DEBUG TEST');
  console.log('==========================');
  
  // Test current Bangkok time
  const bangkokNow = DateTime.now().setZone('Asia/Bangkok');
  const today = bangkokNow.toFormat('yyyy-MM-dd');
  
  console.log('Current Bangkok time:', bangkokNow.toISO());
  console.log('Current Bangkok date:', today);
  console.log('UTC equivalent:', bangkokNow.toUTC().toISO());
  console.log();
  
  // Test 1: Get all entries (no date filter)
  console.log('Test 1: Get all entries (no date filter)');
  try {
    const response = await fetch(`${BASE_URL}/api/time-clock/entries?limit=50`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ API accessible');
      console.log(`   Total entries: ${data.entries?.length || 0}`);
      
      if (data.entries && data.entries.length > 0) {
        console.log('   Latest entries:');
        data.entries.slice(0, 5).forEach((entry, i) => {
          console.log(`     ${i + 1}. ${entry.staff_name} - ${entry.action} on ${entry.date_only} at ${entry.time_only}`);
        });
        
        // Check if any entries are from today
        const todaysEntries = data.entries.filter(e => e.date_only === today);
        console.log(`   Entries from today (${today}): ${todaysEntries.length}`);
        
        if (todaysEntries.length > 0) {
          console.log('   Today\'s entries:');
          todaysEntries.forEach((entry, i) => {
            console.log(`     ${i + 1}. ${entry.staff_name} - ${entry.action} at ${entry.time_only}`);
          });
        }
      }
    } else {
      console.log('❌ API error:', data.message);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
  console.log();
  
  // Test 2: Get today's entries specifically
  console.log('Test 2: Get today\'s entries specifically');
  try {
    const params = new URLSearchParams({
      start_date: today,
      end_date: today
    });
    
    const response = await fetch(`${BASE_URL}/api/time-clock/entries?${params}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Today filter working');
      console.log(`   Entries for ${today}: ${data.entries?.length || 0}`);
      
      if (data.entries && data.entries.length > 0) {
        console.log('   Today\'s filtered entries:');
        data.entries.forEach((entry, i) => {
          console.log(`     ${i + 1}. ${entry.staff_name} - ${entry.action} at ${entry.time_only}`);
        });
      }
    } else {
      console.log('❌ Today filter failed:', data.message);
    }
  } catch (error) {
    console.log('❌ Today filter error:', error.message);
  }
  console.log();
  
  // Test 3: Test with different date ranges
  console.log('Test 3: Test recent date ranges');
  const yesterday = bangkokNow.minus({ days: 1 }).toFormat('yyyy-MM-dd');
  const twoDaysAgo = bangkokNow.minus({ days: 2 }).toFormat('yyyy-MM-dd');
  
  for (const testDate of [today, yesterday, twoDaysAgo]) {
    try {
      const params = new URLSearchParams({
        start_date: testDate,
        end_date: testDate
      });
      
      const response = await fetch(`${BASE_URL}/api/time-clock/entries?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`   ${testDate}: ${data.entries?.length || 0} entries`);
      } else {
        console.log(`   ${testDate}: Error - ${data.message}`);
      }
    } catch (error) {
      console.log(`   ${testDate}: Network error - ${error.message}`);
    }
  }
  console.log();
  
  // Test 4: Check if time clock punch endpoint is working
  console.log('Test 4: Check time clock system status');
  try {
    const response = await fetch(`${BASE_URL}/api/time-clock/punch`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Time clock system operational');
      console.log('   Server time:', data.server_time_display);
      console.log('   Timezone:', data.timezone);
    } else {
      console.log('❌ Time clock system error:', data.message);
    }
  } catch (error) {
    console.log('❌ Time clock system unreachable:', error.message);
  }
  
  console.log('\n🎯 Debug test completed');
}

// Run the test
testTimeEntriesDebug().catch(console.error); 