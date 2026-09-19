/**
 * Morrisons vocabulary -> contract vocabulary. Anything not listed here is
 * dropped with a warning rather than guessed at.
 */
import type { DietaryClaim } from '../../contract/dietary.js';
import type { ProductQuantity } from '../../contract/quantity.js';
import type { UnitPrice, UnitPriceBasis } from '../../contract/unitPrice.js';
import { amountToPence } from '../../normalise/money.js';
import { massToGrams, parseQuantity, variableMassQuantity } from '../../normalise/quantity.js';
import { AttributeSchema, type CatchWeightSchema, type Money } from './raw.js';
import type { z } from 'zod';

/**
 * Morrisons' unit-price label keys that map exactly onto a contract basis.
 * The page defines about 30 (per 75cl, per dozen, per wash...); those are
 * reported as unsupported instead of being converted.
 */
const UNIT_LABELS: Record<string, UnitPriceBasis> = {
    'fop.price.per.kg': 'kg',
    'fop.price.per.1000gram': 'kg',
    'fop.price.per.100gram': '100g',
    'fop.price.per.litre': 'litre',
    'fop.price.per.1000ml': 'litre',
    'fop.price.per.100ml': '100ml',
    'fop.price.per.each': 'each',
};

export function retailerUnitPrice(
    price: Money,
    label: string,
    warnings: string[],
): UnitPrice | null {
    const basis = UNIT_LABELS[label];
    if (!basis) {
        warnings.push(`unit_price_basis_unsupported: ${label}`);
        return null;
    }
    const pence = amountToPence(price.amount, price.currency);
    if (!(pence > 0)) {
        warnings.push(`unit_price_not_positive: ${price.amount} ${price.currency}`);
        return null;
    }
    return { pence, basis, source: 'retailer' };
}

const DIETARY_ICONS: Record<string, DietaryClaim> = {
    vegetarian: 'vegetarian',
    vegan: 'vegan',
    gluten_free: 'gluten_free',
};

/**
 * Listing attributes look like {icon: "vegan", label: "Vegan"}: the retailer's
 * own labels, so they are claims, not inference. Non-dietary icons (organic,
 * frozen) are ignored.
 */
export function dietaryClaims(attributes: unknown[] | null | undefined): DietaryClaim[] {
    const flags = new Set<DietaryClaim>();
    for (const item of attributes ?? []) {
        const parsed = AttributeSchema.safeParse(item);
        const flag = parsed.success ? DIETARY_ICONS[parsed.data.icon] : undefined;
        if (flag) flags.add(flag);
    }
    return [...flags];
}

type CatchWeight = z.infer<typeof CatchWeightSchema>;

/** Weighed product -> mass quantity at its typical weight, with the min-max range. */
export function catchWeightQuantity(catchweight: CatchWeight, warnings: string[]): ProductQuantity | null {
    const typical = massToGrams(catchweight.typicalQuantity.value, catchweight.typicalQuantity.uom);
    const min = massToGrams(catchweight.minQuantity.value, catchweight.minQuantity.uom);
    const max = massToGrams(catchweight.maxQuantity.value, catchweight.maxQuantity.uom);
    const raw = `${catchweight.typicalQuantity.value} ${catchweight.typicalQuantity.uom} `
        + `(${catchweight.minQuantity.value} ${catchweight.minQuantity.uom}-${catchweight.maxQuantity.value} ${catchweight.maxQuantity.uom})`;
    const quantity = typical !== null && min !== null && max !== null
        ? variableMassQuantity(raw, typical, { min, max })
        : null;
    if (!quantity) warnings.push(`quantity_unparsed: catch weight ${raw}`);
    return quantity;
}

export function sizeQuantity(sizeText: string | null | undefined, warnings: string[]): ProductQuantity | null {
    if (!sizeText?.trim()) {
        warnings.push('quantity_missing');
        return null;
    }
    const quantity = parseQuantity(sizeText);
    if (!quantity) warnings.push(`quantity_unparsed: "${sizeText}"`);
    return quantity;
}

/** Shelf prices must be whole pence; anything else means we misread the page. */
export function shelfPricePence(price: Money): number | null {
    const pence = amountToPence(price.amount, price.currency);
    return Number.isInteger(pence) && pence > 0 ? pence : null;
}
