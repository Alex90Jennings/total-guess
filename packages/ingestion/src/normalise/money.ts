import { scaleDecimal } from './decimal.js';

/** GBX is pence sterling. Retailers use it for sub-pound unit prices ("83.3p/kg"). */
export type Currency = 'GBP' | 'GBX';

/** An amount in pence. May be fractional (unit prices); shelf prices are checked for integers separately. */
export function amountToPence(amount: string, currency: Currency): number {
    return currency === 'GBP' ? scaleDecimal(amount, 2) : scaleDecimal(amount, 0);
}

const MONEY_TEXT = /^(?:£(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d+)?)p)$/;

/** "£6.50" -> 650, "£4" -> 400, "75p" -> 75. Null for anything else. */
export function moneyTextToPence(text: string): number | null {
    const match = MONEY_TEXT.exec(text.trim());
    if (!match) return null;
    if (match[1] !== undefined) return scaleDecimal(match[1], 2);
    return scaleDecimal(match[2] ?? '', 0);
}
