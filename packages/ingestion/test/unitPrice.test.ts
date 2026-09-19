import { describe, expect, it } from 'vitest';
import type { UnitPrice } from '../src/contract/unitPrice.js';
import { parseQuantity } from '../src/normalise/quantity.js';
import {
    comparableUnitPrice, convertUnitPrice, IncompatibleBasisError, unitPricesAgree,
} from '../src/normalise/unitPrice.js';

const q = (raw: string) => {
    const quantity = parseQuantity(raw);
    if (!quantity) throw new Error(`test setup: ${raw} did not parse`);
    return quantity;
};
const retailer = (pence: number, basis: UnitPrice['basis']): UnitPrice => ({ pence, basis, source: 'retailer' });

describe('comparableUnitPrice (price / quantity.total)', () => {
    it('prices mass per kg', () => {
        expect(comparableUnitPrice(45, q('500g'))).toEqual({ pence: 90, basis: 'kg', source: 'calculated' });
    });

    it('uses the multipack total, not the per-pack amount', () => {
        expect(comparableUnitPrice(175, q('4 x 400g')).pence).toBeCloseTo(109.375, 10);
    });

    it('keeps fractional pennies: 400p for 12 x 400g is 83.333...p/kg', () => {
        const price = comparableUnitPrice(400, q('12 x 400g'));
        expect(price.pence).toBeCloseTo(83.3333333333, 8);
        expect(Number.isInteger(price.pence)).toBe(false);
    });

    it('prices volume per litre and counts per item', () => {
        expect(comparableUnitPrice(700, q('750ml')).pence).toBeCloseTo(933.3333333, 6);
        expect(comparableUnitPrice(180, q('6 per pack'))).toEqual({ pence: 30, basis: 'each', source: 'calculated' });
    });
});

describe('convertUnitPrice', () => {
    it('converts between bases of the same kind without rounding', () => {
        expect(convertUnitPrice(retailer(113, 'kg'), '100g').pence).toBeCloseTo(11.3, 10);
        expect(convertUnitPrice(retailer(11.3, '100g'), 'kg').pence).toBeCloseTo(113, 10);
        expect(convertUnitPrice(retailer(83.3, 'kg'), '100g').pence).toBeCloseTo(8.33, 10);
        expect(convertUnitPrice(retailer(933.33, 'litre'), '100ml').pence).toBeCloseTo(93.333, 10);
    });

    it('keeps the source of the figure it converts', () => {
        expect(convertUnitPrice(retailer(113, 'kg'), '100g').source).toBe('retailer');
    });

    it('refuses to convert between kinds', () => {
        expect(() => convertUnitPrice(retailer(113, 'kg'), 'litre')).toThrow(IncompatibleBasisError);
        expect(() => convertUnitPrice(retailer(30, 'each'), 'kg')).toThrow(IncompatibleBasisError);
    });
});

describe('unitPricesAgree', () => {
    it('accepts the retailer rounding to the penny (45p / 400g = 112.5p/kg shown as £1.13)', () => {
        expect(unitPricesAgree(retailer(113, 'kg'), comparableUnitPrice(45, q('400g')))).toBe(true);
    });

    it('compares across bases', () => {
        expect(unitPricesAgree(retailer(11.25, '100g'), comparableUnitPrice(45, q('400g')))).toBe(true);
    });

    it('flags a figure that implies a different pack size', () => {
        // 300p over "6 x 270g" = 185p/kg; the same price over 270g would be 1111p/kg
        expect(unitPricesAgree(retailer(1111, 'kg'), comparableUnitPrice(300, q('6 x 270g')))).toBe(false);
    });

    it('never agrees across kinds', () => {
        expect(unitPricesAgree(retailer(30, 'each'), comparableUnitPrice(30, q('1kg')))).toBe(false);
    });
});
