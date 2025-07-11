// Debug Dolly's Weekly Hours Calculation
// This will manually calculate what her weekly breakdown should be

console.log('🔍 Debugging Dolly\'s Weekly Hours Calculation...\n');

// Helper function to get Sunday of the week
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = d.getDate() - day; // Get Sunday of the current week
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Helper function to format date range
function formatWeekRange(weekStart) {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

async function debugDollyWeekly() {
  try {
    console.log('1. Getting current payroll calculation...');
    
    const payrollResponse = await fetch('/api/admin/payroll/2025-05/calculations');
    const payrollData = await payrollResponse.json();
    
    const dolly = payrollData.staff_payroll?.find(s => s.staff_name?.toLowerCase() === 'dolly');
    if (!dolly) {
      console.log('❌ Dolly not found');
      return;
    }
    
    console.log('✅ Current Payroll Result:');
    console.log(`   Total Hours (shown as regular_hours): ${dolly.regular_hours.toFixed(2)}`);
    console.log(`   Overtime Hours: ${dolly.ot_hours.toFixed(2)}`);
    console.log(`   Actual Regular Hours: ${(dolly.regular_hours - dolly.ot_hours).toFixed(2)}`);
    console.log(`   Staff ID: ${dolly.staff_id}`);
    
    // Now let's manually calculate what it should be
    console.log('\n2. Manual calculation - What it SHOULD be:');
    console.log('============================================');
    
    // Example calculation for 212.02 hours over ~4.3 weeks
    const totalHours = dolly.regular_hours;
    const avgHoursPerWeek = totalHours / 4.3; // May has ~4.3 weeks
    
    console.log(`Total hours: ${totalHours.toFixed(2)}`);
    console.log(`Average per week: ${avgHoursPerWeek.toFixed(2)} hours/week`);
    
    if (avgHoursPerWeek > 48) {
      console.log('\n⚠️  If hours were evenly distributed:');
      console.log(`   Each week would be ${avgHoursPerWeek.toFixed(2)} hours`);
      console.log(`   Each week OT: ${Math.max(0, avgHoursPerWeek - 48).toFixed(2)} hours`);
      console.log(`   Total monthly OT: ${(Math.max(0, avgHoursPerWeek - 48) * 4.3).toFixed(2)} hours`);
    }
    
    console.log('\n3. Examining the weekly calculation logic...');
    console.log('===========================================');
    
    // The issue might be that the system is calculating wrong
    // Let's see if we can trace through the logic
    
    console.log('\nThe payroll system should:');
    console.log('1. Group daily hours by week (Sunday-Saturday)');
    console.log('2. For each week: overtime = max(0, weekly_total - 48)');
    console.log('3. Sum all weekly overtime totals');
    console.log('');
    console.log('But current result suggests this is not happening correctly.');
    
    console.log('\n4. Expected vs Actual:');
    console.log('======================');
    
    // If Dolly worked roughly evenly
    const expectedWeeklyOT = Math.max(0, avgHoursPerWeek - 48) * 4.3;
    const actualOT = dolly.ot_hours;
    
    console.log(`Expected OT (if evenly distributed): ~${expectedWeeklyOT.toFixed(2)} hours`);
    console.log(`Actual OT from system: ${actualOT.toFixed(2)} hours`);
    console.log(`Difference: ${(actualOT - expectedWeeklyOT).toFixed(2)} hours`);
    
    if (Math.abs(actualOT - (totalHours - 48)) < 1) {
      console.log('\n🚨 CONFIRMED ISSUE:');
      console.log('==================');
      console.log('The system is calculating OT as (total_monthly_hours - 48)');
      console.log('instead of summing weekly overtime calculations!');
      console.log('');
      console.log('This suggests the weekly calculation logic has a bug');
      console.log('or the aggregation is wrong.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugDollyWeekly(); 