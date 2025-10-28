#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { refacSupabaseAdmin } from '../src/lib/refac-supabase';
import { openai } from '../src/lib/ai/openai-client';

const FAQ_CONVERSATION_ID = '00000000-0000-0000-0000-000000000001';

async function regenerateEmbedding(faqId: string) {
  // Get FAQ details
  const { data: faq, error } = await refacSupabaseAdmin
    .from('faq_knowledge_base')
    .select(`
      id,
      question_en,
      question_th,
      answer,
      faq_image_associations (
        curated_image_id,
        display_order
      )
    `)
    .eq('id', faqId)
    .single();

  if (error || !faq) {
    console.error('FAQ not found:', faqId);
    return;
  }

  const primaryImageId = faq.faq_image_associations?.[0]?.curated_image_id;

  // Get image description if available
  let imageDescription: string | undefined;
  if (primaryImageId) {
    const { data: image } = await refacSupabaseAdmin
      .from('line_curated_images')
      .select('description')
      .eq('id', primaryImageId)
      .single();
    imageDescription = image?.description;
  }

  // Generate English embedding
  console.log('Generating English embedding...');
  const embeddingEn = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: faq.question_en,
  });

  await refacSupabaseAdmin
    .from('message_embeddings')
    .insert({
      id: crypto.randomUUID(),
      conversation_id: FAQ_CONVERSATION_ID,
      content: faq.question_en,
      response_used: faq.answer,
      embedding: embeddingEn.data[0].embedding,
      channel_type: 'line',
      sender_type: 'customer',
      curated_image_id: primaryImageId,
      image_description: imageDescription,
      created_at: new Date().toISOString()
    });

  console.log('✅ English embedding created');

  // Generate Thai embedding if available
  if (faq.question_th) {
    console.log('Generating Thai embedding...');
    const embeddingTh = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: faq.question_th,
    });

    await refacSupabaseAdmin
      .from('message_embeddings')
      .insert({
        id: crypto.randomUUID(),
        conversation_id: FAQ_CONVERSATION_ID,
        content: faq.question_th,
        response_used: faq.answer,
        embedding: embeddingTh.data[0].embedding,
        channel_type: 'line',
        sender_type: 'customer',
        curated_image_id: primaryImageId,
        image_description: imageDescription,
        created_at: new Date().toISOString()
      });

    console.log('✅ Thai embedding created');
  }

  console.log('Done!');
}

// Run with FAQ ID
regenerateEmbedding('676f1f36-9b55-4850-ad74-9d27bb764ec9').catch(console.error);
