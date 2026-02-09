import type { WhtFilingData } from '@/types/tax-filing';

interface WhtFileResult {
  content: string;
  filename: string;
}

/**
 * Sanitize a string field for pipe-delimited format.
 * Removes pipe characters and newlines that would corrupt the file structure.
 */
function sanitize(s: string): string {
  return s.replace(/[\|\r\n]/g, ' ').trim();
}

/**
 * Generate a pipe-delimited .txt file for PND3/PND53 filing.
 *
 * Format per line:
 *   {seq}|{tax_id}|{prefix}|{first_name}|{last_name}|{address}|||{date_BE}|{description}|{rate}|{amount}|{tax}|{condition}
 *
 * - Dates in Buddhist Era (CE + 543), format DD/MM/YYYY
 * - Rate as XX.XX (zero-padded, e.g. 03.00)
 * - Amounts with 2 decimal places
 * - Fields 7 and 8 are empty (reserved)
 */
export function generateWhtFile(data: WhtFilingData): WhtFileResult {
  const lines = data.entries.map((entry, index) => {
    const seq = String(index + 1).padStart(5, '0');

    // Convert date to Buddhist Era
    const dateBE = toBuddhistEraDate(entry.transaction_date);

    // Format rate as XX.XX (e.g. 3 -> 03.00)
    const rate = formatRate(entry.wht_rate);

    // Format amounts
    const taxBase = entry.tax_base.toFixed(2);
    const whtAmount = entry.wht_amount.toFixed(2);

    // For companies: name in first_name, last_name empty
    const firstName = sanitize(entry.first_name);
    const lastName = entry.is_company ? '' : sanitize(entry.last_name);

    const fields = [
      seq,
      sanitize(entry.tax_id),
      sanitize(entry.prefix),
      firstName,
      lastName,
      sanitize(entry.address),
      '',  // field 7 (empty)
      '',  // field 8 (empty)
      dateBE,
      sanitize(entry.description),
      rate,
      taxBase,
      whtAmount,
      String(entry.condition),
    ];

    return fields.join('|');
  });

  const content = lines.join('\n');

  // Filename: PND3_0105566207013_256901.txt
  const formPrefix = data.form_type === 'pnd3' ? 'PND3' : 'PND53';
  const [yearStr, monthStr] = data.period.split('-');
  const yearBE = Number(yearStr) + 543;
  // Format: YYYYMM in BE (e.g. 256901 for Jan 2026)
  const periodBE = `${yearBE}${monthStr}`;
  const filename = `${formPrefix}_${data.company_tax_id}_${periodBE}.txt`;

  return { content, filename };
}

/**
 * Convert a YYYY-MM-DD date string to DD/MM/YYYY in Buddhist Era
 */
function toBuddhistEraDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const yearBE = Number(year) + 543;
  return `${day}/${month}/${yearBE}`;
}

/**
 * Format WHT rate as XX.XX (e.g. 3 -> 03.00, 5 -> 05.00)
 */
function formatRate(rate: number): string {
  return rate.toFixed(2).padStart(5, '0');
}
