// Script to import historical cash check data from CSV
const fs = require('fs');
const path = require('path');

// Read and parse the CSV file
const csvPath = path.join(__dirname, '..', 'Cash (Responses) - Form Responses 1.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV content
const lines = csvContent.split('\n');
const headers = lines[0].split(',');

// Find column indices
const timestampIndex = headers.findIndex(h => h.includes('Timestamp'));
const staffIndex = headers.findIndex(h => h.includes('Who are you'));
const amountIndex = headers.findIndex(h => h.includes('Currrent Cash Amount'));

console.log('Column indices:', { timestampIndex, staffIndex, amountIndex });

// Process data rows
const records = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const columns = line.split(',');
  if (columns.length < 3) continue;
  
  const timestamp = columns[timestampIndex]?.trim();
  const staff = columns[staffIndex]?.trim();
  const amount = parseFloat(columns[amountIndex]?.trim());
  
  if (timestamp && staff && !isNaN(amount)) {
    // Convert timestamp format from M/D/YYYY HH:MM:SS to ISO format
    const [datePart, timePart] = timestamp.split(' ');
    const [month, day, year] = datePart.split('/');
    const isoTimestamp = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${timePart}`).toISOString();
    
    records.push({
      timestamp: isoTimestamp,
      staff,
      amount
    });
  }
}

console.log(`Parsed ${records.length} records`);
console.log('Sample records:', records.slice(0, 5));

// Generate SQL insert statements
const sqlStatements = records.map(record => 
  `INSERT INTO public.cash_checks (timestamp, staff, amount) VALUES ('${record.timestamp}', '${record.staff}', ${record.amount});`
);

// Write SQL file
const sqlContent = sqlStatements.join('\n');
fs.writeFileSync(path.join(__dirname, 'import-cash-data.sql'), sqlContent);

console.log('SQL file generated: scripts/import-cash-data.sql');
console.log(`Generated ${sqlStatements.length} INSERT statements`);