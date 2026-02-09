import { openai } from '@/lib/ai/openai-client';
import type { InvoiceExtraction } from '@/types/expense-tracker';

const SYSTEM_PROMPT = `You are an invoice data extraction assistant specializing in Thai (ภาษาไทย) and English invoices and receipts.

Rules:
- All monetary amounts in THB as numbers (no commas, no currency symbols)
- If a field cannot be determined from the document, use null
- Keep vendor_name in the original language as it appears on the document
- vendor_company_name_en: Provide the **official English name** of the company. Look for English text/logos on the document (e.g. letterhead, footer). If the document only shows a Thai name like "บริษัท แอคโทเปีย กรุ๊ป จำกัด", translate it to proper English legal form (e.g. "Actopia Group Co., Ltd."). Use standard Thai→English company suffix mappings: บริษัท...จำกัด → "Co., Ltd.", บริษัท...จำกัด (มหาชน) → "Public Co., Ltd.", ห้างหุ้นส่วนจำกัด → "Limited Partnership". Always include the legal suffix.
- Keep vendor_address in the original language/script as it appears on the document (Thai addresses must remain in Thai script ภาษาไทย, do NOT transliterate to English)
- If dates use Buddhist Era (พ.ศ.), convert to Common Era (ค.ศ.) by subtracting 543. Output dates as YYYY-MM-DD.
- For vat_type: use "pp30" if Thai domestic VAT 7% is shown (most common), "pp36" only for foreign/reverse-charge services, "none" if no VAT
- wht_applicable: true if this looks like a service that typically has withholding tax (services, consulting, rent, professional fees, etc.)
- confidence: "high" if document is clear and all key fields are readable, "medium" if some fields are uncertain, "low" if document is poor quality or heavily obscured
- confidence_explanation: Brief explanation of why you chose that confidence level (e.g. "Clear printed invoice with all fields visible", "Handwritten receipt, some amounts hard to read", "Blurry photo, vendor name uncertain")

MULTI-PAGE / MULTI-INVOICE DOCUMENTS:
- **Read ALL pages** of the document, not just the first page.
- If the document contains multiple invoices from the same vendor, **SUM the amounts** across all invoices:
  - total_amount = sum of all invoice totals
  - tax_base = sum of all tax bases
  - vat_amount = sum of all VAT amounts
- Concatenate invoice numbers with ", " (e.g. "INV-001, INV-002")
- Use the earliest invoice_date among the invoices
- If invoices have different vat_type values, prefer "pp30" over "none" (partial VAT is still VAT)
- Mention the number of invoices found in confidence_explanation (e.g. "2 invoices found, amounts summed")`;

const USER_PROMPT = `Extract all invoice/receipt data from this document. If there are multiple pages or multiple invoices, read ALL pages and SUM the amounts (total_amount, tax_base, vat_amount) across all invoices. Concatenate invoice numbers with ", ".`;

// Allowed models for extraction (whitelist for safety)
const ALLOWED_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-5.2', 'gpt-5-mini'] as const;
const DEFAULT_MODEL = 'gpt-5.2';

