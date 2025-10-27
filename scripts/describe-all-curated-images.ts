#!/usr/bin/env tsx
/**
 * Batch script to describe ALL curated images using GPT-4 Vision
 *
 * This script:
 * 1. Fetches all curated images from line_curated_images table
 * 2. For each image without a description, calls GPT-4 Vision API
 * 3. Stores the generated description in the database
 * 4. Provides progress updates and statistics
 *
 * Usage:
 *   npx tsx scripts/describe-all-curated-images.ts
 *   npx tsx scripts/describe-all-curated-images.ts --force  (re-describe all, even if description exists)
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { refacSupabaseAdmin } from '../src/lib/refac-supabase';

// Check if force flag is provided
const forceRegenerate = process.argv.includes('--force');

interface CuratedImage {
  id: string;
  name: string;
  category: string;
  file_url: string;
  description: string | null;
  usage_count: number;
}

async function describeImage(imageUrl: string): Promise<string> {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const response = await fetch(`${baseUrl}/api/ai/describe-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // In production, you'd need proper authentication
      // For now, this script should be run by authenticated admin
    },
    body: JSON.stringify({ imageUrl })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to describe image: ${error}`);
  }

  const result = await response.json();
  return result.description.description; // The main description text
}

async function main() {
  console.log('🖼️  Describing ALL curated images...\n');

  if (forceRegenerate) {
    console.log('⚠️  FORCE MODE: Will regenerate descriptions for all images\n');
  }

  try {
    // Fetch all curated images
    const { data: images, error } = await refacSupabaseAdmin
      .from('line_curated_images')
      .select('id, name, category, file_url, description, usage_count')
      .order('usage_count', { ascending: false }); // Process most-used images first

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!images || images.length === 0) {
      console.log('No curated images found in database.');
      return;
    }

    console.log(`Found ${images.length} curated images total\n`);

    // Filter images that need descriptions
    const imagesToProcess = forceRegenerate
      ? images
      : images.filter(img => !img.description);

    console.log(`${imagesToProcess.length} images need descriptions\n`);

    if (imagesToProcess.length === 0) {
      console.log('✅ All images already have descriptions!');
      console.log('Use --force flag to regenerate all descriptions.');
      return;
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ title: string; error: string }> = [];

    // Process each image
    for (const image of imagesToProcess) {
      processed++;
      console.log(`[${processed}/${imagesToProcess.length}] Processing: ${image.name}`);
      console.log(`   Category: ${image.category}`);
      console.log(`   Usage count: ${image.usage_count}`);

      try {
        // Call the describe-image API endpoint
        const description = await describeImage(image.file_url);

        // Store description in database
        const { error: updateError } = await refacSupabaseAdmin
          .from('line_curated_images')
          .update({
            description: description,
            updated_at: new Date().toISOString()
          })
          .eq('id', image.id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        succeeded++;
        console.log(`   ✅ Success: ${description.substring(0, 100)}...`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

      } catch (error: any) {
        failed++;
        const errorMsg = error.message || 'Unknown error';
        errors.push({ title: image.name, error: errorMsg });
        console.log(`   ❌ Failed: ${errorMsg}`);
      }

      console.log('');
    }

    // Summary
    console.log('\n========================================');
    console.log('📊 SUMMARY');
    console.log('========================================');
    console.log(`Total images in library: ${images.length}`);
    console.log(`Images processed: ${processed}`);
    console.log(`✅ Succeeded: ${succeeded}`);
    console.log(`❌ Failed: ${failed}`);

    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach(({ title, error }) => {
        console.log(`   - ${title}: ${error}`);
      });
    }

    console.log('\n✨ Done! All curated images now have descriptions for AI embeddings.');

  } catch (error: any) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
