/**
 * Proper Node.js script to import all 1,032 historical referral records
 * Uses Supabase API with proper credentials and batch processing
 * 
 * Usage: node scripts/import-full-historical-data.js
 */

const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Supabase client with proper credentials
const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY
);

// Referral source normalization mapping
const REFERRAL_SOURCE_MAPPING = {
  // Google variations
  'Google': 'Google',
  'google': 'Google',
  
  // Instagram variations  
  'Instagram': 'Instagram',
  'instagram': 'Instagram',
  
  // Facebook variations
  'Facebook': 'Facebook',
  'facebook': 'Facebook',
  
  // TikTok variations
  'Tiktok': 'TikTok',
  'TikTok': 'TikTok',
  'tiktok': 'TikTok',
  
  // Friends variations
  'Friends': 'Friends',
  'friends': 'Friends',
  'Friend': 'Friends',
  'Girlfriend': 'Friends',
  'girlfriend': 'Friends',
  'Knew from our Mr. Chris Rall': 'Friends',
  'From his girlfriend': 'Friends',
  'From Pro Ratchavin': 'Friends',
  
  // Mall Advertisement variations
  'Advertisment in the mall': 'Mall Advertisement',
  'Advertisement in front of Lengolf store': 'Mall Advertisement',
  'Advertisment in the mall': 'Mall Advertisement',
  
  // YouTube variations
  'YouTube': 'YouTube',
  'YouTuber named "Mr. Chris"': 'YouTube',
  'From YouTube (Mr Chris Rall\'s Interview)': 'YouTube',
  'YouTube ': 'YouTube',
  
  // LINE variations
  'Line': 'LINE',
  
  // ClassPass variations
  'ClassPass notification': 'ClassPass',
  'Class pass': 'ClassPass',
  'ClassPass': 'ClassPass',
  'ClassPass Application': 'ClassPass',
  'ClassPass App': 'ClassPass',
  'ClassPass App.': 'ClassPass',
  
  // Gowabi variations
  'Gowabi': 'Gowabi',
  'Gowabi app': 'Gowabi',
  'Gowabi app ': 'Gowabi',
  
  // Hotel/Tourism variations
  'From the hotel concierge.': 'Hotel/Tourism',
  'His hotel recommend him': 'Hotel/Tourism',
  
  // Multi-channel responses
  'Instagram, Google': 'Google', // Primary channel
  'Google, And TikTok as well': 'Google', // Primary channel
  'Facebook, Mr. Richard knew us from Facebook on Mon.24th.Mar.25': 'Facebook',
  
  // Other/Unknown
  'Other': 'Other'
};

// Staff name normalization
const STAFF_MAPPING = {
  'Dolly': 'Dolly',
  'Net': 'Net', 
  'May': 'May',
  '': 'Unknown'
};

/**
 * Normalize referral source from CSV data
 */
function normalizeReferralSource(rawSource) {
  if (!rawSource || rawSource.trim() === '') {
    return 'Unknown';
  }
  
  const trimmed = rawSource.trim();
  
  // Check direct mapping first
  if (REFERRAL_SOURCE_MAPPING[trimmed]) {
    return REFERRAL_SOURCE_MAPPING[trimmed];
  }
  
  // Check case-insensitive mapping
  const lowerSource = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(REFERRAL_SOURCE_MAPPING)) {
    if (key.toLowerCase() === lowerSource) {
      return value;
    }
  }
  
  // Pattern matching for complex cases
  if (lowerSource.includes('google')) return 'Google';
  if (lowerSource.includes('instagram')) return 'Instagram';
  if (lowerSource.includes('facebook')) return 'Facebook';
  if (lowerSource.includes('tiktok')) return 'TikTok';
  if (lowerSource.includes('friend')) return 'Friends';
  if (lowerSource.includes('mall') || lowerSource.includes('advertisement')) return 'Mall Advertisement';
  if (lowerSource.includes('youtube')) return 'YouTube';
  if (lowerSource.includes('classpass') || lowerSource.includes('class pass')) return 'ClassPass';
  if (lowerSource.includes('gowabi')) return 'Gowabi';
  if (lowerSource.includes('hotel')) return 'Hotel/Tourism';
  if (lowerSource.includes('line')) return 'LINE';
  
  console.warn(`Unknown referral source: "${trimmed}"`);
  return 'Other';
}

/**
 * Parse timestamp from CSV format
 */
function parseTimestamp(timestampStr) {
  if (!timestampStr) return null;
  
  // Handle CSV format: "9/9/2024 11:49:59" or "1/1/2025 21:58:14"
  const date = new Date(timestampStr);
  if (isNaN(date.getTime())) {
    console.warn(`Invalid timestamp: "${timestampStr}"`);
    return null;
  }
  
  return date;
}

