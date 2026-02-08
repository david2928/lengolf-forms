/**
 * Smart vendor upsert logic - fill blank fields, only replace if significantly better.
 */

interface VendorFields {
  name: string;
  company_name?: string | null;
  address?: string | null;
  tax_id?: string | null;
  is_company?: boolean;
}

interface ExistingVendor {
  id: string;
  name: string;
  company_name: string | null;
  address: string | null;
  tax_id: string | null;
  is_company: boolean;
}

/**
 * Validate Thai tax ID (13 digits).
 */
export function isValidThaiTaxId(taxId: string | null | undefined): boolean {
  if (!taxId) return false;
  const cleaned = taxId.replace(/[\s-]/g, '');
  return /^\d{13}$/.test(cleaned);
}

/**
 * Compute which vendor fields should be updated.
 * Rules:
 * - Fill blank fields from candidate data
 * - Replace address only if candidate is significantly longer (2x+)
 * - Replace tax_id only if new one is valid 13-digit format and old one isn't
 * - Never overwrite a name
 */
export function computeVendorUpdates(
  existing: ExistingVendor,
  candidate: VendorFields
): Record<string, unknown> | null {
  const updates: Record<string, unknown> = {};

  // Fill blank company_name
  if (!existing.company_name && candidate.company_name) {
    updates.company_name = candidate.company_name;
  }

  // Fill blank address, or replace if candidate is significantly more complete
  if (!existing.address && candidate.address) {
    updates.address = candidate.address;
  } else if (
    existing.address &&
    candidate.address &&
    candidate.address.length > existing.address.length * 2
  ) {
    updates.address = candidate.address;
  }

  // Fill blank tax_id, or replace if new one is valid and old isn't
  if (!existing.tax_id && candidate.tax_id) {
    updates.tax_id = candidate.tax_id;
  } else if (
    existing.tax_id &&
    candidate.tax_id &&
    !isValidThaiTaxId(existing.tax_id) &&
    isValidThaiTaxId(candidate.tax_id)
  ) {
    updates.tax_id = candidate.tax_id;
  }

  return Object.keys(updates).length > 0 ? updates : null;
}
