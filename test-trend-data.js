// Test script to check trend data retrieval
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load environment variables from different possible locations
const envPaths = ['.env.local', '.env', '../.env.local', '../.env'];
let envLoaded = false;

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment from: ${envPath}`);
    require('dotenv').config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log('No .env file found. Trying to use environment variables directly...');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment check:');
console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\nMissing Supabase environment variables. Please ensure you have:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nIn one of these files: .env.local, .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTrendData() {
  console.log('\nTesting trend data retrieval...\n');

  try {
    // First, let's check if we have any products
    console.log('1. Checking available products...');
    const { data: products, error: productsError } = await supabase
      .from('inventory_products')
      .select('id, name, input_type')
      .eq('is_active', true)
      .limit(5);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return;
    }

    console.log(`Found ${products?.length || 0} products:`);
    products?.forEach(p => console.log(`  - ${p.name} (${p.id}) - Type: ${p.input_type}`));

    if (!products || products.length === 0) {
      console.log('No products found. Cannot test trend data.');
      return;
    }

    // Check for recent submissions
    console.log('\n2. Checking recent submissions...');
    const { data: submissions, error: submissionsError } = await supabase
      .from('inventory_submission')
      .select('product_id, date, value_numeric, staff')
      .not('value_numeric', 'is', null)
      .gte('date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(10);

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return;
    }

    console.log(`Found ${submissions?.length || 0} recent numerical submissions:`);
    submissions?.forEach(s => console.log(`  - Product: ${s.product_id}, Date: ${s.date}, Value: ${s.value_numeric}, Staff: ${s.staff}`));

    if (!submissions || submissions.length === 0) {
      console.log('No recent numerical submissions found. This explains why trend data is empty.');
      return;
    }

    // Test the database function with the first product that has submissions
    const testProductId = submissions[0].product_id;
    console.log(`\n3. Testing get_product_trend_data function with product: ${testProductId}`);

    const { data: trendData, error: trendError } = await supabase.rpc(
      'get_product_trend_data',
      { target_product_id: testProductId }
    );

    if (trendError) {
      console.error('Error calling get_product_trend_data:', trendError);
      return;
    }

    console.log(`Trend data result:`, trendData);
    console.log(`Number of trend data points: ${trendData?.length || 0}`);

    if (trendData && trendData.length > 0) {
      console.log('Sample trend data points:');
      trendData.slice(0, 3).forEach(point => {
        console.log(`  - Date: ${point.submission_date}, Value: ${point.value_numeric}, Staff: ${point.staff}, Product: ${point.product_name}`);
      });
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testTrendData(); 