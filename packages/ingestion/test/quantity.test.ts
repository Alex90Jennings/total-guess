import { describe, expect, it } from 'vitest';
import { makeQuantity, ProductQuantitySchema } from '../src/contract/quantity.js';
import { parseQuantity, variableMassQuantity } from '../src/normalise/quantity.js';

describe('parseQuantity semantics', () => {
    it.each([
        // raw           kind      unit    perPack  packCount  total
        ['400g',        'mass',   'g',    400,     1,         400],
        ['1kg',         'mass',   'g',    1000,    1,         1000],
        ['1.2kg',       'mass',   'g',    1200,    1,         1200],
        ['1.1kg',       'mass',   'g',    1100,    1,         1100], // 1.1 * 1000 is 1100.0000000000002 in floats
        ['4 x 400g',    'mass',   'g',    400,     4,         1600],
        ['4x400g',      'mass',   'g',    400,     4,         1600],
        ['12 x 400g',   'mass',   'g',    400,     12,        4800],
        ['2L',          'volume', 'ml',   2000,    1,         2000],
        ['1L',          'volume', 'ml',   1000,    1,         1000],
        ['500ml',       'volume', 'ml',   500,     1,         500],
        ['70cl',        'volume', 'ml',   700,     1,         700],
        ['6 x 330ml',   'volume', 'ml',   330,     6,         1980],
        ['18 x 330ml',  'volume', 'ml',   330,     18,        5940],
        ['4 pack',      'count',  'each', 4,       1,         4],
        ['6 per pack',  'count',  'each', 6,       1,         6],
        ['340G',        'mass',   'g',    340,     1,         340],
        ['2 pints',     'volume', 'ml',   1136.5225, 1,       1136.5225],
        ['1 pint',      'volume', 'ml',   568.26125, 1,       568.26125],
    ])('%s -> %s %s x%s = %s', (raw, kind, unit, perPack, packCount, total) => {
        expect(parseQuantity(raw)).toEqual(expect.objectContaining({ kind, unit, perPack, packCount, total, raw }));
    });

    it('keeps the retailer string verbatim in raw', () => {
        expect(parseQuantity('  4 x 400g ')?.raw).toBe('4 x 400g');
    });

    it.each(['', '340', 'Each', 'Pack of 4', '4 x', 'about 400g', '0g', '400 grams', '2 x 6 pack'])(
        'returns null for unreadable %j rather than guessing',
        (raw) => expect(parseQuantity(raw)).toBeNull(),
    );

    it('every parsed quantity satisfies the schema', () => {
        for (const raw of ['400g', '4 x 400g', '6 x 330ml', '70cl', '6 per pack']) {
            expect(ProductQuantitySchema.safeParse(parseQuantity(raw)).success).toBe(true);
        }
    });
});

describe('ProductQuantity invariants', () => {
    it('rejects a total that is not perPack x packCount', () => {
        const q = { ...makeQuantity({ kind: 'mass', perPack: 400, packCount: 4, raw: '4 x 400g' }), total: 400 };
        expect(ProductQuantitySchema.safeParse(q).success).toBe(false);
    });

    it('rejects a unit that does not belong to the kind', () => {
        const q = { ...makeQuantity({ kind: 'mass', perPack: 400, packCount: 1, raw: '400g' }), unit: 'ml' };
        expect(ProductQuantitySchema.safeParse(q).success).toBe(false);
    });

    it('rejects fractional counts', () => {
        const q = { kind: 'count', unit: 'each', perPack: 1.5, packCount: 1, total: 1.5, raw: '1.5 pack' };
        expect(ProductQuantitySchema.safeParse(q).success).toBe(false);
    });

    it('models weighed products as a typical weight inside a range', () => {
        const q = variableMassQuantity('340 G', 340, { min: 200, max: 480 });
        expect(q).toMatchObject({ kind: 'mass', total: 340, variableWeight: { min: 200, max: 480 } });
        expect(ProductQuantitySchema.safeParse(q).success).toBe(true);
        expect(variableMassQuantity('600 G', 600, { min: 200, max: 480 })).toBeNull();
    });
});
