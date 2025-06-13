const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeDateTimezoneIssues() {
  console.log('=== ANALYZING POS DATA TIMEZONE ISSUES ===');
  
  // 1. Check current database time and timezone settings
  console.log('\n1. Database timezone information:');
  
  const { data: dbTime, error: dbTimeError } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        NOW() as current_utc_time,
        NOW() AT TIME ZONE 'Asia/Bangkok' as current_bangkok_time,
        current_setting('timezone') as db_timezone,
        extract(timezone from NOW()) as tz_offset_seconds
      `
  });
  
  if (dbTime) {
    console.log('DB Current UTC:', dbTime[0].current_utc_time);
    console.log('DB Current Bangkok:', dbTime[0].current_bangkok_time);
    console.log('DB Timezone Setting:', dbTime[0].db_timezone);
    console.log('DB Timezone Offset:', dbTime[0].tz_offset_seconds, 'seconds');
  } else {
    console.error('Error getting DB time:', dbTimeError);
  }
  
  // 2. Check sample data from staging table
  console.log('\n2. Sample staging data analysis:');
  
  const { data: stagingData, error: stagingError } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        date as original_date_text,
        date::timestamp as parsed_timestamp,
        date::timestamp AT TIME ZONE 'Asia/Bangkok' as bangkok_timestamp,
        import_batch_id,
        created_at
      FROM pos.lengolf_sales_staging 
      ORDER BY created_at DESC 
      LIMIT 5
    `
  });
  
  if (stagingData) {
    console.log('Staging data samples:');
    stagingData.forEach((row, i) => {
      console.log(`  ${i + 1}. Original: ${row.original_date_text}`);
      console.log(`     Parsed: ${row.parsed_timestamp}`);
      console.log(`     Bangkok: ${row.bangkok_timestamp}`);
      console.log(`     Batch: ${row.import_batch_id}`);
      console.log('');
    });
  } else {
    console.error('Error getting staging data:', stagingError);
  }
  
  // 3. Check sample data from production sales table
  console.log('\n3. Sample production sales data analysis:');
  
  const { data: salesData, error: salesError } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        date as date_field,
        sales_timestamp,
        sales_timestamp AT TIME ZONE 'Asia/Bangkok' as bangkok_sales_timestamp,
        product_name,
        sales_total,
        receipt_number
      FROM pos.lengolf_sales 
      ORDER BY sales_timestamp DESC 
      LIMIT 5
    `
  });
  
  if (salesData) {
    console.log('Production sales data samples:');
    salesData.forEach((row, i) => {
      console.log(`  ${i + 1}. Date: ${row.date_field}`);
      console.log(`     Sales Timestamp: ${row.sales_timestamp}`);
      console.log(`     Bangkok Timestamp: ${row.bangkok_sales_timestamp}`);
      console.log(`     Product: ${row.product_name}`);
      console.log(`     Amount: ${row.sales_total}`);
      console.log('');
    });
  } else {
    console.error('Error getting sales data:', salesError);
  }
  
  // 4. Check what "today" data exists
  console.log('\n4. Today\'s data analysis:');
  
  const todayBangkok = new Date().toLocaleDateString('sv-SE'); // Get YYYY-MM-DD in local time
  console.log('Today (local system):', todayBangkok);
  
  const { data: todaysData, error: todayError } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        '${todayBangkok}' as searched_date,
        COUNT(*) as staging_count,
        (SELECT COUNT(*) FROM pos.lengolf_sales WHERE date = '${todayBangkok}') as sales_count,
        MAX(date) as latest_staging_date,
        (SELECT MAX(date) FROM pos.lengolf_sales) as latest_sales_date,
        (SELECT MAX(sales_timestamp AT TIME ZONE 'Asia/Bangkok') FROM pos.lengolf_sales) as latest_bangkok_timestamp
      FROM pos.lengolf_sales_staging 
      WHERE date::date = '${todayBangkok}'
    `
  });
  
  if (todaysData) {
    const today = todaysData[0];
    console.log(`Searching for date: ${today.searched_date}`);
    console.log(`Staging records for today: ${today.staging_count}`);
    console.log(`Sales records for today: ${today.sales_count}`);
    console.log(`Latest staging date: ${today.latest_staging_date}`);
    console.log(`Latest sales date: ${today.latest_sales_date}`);
    console.log(`Latest Bangkok timestamp: ${today.latest_bangkok_timestamp}`);
  } else {
    console.error('Error checking today\'s data:', todayError);
  }
  
  // 5. Check dashboard function results for today
  console.log('\n5. Dashboard function test for today:');
  
  const { data: dashboardData, error: dashboardError } = await supabase.rpc('get_dashboard_summary_enhanced', {
    start_date: todayBangkok,
    end_date: todayBangkok,
    comparison_start_date: '2025-06-11',
    comparison_end_date: '2025-06-11'
  });
  
  if (dashboardData) {
    console.log('Dashboard results for today:');
    console.log('Current period revenue:', dashboardData.current_period?.total_revenue || 0);
    console.log('Current period transactions:', dashboardData.current_period?.transaction_count || 0);
    console.log('Has trend data:', !!dashboardData.trend_data);
  } else {
    console.error('Error getting dashboard data:', dashboardError);
  }
}

// Function to suggest fixes
async function suggestFixes() {
  console.log('\n=== RECOMMENDED FIXES ===');
  
  console.log(`
1. TIMEZONE ISSUE IN DATABASE FUNCTIONS:
   - Database functions should use Asia/Bangkok timezone for date comparisons
   - Current queries may be treating dates as UTC when they should be Bangkok time
   
2. API ENDPOINT TIMEZONE ISSUE:
   - API endpoint should determine "today" using Asia/Bangkok timezone
   - Current code: new Date().toISOString().split('T')[0] // Uses server timezone
   - Should be: Bangkok timezone aware date calculation
   
3. FRONTEND DATE HANDLING:
   - Frontend should send dates in consistent format
   - Should consider Bangkok business timezone for date ranges
   
4. ETL PIPELINE TIMEZONE CONSISTENCY:
   - Ensure staging to production transformation handles timezones correctly
   - sales_timestamp should be properly converted to Bangkok timezone
  `);
  
  console.log('\n=== IMMEDIATE FIXES TO IMPLEMENT ===');
  
  console.log(`
FIX 1: Update API endpoint to use Bangkok timezone
FIX 2: Update database functions to handle Bangkok timezone properly  
FIX 3: Ensure ETL pipeline converts timestamps correctly
FIX 4: Add timezone debugging to dashboard
  `);
}

// Main execution
async function main() {
  try {
    await analyzeDateTimezoneIssues();
    await suggestFixes();
  } catch (error) {
    console.error('Error analyzing timezone issues:', error);
  }
}

main(); 