import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { uploadTaxDocument, type TaxFilingType } from '@/lib/google-drive-service';

export const maxDuration = 30; // Google Drive upload

const VALID_FILING_TYPES = new Set<TaxFilingType>(['pp30', 'pp36', 'pnd3', 'pnd53', 'sso']);
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const filingType = formData.get('filing_type') as string | null;
    const reportingMonth = formData.get('reporting_month') as string | null;
    const description = (formData.get('description') as string | null) || undefined;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      return NextResponse.json({ error: "Only PDF and image files are supported" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    if (!filingType || !VALID_FILING_TYPES.has(filingType as TaxFilingType)) {
      return NextResponse.json({ error: "Invalid filing_type" }, { status: 400 });
    }

    if (!reportingMonth || !MONTH_RE.test(reportingMonth)) {
      return NextResponse.json({ error: "Invalid reporting_month (expected YYYY-MM)" }, { status: 400 });
    }

    // Require description for VAT filings
    if ((filingType === 'pp30' || filingType === 'pp36') && !description?.trim()) {
      return NextResponse.json({ error: "Description is required for VAT filings" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await uploadTaxDocument(buffer, file.type, {
      filingType: filingType as TaxFilingType,
      reportingMonth,
      description: description?.trim(),
      originalFileName: file.name,
    });

    return NextResponse.json({
      fileUrl: result.fileUrl,
      fileName: result.fileName,
    });
  } catch (error) {
    console.error('[upload-tax-document] Error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
