/**
 * How much product a listing sells, in base units.
 *
 *   perPack    amount in one inner unit (one can, one bottle, one pack of eggs)
 *   packCount  number of inner units sold together
 *   total      perPack x packCount: what the shopper actually gets
 *
 *   400g      -> mass   400 x 1  = 400 g
 *   4 x 400g  -> mass   400 x 4  = 1600 g
 *   6 x 330ml -> volume 330 x 6  = 1980 ml
 *   6 per pack-> count  6 x 1    = 6 each
 *
 * Basket and unit-price code must use `total`, never `perPack`.
 *
 * The kind fixes the unit, so "mass in ml" cannot be written down. The
 * total = perPack x packCount invariant cannot be expressed in TypeScript, so
 * build quantities with makeQuantity() and let the schema refine enforce it.
 */
import { z } from 'zod';

const amount = z.number().positive().finite();
const packCount = z.int().positive();
const raw = z.string().min(1);

/** Weighed ("catch weight") items: the pack's real weight falls in this range, in grams. */
export const WeightRangeSchema = z
    .strictObject({ min: amount, max: amount })
    .refine((range) => range.min <= range.max, 'min must not exceed max');

const MassSchema = z.strictObject({
    kind: z.literal('mass'),
    unit: z.literal('g'),
    perPack: amount,
    packCount,
    total: amount,
    /** Null for fixed-weight packs. Set when the price is an estimate at a typical weight. */
    variableWeight: WeightRangeSchema.nullable(),
    raw,
});

const VolumeSchema = z.strictObject({
    kind: z.literal('volume'),
    unit: z.literal('ml'),
    perPack: amount,
    packCount,
    total: amount,
    raw,
});

const CountSchema = z.strictObject({
    kind: z.literal('count'),
    unit: z.literal('each'),
    perPack: z.int().positive(),
    packCount,
    total: z.int().positive(),
    raw,
});

function totalMatches(q: { perPack: number; packCount: number; total: number }): boolean {
    const expected = q.perPack * q.packCount;
    return Math.abs(q.total - expected) <= Number.EPSILON * Math.max(1, expected) * 4;
}

export const ProductQuantitySchema = z
    .discriminatedUnion('kind', [MassSchema, VolumeSchema, CountSchema])
    .refine(totalMatches, { message: 'total must equal perPack x packCount', path: ['total'] })
    .refine(
        (q) => q.kind !== 'mass' || q.variableWeight === null
            || (q.variableWeight.min <= q.total && q.total <= q.variableWeight.max),
        { message: 'typical weight must fall inside the variable weight range', path: ['variableWeight'] },
    );

export type ProductQuantity = z.infer<typeof ProductQuantitySchema>;
export type QuantityKind = ProductQuantity['kind'];
export type WeightRange = z.infer<typeof WeightRangeSchema>;

export const UNIT_FOR_KIND = { mass: 'g', volume: 'ml', count: 'each' } as const;

type MakeQuantityArgs =
    | { kind: 'mass'; perPack: number; packCount: number; raw: string; variableWeight?: WeightRange | null }
    | { kind: 'volume' | 'count'; perPack: number; packCount: number; raw: string };

/** The only way code should build a quantity: total is always derived. */
export function makeQuantity(args: MakeQuantityArgs): ProductQuantity {
    const total = args.perPack * args.packCount;
    switch (args.kind) {
        case 'mass':
            return { kind: 'mass', unit: 'g', perPack: args.perPack, packCount: args.packCount, total,
                variableWeight: args.variableWeight ?? null, raw: args.raw };
        case 'volume':
            return { kind: 'volume', unit: 'ml', perPack: args.perPack, packCount: args.packCount, total, raw: args.raw };
        case 'count':
            return { kind: 'count', unit: 'each', perPack: args.perPack, packCount: args.packCount, total, raw: args.raw };
    }
}
