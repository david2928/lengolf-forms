import { openai } from '@/lib/ai/openai-client';
import { PDFDocument } from 'pdf-lib';
import type { InvoiceExtraction, MultiInvoiceExtraction, InvoiceLineItem } from '@/types/expense-tracker';

const SYSTEM_PROMPT = `You are an invoice data extraction assistant specializing in Thai (ภาษาไทย) and English invoices and receipts.

Rules:
- All monetary amounts in THB as numbers (no commas, no currency symbols)
- If a field cannot be determined from the document, use null
- Keep vendor_name in the original language as it appears on the document
- vendor_company_name_en: Provide the **official English name** of the company. Look for English text/logos on the document (e.g. letterhead, footer). If the document only shows a Thai name like "บริษัท แอคโทเปีย กรุ๊ป จำกัด", translate it to proper English legal form (e.g. "Actopia Group Co., Ltd."). Use standard Thai→English company suffix mappings: บริษัท...จำกัด → "Co., Ltd.", บริษัท...จำกัด (มหาชน) → "Public Co., Ltd.", ห้างหุ้นส่วนจำกัด → "Limited Partnership". Always include the legal suffix.
- Keep vendor_address in the original language/script as it appears on the document (Thai addresses must remain in Thai script ภาษาไทย, do NOT transliterate to English)
- If dates use Buddhist Era (พ.ศ.), convert to Common Era (ค.ศ.) by subtracting 543. Output dates as YYYY-MM-DD.
- For vat_type: use "pp30" if Thai domestic VAT 7% is shown (most common), "pp36" only for foreign/reverse-charge services, "none" if no VAT
- wht_applicable: true ONLY for Thai domestic services that typically have withholding tax (Thai consulting, professional fees, commissions, Thai contractor services). Set to false for: rent, lease, common area fees, utility invoices, product purchases, AND all foreign/overseas services (vat_type="pp36"). Foreign services like Google, Meta, AWS, Supabase, etc. NEVER have WHT — they use PP36 reverse-charge VAT only.
- TAX PAYMENT RECEIPTS: If the document is a tax payment receipt from กรมสรรพากร (Revenue Department) — e.g. PP30, PP36, PND3, PND53 filing receipts — set vendor_name to "กรมสรรพากร", vendor_company_name_en to "Revenue Department", use the เลขที่ใบเสร็จ (receipt number) as the invoice_number, set vat_type to "none", vat_amount to null, tax_base to null, wht_applicable to false, and for notes: use just the filing type code (e.g. "PP30", "PND3"), EXCEPT for PP36 filings where notes should include the payee company from ชื่อผู้ประกอบการซึ่งเป็นผู้รับเงิน (e.g. "PP36 - Google"). These are tax payments, NOT expenses with VAT/WHT.
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
const DEFAULT_MODEL = 'gpt-5-mini';

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
  const t0 = performance.now();
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

  const tPrep = performance.now();
  console.log(`[invoice-extraction] Prep (base64 + filePart): ${Math.round(tPrep - t0)}ms`);

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
      json_schema: INVOICE_SCHEMA,
    },
    ...(isReasoningModel
      ? { max_completion_tokens: 1500, reasoning_effort: 'low' as const }
      : { temperature: 0 }),
  });

  const tLLM = performance.now();

  const content = response.choices[0]?.message?.content;
  const finishReason = response.choices[0]?.finish_reason;
  const usage = response.usage;

  console.log('[invoice-extraction] Model:', model);
  console.log('[invoice-extraction] File:', fileName, '| Type:', mimeType, '| isPdf:', isPdf);
  console.log(`[invoice-extraction] LLM call: ${Math.round(tLLM - tPrep)}ms`);
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
  console.log(`[invoice-extraction] Total: ${Math.round(performance.now() - t0)}ms`);

  return { extraction, model_used: model };
}

// ── Multi-invoice extraction ──────────────────────────────────────────────────
// Returns each invoice as a separate object instead of summing them.

const MULTI_INVOICE_SYSTEM_PROMPT = `You are an invoice data extraction assistant specializing in Thai (ภาษาไทย) and English invoices and receipts.

