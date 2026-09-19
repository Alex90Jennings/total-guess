import { z } from 'zod';

/**
 * Unit prices are pence per basis and may be fractional (Morrisons shows
 * "83.3p/kg"). Nothing here rounds; rounding is for presentation only.
 */
export const UNIT_PRICE_BASES = ['100g', 'kg', '100ml', 'litre', 'each'] as const;

export const UnitPriceBasisSchema = z.enum(UNIT_PRICE_BASES);
export type UnitPriceBasis = z.infer<typeof UnitPriceBasisSchema>;

export const UnitPriceSchema = z.strictObject({
    pence: z.number().positive().finite(),
    basis: UnitPriceBasisSchema,
    /** "retailer": as the retailer displayed it. "calculated": price / quantity.total, by us. */
    source: z.enum(['retailer', 'calculated']),
});

export type UnitPrice = z.infer<typeof UnitPriceSchema>;
