/**
 * One-time import script for historical referral data from Google Forms CSV
 * 
 * This script processes the "New Customer Form - Form Responses 1.csv" file
 * and creates a normalized referral source mapping for sales dashboard analysis.
 * 
 * Usage: node scripts/import-historical-referrals.js
 */

const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

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
 * Process CSV file and generate normalized data
 */
async function processCSV() {
  const csvFilePath = path.join(__dirname, '..', 'New Customer Form - Form Responses 1.csv');
  const results = [];
  
  console.log('Processing CSV file:', csvFilePath);
  
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        const timestamp = parseTimestamp(row.Timestamp);
        const rawReferralSource = row['How did you hear from us?'];
        const staffName = row['You are?'] || 'Unknown';
        
        if (timestamp) {
          const normalizedData = {
            timestamp: timestamp,
            date: timestamp.toISOString().split('T')[0],
            week: getWeekOfYear(timestamp),
            month: timestamp.toISOString().substring(0, 7),
            rawReferralSource: rawReferralSource,
            normalizedReferralSource: normalizeReferralSource(rawReferralSource),
            staffName: STAFF_MAPPING[staffName] || staffName,
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
 * Get week of year for a date
 */
function getWeekOfYear(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - startOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}

/**
 * Generate summary statistics
 */
function generateSummary(data) {
  const summary = {
    totalRecords: data.length,
    dateRange: {
      start: data[0]?.date,
      end: data[data.length - 1]?.date
    },
    referralSources: {},
    staffBreakdown: {},
    monthlyBreakdown: {},
    weeklyBreakdown: {}
  };
  
  // Count by referral source
  data.forEach(record => {
    const source = record.normalizedReferralSource;
    summary.referralSources[source] = (summary.referralSources[source] || 0) + 1;
  });
  
  // Count by staff
  data.forEach(record => {
    const staff = record.staffName;
    summary.staffBreakdown[staff] = (summary.staffBreakdown[staff] || 0) + 1;
  });
  
  // Count by month
  data.forEach(record => {
    const month = record.month;
    summary.monthlyBreakdown[month] = (summary.monthlyBreakdown[month] || 0) + 1;
  });
  
  // Count by week (last 12 weeks for trending)
  const recentWeeks = data.filter(record => {
    const weeksDiff = (new Date() - record.timestamp) / (7 * 24 * 60 * 60 * 1000);
    return weeksDiff <= 12;
  });
  
  recentWeeks.forEach(record => {
    const weekKey = `${record.timestamp.getFullYear()}-W${record.week}`;
    summary.weeklyBreakdown[weekKey] = (summary.weeklyBreakdown[weekKey] || 0) + 1;
  });
  
  return summary;
}

/**
 * Create database-ready SQL for import
 */
function generateImportSQL(data) {
  const tableName = 'historical_referrals';
  
  let sql = `
-- Create table for historical referral data
CREATE TABLE IF NOT EXISTS ${tableName} (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  date DATE NOT NULL,
  week INTEGER NOT NULL,
  month VARCHAR(7) NOT NULL,
  raw_referral_source TEXT,
  normalized_referral_source TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'google_forms_csv',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_historical_referrals_date ON ${tableName}(date);
CREATE INDEX IF NOT EXISTS idx_historical_referrals_month ON ${tableName}(month);
CREATE INDEX IF NOT EXISTS idx_historical_referrals_source ON ${tableName}(normalized_referral_source);
CREATE INDEX IF NOT EXISTS idx_historical_referrals_staff ON ${tableName}(staff_name);

-- Clear existing data (for re-import)
DELETE FROM ${tableName} WHERE source = 'google_forms_csv';

-- Insert historical data
INSERT INTO ${tableName} (timestamp, date, week, month, raw_referral_source, normalized_referral_source, staff_name, source)
VALUES
`;
  
  const values = data.map(record => 
    `('${record.timestamp.toISOString()}', '${record.date}', ${record.week}, '${record.month}', ${record.rawReferralSource ? `'${record.rawReferralSource.replace(/'/g, "''")}'` : 'NULL'}, '${record.normalizedReferralSource}', '${record.staffName}', '${record.source}')`
  );
  
  sql += values.join(',\n');
  sql += ';\n';
  
  return sql;
}

/**
 * Create dashboard integration function
 */
function generateDashboardFunction() {
  return `
-- Function to get combined referral data for dashboard
CREATE OR REPLACE FUNCTION get_combined_referral_data(
  start_date DATE,
  end_date DATE
) RETURNS TABLE (
  source TEXT,
  date DATE,
  count BIGINT,
  data_source TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Current booking system data
  SELECT 
    COALESCE(b.referral_source, 'Unknown') as source,
    b.date,
    COUNT(*)::BIGINT as count,
    'booking_system'::TEXT as data_source
  FROM public.bookings b
  WHERE b.date BETWEEN start_date AND end_date
    AND b.is_new_customer = TRUE
  GROUP BY b.referral_source, b.date
  
  UNION ALL
  
  -- Historical Google Forms data
  SELECT 
    hr.normalized_referral_source as source,
    hr.date,
    COUNT(*)::BIGINT as count,
    'google_forms_csv'::TEXT as data_source
  FROM historical_referrals hr
  WHERE hr.date BETWEEN start_date AND end_date
  GROUP BY hr.normalized_referral_source, hr.date
  
  ORDER BY date, source;
END;
$$ LANGUAGE plpgsql;

-- Function to get weekly referral trends
CREATE OR REPLACE FUNCTION get_weekly_referral_trends(
  weeks_back INTEGER DEFAULT 12
) RETURNS TABLE (
  week_start DATE,
  week_end DATE,
  source TEXT,
  count BIGINT,
  data_source TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT 
      (CURRENT_DATE - (weeks_back * 7))::DATE as start_date,
      CURRENT_DATE as end_date
  )
  SELECT 
    DATE_TRUNC('week', combined.date)::DATE as week_start,
    (DATE_TRUNC('week', combined.date) + INTERVAL '6 days')::DATE as week_end,
    combined.source,
    SUM(combined.count)::BIGINT as count,
    combined.data_source
  FROM (
    SELECT * FROM get_combined_referral_data(
      (SELECT start_date FROM date_range),
      (SELECT end_date FROM date_range)
    )
  ) combined
  GROUP BY DATE_TRUNC('week', combined.date), combined.source, combined.data_source
  ORDER BY week_start, combined.source;
END;
$$ LANGUAGE plpgsql;

-- Function to get monthly referral summary
CREATE OR REPLACE FUNCTION get_monthly_referral_summary(
  months_back INTEGER DEFAULT 12
) RETURNS TABLE (
  month TEXT,
  source TEXT,
  count BIGINT,
  percentage DECIMAL,
  data_source TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT 
      (DATE_TRUNC('month', CURRENT_DATE) - (months_back || ' months')::INTERVAL)::DATE as start_date,
      CURRENT_DATE as end_date
  ),
  monthly_data AS (
    SELECT 
      TO_CHAR(combined.date, 'YYYY-MM') as month,
      combined.source,
      SUM(combined.count)::BIGINT as count,
      combined.data_source
    FROM (
      SELECT * FROM get_combined_referral_data(
        (SELECT start_date FROM date_range),
        (SELECT end_date FROM date_range)
      )
    ) combined
    GROUP BY TO_CHAR(combined.date, 'YYYY-MM'), combined.source, combined.data_source
  ),
  monthly_totals AS (
    SELECT 
      month,
      SUM(count) as total_count
    FROM monthly_data
    GROUP BY month
  )
  SELECT 
    md.month,
    md.source,
    md.count,
    ROUND((md.count::DECIMAL / mt.total_count::DECIMAL) * 100, 2) as percentage,
    md.data_source
  FROM monthly_data md
  JOIN monthly_totals mt ON md.month = mt.month
  ORDER BY md.month, md.count DESC;
END;
$$ LANGUAGE plpgsql;
`;
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('Starting historical referral data import...');
    
    // Process CSV data
    const data = await processCSV();
    
    // Generate summary
    const summary = generateSummary(data);
    console.log('\nSummary:');
    console.log('Total records:', summary.totalRecords);
    console.log('Date range:', summary.dateRange);
    console.log('\nReferral sources:');
    Object.entries(summary.referralSources)
      .sort(([,a], [,b]) => b - a)
      .forEach(([source, count]) => {
        console.log(`  ${source}: ${count} (${((count / summary.totalRecords) * 100).toFixed(1)}%)`);
      });
    
    // Generate SQL files
    const importSQL = generateImportSQL(data);
    const dashboardSQL = generateDashboardFunction();
    
    // Write output files
    const outputDir = path.join(__dirname, '..', 'sql-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(outputDir, 'import-historical-referrals.sql'), importSQL);
    fs.writeFileSync(path.join(outputDir, 'dashboard-referral-functions.sql'), dashboardSQL);
    fs.writeFileSync(path.join(outputDir, 'referral-summary.json'), JSON.stringify(summary, null, 2));
    
    console.log('\nOutput files created:');
    console.log('  sql-output/import-historical-referrals.sql');
    console.log('  sql-output/dashboard-referral-functions.sql');
    console.log('  sql-output/referral-summary.json');
    
    console.log('\nNext steps:');
    console.log('1. Run the import SQL in your database');
    console.log('2. Run the dashboard function SQL');
    console.log('3. Update the sales dashboard to use the new functions');
    
  } catch (error) {
    console.error('Error processing data:', error);
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
  generateSummary,
  generateImportSQL,
  generateDashboardFunction
};