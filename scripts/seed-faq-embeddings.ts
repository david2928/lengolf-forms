#!/usr/bin/env tsx

// CRITICAL: Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

/**
 * Seed FAQ embeddings with image associations
 *
 * This script creates embeddings for common customer questions and associates them
 * with relevant curated images. This improves AI suggestions by providing training
 * data for image-based responses.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-faq-embeddings.ts
 */

import { refacSupabaseAdmin } from '../src/lib/refac-supabase';
import { openai } from '../src/lib/ai/openai-client';

interface FAQ {
  question: string;
  questionThai?: string;
  answer: string;
  imageId: string;
  imageName: string;
  category: string;
}

// FAQ data mapped to actual curated images
const FAQS: FAQ[] = [
  // Bay-related questions
  {
    question: "What is social bay?",
    questionThai: "Social Bay คืออะไร",
    answer: "Social Bay รองรับผู้เล่นสูงสุด 5 ท่าน เหมาะสำหรับมาเล่นกับเพื่อนๆ มีบรรยากาศสนุกสนาน",
    imageId: "dbb35bdd-b23f-4b8b-b77c-24334649e9b1",
    imageName: "Social Bay 1",
    category: "Bay Types"
  },
  {
    question: "What is AI bay?",
    questionThai: "AI Bay คืออะไร",
    answer: "AI Bay เป็นห้องที่มีระบบวิเคราะห์การตี มีเทคโนโลยี AI ช่วยวิเคราะห์ท่าทาง และให้คำแนะนำ เหมาะสำหรับผู้ที่ต้องการพัฒนาฝีมือ",
    imageId: "60082aef-5155-420d-afdd-e180728dd4ba",
    imageName: "AI Bay Unlimited Soft drinks",
    category: "Bay Types"
  },

  // Pricing questions
  {
    question: "How much does it cost?",
    questionThai: "ราคาเท่าไหร่",
    answer: "ราคาขึ้นอยู่กับประเภทห้องและเวลา คุณสามารถดูรายละเอียดราคาได้จากรูปภาพครับ",
    imageId: "53d519c6-4937-483e-9875-ca6f7d5c7d72",
    imageName: "Bay Rate",
    category: "Pricing"
  },
  {
    question: "Do you have monthly packages?",
    questionThai: "มีแพ็คเกจรายเดือนไหม",
    answer: "มีครับ เรามีแพ็คเกจรายเดือนหลายแบบให้เลือก สามารถดูรายละเอียดได้จากรูปภาพนี้",
    imageId: "589e2ac3-a09d-4857-92d4-cf7bcf90b079",
    imageName: "Monthly Packages",
    category: "Packages"
  },
  {
    question: "Can I rent premium clubs?",
    questionThai: "เช่าไม้กอล์ฟพรีเมี่ยมได้ไหม",
    answer: "ได้ครับ เรามีบริการเช่าไม้กอล์ฟคุณภาพสูง รายละเอียดราคาและรุ่นที่มีให้บริการอยู่ในรูปนี้",
    imageId: "ec3b5946-408c-4ec9-bd5c-11752498dffd",
    imageName: "Premium Club Rental",
    category: "Services"
  },

  // Coaching questions
  {
    question: "Do you have golf coaches?",
    questionThai: "มีโปรสอนไหม",
    answer: "มีครับ เรามีโปรที่มีประสบการณ์หลายท่าน สามารถเลือกโปรที่เหมาะกับคุณได้",
    imageId: "4ff2e288-9785-410a-8bda-3ae2668f7258",
    imageName: "Pro Ratchavin",
    category: "Coaching"
  },
  {
    question: "What coaching packages do you have?",
    questionThai: "มีคอร์สเรียนอะไรบ้าง",
    answer: "เรามีแพ็คเกจเรียนหลายแบบ ตั้งแต่แบบรายครั้งไปจนถึงแบบแพ็คเกจหลายครั้ง รายละเอียดอยู่ในรูปนี้",
    imageId: "6581910a-6981-4b79-a660-ddecc14bdb83",
    imageName: "Lesson Packages",
    category: "Coaching"
  },

  // Promotions
  {
    question: "Do you have any promotions?",
    questionThai: "มีโปรโมชั่นอะไรบ้างไหม",
    answer: "มีครับ ตอนนี้มีโปรโมชั่น Buy 1 Get 1 ให้ลูกค้าทุกท่าน สามารถดูรายละเอียดได้จากรูปนี้",
    imageId: "1c0cd3f4-b456-4e2c-a28c-0a85dc1bd2c1",
    imageName: "Buy 1 Get 1",
    category: "Promotions"
  },

  // Location/Facility
  {
    question: "What does the facility look like?",
    questionThai: "สถานที่เป็นยังไงบ้าง",
    answer: "สถานที่ของเราทันสมัย สะอาด และมีบรรยากาศดี คุณสามารถดูภาพบรรยากาศภายในได้จากรูปนี้",
    imageId: "c110e5c8-e494-4bc7-8e0e-0aa8276d6f58",
    imageName: "Front Door Area",
    category: "Facility"
  }
];

