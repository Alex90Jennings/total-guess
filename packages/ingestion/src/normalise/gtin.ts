/**
 * GTIN (barcode) handling. The GTIN is the join key between sources, so it is
 * validated (check digit) and canonicalised: EAN-8, UPC-A, EAN-13 and GTIN-14
 * are all padded to 14 digits, so "5000112637922" and "05000112637922" match.
 */

export function hasValidCheckDigit(digits: string): boolean {
    if (!/^\d{8}$|^\d{12,14}$/.test(digits)) return false;
    const body = digits.slice(0, -1);
    let sum = 0;
    for (let i = 0; i < body.length; i++) {
        // Weights alternate 3,1,3,... counting from the digit next to the check digit.
        const weight = (body.length - i) % 2 === 1 ? 3 : 1;
        sum += Number(body[i]) * weight;
    }
    return (10 - (sum % 10)) % 10 === Number(digits.at(-1));
}

/** The 14-digit form, or null if this is not a valid GTIN. */
export function canonicalGtin(code: string | null | undefined): string | null {
    const digits = code?.trim() ?? '';
    if (!hasValidCheckDigit(digits)) return null;
    return digits.padStart(14, '0');
}

/**
 * Codes starting 02, 04 or 2 (EAN-13 "20"-"29") are restricted-circulation
 * numbers: in-store codes for weighed items and retailer-internal use. They
 * are not unique across retailers, so they must never be used as a join key.
 */
export function isRestrictedCirculation(gtin14: string): boolean {
    const ean13 = gtin14.slice(1);
    return ean13.startsWith('2') || ean13.startsWith('02') || ean13.startsWith('04');
}

/** GS1 UK issues EAN-13 prefixes 500-509: a good signal that a product is sold in the UK. */
export function isGs1UkPrefix(gtin14: string): boolean {
    return gtin14.startsWith('0') && /^50\d/.test(gtin14.slice(1));
}
