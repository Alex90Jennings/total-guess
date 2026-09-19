import type { OfferData } from '../../contract/offer.js';
import type { ProductQuantity } from '../../contract/quantity.js';
import { comparableUnitPrice, convertUnitPrice, unitPricesAgree } from '../../normalise/unitPrice.js';
import { retailerUnitPrice, shelfPricePence } from './mappings.js';
import { classifyPromotion, type RawPromotion } from './promotions.js';
import type { Money } from './raw.js';

export type RawOffer = {
    price: Money;
    originalPrice: Money | null;
    unitPrice: { price: Money; label: string } | null;
    available: boolean;
    promotions: RawPromotion[];
};

/**
 * Builds OfferData, or returns null (with an error) when the shelf price
 * itself cannot be trusted. Everything softer is a warning.
 */
export function buildOffer(raw: RawOffer, errors: string[], warnings: string[]): OfferData | null {
    const pricePence = shelfPricePence(raw.price);
    if (pricePence === null) {
        errors.push(`price is not a whole positive number of pence: ${raw.price.amount} ${raw.price.currency}`);
        return null;
    }
    const originalPence = raw.originalPrice ? shelfPricePence(raw.originalPrice) : null;
    if (raw.originalPrice && originalPence === null) warnings.push('was_price_unreadable');

    const promotions = raw.promotions.map((promotion) =>
        classifyPromotion(promotion, { currentPence: pricePence, originalPence }, warnings));

    // Prefer the structured was-price; fall back to one proven by a price-reduction promotion.
    const reduction = promotions.find((p) => p.type === 'price_reduction');
    const wasPricePence = originalPence ?? (reduction?.type === 'price_reduction' ? reduction.wasPricePence : null);

    return {
        pricePence,
        // A retailer page shows the price anyone pays; member prices arrive as loyalty_price promotions.
        priceCondition: 'none',
        retailerUnitPrice: raw.unitPrice ? retailerUnitPrice(raw.unitPrice.price, raw.unitPrice.label, warnings) : null,
        wasPricePence: wasPricePence !== null && wasPricePence > pricePence ? wasPricePence : null,
        promotions,
        availability: raw.available ? 'in_stock' : 'out_of_stock',
    };
}

/**
 * Our own price / total against the retailer's displayed unit price. A
 * disagreement usually means the pack size was misread (or misstated), so it
 * is surfaced, never silently "fixed".
 */
export function crossCheckUnitPrice(offer: OfferData, quantity: ProductQuantity | null, warnings: string[]): void {
    if (!offer.retailerUnitPrice) return;
    if (!quantity) {
        // Morrisons' "each" is per item when the pack count is known (a 6-pack of eggs
        // is priced per egg) but per pack when it is not.
        if (offer.retailerUnitPrice.basis === 'each') warnings.push('unit_price_each_ambiguous: no quantity to say what "each" counts');
        return;
    }
    const ours = comparableUnitPrice(offer.pricePence, quantity);
    if (unitPricesAgree(offer.retailerUnitPrice, ours)) return;
    let theirs = `${offer.retailerUnitPrice.pence}p/${offer.retailerUnitPrice.basis}`;
    try {
        theirs += ` (= ${convertUnitPrice(offer.retailerUnitPrice, ours.basis).pence.toFixed(2)}p/${ours.basis})`;
    } catch {
        // Different kinds of unit (e.g. per each vs per kg): nothing to convert.
    }
    warnings.push(`unit_price_mismatch: retailer ${theirs} vs calculated ${ours.pence.toFixed(2)}p/${ours.basis} from ${quantity.total}${quantity.unit}`);
}
