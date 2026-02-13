import type { VatType, WhtType } from '@/types/expense-tracker';

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Calculate VAT amount from the transaction amount.
 *
 * PP30 (domestic, 7% included in amount):  VAT = amount - (amount / 1.07)
 * PP36 (reverse charge, 7% extra):         VAT = amount * 0.07
 */
export function calcVat(amount: number, vatType: VatType): number {
  if (vatType === 'pp30') return r2(amount - amount / 1.07);
  if (vatType === 'pp36') return r2(amount * 0.07);
  return 0;
}

/**
 * Calculate WHT amount from the transaction amount.
 *
 * PND 3 / PND 53 (default 3%): WHT = amount * rate / (100 - rate)
 *   e.g. 3%: WHT = amount * 3 / 97
 */
export function calcWht(amount: number, whtType: WhtType, ratePercent: number): number {
  if (whtType === 'none' || ratePercent <= 0) return 0;
  return r2((amount * ratePercent) / (100 - ratePercent));
}

/**
 * Derive the tax base from the transaction amount, VAT, and WHT.
 *
 * No VAT, no WHT  → amount
 * PP30 only       → amount - VAT
 * PP36 only       → amount + VAT   (reverse charge: base is paid amount, VAT is extra)
 * WHT only        → amount + WHT
 * PP30 + WHT      → amount - VAT + WHT
 * PP36 + WHT      → amount + VAT + WHT
 */
export function calcTaxBase(
  amount: number,
  vatType: VatType,
  vatAmount: number,
  whtType: WhtType,
  whtAmount: number,
): number {
  let base = amount;

  if (vatType === 'pp30') base -= vatAmount;
  else if (vatType === 'pp36') base += vatAmount;

  if (whtType !== 'none') base += whtAmount;

  return r2(base);
}

/**
 * Recalculate all derived fields, respecting user overrides.
 * Returns the updated VAT, WHT, and Tax Base values.
 */
export function recalcAll(params: {
  amount: number;
  vatType: VatType;
  vatAmountOverride: boolean;
  currentVatAmount: number | null;
  whtType: WhtType;
  whtRate: number;
  whtAmountOverride: boolean;
  currentWhtAmount: number | null;
  taxBaseOverride: boolean;
  currentTaxBase: number | null;
}): {
  vat_amount: number | null;
  wht_amount: number | null;
  tax_base: number | null;
} {
  const {
    amount,
    vatType,
    vatAmountOverride,
    currentVatAmount,
    whtType,
    whtRate,
    whtAmountOverride,
    currentWhtAmount,
    taxBaseOverride,
    currentTaxBase,
  } = params;

  const vatAmt = vatAmountOverride
    ? (currentVatAmount ?? 0)
    : calcVat(amount, vatType);

  const whtAmt = whtAmountOverride
    ? (currentWhtAmount ?? 0)
    : calcWht(amount, whtType, whtRate);

  const taxBase = taxBaseOverride
    ? (currentTaxBase ?? amount)
    : calcTaxBase(amount, vatType, vatAmt, whtType, whtAmt);

  return {
    vat_amount: vatType !== 'none' ? vatAmt : null,
    wht_amount: whtType !== 'none' ? whtAmt : null,
    tax_base: (vatType !== 'none' || whtType !== 'none') ? taxBase : null,
  };
}
