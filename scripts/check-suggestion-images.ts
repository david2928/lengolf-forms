#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { refacSupabaseAdmin } from '../src/lib/refac-supabase';

async function checkSuggestionImages() {
  // Check latest suggestion
  const { data: suggestions, error } = await refacSupabaseAdmin
    .from('ai_suggestions')
    .select('id, suggested_response, suggested_images, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error fetching suggestions:', error);
    return;
  }

  console.log('Latest 3 suggestions:');
  suggestions?.forEach((s: any, i: number) => {
    console.log(`\n${i + 1}. ID: ${s.id}`);
    console.log(`   Response: ${s.suggested_response?.substring(0, 50)}...`);
    console.log(`   Created: ${s.created_at}`);
    console.log(`   Has suggested_images: ${s.suggested_images ? 'YES' : 'NO'}`);
    if (s.suggested_images) {
      console.log(`   Images count: ${s.suggested_images.length}`);
      console.log(`   Images:`, JSON.stringify(s.suggested_images, null, 2));
    }
  });
}

checkSuggestionImages().catch(console.error);
