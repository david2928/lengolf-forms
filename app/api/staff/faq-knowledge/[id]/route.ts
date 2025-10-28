import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { openai } from '@/lib/ai/openai-client';

// Special conversation ID for FAQ embeddings
const FAQ_CONVERSATION_ID = '00000000-0000-0000-0000-000000000001';

/**
 * PUT /api/staff/faq-knowledge/[id]
 * Update existing FAQ and regenerate embeddings
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { category, question_en, question_th, answer, image_ids, is_active } = body;
    const { id: faqId } = await params;

    // Update FAQ entry
    const { data: faq, error: faqError } = await refacSupabaseAdmin
      .from('faq_knowledge_base')
      .update({
        category,
        question_en,
        question_th,
        answer,
        is_active,
        updated_by: session.user.email
      })
      .eq('id', faqId)
      .select()
      .single();

    if (faqError) {
      console.error('Error updating FAQ:', faqError);
      return NextResponse.json({ error: 'Failed to update FAQ' }, { status: 500 });
    }

    // Delete existing image associations
    await refacSupabaseAdmin
      .from('faq_image_associations')
      .delete()
      .eq('faq_id', faqId);

    // Create new image associations
    if (image_ids && image_ids.length > 0) {
      const imageAssociations = image_ids.map((imageId: string, index: number) => ({
        faq_id: faqId,
        curated_image_id: imageId,
        display_order: index
      }));

      await refacSupabaseAdmin
        .from('faq_image_associations')
        .insert(imageAssociations);
    }

    // Delete old embeddings for this FAQ
    await refacSupabaseAdmin
      .from('message_embeddings')
      .delete()
      .eq('conversation_id', FAQ_CONVERSATION_ID)
      .or(`content.eq.${question_en},content.eq.${question_th || ''}`);

    // Regenerate embeddings for English question
    try {
      await generateEmbedding(question_en, answer, image_ids?.[0]);
    } catch (embError) {
      console.error('Error generating English embedding:', embError);
    }

    // Regenerate embeddings for Thai question if provided
    if (question_th) {
      try {
        await generateEmbedding(question_th, answer, image_ids?.[0]);
      } catch (embError) {
        console.error('Error generating Thai embedding:', embError);
      }
    }

    return NextResponse.json({ success: true, faq });
  } catch (error: any) {
    console.error('Error in PUT /api/staff/faq-knowledge/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/staff/faq-knowledge/[id]
 * Delete FAQ and its embeddings
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: faqId } = await params;

    // Get FAQ details before deleting
    const { data: faq } = await refacSupabaseAdmin
      .from('faq_knowledge_base')
      .select('question_en, question_th')
      .eq('id', faqId)
      .single();

    // Delete FAQ (cascade will delete image associations)
    const { error: deleteError } = await refacSupabaseAdmin
      .from('faq_knowledge_base')
      .delete()
      .eq('id', faqId);

    if (deleteError) {
      console.error('Error deleting FAQ:', deleteError);
      return NextResponse.json({ error: 'Failed to delete FAQ' }, { status: 500 });
    }

    // Delete embeddings
    if (faq) {
      const deleteConditions = faq.question_th
        ? `content.eq.${faq.question_en},content.eq.${faq.question_th}`
        : `content.eq.${faq.question_en}`;

      await refacSupabaseAdmin
        .from('message_embeddings')
        .delete()
        .eq('conversation_id', FAQ_CONVERSATION_ID)
        .or(deleteConditions);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/staff/faq-knowledge/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Helper function to generate and store embeddings
 */
async function generateEmbedding(
  question: string,
  answer: string,
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
