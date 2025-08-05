import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!;
const supabaseServiceKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CSVRecord {
  Timestamp: string;
  'Customer Name': string;
  Date: string;
  'Was the customer reachable?\n(ลูกค้าสามารถติดต่อได้หรือไม่?)  ': string;
  'How did the customer respond to the call?\n(ลูกค้ามีการตอบสนองต่อการติดต่ออย่างไร?)  ': string;
  'When is the customer planning to visit LENGOLF?\n(ลูกค้ามีแผนจะมา LENGOLF เมื่อไหร่?)  ': string;
  'Does this lead require a follow-up?\n(ต้องติดตามลูกค้ารายนี้ต่อหรือไม่?)  ': string;
  'Was the lead successfully closed and booking submitted?\n(ลูกค้าปิดการขายและทำการจองสำเร็จหรือไม่?)  ': string;
  'Additional Comments (optional):\n(หมายเหตุเพิ่มเติม)  ': string;
}

function mapResponseType(response: string): string | null {
  const trimmed = response?.trim();
  switch (trimmed) {
    case 'Very interested':
      return 'very_interested';
    case 'Interested but need more time':
      return 'interested_need_time';
    case 'Not interested':
      return 'not_interested';
    case 'No clear answer':
      return 'no_clear_answer';
    default:
      return null;
  }
}

function mapVisitTimeline(timeline: string): string | null {
  const trimmed = timeline?.trim();
  switch (trimmed) {
    case 'Within 1 week':
      return 'within_1_week';
    case 'Within this month':
      return 'within_month';
    case 'No plan yet':
      return 'no_plan';
    default:
      return null;
  }
}

function parseCustomerName(customerName: string): { name: string; phone: string | null } {
  // Extract phone number from format "Name (Phone)"
  const match = customerName.match(/^(.+?)\s*\((\d+)\)$/);
  if (match) {
    return {
      name: match[1].trim(),
      phone: match[2]
    };
  }
  return {
    name: customerName.trim(),
    phone: null
  };
}

function parseDate(dateStr: string): string {
  // Handle both M/D/YYYY and M/D/YYYY formats
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    let year = parts[2];
    
    // Fix any typos in year (e.g., 2026 should be 2025)
    if (year === '2026') {
      year = '2025';
    }
    
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

async function importLeadFeedback() {
  try {
    // Read CSV file
    const csvPath = path.join(process.cwd(), 'B2C Lead Feedback (Responses) - Form Responses 1.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const records: CSVRecord[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`Found ${records.length} records to import`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of records) {
      try {
        const { name, phone } = parseCustomerName(record['Customer Name']);
        
        // Find matching lead in processed_leads
        let query = supabase
          .from('processed_leads')
          .select('id, full_name, phone_number')
          .eq('lead_type', 'b2c')
          .eq('is_likely_spam', false);

        // Try to match by phone first
        if (phone) {
          // Format phone for matching (remove country code if present)
          const phoneDigits = phone.replace(/^\d{2}/, ''); // Remove country code
          query = query.or(`phone_number.like.%${phoneDigits},phone_number.like.%${phone}`);
        } else {
          // Fallback to name matching
          query = query.ilike('full_name', `%${name}%`);
        }

        const { data: leads, error: leadError } = await query;

        if (leadError) {
          console.error(`Error finding lead for ${name}:`, leadError);
          errors++;
          continue;
        }

        if (!leads || leads.length === 0) {
          console.warn(`No matching lead found for: ${name} (${phone || 'no phone'})`);
          skipped++;
          continue;
        }

        // Use the first match
        const lead = leads[0];
        
        // Parse feedback data
        const callDate = parseDate(record.Date);
        const wasReachable = record['Was the customer reachable?\n(ลูกค้าสามารถติดต่อได้หรือไม่?)  ']?.trim() === 'Yes';
        const responseType = mapResponseType(record['How did the customer respond to the call?\n(ลูกค้ามีการตอบสนองต่อการติดต่ออย่างไร?)  ']);
        const visitTimeline = mapVisitTimeline(record['When is the customer planning to visit LENGOLF?\n(ลูกค้ามีแผนจะมา LENGOLF เมื่อไหร่?)  ']);
        const requiresFollowup = record['Does this lead require a follow-up?\n(ต้องติดตามลูกค้ารายนี้ต่อหรือไม่?)  ']?.trim() === 'Yes';
        const bookingSubmitted = record['Was the lead successfully closed and booking submitted?\n(ลูกค้าปิดการขายและทำการจองสำเร็จหรือไม่?)  ']?.trim() === 'Yes';
        const comments = record['Additional Comments (optional):\n(หมายเหตุเพิ่มเติม)  ']?.trim() || null;

        // Check if feedback already exists for this lead and date
        const { data: existingFeedback } = await supabase
          .from('lead_feedback')
          .select('id')
          .eq('lead_id', lead.id)
          .eq('call_date', callDate)
          .single();

        if (existingFeedback) {
          console.log(`Feedback already exists for ${name} on ${callDate}, skipping`);
          skipped++;
          continue;
        }

        // Insert feedback
        const { error: insertError } = await supabase
          .from('lead_feedback')
          .insert({
            lead_id: lead.id,
            call_date: callDate,
            was_reachable: wasReachable,
            response_type: responseType,
            visit_timeline: visitTimeline,
            requires_followup: requiresFollowup,
            booking_submitted: bookingSubmitted,
            comments: comments
          });

        if (insertError) {
          console.error(`Error inserting feedback for ${name}:`, insertError);
          errors++;
        } else {
          console.log(`✓ Imported feedback for ${name} (${callDate})`);
          imported++;
        }

      } catch (err) {
        console.error(`Error processing record:`, err);
        errors++;
      }
    }

    console.log('\n=== Import Summary ===');
    console.log(`Total records: ${records.length}`);
    console.log(`Successfully imported: ${imported}`);
    console.log(`Skipped (no match or duplicate): ${skipped}`);
    console.log(`Errors: ${errors}`);

  } catch (error) {
    console.error('Fatal error during import:', error);
    process.exit(1);
  }
}

// Run the import
importLeadFeedback();