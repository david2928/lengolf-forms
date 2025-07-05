#!/usr/bin/env node
/**
 * Check Coach Data Script
 * This script runs the requested queries to check the current state of coach data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use the refactored Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables:');
  console.error('NEXT_PUBLIC_REFAC_SUPABASE_URL:', !!supabaseUrl);
  console.error('REFAC_SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceRoleKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runQuery(queryName, query) {
  try {
    console.log(`\n📋 ${queryName}`);
    console.log('=' .repeat(50));
    
    const { data, error } = await supabase.rpc('execute_sql', { query });
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('🔍 No data returned');
      return;
    }
    
    console.table(data);
    console.log(`📊 Total records: ${data.length}`);
    
  } catch (error) {
    console.error('❌ Exception:', error.message);
  }
}

async function runDirectQuery(queryName, query) {
  try {
    console.log(`\n📋 ${queryName}`);
    console.log('=' .repeat(50));
    
    // Try to execute the query directly (fallback approach)
    const { data, error } = await supabase
      .from('backoffice.allowed_users')
      .select('id, coach_code, coach_display_name, email, is_coach, is_active_coach')
      .eq('is_coach', true);
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('🔍 No data returned');
      return;
    }
    
    console.table(data);
    console.log(`📊 Total records: ${data.length}`);
    
  } catch (error) {
    console.error('❌ Exception:', error.message);
  }
}

async function main() {
  console.log('🔍 Checking Coach Data...');
  
  // Query 1: Get coaches from allowed_users
  await runQuery(
    'Query 1: Coaches from allowed_users',
    'SELECT id, coach_code, coach_display_name, email, is_coach, is_active_coach FROM backoffice.allowed_users WHERE is_coach = true;'
  );
  
  // Query 2: Get all coach weekly schedules
  await runQuery(
    'Query 2: All coach weekly schedules',
    'SELECT * FROM coach_weekly_schedules;'
  );
  
  // Query 3: Join coaches with their schedules
  await runQuery(
    'Query 3: Coaches with their schedules',
    `SELECT 
      au.coach_code,
      au.coach_display_name,
      au.email,
      cws.day_of_week,
      cws.start_time,
      cws.end_time,
      cws.is_available
    FROM backoffice.allowed_users au
    JOIN coach_weekly_schedules cws ON au.id = cws.coach_id
    WHERE au.is_coach = true
    ORDER BY au.coach_display_name, cws.day_of_week;`
  );

  // Query 4: Check which coaches have schedules vs which don't
  await runQuery(
    'Query 4: Coaches with/without schedules',
    `WITH coaches AS (
      SELECT id, email, coach_display_name, coach_code
      FROM backoffice.allowed_users 
      WHERE is_coach = true AND is_active_coach = true
    ),
    schedules AS (
      SELECT coach_id, COUNT(*) as schedule_count
      FROM coach_weekly_schedules
      GROUP BY coach_id
    )
    SELECT 
      c.coach_code,
      c.coach_display_name,
      c.email,
      COALESCE(s.schedule_count, 0) as schedule_count,
      CASE 
        WHEN s.schedule_count > 0 THEN 'Has Schedule'
        ELSE 'No Schedule'
      END as status
    FROM coaches c
    LEFT JOIN schedules s ON c.id = s.coach_id
    ORDER BY c.coach_display_name;`
  );
  
  console.log('\n✅ Coach data check complete!');
}

main().catch(console.error);