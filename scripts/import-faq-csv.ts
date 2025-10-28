#!/usr/bin/env tsx

// CRITICAL: Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

/**
 * Import FAQs from CSV file
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/import-faq-csv.ts
 *   npx tsx --env-file=.env.local scripts/import-faq-csv.ts --dry-run
 */

import { readFileSync } from 'fs';
import { refacSupabaseAdmin } from '../src/lib/refac-supabase';
import { openai } from '../src/lib/ai/openai-client';

const isDryRun = process.argv.includes('--dry-run');
const FAQ_CONVERSATION_ID = '00000000-0000-0000-0000-000000000001';

interface CSVRow {
  category: string;
  question_en: string;
  question_th: string;
  answer: string;
  image_names: string;
}

/**
 * Parse CSV file
 */
function parseCSV(filePath: string): CSVRow[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= headers.length) {
      rows.push({
        category: values[0],
        question_en: values[1],
        question_th: values[2],
        answer: values[3],
        image_names: values[4] || ''
      });
    }
  }

  return rows;
}

/**
 * Parse CSV line handling quoted values with commas
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/**
 * Find image IDs by names
 */
async function findImageIds(imageNames: string): Promise<string[]> {
  if (!imageNames) return [];

  const names = imageNames.split(',').map(n => n.trim()).filter(Boolean);
  const ids: string[] = [];

  for (const name of names) {
    const { data } = await refacSupabaseAdmin
      .from('line_curated_images')
      .select('id')
      .ilike('name', name)
      .limit(1)
      .single();

    if (data) {
      ids.push(data.id);
    } else {
      console.warn(`⚠️  Image not found: "${name}"`);
    }
  }

  return ids;
}

/**
 * Generate and store embedding
 */
async function generateEmbedding(
  question: string,
  answer: string,
  primaryImageId?: string
) {
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });

  const embedding = embeddingResponse.data[0].embedding;

  let imageDescription: string | undefined;
  if (primaryImageId) {
    const { data: image } = await refacSupabaseAdmin
      .from('line_curated_images')
      .select('description')
      .eq('id', primaryImageId)
      .single();

    imageDescription = image?.description;
  }

  await refacSupabaseAdmin
    .from('message_embeddings')
    .insert({
      id: crypto.randomUUID(),
      conversation_id: FAQ_CONVERSATION_ID,
      content: question,
      response_used: answer,
      embedding: embedding,
      channel_type: 'line',
      sender_type: 'customer',
      curated_image_id: primaryImageId,
      image_description: imageDescription,
      created_at: new Date().toISOString()
    });
}

/**
 * Main import function
 */
async function main() {
  console.log('📥 Importing FAQs from CSV...\\n');

  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE: No changes will be applied\\n');
  }

  const csvPath = path.join(process.cwd(), 'scripts', 'faq-embeddings.csv');

  try {
    const rows = parseCSV(csvPath);
    console.log(`Found ${rows.length} FAQs in CSV\\n`);

    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ question: string; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      console.log(`[${i + 1}/${rows.length}] Processing: ${row.question_en.substring(0, 50)}...`);

      try {
        // Find image IDs
        const imageIds = await findImageIds(row.image_names);
        console.log(`   Images: ${imageIds.length} found`);

        if (!isDryRun) {
          // Create FAQ
          const { data: faq, error: faqError } = await refacSupabaseAdmin
            .from('faq_knowledge_base')
            .insert({
              category: row.category,
              question_en: row.question_en,
              question_th: row.question_th || null,
              answer: row.answer,
              is_active: true,
              created_by: 'CSV Import',
              updated_by: 'CSV Import'
            })
            .select()
            .single();

          if (faqError) {
            throw new Error(`Failed to insert FAQ: ${faqError.message}`);
          }

          // Associate images
          if (imageIds.length > 0) {
            const associations = imageIds.map((imageId, index) => ({
              faq_id: faq.id,
              curated_image_id: imageId,
              display_order: index
            }));

            await refacSupabaseAdmin
              .from('faq_image_associations')
              .insert(associations);
          }

          // Generate embedding for English question
          await generateEmbedding(row.question_en, row.answer, imageIds[0]);

          // Generate embedding for Thai question if provided
          if (row.question_th) {
            await generateEmbedding(row.question_th, row.answer, imageIds[0]);
          }
        }

        succeeded++;
        console.log(`   ✅ ${isDryRun ? 'Would import' : 'Imported'}\\n`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error: any) {
        failed++;
        const errorMsg = error.message || 'Unknown error';
        errors.push({ question: row.question_en, error: errorMsg });
        console.log(`   ❌ Failed: ${errorMsg}\\n`);
      }
    }

    // Summary
    console.log('========================================');
    console.log('📊 SUMMARY');
    console.log('========================================');
    console.log(`Total FAQs: ${rows.length}`);
    console.log(`✅ ${isDryRun ? 'Would import' : 'Imported'}: ${succeeded}`);
    console.log(`❌ Failed: ${failed}`);

    if (errors.length > 0) {
      console.log('\\n❌ ERRORS:');
      errors.forEach(({ question, error }) => {
        console.log(`   - ${question.substring(0, 50)}...: ${error}`);
      });
    }

    if (isDryRun) {
      console.log('\\n💡 Run without --dry-run to apply changes');
    } else {
      console.log('\\n✨ Done! FAQs imported successfully.');
    }

  } catch (error: any) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
