import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

interface CustomerData {
  store: string;
  customer_name: string;
  contact_number: string | null;
  address: string | null;
  email: string | null;
  date_of_birth: string | null;
  date_joined: string | null;
  available_credit: number;
  available_point: number;
  source: string | null;
  sms_pdpa: boolean | null;
  email_pdpa: boolean | null;
  batch_id: string;
  update_time: string;
}

interface ApiResponse {
  status: string;
  batch_id?: string;
  records_processed?: number;
  timestamp: string;
  message?: string;
}

// Column name mapping from CSV to database
const COLUMN_MAP: Record<string, string> = {
  'Store': 'store',
  'Customer': 'customer_name',
  'Contact Number': 'contact_number',
  'Address': 'address',
  'Email': 'email',
  'Date of Birth': 'date_of_birth',
  'Date Joined': 'date_joined',
  'Available Credit': 'available_credit',
  'Available Point': 'available_point',
  'Source': 'source',
  'SMS PDPA': 'sms_pdpa',
  'Email PDPA': 'email_pdpa'
};

function parseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr || dateStr === '') return null;
  try {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch {
    return null;
  }
}

function cleanNumeric(value: string | number | null | undefined): number {
  if (!value || value === '') return 0;
  if (typeof value === 'number') return value;
  try {
    return parseFloat(value.toString().replace(/,/g, ''));
  } catch {
    return 0;
  }
}

function cleanPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone || phone === '') return null;
  
  // Remove all characters except digits and plus sign
  let clean = phone.toString().replace(/[^\d+]/g, '');
  
  // Handle international format
  if (clean.startsWith('+66')) {  // Thailand
    clean = '0' + clean.substring(3);
  } else if (clean.startsWith('66')) {  // Thailand without plus
    clean = '0' + clean.substring(2);
  }
  
  return clean.length === 0 ? null : clean;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function processCsvData(csvContent: string): CustomerData[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = parseCsvLine(lines[0]);
  const customers: CustomerData[] = [];
  
  const batchId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, -3);
  const updateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length !== headers.length) continue;
    
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    // Clean phone number first
    const cleanedPhone = cleanPhoneNumber(row['Contact Number']);
    
    const customer: CustomerData = {
      store: row['Store'] || '',
      customer_name: row['Customer'] || '',
      contact_number: cleanedPhone,
      address: row['Address'] || null,
      email: row['Email'] || null,
      date_of_birth: parseDate(row['Date of Birth']),
      date_joined: parseDate(row['Date Joined']),
      available_credit: cleanNumeric(row['Available Credit']),
      available_point: cleanNumeric(row['Available Point']),
      source: row['Source'] || null,
      sms_pdpa: row['SMS PDPA'] === 'Yes' ? true : row['SMS PDPA'] === 'No' ? false : null,
      email_pdpa: row['Email PDPA'] === 'Yes' ? true : row['Email PDPA'] === 'No' ? false : null,
      batch_id: batchId,
      update_time: updateTime
    };
    
    customers.push(customer);
  }
  
  return customers;
}

async function downloadCustomerData(): Promise<string> {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
    });
    
    const page = await context.newPage();
    
    // Get credentials from environment variables
    const loginEncoded = process.env.QASHIER_LOGIN;
    const passwordEncoded = process.env.QASHIER_PASSWORD;
    
    if (!loginEncoded || !passwordEncoded) {
      throw new Error('Missing QASHIER_LOGIN or QASHIER_PASSWORD environment variables');
    }
    
    const login = Buffer.from(loginEncoded, 'base64').toString('utf-8');
    const password = Buffer.from(passwordEncoded, 'base64').toString('utf-8');
    
    console.log('Navigating to Qashier login page...');
    
    // Navigate to login page
    await page.goto('https://hq.qashier.com/#/login?redirect=/customer-management', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    // Wait for login form
    await page.waitForSelector('label:has-text("Username")', { timeout: 10000 });
    
    // Fill credentials
    await page.getByLabel('Username').click();
    await page.getByLabel('Username').fill(login);
    await page.getByLabel('Username').press('Tab');
    await page.getByLabel('Password').fill(password);
    
    console.log('Logging in...');
    
    // Login
    await Promise.all([
      page.waitForNavigation({ timeout: 60000 }),
      page.getByRole('button', { name: 'Login' }).click()
    ]);
    
    // Wait for export button
    await page.waitForSelector('button:has-text("Export")', { timeout: 15000 });
    
    console.log('Login successful, waiting for data to load...');
    
    // Wait for data to load
    await page.waitForTimeout(10000);
    
    // Start download
    console.log('Starting export...');
    await page.locator('button:has-text("Export")').click();
    await page.waitForSelector('button:has-text("Confirm")', { timeout: 10000 });
    
    // Get the download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button:has-text("Confirm")').click()
    ]);
    
    console.log('Download completed, reading file...');
    
    // Read the downloaded file content
    const buffer = await download.createReadStream();
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      buffer.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
      buffer.on('error', reject);
      buffer.on('end', () => {
        const csvContent = Buffer.concat(chunks).toString('utf-8');
        resolve(csvContent);
      });
    });
    
  } finally {
    await browser.close();
  }
}

async function pushToSupabase(customers: CustomerData[]): Promise<string> {
  console.log(`Processing ${customers.length} customer records...`);
  
  // Clear existing data
  console.log('Clearing existing customer data...');
  await refacSupabaseAdmin
    .schema('backoffice')
    .from('customers')
    .delete()
    .neq('id', 0);
  
  console.log('Inserting new customer data...');
  
  // Insert new data in batches
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);
    
    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('customers')
      .insert(batch);
    
    if (error) {
      console.error('Error inserting batch:', error);
      throw new Error(`Failed to insert batch: ${error.message}`);
    }
    
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${customers.length} records`);
  }
  
  return customers[0]?.batch_id || new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, -3);
}

export async function POST(): Promise<NextResponse<ApiResponse>> {
  console.log('Starting customer data sync...');
  
  try {
    // Step 1: Download data from Qashier
    console.log('Step 1: Downloading data from Qashier...');
    const csvContent = await downloadCustomerData();
    
    // Step 2: Process the CSV data
    console.log('Step 2: Processing CSV data...');
    const customers = processCsvData(csvContent);
    
    if (customers.length === 0) {
      throw new Error('No customer data found in downloaded file');
    }
    
    // Step 3: Push to Supabase
    console.log('Step 3: Updating database...');
    const batchId = await pushToSupabase(customers);
    
    const response: ApiResponse = {
      status: 'success',
      batch_id: batchId,
      records_processed: customers.length,
      timestamp: new Date().toISOString()
    };
    
    console.log('Customer sync completed successfully:', response);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Customer sync failed:', error);
    
    const response: ApiResponse = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(response, { status: 500 });
  }
} 