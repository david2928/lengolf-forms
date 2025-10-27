import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { openai } from '@/lib/ai/openai-client';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const maxDuration = 60; // 60 seconds for vision processing

interface DescribeImageRequest {
  imageUrl?: string;
  curatedImageId?: string;
}

interface ImageDescription {
  description: string;
  textVisible: string[];
  keyConceptsThai: string[];
  keyConceptsEnglish: string[];
  usageContext: string;
}

// Golf simulator-specific prompt for GPT-4 Vision
const VISION_PROMPT = `You are analyzing images from Lengolf, a golf simulator facility in Bangkok, Thailand.

Analyze this image and provide a detailed description that will be used for AI learning and search.

Focus on:
1. **Text visible in the image** (both Thai and English)
2. **Visual elements** (photos, diagrams, comparisons, pricing tables)
3. **Key concepts** related to golf simulators (bay types, pricing, equipment, features)
4. **Context** (when would staff send this image? what customer questions does it answer?)

Important: This description will be embedded and used for semantic search. Make it comprehensive but natural.

Return a JSON object with this structure:
{
  "description": "A comprehensive 2-3 sentence description of the image",
  "textVisible": ["exact text line 1", "exact text line 2", ...],
  "keyConceptsThai": ["หลักใจความหลัก 1", "หลักใจความหลัก 2", ...],
  "keyConceptsEnglish": ["key concept 1", "key concept 2", ...],
  "usageContext": "When to use this image (e.g., 'when customer asks about bay differences')"
}`;

/**
 * Describe image using GPT-4 Vision
 * POST /api/ai/describe-image
 */
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: DescribeImageRequest = await request.json();

    // Validate input
    if (!body.imageUrl && !body.curatedImageId) {
      return NextResponse.json({
        error: 'Either imageUrl or curatedImageId is required'
      }, { status: 400 });
    }

    let imageUrl = body.imageUrl;

    // If curated image ID provided, fetch URL from database
    if (body.curatedImageId && !imageUrl) {
      const { data: image, error } = await refacSupabaseAdmin
        .from('line_curated_images')
        .select('file_url, name, category')
        .eq('id', body.curatedImageId)
        .single();

      if (error || !image) {
        return NextResponse.json({
          error: 'Curated image not found'
        }, { status: 404 });
      }

      imageUrl = image.file_url;
    }

    if (!imageUrl) {
      return NextResponse.json({
        error: 'Image URL could not be determined'
      }, { status: 400 });
    }

    // Call GPT-4 Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // GPT-4 with vision
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: VISION_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high" // High detail for better text recognition
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.3, // Lower temperature for more consistent descriptions
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in GPT-4 Vision response');
    }

    // Parse JSON response
    const imageDescription: ImageDescription = JSON.parse(content);

    // If curated image ID was provided, optionally update the description in database
    if (body.curatedImageId) {
      // Store description in line_curated_images table for reuse
      await refacSupabaseAdmin
        .from('line_curated_images')
        .update({
          description: imageDescription.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', body.curatedImageId);
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      description: imageDescription
    });

  } catch (error: any) {
    console.error('Error describing image:', error);
    return NextResponse.json({
      error: 'Failed to describe image',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Get description for a curated image (cached if available)
 * GET /api/ai/describe-image?curatedImageId=xxx
 */
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const curatedImageId = searchParams.get('curatedImageId');

    if (!curatedImageId) {
      return NextResponse.json({
        error: 'curatedImageId parameter is required'
      }, { status: 400 });
    }

    // Check if description already exists
    const { data: image, error } = await refacSupabaseAdmin
      .from('line_curated_images')
      .select('file_url, name, category, description')
      .eq('id', curatedImageId)
      .single();

    if (error || !image) {
      return NextResponse.json({
        error: 'Curated image not found'
      }, { status: 404 });
    }

    // If description exists, return it
    if (image.description) {
      return NextResponse.json({
        success: true,
        cached: true,
        imageUrl: image.file_url,
        description: {
          description: image.description,
          // Parse structured data if available, otherwise return basic info
          textVisible: [],
          keyConceptsThai: [],
          keyConceptsEnglish: [],
          usageContext: `${image.category}: ${image.name}`
        }
      });
    }

    // No cached description - return image info but suggest POST request
    return NextResponse.json({
      success: true,
      cached: false,
      imageUrl: image.file_url,
      message: 'No cached description. Use POST to generate one.'
    });

  } catch (error: any) {
    console.error('Error fetching image description:', error);
    return NextResponse.json({
      error: 'Failed to fetch image description',
      details: error.message
    }, { status: 500 });
  }
}
