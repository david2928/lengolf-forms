#!/usr/bin/env tsx

// CRITICAL: Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

/**
 * Fix historical "You sent a photo" embeddings
 *
 * This script finds all message embeddings where the response_used is
 * "You sent a photo" and updates them with proper image information by
 * looking up the actual image that was sent in the LINE conversation.
 *
 * Usage:
 *   npx tsx scripts/fix-photo-embeddings.ts
 *   npx tsx scripts/fix-photo-embeddings.ts --dry-run  (preview changes without applying)
 */

import { refacSupabaseAdmin } from '../src/lib/refac-supabase';

const isDryRun = process.argv.includes('--dry-run');

interface BadEmbedding {
  id: string;
  conversation_id: string;
  content: string;
  response_used: string;
  created_at: string;
}

interface LineMessageWithImage {
  id: string;
  conversation_id: string;
  content: string | null;
  sender_type: string;
  created_at: string;
  line_message_curated_images: Array<{
    curated_image_id: string;
  }>;
}

async function main() {
  console.log('🔧 Fixing historical "You sent a photo" embeddings...\n');

  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE: No changes will be applied\n');
  }

  try {
    // Find all embeddings with "You sent a photo"
    const { data: badEmbeddings, error: fetchError } = await refacSupabaseAdmin
      .from('message_embeddings')
      .select('id, conversation_id, content, response_used, created_at')
      .eq('response_used', 'You sent a photo')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch embeddings: ${fetchError.message}`);
    }

    if (!badEmbeddings || badEmbeddings.length === 0) {
      console.log('✅ No "You sent a photo" embeddings found. All clean!');
      return;
    }

    console.log(`Found ${badEmbeddings.length} embeddings to fix\n`);

    let succeeded = 0;
    let failed = 0;
    let noImageFound = 0;
    const errors: Array<{ embeddingId: string; error: string }> = [];

    for (let i = 0; i < badEmbeddings.length; i++) {
      const embedding = badEmbeddings[i] as BadEmbedding;
      console.log(`[${i + 1}/${badEmbeddings.length}] Processing embedding ${embedding.id.substring(0, 8)}...`);
      console.log(`   Conversation: ${embedding.conversation_id}`);
      console.log(`   Customer question: "${embedding.content.substring(0, 60)}..."`);

      try {
        // Find the LINE message that was sent as response
        // Look for staff messages with images sent after this embedding was created
        const { data: lineMessages, error: messageError } = await refacSupabaseAdmin
          .from('line_messages')
          .select(`
            id,
            conversation_id,
            content,
            sender_type,
            created_at,
            line_message_curated_images (
              curated_image_id
            )
          `)
          .eq('conversation_id', embedding.conversation_id)
          .eq('sender_type', 'staff')
          .gte('created_at', embedding.created_at)
          .order('created_at', { ascending: true })
          .limit(10); // Get first 10 staff messages after embedding

        if (messageError) {
          throw new Error(`Failed to fetch LINE messages: ${messageError.message}`);
        }

        // Find first message with curated images
        const messageWithImage = (lineMessages as LineMessageWithImage[] || []).find(
          msg => msg.line_message_curated_images && msg.line_message_curated_images.length > 0
        );

        if (!messageWithImage || !messageWithImage.line_message_curated_images.length) {
          noImageFound++;
          console.log(`   ⚠️  No image found in conversation after this embedding\n`);
          continue;
        }

        const imageId = messageWithImage.line_message_curated_images[0].curated_image_id;

        // Fetch image details
        const { data: image, error: imageError } = await refacSupabaseAdmin
          .from('line_curated_images')
          .select('id, name, description')
          .eq('id', imageId)
          .single();

        if (imageError || !image) {
          throw new Error(`Image not found: ${imageId}`);
        }

        if (!image.description) {
          throw new Error(`Image "${image.name}" has no description`);
        }

        console.log(`   Found image: ${image.name}`);
        console.log(`   Description: ${image.description.substring(0, 60)}...`);

        // Update the embedding
        if (!isDryRun) {
          const { error: updateError } = await refacSupabaseAdmin
            .from('message_embeddings')
            .update({
              curated_image_id: imageId,
              image_description: image.description,
              response_used: image.description // Replace "You sent a photo" with description
            })
            .eq('id', embedding.id);

          if (updateError) {
            throw new Error(`Failed to update embedding: ${updateError.message}`);
          }
        }

        succeeded++;
        console.log(`   ✅ ${isDryRun ? 'Would update' : 'Updated'}\n`);

      } catch (error: any) {
        failed++;
        const errorMsg = error.message || 'Unknown error';
        errors.push({ embeddingId: embedding.id, error: errorMsg });
        console.log(`   ❌ Failed: ${errorMsg}\n`);
      }
    }

    // Summary
    console.log('========================================');
    console.log('📊 SUMMARY');
    console.log('========================================');
    console.log(`Total embeddings found: ${badEmbeddings.length}`);
    console.log(`✅ ${isDryRun ? 'Would fix' : 'Fixed'}: ${succeeded}`);
    console.log(`⚠️  No image found: ${noImageFound}`);
    console.log(`❌ Failed: ${failed}`);

    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach(({ embeddingId, error }) => {
        console.log(`   - ${embeddingId.substring(0, 8)}: ${error}`);
      });
    }

    if (isDryRun) {
      console.log('\n💡 Run without --dry-run to apply changes');
    } else {
      console.log('\n✨ Done! Historical embeddings fixed with proper image information.');
    }

  } catch (error: any) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
