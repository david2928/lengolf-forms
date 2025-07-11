// Dolly Weekly Hours Breakdown - May 2025
// Run this in browser console while logged into admin panel

console.log('📊 Getting Dolly\'s Weekly Hours Breakdown...\n');

async function getDollyWeeklyBreakdown() {
  try {
    // Get the weekly hours data
    const response = await fetch('/api/admin/payroll/2025-05/calculations');
    const data = await response.json();
    
    // Find Dolly
    const dolly = data.staff_payroll?.find(s => s.staff_name?.toLowerCase() === 'dolly');
    if (!dolly) {
      console.log('❌ Dolly not found');
      return;
    }
    
    console.log('✅ Found Dolly in payroll data');
    console.log(`   Total Monthly Hours: ${dolly.regular_hours.toFixed(2)}`);
    console.log(`   Monthly OT Hours: ${dolly.ot_hours.toFixed(2)}`);
    console.log(`   Staff ID: ${dolly.staff_id}`);
    
    // Now let's try to get the actual weekly breakdown
    // The system should have this in the weekly hours calculation
    
    console.log('\n🔍 Attempting to get detailed weekly data...');
    
    // Try to access the underlying weekly calculation
    // This might require a different API call or direct database access
    
    // For now, let's show what we can calculate
    const monthlyRegular = dolly.regular_hours - dolly.ot_hours;
    const monthlyOT = dolly.ot_hours;
    
    console.log('\n📋 CURRENT CALCULATION RESULT:');
    console.log('===============================');
    console.log(`Monthly Total Hours: ${dolly.regular_hours.toFixed(2)}`);
    console.log(`Monthly Regular Hours: ${monthlyRegular.toFixed(2)}`);
    console.log(`Monthly OT Hours: ${monthlyOT.toFixed(2)}`);
    
    console.log('\n⚠️  ISSUE IDENTIFIED:');
    console.log('===================');
    console.log('The system shows OT as total monthly hours minus 48,');
    console.log('but OT should be calculated per week (Sunday-Saturday).');
    console.log('');
    console.log('For example, if Dolly worked:');
    console.log('- Week 1: 45 hours → 45 regular, 0 OT');
    console.log('- Week 2: 52 hours → 48 regular, 4 OT');
    console.log('- Week 3: 50 hours → 48 regular, 2 OT');
    console.log('- Week 4: 43 hours → 43 regular, 0 OT');
    console.log('- Week 5: 22 hours → 22 regular, 0 OT');
    console.log('Total: 206 regular + 6 OT = 212 hours');
    console.log('');
    console.log('But current system shows:', monthlyRegular.toFixed(2), 'regular +', monthlyOT.toFixed(2), 'OT');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

getDollyWeeklyBreakdown(); 