/**
 * Get week of year for a date
 */
function getWeekOfYear(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - startOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}

/**
 * Process CSV file and generate normalized data
 */
async function processCSV() {
  const csvFilePath = path.join(__dirname, '..', 'New Customer Form - Form Responses 1.csv');
  const results = [];
  
  console.log('Processing CSV file:', csvFilePath);
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        const timestamp = parseTimestamp(row.Timestamp);
        const rawReferralSource = row['How did you hear from us?'];
        const staffName = row['You are?'] || 'Unknown';
        
        if (timestamp) {
          const normalizedData = {
            timestamp: timestamp.toISOString(),
            date: timestamp.toISOString().split('T')[0],
            week: getWeekOfYear(timestamp),
            month: timestamp.toISOString().substring(0, 7),
            raw_referral_source: rawReferralSource,
            normalized_referral_source: normalizeReferralSource(rawReferralSource),
            staff_name: STAFF_MAPPING[staffName] || staffName,
            source: 'google_forms_csv'
          };
          
          results.push(normalizedData);
        }
      })
      .on('end', () => {
        console.log(`Processed ${results.length} records`);
        resolve(results);
      })
      .on('error', reject);
  });
}

/**
 * Clear existing historical data
 */
async function clearExistingData() {
  console.log('Clearing existing historical data...');
  
  const { error } = await supabase
    .from('historical_referrals')
    .delete()
    .eq('source', 'google_forms_csv');
  
  if (error) {
    throw new Error(`Failed to clear existing data: ${error.message}`);
  }
  
  console.log('Existing data cleared successfully');
}

/**
 * Import data in batches to avoid API limits
 */
async function importDataInBatches(data, batchSize = 100) {
  console.log(`Importing ${data.length} records in batches of ${batchSize}...`);
  
  const totalBatches = Math.ceil(data.length / batchSize);
  let successCount = 0;
  
  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, data.length);
    const batch = data.slice(start, end);
    
    console.log(`Processing batch ${i + 1}/${totalBatches} (${start + 1}-${end})`);
    
    const { data: insertedData, error } = await supabase
      .from('historical_referrals')
      .insert(batch);
    
    if (error) {
      console.error(`Error in batch ${i + 1}:`, error);
      throw new Error(`Failed to import batch ${i + 1}: ${error.message}`);
    }
    
    successCount += batch.length;
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`Successfully imported ${successCount} records`);
  return successCount;
}

/**
 * Verify the import
 */
async function verifyImport() {
  console.log('Verifying import...');
  
  const { data, error } = await supabase
    .from('historical_referrals')
    .select('*')
    .eq('source', 'google_forms_csv');
  
  if (error) {
    throw new Error(`Failed to verify import: ${error.message}`);
  }
  
  console.log(`Verification: ${data.length} records found in database`);
  
  // Get summary statistics using SQL query
  const { data: summary, error: summaryError } = await supabase
    .rpc('execute_sql', {
      query: `
        SELECT normalized_referral_source, COUNT(*) as count
        FROM historical_referrals 
        WHERE source = 'google_forms_csv'
        GROUP BY normalized_referral_source
        ORDER BY count DESC
      `
    });
  
  if (summaryError) {
    console.warn('Could not get summary statistics:', summaryError.message);
  } else {
    console.log('\nReferral source breakdown:');
    summary.forEach(item => {
      console.log(`  ${item.normalized_referral_source}: ${item.count} records`);
    });
  }
  
  return data.length;
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('Starting full historical referral data import...');
    console.log('Using Supabase URL:', process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL);
    
    // Check credentials
    if (!process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL || !process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase credentials. Please check your .env file.');
    }
    
    // Process CSV data
    const data = await processCSV();
    
    // Clear existing data
    await clearExistingData();
    
    // Import in batches
    const importedCount = await importDataInBatches(data);
    
    // Verify import
    const verifiedCount = await verifyImport();
    
    console.log(`\n✅ Import completed successfully!`);
    console.log(`   Processed: ${data.length} records`);
    console.log(`   Imported: ${importedCount} records`);
    console.log(`   Verified: ${verifiedCount} records`);
    console.log(`   Date range: ${data[0]?.date} to ${data[data.length - 1]?.date}`);
    
    // Show referral source summary
    const sourceCounts = {};
    data.forEach(record => {
      sourceCounts[record.normalized_referral_source] = (sourceCounts[record.normalized_referral_source] || 0) + 1;
    });
    
    console.log('\nReferral source summary:');
    Object.entries(sourceCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([source, count]) => {
        console.log(`  ${source}: ${count} (${((count / data.length) * 100).toFixed(1)}%)`);
      });
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  processCSV,
  normalizeReferralSource,
  importDataInBatches,
  clearExistingData,
  verifyImport
};