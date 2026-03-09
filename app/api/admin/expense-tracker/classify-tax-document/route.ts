import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { openai } from '@/lib/ai/openai-client';

export const maxDuration = 30;

const ALLOWED_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-5.2', 'gpt-5-mini'] as const;
const DEFAULT_MODEL = 'gpt-5-mini';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const SYSTEM_PROMPT = `You are a Thai tax document classifier. Your job is to identify the type of tax filing document uploaded.

Thai Revenue Department (กรมสรรพากร) forms:
- PP30 (ภ.พ.30): Monthly VAT return. Shows "แบบแสดงรายการภาษีมูลค่าเพิ่ม" or "ภ.พ.30". Filed monthly for domestic VAT.
- PP36 (ภ.พ.36): Foreign service VAT payment. Shows "แบบนำส่งภาษีมูลค่าเพิ่ม" or "ภ.พ.36". Filed when paying VAT on foreign services.
- PND3 (ภ.ง.ด.3): Withholding tax certificate for payments to individuals. Shows "หนังสือรับรองการหักภาษี ณ ที่จ่าย" or "ภ.ง.ด.3".
- PND53 (ภ.ง.ด.53): Withholding tax certificate for payments to companies. Shows "หนังสือรับรองการหักภาษี ณ ที่จ่าย" or "ภ.ง.ด.53".

Social Security:
- SSO: Social security contribution form. Shows "สำนักงานประกันสังคม" or related social security text.

Rules:
- Look for the form number prominently displayed on the document
- PP30 and PP36 are VAT-related forms from Revenue Department
- PND3 and PND53 are withholding tax certificates
- SSO is social security, not from Revenue Department
- If the document is a tax payment receipt (ใบเสร็จรับเงิน) from Revenue Department, identify which filing type it corresponds to based on the form number referenced
- For description: provide a brief summary of what this specific document is for (e.g. "Monthly VAT return Feb 2026", "WHT for coaching services", "Foreign service VAT - Google")
- If dates use Buddhist Era (พ.ศ.), convert to Common Era for the description`;

const USER_PROMPT = `Classify this tax document. Identify the filing type and provide a brief description.`;

const CLASSIFICATION_SCHEMA = {
  name: "tax_document_classification",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      filing_type: {
        type: "string" as const,
        enum: ["pp30", "pp36", "pnd3", "pnd53", "sso", "unknown"],
        description: "The identified filing type",
      },
      description: {
        type: ["string", "null"] as const,
        description: "Brief description of what this document is for (e.g. 'Monthly VAT return Feb 2026', 'WHT for coaching services')",
      },
      confidence: {
        type: "string" as const,
        enum: ["high", "medium", "low"],
        description: "Classification confidence",
      },
      confidence_explanation: {
        type: "string" as const,
        description: "Brief explanation of why this classification was chosen",
      },
    },
    required: ["filing_type", "description", "confidence", "confidence_explanation"],
    additionalProperties: false,
  },
};

function resolveModel(requested?: string): string {
  if (requested && ALLOWED_MODELS.includes(requested as typeof ALLOWED_MODELS[number])) {
    return requested;
  }
  return DEFAULT_MODEL;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const requestedModel = (formData.get('model') as string) || undefined;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      return NextResponse.json({ error: "Only PDF and image files are supported" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const t0 = performance.now();
    const model = resolveModel(requestedModel);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const isPdf = file.type === 'application/pdf';

    const filePart = isPdf
      ? {
          type: 'file' as const,
          file: {
            filename: file.name || 'document.pdf',
            file_data: `data:application/pdf;base64,${base64}`,
          },
        }
      : {
          type: 'image_url' as const,
          image_url: {
            url: `data:${file.type || 'image/jpeg'};base64,${base64}`,
            detail: 'high' as const,
          },
        };

    // Reasoning models (o-series, gpt-5-mini) use 'developer' role instead of 'system'
    const isReasoningModel = model.startsWith('o') || model.includes('5-mini');
    const systemRole = isReasoningModel ? 'developer' : 'system';

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: systemRole as 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            filePart,
            { type: 'text', text: USER_PROMPT },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: CLASSIFICATION_SCHEMA,
      },
      ...(isReasoningModel
        ? { max_completion_tokens: 500, reasoning_effort: 'low' as const }
        : { temperature: 0 }),
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI model');
    }

    const classification = JSON.parse(content);
    const elapsed = Math.round(performance.now() - t0);

    console.log(`[classify-tax-document] ${model} → ${classification.filing_type} (${classification.confidence}) in ${elapsed}ms`);

    return NextResponse.json({
      filing_type: classification.filing_type,
      description: classification.description,
      confidence: classification.confidence,
      confidence_explanation: classification.confidence_explanation,
      model_used: model,
    });
  } catch (error) {
    console.error('[classify-tax-document] Error:', error);
    return NextResponse.json({ error: "Classification failed" }, { status: 500 });
  }
}
