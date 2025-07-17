/**
 * Batch import script for historical referral data
 * This script imports the processed CSV data into the database in batches
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY
);

async function importHistoricalData() {
  try {
    // Read the processed summary data
    const summaryPath = path.join(__dirname, '..', 'sql-output', 'referral-summary.json');
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    
    console.log('Starting batch import...');
    console.log(`Total records to import: ${summary.totalRecords}`);
    
    // Process the CSV again to get the data
    const csvData = await processCSVData();
    
    // Clear existing data
    const { error: deleteError } = await supabase
      .from('historical_referrals')
      .delete()
      .eq('source', 'google_forms_csv');
    
    if (deleteError) {
      console.error('Error clearing existing data:', deleteError);
      return;
    }
    
    // Import in batches of 100
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < csvData.length; i += batchSize) {
      const batch = csvData.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('historical_referrals')
        .insert(batch);
      
      if (error) {
        console.error(`Error importing batch ${i / batchSize + 1}:`, error);
        break;
      }
      
      imported += batch.length;
      console.log(`Imported ${imported}/${csvData.length} records`);
    }
    
    console.log('Import completed successfully!');
    
    // Verify import
    const { data: count } = await supabase
      .from('historical_referrals')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Verified: ${count} records in database`);
    
  } catch (error) {
    console.error('Import failed:', error);
  }
}

async function processCSVData() {
  const csv = require('csv-parser');
  const results = [];
  
  const csvFilePath = path.join(__dirname, '..', 'New Customer Form - Form Responses 1.csv');
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        const timestamp = new Date(row.Timestamp);
        const rawReferralSource = row['How did you hear from us?'];
        const staffName = row['You are?'] || 'Unknown';
        
        if (!isNaN(timestamp.getTime())) {
          results.push({
            timestamp: timestamp.toISOString(),
            date: timestamp.toISOString().split('T')[0],
            week: getWeekOfYear(timestamp),
            month: timestamp.toISOString().substring(0, 7),
            raw_referral_source: rawReferralSource,
            normalized_referral_source: normalizeReferralSource(rawReferralSource),
            staff_name: staffName === 'Dolly' ? 'Dolly' : 
                       staffName === 'Net' ? 'Net' : 
                       staffName === 'May' ? 'May' : 'Unknown',
            source: 'google_forms_csv'
          });
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

function getWeekOfYear(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - startOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}

function normalizeReferralSource(rawSource) {
  if (!rawSource || rawSource.trim() === '') {
    return 'Unknown';
  }
  
  const trimmed = rawSource.trim();
  
  // Direct mapping
  const mapping = {
    'Google': 'Google',
    'Instagram': 'Instagram',
    'Facebook': 'Facebook',
    'Tiktok': 'TikTok',
    'TikTok': 'TikTok',
    'Friends': 'Friends',
    'Girlfriend': 'Friends',
    'Advertisment in the mall': 'Mall Advertisement',
    'Advertisement in front of Lengolf store': 'Mall Advertisement',
    'YouTube': 'YouTube',
    'YouTuber named "Mr. Chris"': 'YouTube',
    'Line': 'LINE',
    'ClassPass notification': 'ClassPass',
    'Class pass': 'ClassPass',
    'ClassPass': 'ClassPass',
    'ClassPass Application': 'ClassPass',
    'ClassPass App': 'ClassPass',
    'Gowabi': 'Gowabi',
    'Gowabi app': 'Gowabi',
    'From the hotel concierge.': 'Hotel/Tourism',
    'His hotel recommend him': 'Hotel/Tourism',
    'Instagram, Google': 'Google',
    'Google, And TikTok as well': 'Google',
  };
  
  if (mapping[trimmed]) {
    return mapping[trimmed];
  }
  
  // Pattern matching
  const lowerSource = trimmed.toLowerCase();
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
  
  return 'Other';
}

// Run the import
if (require.main === module) {
  importHistoricalData();
}

module.exports = { importHistoricalData };