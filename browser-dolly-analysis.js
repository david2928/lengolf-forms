// Browser-based Dolly Hours Analysis
// Run this in the browser console while logged into the admin panel

console.log('📊 Analyzing Dolly\'s Weekly Hours (Sunday-Saturday weeks)...\n');

// Helper function to format date range
function formatWeekRange(weekStart) {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

async function analyzeDollyHours() {
  try {
    console.log('📅 Fetching payroll data for May 2025...');
    
    // Get payroll calculation results for May 2025
    const payrollResponse = await fetch('/api/admin/payroll/2025-05/calculations');
    
    if (!payrollResponse.ok) {
      console.log('❌ Failed to fetch payroll data:', payrollResponse.status, payrollResponse.statusText);
      return;
    }
    
    const payrollData = await payrollResponse.json();
    console.log('✅ Payroll data fetched successfully');
    
    // Find Dolly in the payroll results
    const dolly = payrollData.staff_payroll?.find(staff => staff.staff_name?.toLowerCase() === 'dolly');
    
    if (!dolly) {
      console.log('❌ Could not find Dolly in payroll results');
      console.log('Available staff:', payrollData.staff_payroll?.map(s => s.staff_name) || 'No staff data');
      return;
    }
    
    console.log(`✅ Found Dolly in payroll data - Staff ID: ${dolly.staff_id}`);
    
    console.log('\n📊 DOLLY\'S HOURS ANALYSIS (May 2025)');
    console.log('=======================================');
    
    // Show the calculated totals from payroll
    const totalRegularHours = dolly.regular_hours - dolly.ot_hours;
    const totalOvertimeHours = dolly.ot_hours;
    
    console.log(`📋 MONTHLY SUMMARY`);
    console.log(`Total Regular Hours: ${totalRegularHours.toFixed(2)}`);
    console.log(`Total Overtime Hours: ${totalOvertimeHours.toFixed(2)}`);
    console.log(`Grand Total Hours: ${dolly.regular_hours.toFixed(2)}`);
    
    // Show payroll summary
    console.log('\n💰 PAYROLL SUMMARY');
    console.log('==================');
    console.log(`Working Days: ${dolly.working_days || 'N/A'}`);
    console.log(`Total Hours: ${dolly.regular_hours.toFixed(2)}`);
    console.log(`Overtime Hours: ${dolly.ot_hours.toFixed(2)}`);
    console.log(`Holiday Hours: ${dolly.holiday_hours?.toFixed(2) || 'N/A'}`);
    console.log(`Base Salary: ฿${dolly.base_salary.toFixed(2)}`);
    console.log(`Daily Allowance: ฿${dolly.total_allowance?.toFixed(2) || 'N/A'}`);
    console.log(`Overtime Pay: ฿${dolly.ot_pay.toFixed(2)}`);
    console.log(`Holiday Pay: ฿${dolly.holiday_pay?.toFixed(2) || 'N/A'}`);
    console.log(`Service Charge: ฿${dolly.service_charge.toFixed(2)}`);
    console.log(`Total Payout: ฿${dolly.total_payout.toFixed(2)}`);
    
    // Try to get detailed weekly breakdown
    console.log('\n📅 Attempting to get detailed weekly breakdown...');
    
    try {
      const weeklyResponse = await fetch('/api/admin/payroll/2025-05/debug-weekly-hours');
      if (weeklyResponse.ok) {
        const weeklyData = await weeklyResponse.json();
        console.log('Weekly data:', weeklyData);
      } else {
        console.log('Weekly hours endpoint not available');
      }
    } catch (error) {
      console.log('Could not fetch weekly breakdown');
    }
    
  } catch (error) {
    console.error('💥 Error analyzing Dolly\'s hours:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the analysis
analyzeDollyHours(); 