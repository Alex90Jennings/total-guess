/**
 * Deterministic unit-price maths. Retailers quote unit prices on different
 * bases (per kg, per 100g, per litre...), so comparisons go through
 * convertUnitPrice first. Nothing here rounds.
 */
import type { ProductQuantity, QuantityKind } from '../contract/quantity.js';
import type { UnitPrice, UnitPriceBasis } from '../contract/unitPrice.js';

/** What each basis measures, and how many base units (g, ml, each) it covers. */
export const BASIS: Record<UnitPriceBasis, { kind: QuantityKind; baseUnits: number }> = {
    '100g': { kind: 'mass', baseUnits: 100 },
    kg: { kind: 'mass', baseUnits: 1000 },
    '100ml': { kind: 'volume', baseUnits: 100 },
    litre: { kind: 'volume', baseUnits: 1000 },
    each: { kind: 'count', baseUnits: 1 },
};

/** The basis calculated unit prices are expressed in, per kind of quantity. */
export const COMPARABLE_BASIS: Record<QuantityKind, UnitPriceBasis> = {
    mass: 'kg',
    volume: 'litre',
    count: 'each',
};

export class IncompatibleBasisError extends Error {
    constructor(from: UnitPriceBasis, to: UnitPriceBasis) {
        super(`cannot convert a unit price per ${from} to per ${to}`);
        this.name = 'IncompatibleBasisError';
    }
}

export function convertUnitPrice(price: UnitPrice, to: UnitPriceBasis): UnitPrice {
    const from = BASIS[price.basis];
    const target = BASIS[to];
    if (from.kind !== target.kind) throw new IncompatibleBasisError(price.basis, to);
    return { ...price, basis: to, pence: (price.pence * target.baseUnits) / from.baseUnits };
}

/**
 * pricePence / quantity.total, on the comparable basis for the quantity's kind.
 * Always uses `total`, so a 4 x 400g multipack is priced per kg of all 1600g.
 */
export function comparableUnitPrice(pricePence: number, quantity: ProductQuantity): UnitPrice {
    const basis = COMPARABLE_BASIS[quantity.kind];
    return {
        pence: (pricePence * BASIS[basis].baseUnits) / quantity.total,
        basis,
        source: 'calculated',
    };
}

/**
 * Whether two unit prices describe the same thing, allowing for the retailer
 * rounding its display to the penny. Different kinds never agree.
 */
export function unitPricesAgree(a: UnitPrice, b: UnitPrice, relativeTolerance = 0.01): boolean {
    if (BASIS[a.basis].kind !== BASIS[b.basis].kind) return false;
    const other = convertUnitPrice(b, a.basis).pence;
    const allowed = Math.max(0.5 + 1e-9, a.pence * relativeTolerance);
    return Math.abs(a.pence - other) <= allowed;
}
