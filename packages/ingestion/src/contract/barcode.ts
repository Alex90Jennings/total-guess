import { z } from 'zod';
import { canonicalGtin, hasValidCheckDigit, isRestrictedCirculation } from '../normalise/gtin.js';

/**
 * A product barcode in canonical form: 14 digits, valid check digit, and not
 * a restricted-circulation (in-store) code, which is not unique across
 * retailers and so cannot identify a product. Build with toBarcode().
 */
export const BarcodeSchema = z
    .string()
    .regex(/^\d{14}$/, 'barcode must be the canonical 14-digit form')
    .refine(hasValidCheckDigit, 'barcode check digit is wrong')
    .refine((b) => !isRestrictedCirculation(b), 'restricted-circulation (in-store) codes are not product identities');
export type Barcode = z.infer<typeof BarcodeSchema>;

/** Any EAN-8/UPC-A/EAN-13/GTIN-14 -> canonical Barcode, or null with the reason. */
export function toBarcode(code: string | null | undefined): { barcode: Barcode } | { barcode: null; reason: string } {
    const canonical = canonicalGtin(code);
    if (!canonical) return { barcode: null, reason: `not a valid GTIN: "${code ?? ''}"` };
    if (isRestrictedCirculation(canonical)) return { barcode: null, reason: `restricted-circulation code: "${code}"` };
    return { barcode: canonical };
}
