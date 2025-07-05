// Script to query actual coach availability tables
// Run with: node scripts/query-actual-coach-availability.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
const supabaseServiceKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runQueries() {
  console.log('🚀 Running Coach Availability Queries (Actual Tables)...\n');

  try {
    // Query 1: Get all coaches
    console.log('📊 Query 1: All coaches from allowed_users');
    console.log('=' .repeat(80));
    const { data: coaches, error: error1 } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, email, coach_name, coach_display_name, coach_code, is_coach, is_active_coach')
      .eq('is_coach', true)
      .order('coach_name');

    if (error1) {
      console.error('❌ Error:', error1.message);
    } else {
      console.log(`Found ${coaches?.length || 0} coaches`);
      console.table(coaches);
    }

    // Query 2: Check coach_weekly_schedules
    console.log('\n📊 Query 2: Coach weekly schedules');
    console.log('=' .repeat(80));
    const { data: weeklySchedules, error: error2 } = await supabase
      .from('coach_weekly_schedules')
      .select('*')
      .order('coach_id', { ascending: true })
      .order('day_of_week', { ascending: true });

    if (error2) {
      console.error('❌ Error:', error2.message);
    } else {
      console.log(`Found ${weeklySchedules?.length || 0} weekly schedule records`);
      if (weeklySchedules && weeklySchedules.length > 0) {
        // Join with coach names for better display
        const schedulesWithNames = weeklySchedules.map(schedule => {
          const coach = coaches?.find(c => c.id === schedule.coach_id);
          return {
            coach_name: coach?.coach_display_name || coach?.coach_name || 'Unknown',
            day_of_week: schedule.day_of_week,
            day_name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][schedule.day_of_week],
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            is_available: schedule.is_available
          };
        });
        console.table(schedulesWithNames);
      }
    }

    // Query 3: Check coach_date_overrides
    console.log('\n📊 Query 3: Coach date overrides');
    console.log('=' .repeat(80));
    const { data: dateOverrides, error: error3 } = await supabase
      .from('coach_date_overrides')
      .select('*')
      .order('override_date', { ascending: false })
      .limit(20);

    if (error3) {
      console.error('❌ Error:', error3.message);
    } else {
      console.log(`Found ${dateOverrides?.length || 0} date override records`);
      if (dateOverrides && dateOverrides.length > 0) {
        const overridesWithNames = dateOverrides.map(override => {
          const coach = coaches?.find(c => c.id === override.coach_id);
          return {
            coach_name: coach?.coach_display_name || coach?.coach_name || 'Unknown',
            override_date: override.override_date,
            override_type: override.override_type,
            start_time: override.start_time,
            end_time: override.end_time,
            notes: override.notes
          };
        });
        console.table(overridesWithNames);
      }
    }

    // Query 4: Check coach_recurring_blocks
    console.log('\n📊 Query 4: Coach recurring blocks (e.g., lunch breaks)');
    console.log('=' .repeat(80));
    const { data: recurringBlocks, error: error4 } = await supabase
      .from('coach_recurring_blocks')
      .select('*')
      .order('coach_id')
      .order('day_of_week')
      .order('start_time');

    if (error4) {
      console.error('❌ Error:', error4.message);
    } else {
      console.log(`Found ${recurringBlocks?.length || 0} recurring block records`);
      if (recurringBlocks && recurringBlocks.length > 0) {
        const blocksWithNames = recurringBlocks.map(block => {
          const coach = coaches?.find(c => c.id === block.coach_id);
          return {
            coach_name: coach?.coach_display_name || coach?.coach_name || 'Unknown',
            day_of_week: block.day_of_week,
            day_name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][block.day_of_week],
            start_time: block.start_time,
            end_time: block.end_time,
            block_reason: block.block_reason
          };
        });
        console.table(blocksWithNames);
      }
    }

    // Summary
    console.log('\n📊 Summary: Coach Availability Configuration Status');
    console.log('=' .repeat(80));
    
    if (coaches) {
      const coachIds = new Set(weeklySchedules?.map(s => s.coach_id) || []);
      const summary = coaches.map(coach => ({
        email: coach.email,
        name: coach.coach_display_name || coach.coach_name,
        code: coach.coach_code,
        has_weekly_schedule: coachIds.has(coach.id) ? '✅ Yes' : '❌ No',
        schedule_count: weeklySchedules?.filter(s => s.coach_id === coach.id).length || 0
      }));
      console.table(summary);
    }

    // Query to check if tables exist in backoffice schema
    console.log('\n📊 Checking for coach_availability table in backoffice schema');
    console.log('=' .repeat(80));
    const { data: availabilityData, error: availabilityError } = await supabase
      .schema('backoffice')
      .from('coach_availability')
      .select('*')
      .limit(5);

    if (availabilityError) {
      console.log('❌ coach_availability table does not exist in backoffice schema or is empty');
      console.log('   Error:', availabilityError.message);
    } else {
      console.log(`✅ coach_availability table exists with ${availabilityData?.length || 0} records`);
      if (availabilityData && availabilityData.length > 0) {
        console.table(availabilityData);
      }
    }

  } catch (error) {
    console.error('🚨 Unexpected error:', error);
  }
}

runQueries().catch(console.error);