// Test script to verify coaching APIs are working
// Run with: node scripts/test-coaching-api.js

const API_BASE = 'http://localhost:3000/api';

async function testAPI(endpoint, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`📍 Endpoint: ${endpoint}`);
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('✅ Success!');
      if (data.coaches) {
        console.log(`👥 Found ${data.coaches.length} coaches`);
      }
      if (data.sessions) {
        console.log(`📚 Found ${data.sessions.length} sessions`);
      }
      if (data.availability_slots) {
        console.log(`⏰ Found ${data.availability_slots.length} availability slots`);
      }
    } else {
      console.log('❌ Error:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.log('🚨 Network Error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Coaching API Tests...');
  console.log('⚠️  Note: These tests will fail without authentication');
  console.log('   Use these endpoints in the actual app to test properly');
  
  await testAPI('/admin/coaching/coaches', 'Get all coaches');
  await testAPI('/admin/coaching/sessions?start_date=2025-07-01&end_date=2025-07-05', 'Get coaching sessions');
  await testAPI('/admin/coaching/availability?date=2025-07-05', 'Get coach availability');
  await testAPI('/admin/coaching/performance', 'Get performance metrics');
  await testAPI('/admin/coaching/rates', 'Get rates (should be blocked)');
  
  console.log('\n✨ Tests completed!');
  console.log('\n📝 Summary:');
  console.log('- Coaches API should return coach data without earnings');
  console.log('- Sessions API should return booking data without financial info');
  console.log('- Availability API should show real-time coach schedules');
  console.log('- Performance API should show operational metrics');
  console.log('- Rates API should be blocked (403) for staff');
}

runTests().catch(console.error);