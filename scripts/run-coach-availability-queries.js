// Script to run coach availability queries
// Run with: node scripts/run-coach-availability-queries.js

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
  console.log('🚀 Running Coach Availability Queries...\n');

  try {
    // Query 1: Get latest 20 coach availability records
    console.log('📊 Query 1: Latest 20 coach availability records');
    console.log('=' .repeat(80));
    const { data: latestRecords, error: error1 } = await supabase
      .schema('backoffice')
      .from('coach_availability')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error1) {
      console.error('❌ Error:', error1.message);
    } else {
      console.log(`Found ${latestRecords?.length || 0} records`);
      console.table(latestRecords);
    }

    // Query 2: Count by availability type and coach email
    console.log('\n📊 Query 2: Count by availability type and coach email');
    console.log('=' .repeat(80));
    const { data: counts, error: error2 } = await supabase
      .rpc('execute_sql', {
        query: `
          SELECT 
            COUNT(*) as total, 
            availability_type, 
            coach_email 
          FROM backoffice.coach_availability 
          GROUP BY availability_type, coach_email
          ORDER BY coach_email, availability_type
        `
      }).single();

    if (error2 || !counts) {
      // Fallback to manual grouping
      const { data: allRecords, error: fallbackError } = await supabase
        .schema('backoffice')
        .from('coach_availability')
        .select('availability_type, coach_email');

      if (!fallbackError && allRecords) {
        const grouped = allRecords.reduce((acc, record) => {
          const key = `${record.coach_email}-${record.availability_type}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        const groupedArray = Object.entries(grouped).map(([key, count]) => {
          const [email, type] = key.split('-');
          return { coach_email: email, availability_type: type, total: count };
        });

        console.table(groupedArray);
      }
    } else {
      console.table(counts);
    }

    // Query 3: Get all coaches
    console.log('\n📊 Query 3: All coaches from allowed_users');
    console.log('=' .repeat(80));
    const { data: coaches, error: error3 } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('email, coach_name, coach_display_name, coach_code, is_coach, is_active_coach')
      .eq('is_coach', true)
      .order('coach_name');

    if (error3) {
      console.error('❌ Error:', error3.message);
    } else {
      console.log(`Found ${coaches?.length || 0} coaches`);
      console.table(coaches);
    }

    // Query 4: Distinct coach emails from availability
    console.log('\n📊 Query 4: Distinct coach emails from coach_availability');
    console.log('=' .repeat(80));
    const { data: availabilityEmails, error: error4 } = await supabase
      .schema('backoffice')
      .from('coach_availability')
      .select('coach_email')
      .order('coach_email');

    if (error4) {
      console.error('❌ Error:', error4.message);
    } else {
      const uniqueEmails = [...new Set(availabilityEmails?.map(r => r.coach_email) || [])];
      console.log(`Found ${uniqueEmails.length} unique coach emails with availability data:`);
      uniqueEmails.forEach(email => console.log(`  - ${email}`));
    }

    // Summary comparison
    console.log('\n📊 Summary: Coaches with/without availability data');
    console.log('=' .repeat(80));
    if (coaches && availabilityEmails) {
      const emailsWithAvailability = new Set(availabilityEmails.map(r => r.coach_email));
      const summary = coaches.map(coach => ({
        email: coach.email,
        name: coach.coach_display_name || coach.coach_name,
        code: coach.coach_code,
        has_availability_data: emailsWithAvailability.has(coach.email) ? '✅ Yes' : '❌ No'
      }));
      console.table(summary);
    }

  } catch (error) {
    console.error('🚨 Unexpected error:', error);
  }
}

runQueries().catch(console.error);