// JSON Schema for structured outputs (strict: true guarantees schema compliance)
const INVOICE_SCHEMA = {
  name: "invoice_extraction",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      vendor_name: {
        type: ["string", "null"] as const,
        description: "Company or person name on the invoice in original language",
      },
      vendor_company_name_en: {
        type: ["string", "null"] as const,
        description: "Official English company name with legal suffix (e.g. 'Actopia Group Co., Ltd.'). Translate from Thai if needed.",
      },
      vendor_address: {
        type: ["string", "null"] as const,
        description: "Full address of the vendor",
      },
      vendor_tax_id: {
        type: ["string", "null"] as const,
        description: "Tax ID number (เลขประจำตัวผู้เสียภาษี)",
      },
      invoice_number: {
        type: ["string", "null"] as const,
        description: "Invoice or receipt number",
      },
      invoice_date: {
        type: ["string", "null"] as const,
        description: "Date in YYYY-MM-DD format (convert Buddhist Era to Common Era)",
      },
      total_amount: {
        type: ["number", "null"] as const,
        description: "Total amount paid in THB",
      },
      tax_base: {
        type: ["number", "null"] as const,
        description: "Amount before tax in THB",
      },
      vat_amount: {
        type: ["number", "null"] as const,
        description: "VAT amount in THB (if any)",
      },
      vat_type: {
        type: "string" as const,
        enum: ["none", "pp30", "pp36"],
        description: "pp30 = Thai domestic 7% VAT included, pp36 = foreign/reverse charge, none = no VAT",
      },
      wht_applicable: {
        type: "boolean" as const,
        description: "Whether withholding tax likely applies to this transaction",
      },
      notes: {
        type: ["string", "null"] as const,
        description: "1-2 word category of what was purchased (e.g. 'Beverages', 'Internet', 'Office supplies', 'Rent', 'Cleaning'). Maximum 3 words.",
      },
      confidence: {
        type: "string" as const,
        enum: ["high", "medium", "low"],
        description: "Extraction confidence based on document clarity",
      },
      confidence_explanation: {
        type: "string" as const,
        description: "Brief explanation of the confidence level (e.g. 'Clear printed invoice, all fields readable')",
      },
    },
    required: [
      "vendor_name", "vendor_company_name_en", "vendor_address", "vendor_tax_id",
      "invoice_number", "invoice_date", "total_amount", "tax_base", "vat_amount",
      "vat_type", "wht_applicable", "notes", "confidence", "confidence_explanation",
    ],
    additionalProperties: false,
  },
};

export interface ExtractionResult {
  extraction: InvoiceExtraction;
  model_used: string;
}

export function resolveModel(requested?: string): string {
  if (requested && ALLOWED_MODELS.includes(requested as typeof ALLOWED_MODELS[number])) {
    return requested;
  }
  return DEFAULT_MODEL;
}

/**
 * Extract invoice data from a file buffer using OpenAI vision.
 * Pure extraction logic - no Drive upload, no DB writes.
 */
export async function extractInvoiceData(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  options?: { model?: string }
): Promise<ExtractionResult> {
  const model = resolveModel(options?.model);
  const base64 = buffer.toString('base64');
  const isPdf = mimeType === 'application/pdf';

  const filePart = isPdf
    ? {
        type: 'file' as const,
        file: {
          filename: fileName || 'invoice.pdf',
          file_data: `data:application/pdf;base64,${base64}`,
        },
      }
    : {
        type: 'image_url' as const,
        image_url: {
          url: `data:${mimeType || 'image/jpeg'};base64,${base64}`,
          detail: 'high' as const,
        },
      };

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
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
      json_schema: INVOICE_SCHEMA,
    },
    temperature: 0,
  });

  const content = response.choices[0]?.message?.content;
  const finishReason = response.choices[0]?.finish_reason;
  const usage = response.usage;

  console.log('[invoice-extraction] Model:', model);
  console.log('[invoice-extraction] File:', fileName, '| Type:', mimeType, '| isPdf:', isPdf);
  console.log('[invoice-extraction] Finish reason:', finishReason);
  console.log('[invoice-extraction] Tokens:', usage ? `prompt=${usage.prompt_tokens}, completion=${usage.completion_tokens}, total=${usage.total_tokens}` : 'N/A');

  if (!content) {
    throw new Error('No response from AI model');
  }

  const extraction: InvoiceExtraction = JSON.parse(content);

  console.log('[invoice-extraction] Extracted:', JSON.stringify({
    vendor_name: extraction.vendor_name,
    invoice_number: extraction.invoice_number,
    total_amount: extraction.total_amount,
    vat_type: extraction.vat_type,
    confidence: extraction.confidence,
  }));

  return { extraction, model_used: model };
}
