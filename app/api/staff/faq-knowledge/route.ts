import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { openai } from '@/lib/ai/openai-client';

// Special conversation ID for FAQ embeddings
const FAQ_CONVERSATION_ID = '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/staff/faq-knowledge
 * Fetch all FAQs with their associated images
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: faqs, error } = await refacSupabaseAdmin
      .from('faq_knowledge_base')
      .select(`
        *,
        faq_image_associations (
          curated_image_id,
          display_order,
          line_curated_images (
            id,
            name,
            file_url,
            category
          )
        )
      `)
      .order('category', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching FAQs:', error);
      return NextResponse.json({ error: 'Failed to fetch FAQs' }, { status: 500 });
    }

    return NextResponse.json({ success: true, faqs });
  } catch (error: any) {
    console.error('Error in GET /api/staff/faq-knowledge:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/staff/faq-knowledge
 * Create new FAQ and generate embeddings
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { category, question_en, question_th, answer, image_ids } = body;

    // Validate required fields
    if (!category || !question_en || !answer) {
      return NextResponse.json(
        { error: 'Missing required fields: category, question_en, answer' },
        { status: 400 }
      );
    }

    // Create FAQ entry
    const { data: faq, error: faqError } = await refacSupabaseAdmin
      .from('faq_knowledge_base')
      .insert({
        category,
        question_en,
        question_th,
        answer,
        created_by: session.user.email,
        updated_by: session.user.email
      })
      .select()
      .single();

    if (faqError) {
      console.error('Error creating FAQ:', faqError);
      return NextResponse.json({ error: 'Failed to create FAQ' }, { status: 500 });
    }

    // Associate images if provided
    if (image_ids && image_ids.length > 0) {
      const imageAssociations = image_ids.map((imageId: string, index: number) => ({
        faq_id: faq.id,
        curated_image_id: imageId,
        display_order: index
      }));

      const { error: imageError } = await refacSupabaseAdmin
        .from('faq_image_associations')
        .insert(imageAssociations);

      if (imageError) {
        console.error('Error associating images:', imageError);
        // Don't fail the whole operation, just log the error
      }
    }

    // Generate embeddings for English question
    try {
      await generateEmbedding(question_en, answer, faq.id, image_ids?.[0]);
    } catch (embError) {
      console.error('Error generating English embedding:', embError);
    }

    // Generate embeddings for Thai question if provided
    if (question_th) {
      try {
        await generateEmbedding(question_th, answer, faq.id, image_ids?.[0]);
      } catch (embError) {
        console.error('Error generating Thai embedding:', embError);
      }
    }

    return NextResponse.json({ success: true, faq });
  } catch (error: any) {
    console.error('Error in POST /api/staff/faq-knowledge:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Helper function to generate and store embeddings
 */
async function generateEmbedding(
  question: string,
  answer: string,
  faqId: string,
  primaryImageId?: string
) {
  // Generate embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });

  const embedding = embeddingResponse.data[0].embedding;

  // Get image description if image provided
  let imageDescription: string | undefined;
  if (primaryImageId) {
    const { data: image } = await refacSupabaseAdmin
      .from('line_curated_images')
      .select('description')
      .eq('id', primaryImageId)
      .single();

    imageDescription = image?.description;
  }

  // Insert embedding
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