// Use a consistent fake conversation ID for all FAQ embeddings
const FAQ_CONVERSATION_ID = '00000000-0000-0000-0000-000000000001';

async function createEmbedding(text: string, imageId: string, imageDescription: string, answer: string): Promise<void> {
  // Generate embedding using OpenAI
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  const embedding = embeddingResponse.data[0].embedding;

  // Insert directly into database
  const { error } = await refacSupabaseAdmin
    .from('message_embeddings')
    .insert({
      id: crypto.randomUUID(),
      conversation_id: FAQ_CONVERSATION_ID,
      content: text,
      response_used: answer,
      embedding: embedding,
      channel_type: 'line',
      sender_type: 'customer',
      curated_image_id: imageId,
      image_description: imageDescription,
      created_at: new Date().toISOString()
    });

  if (error) {
    throw new Error(`Database insert failed: ${error.message}`);
  }
}

async function main() {
  console.log('🌱 Seeding FAQ embeddings with image associations...\n');

  let succeeded = 0;
  let failed = 0;
  const errors: Array<{ question: string; error: string }> = [];

  for (let i = 0; i < FAQS.length; i++) {
    const faq = FAQS[i];
    console.log(`[${i + 1}/${FAQS.length}] Processing: ${faq.question}`);
    console.log(`   Thai: ${faq.questionThai || 'N/A'}`);
    console.log(`   Image: ${faq.imageName}`);
    console.log(`   Category: ${faq.category}`);

    try {
      // Verify image exists and has description
      const { data: image, error: imageError } = await refacSupabaseAdmin
        .from('line_curated_images')
        .select('id, name, description')
        .eq('id', faq.imageId)
        .single();

      if (imageError || !image) {
        throw new Error(`Image not found: ${faq.imageName} (${faq.imageId})`);
      }

      if (!image.description) {
        throw new Error(`Image "${image.name}" has no description. Run describe-all-curated-images.ts first.`);
      }

      // Create embedding for English question
      await createEmbedding(faq.question, faq.imageId, image.description, faq.answer);

      // If Thai question exists, create another embedding
      if (faq.questionThai) {
        await createEmbedding(faq.questionThai, faq.imageId, image.description, faq.answer);
      }

      succeeded++;
      console.log(`   ✅ Success\n`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error: any) {
      failed++;
      const errorMsg = error.message || 'Unknown error';
      errors.push({ question: faq.question, error: errorMsg });
      console.log(`   ❌ Failed: ${errorMsg}\n`);
    }
  }

  // Summary
  console.log('========================================');
  console.log('📊 SUMMARY');
  console.log('========================================');
  console.log(`Total FAQs: ${FAQS.length}`);
  console.log(`✅ Succeeded: ${succeeded}`);
  console.log(`❌ Failed: ${failed}`);

  if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    errors.forEach(({ question, error }) => {
      console.log(`   - ${question}: ${error}`);
    });
  }

  console.log('\n✨ Done! FAQ embeddings seeded with image associations.');
}

// Run the script
main().catch(console.error);