Rules:
- All monetary amounts in THB as numbers (no commas, no currency symbols)
- If a field cannot be determined from the document, use null
- Keep vendor_name in the original language as it appears on the document
- vendor_company_name_en: Provide the **official English name** of the company. Look for English text/logos on the document (e.g. letterhead, footer). If the document only shows a Thai name like "บริษัท แอคโทเปีย กรุ๊ป จำกัด", translate it to proper English legal form (e.g. "Actopia Group Co., Ltd."). Use standard Thai→English company suffix mappings: บริษัท...จำกัด → "Co., Ltd.", บริษัท...จำกัด (มหาชน) → "Public Co., Ltd.", ห้างหุ้นส่วนจำกัด → "Limited Partnership". Always include the legal suffix.
- Keep vendor_address in the original language/script as it appears on the document (Thai addresses must remain in Thai script ภาษาไทย, do NOT transliterate to English)
- If dates use Buddhist Era (พ.ศ.), convert to Common Era (ค.ศ.) by subtracting 543. Output dates as YYYY-MM-DD.
- For vat_type: use "pp30" if Thai domestic VAT 7% is shown (most common), "pp36" only for foreign/reverse-charge services, "none" if no VAT
- wht_applicable: true ONLY for Thai domestic services that typically have withholding tax (Thai consulting, professional fees, commissions, Thai contractor services). Set to false for: rent, lease, common area fees, utility invoices, product purchases, AND all foreign/overseas services (vat_type="pp36"). Foreign services like Google, Meta, AWS, Supabase, etc. NEVER have WHT — they use PP36 reverse-charge VAT only.
- TAX PAYMENT RECEIPTS: If the document is a tax payment receipt from กรมสรรพากร (Revenue Department) — e.g. PP30, PP36, PND3, PND53 filing receipts — set vendor_name to "กรมสรรพากร", vendor_company_name_en to "Revenue Department", use the เลขที่ใบเสร็จ (receipt number) as the invoice_number, set vat_type to "none", vat_amount to null, tax_base to null, wht_applicable to false, and for notes: use just the filing type code (e.g. "PP30", "PND3"), EXCEPT for PP36 filings where notes should include the payee company from ชื่อผู้ประกอบการซึ่งเป็นผู้รับเงิน (e.g. "PP36 - Google"). These are tax payments, NOT expenses with VAT/WHT.
- confidence: "high" if document is clear and all key fields are readable, "medium" if some fields are uncertain, "low" if document is poor quality or heavily obscured

