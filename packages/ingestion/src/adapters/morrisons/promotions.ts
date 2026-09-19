/**
 * Morrisons promotion text -> contract Promotion.
 *
 * Every pattern below was seen in real listings (221 food products, 18 Sep
 * 2026). A promotion is only given a mechanic when its text matches exactly
 * AND the numbers agree with the structured prices on the same page;
 * anything else becomes `unparsed`, which the basket engine never applies.
 *
 *   Buy 2 for £10                     multibuy
 *   Mix & Match - Any 3 for £5        multibuy
 *   Now £4, Was £6.50 / Now 75p, ...  price_reduction (already in the price)
 *   Half price, was £5                price_reduction
 *   Save 1/3, was £10.50              price_reduction
 *   £2.50 - More Card Price           loyalty_price
 *   Unbeatable Price, ... Meal Deal for £5, ... Bundle for £5   unparsed
 */
import type { Promotion } from '../../contract/promotion.js';
import { moneyTextToPence } from '../../normalise/money.js';

export type RawPromotion = {
    retailerPromotionId: string | null;
    text: string;
    /** Product pages only: "Buy 2 for £10. Order by 22/09/2026, ..." */
    longText?: string | null;
    /** Product pages only. */
    requiredQuantity?: number | null;
};

export type PriceContext = {
    currentPence: number;
    /** Structured was-price, when the page gives one. */
    originalPence: number | null;
};

const MONEY = String.raw`(£\d+(?:\.\d{1,2})?|\d+p)`;
const BUY_N = new RegExp(String.raw`^Buy (\d+) for ${MONEY}$`, 'i');
const MIX_AND_MATCH = new RegExp(String.raw`^Mix & Match - Any (\d+) for ${MONEY}$`, 'i');
const NOW_WAS = new RegExp(String.raw`^Now ${MONEY}, Was ${MONEY}$`, 'i');
const HALF_PRICE = new RegExp(String.raw`^Half price, was ${MONEY}$`, 'i');
const SAVE_FRACTION = new RegExp(String.raw`^Save (\d+)\/(\d+), was ${MONEY}$`, 'i');
const MORE_CARD = new RegExp(String.raw`^${MONEY} - More Card Price$`, 'i');
const ORDER_BY = /\bOrder by (\d{2})\/(\d{2})\/(\d{4})\b/i;

/** "Order by 22/09/2026" -> "2026-09-22", or null if absent or not a real date. */
export function endsOnFromText(text: string | null | undefined): string | null {
    const match = text ? ORDER_BY.exec(text) : null;
    if (!match) return null;
    const [, dd, mm, yyyy] = match;
    const iso = `${yyyy}-${mm}-${dd}`;
    const date = new Date(`${iso}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) ? iso : null;
}

const penny = (a: number, b: number) => Math.abs(a - b) <= 1;

export function classifyPromotion(
    raw: RawPromotion,
    prices: PriceContext,
    warnings: string[],
): Promotion {
    const text = raw.text.trim();
    const common = { retailerPromotionId: raw.retailerPromotionId, text, endsOn: endsOnFromText(raw.longText) };
    const unparsed = (reason?: string): Promotion => {
        warnings.push(`promotion_unparsed: "${text}"${reason ? ` (${reason})` : ''}`);
        return { type: 'unparsed', ...common, sourceCode: null };
    };
    const wasMatchesStructured = (was: number) => prices.originalPence === null || prices.originalPence === was;

    const multibuy = BUY_N.exec(text) ?? MIX_AND_MATCH.exec(text);
    if (multibuy) {
        const quantity = Number(multibuy[1]);
        const pricePence = moneyTextToPence(multibuy[2] ?? '');
        if (raw.retailerPromotionId === null) return unparsed('multibuy without a promotion id');
        if (pricePence === null || quantity < 2) return unparsed();
        if (raw.requiredQuantity != null && raw.requiredQuantity !== quantity) {
            return unparsed(`text says ${quantity}, requiredProductQuantity says ${raw.requiredQuantity}`);
        }
        return { type: 'multibuy', ...common, retailerPromotionId: raw.retailerPromotionId, quantity, pricePence };
    }

    const nowWas = NOW_WAS.exec(text);
    if (nowWas) {
        const now = moneyTextToPence(nowWas[1] ?? '');
        const was = moneyTextToPence(nowWas[2] ?? '');
        if (now === null || was === null) return unparsed();
        if (now !== prices.currentPence || !wasMatchesStructured(was) || now >= was) {
            return unparsed('prices in text disagree with the page');
        }
        return { type: 'price_reduction', ...common, pricePence: now, wasPricePence: was };
    }

    const half = HALF_PRICE.exec(text);
    if (half) {
        const was = moneyTextToPence(half[1] ?? '');
        if (was === null || !penny(was / 2, prices.currentPence) || !wasMatchesStructured(was)) {
            return unparsed('prices in text disagree with the page');
        }
        return { type: 'price_reduction', ...common, pricePence: prices.currentPence, wasPricePence: was };
    }

    const save = SAVE_FRACTION.exec(text);
    if (save) {
        const numerator = Number(save[1]);
        const denominator = Number(save[2]);
        const was = moneyTextToPence(save[3] ?? '');
        if (was === null || denominator === 0 || numerator >= denominator) return unparsed();
        const expected = was * (1 - numerator / denominator);
        if (!penny(expected, prices.currentPence) || !wasMatchesStructured(was)) {
            return unparsed('prices in text disagree with the page');
        }
        return { type: 'price_reduction', ...common, pricePence: prices.currentPence, wasPricePence: was };
    }

    const moreCard = MORE_CARD.exec(text);
    if (moreCard) {
        const pricePence = moneyTextToPence(moreCard[1] ?? '');
        if (pricePence === null || pricePence >= prices.currentPence) return unparsed('loyalty price is not below the shelf price');
        return { type: 'loyalty_price', ...common, scheme: 'more_card', pricePence };
    }

    return unparsed();
}
