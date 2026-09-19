/**
 * The commercial side of one price observation.
 *
 * `pricePence` is always the price that was actually observed, and
 * `priceCondition` says who could pay it:
 *   none            any shopper (including reductions open to everyone)
 *   loyalty_member  only with a loyalty card: never a shelf price
 *   unknown         the source says it was discounted but not how
 * "What does a normal shopper pay?" must only use condition "none".
 */
import { z } from 'zod';
import { PromotionSchema } from './promotion.js';
import { UnitPriceSchema } from './unitPrice.js';

const pence = z.int().positive();

export const PRICE_CONDITIONS = ['none', 'loyalty_member', 'unknown'] as const;

export const OfferDataSchema = z
    .strictObject({
        pricePence: pence,
        priceCondition: z.enum(PRICE_CONDITIONS),
        /** The regular price, when the observed price is below it and the source states it. */
        wasPricePence: pence.nullable(),
        /** The unit price the retailer displayed, on its own basis. */
        retailerUnitPrice: UnitPriceSchema.refine((u) => u.source === 'retailer', 'must be the retailer figure').nullable(),
        promotions: z.array(PromotionSchema),
        availability: z.enum(['in_stock', 'out_of_stock', 'unknown']),
    })
    .refine((o) => o.wasPricePence === null || o.wasPricePence > o.pricePence, {
        message: 'was-price must be above the observed price', path: ['wasPricePence'],
    })
    .refine((o) => o.priceCondition !== 'none' || o.promotions.every((p) => p.type !== 'loyalty_price' || p.pricePence < o.pricePence), {
        message: 'a loyalty price must be below the shelf price', path: ['promotions'],
    });
export type OfferData = z.infer<typeof OfferDataSchema>;
export type PriceCondition = OfferData['priceCondition'];