MULTI-PAGE / MULTI-INVOICE DOCUMENTS:
- **Read ALL pages** of the document, not just the first page.
- Return each invoice as a **separate object** in the "invoices" array.
- Each invoice has its own invoice_number, invoice_date, total_amount, tax_base, vat_amount, vat_type, wht_applicable, and notes.
- Do NOT sum amounts across invoices — keep each invoice separate.
- Vendor information (name, address, tax_id) is shared at the top level.
- If only 1 invoice is found, return an array with 1 item.
- Mention the number of invoices found in confidence_explanation (e.g. "4 separate invoices found").`;

const MULTI_INVOICE_USER_PROMPT = `Extract all invoice/receipt data from this document. If there are multiple pages or multiple invoices, return each invoice as a SEPARATE object in the invoices array. Do NOT sum amounts — keep each invoice individual.`;

const MULTI_INVOICE_SCHEMA = {
  name: "multi_invoice_extraction",
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
        description: "Official English company name with legal suffix",
      },
      vendor_address: {
        type: ["string", "null"] as const,
        description: "Full address of the vendor",
      },
      vendor_tax_id: {
        type: ["string", "null"] as const,
        description: "Tax ID number (เลขประจำตัวผู้เสียภาษี)",
      },
      invoices: {
        type: "array" as const,
        description: "Each invoice found in the document as a separate object",
        items: {
          type: "object" as const,
          properties: {
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
              description: "pp30 = Thai domestic 7% VAT, pp36 = foreign/reverse charge, none = no VAT",
            },
            wht_applicable: {
              type: "boolean" as const,
              description: "Whether withholding tax likely applies",
            },
            notes: {
              type: ["string", "null"] as const,
              description: "1-2 word category (e.g. 'Rent Common', 'Rent Service', 'Utilities'). Maximum 3 words.",
            },
          },
          required: [
            "invoice_number", "invoice_date", "total_amount", "tax_base",
            "vat_amount", "vat_type", "wht_applicable", "notes",
          ],
          additionalProperties: false,
        },
      },
      confidence: {
        type: "string" as const,
        enum: ["high", "medium", "low"],
        description: "Extraction confidence based on document clarity",
      },
      confidence_explanation: {
        type: "string" as const,
        description: "Brief explanation including number of invoices found",
      },
    },
    required: [
      "vendor_name", "vendor_company_name_en", "vendor_address", "vendor_tax_id",
      "invoices", "confidence", "confidence_explanation",
    ],
    additionalProperties: false,
  },
};

export interface MultiExtractionResult {
  extraction: MultiInvoiceExtraction;
  model_used: string;
}

/**
 * Split a PDF into individual single-page buffers.
 */
async function splitPdfPages(buffer: Buffer): Promise<Buffer[]> {
  const srcDoc = await PDFDocument.load(buffer);
  const pageCount = srcDoc.getPageCount();
  const pages: Buffer[] = [];

  for (let i = 0; i < pageCount; i++) {
    const newDoc = await PDFDocument.create();
    const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
    newDoc.addPage(copiedPage);
    const bytes = await newDoc.save();
    pages.push(Buffer.from(bytes));
  }

  return pages;
}

/**
 * Extract invoice data from a file, returning each invoice as a separate item.
 * For multi-page PDFs, extracts each page separately (to avoid context length
 * limits) then merges vendor info from all pages. Each page that contains an
 * invoice becomes a separate InvoiceLineItem.
 *
 * For single-page PDFs and images, does a single extraction call.
 */
export async function extractMultiInvoiceData(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  options?: { model?: string }
): Promise<MultiExtractionResult> {
  const model = resolveModel(options?.model);
  const isPdf = mimeType === 'application/pdf';

  // For single-page docs or images, extract once and wrap the result
  if (!isPdf) {
    const { extraction: single, model_used } = await extractInvoiceData(buffer, mimeType, fileName, options);
    return {
      extraction: {
        vendor_name: single.vendor_name,
        vendor_company_name_en: single.vendor_company_name_en,
        vendor_address: single.vendor_address,
        vendor_tax_id: single.vendor_tax_id,
        invoices: [{
          invoice_number: single.invoice_number,
          invoice_date: single.invoice_date,
          total_amount: single.total_amount,
          tax_base: single.tax_base,
          vat_amount: single.vat_amount,
          vat_type: single.vat_type,
          wht_applicable: single.wht_applicable,
          notes: single.notes,
        }],
        confidence: single.confidence,
        confidence_explanation: single.confidence_explanation,
      },
      model_used,
    };
  }

  // For PDFs: check page count
  const srcDoc = await PDFDocument.load(buffer);
  const pageCount = srcDoc.getPageCount();

  console.log(`[multi-invoice-extraction] PDF has ${pageCount} page(s)`);

  // Single-page PDF — extract directly
  if (pageCount === 1) {
    const { extraction: single, model_used } = await extractInvoiceData(buffer, mimeType, fileName, options);
    return {
      extraction: {
        vendor_name: single.vendor_name,
        vendor_company_name_en: single.vendor_company_name_en,
        vendor_address: single.vendor_address,
        vendor_tax_id: single.vendor_tax_id,
        invoices: [{
          invoice_number: single.invoice_number,
          invoice_date: single.invoice_date,
          total_amount: single.total_amount,
          tax_base: single.tax_base,
          vat_amount: single.vat_amount,
          vat_type: single.vat_type,
          wht_applicable: single.wht_applicable,
          notes: single.notes,
        }],
        confidence: single.confidence,
        confidence_explanation: single.confidence_explanation,
      },
      model_used,
    };
  }

  // Multi-page PDF — extract each page separately to avoid context limits
  const pages = await splitPdfPages(buffer);
  console.log(`[multi-invoice-extraction] Extracting ${pages.length} pages separately`);

  const results = await Promise.all(
    pages.map((pageBuffer, i) =>
      extractInvoiceData(pageBuffer, 'application/pdf', `${fileName}_page${i + 1}.pdf`, options)
        .then(r => ({ ...r, page: i + 1 }))
        .catch(err => {
          console.error(`[multi-invoice-extraction] Page ${i + 1} failed:`, err.message);
          return null;
        })
    )
  );

  const successful = results.filter((r): r is NonNullable<typeof r> => r !== null);

  if (successful.length === 0) {
    throw new Error('Failed to extract any pages from the document');
  }

  // Use vendor info from the first successful extraction (shared across all pages)
  const first = successful[0].extraction;

  // Each page result becomes an invoice line item
  const invoices: InvoiceLineItem[] = successful.map(r => ({
    invoice_number: r.extraction.invoice_number,
    invoice_date: r.extraction.invoice_date,
    total_amount: r.extraction.total_amount,
    tax_base: r.extraction.tax_base,
    vat_amount: r.extraction.vat_amount,
    vat_type: r.extraction.vat_type,
    wht_applicable: r.extraction.wht_applicable,
    notes: r.extraction.notes,
  }));

  // Filter out empty pages (no invoice_number AND no total_amount)
  const nonEmpty = invoices.filter(inv => inv.invoice_number || inv.total_amount != null);

  // Deduplicate: if multiple pages have the same invoice_number, they're
  // likely the same multi-page invoice — keep only the first occurrence
  const seen = new Set<string>();
  const deduped = nonEmpty.filter(inv => {
    if (!inv.invoice_number) return true; // keep items without invoice numbers
    if (seen.has(inv.invoice_number)) return false;
    seen.add(inv.invoice_number);
    return true;
  });

  const extraction: MultiInvoiceExtraction = {
    vendor_name: first.vendor_name,
    vendor_company_name_en: first.vendor_company_name_en,
    vendor_address: first.vendor_address,
    vendor_tax_id: first.vendor_tax_id,
    invoices: deduped,
    confidence: first.confidence,
    confidence_explanation: `${deduped.length} invoice(s) extracted from ${pageCount} page PDF (per-page extraction)`,
  };

  console.log('[multi-invoice-extraction] Result:', JSON.stringify({
    vendor_name: extraction.vendor_name,
    invoices_count: extraction.invoices.length,
    invoices: extraction.invoices.map(inv => ({
      invoice_number: inv.invoice_number,
      total_amount: inv.total_amount,
      notes: inv.notes,
    })),
  }));

  return { extraction, model_used: model };
}
