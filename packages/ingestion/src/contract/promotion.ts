/**
 * Promotions, as a closed set of mechanics. Each variant exists because its
 * pattern appears in real source data.
 *
 * Rules for consumers (the future basket engine):
 * - `price_reduction` and `clearance` describe why the observed price is low;
 *   the offer's pricePence already includes them. Never apply them again.
 * - `multibuy` applies across all basket lines that share retailerPromotionId,
 *   so it always has one. The wording does not tell you the scope: most
 *   multibuy ids in the Morrisons sample covered several products.
 * - `loyalty_price` needs a loyalty card; only apply it if the shopper opts in.
 * - `clearance` (short-dated reductions) is not representative of the usual
 *   price; exclude it from "typical price" statistics.
 * - `unparsed` is never applied to a calculated total. Show `text` (or, when
 *   the source gave no wording, a generic "discount" note) and nothing more.
 */
import { z } from 'zod';

const pence = z.int().positive();

const common = {
    retailerPromotionId: z.string().min(1).nullable(),
    /** Exactly as the source wrote it; null when the source gives no wording (e.g. Open Prices). */
    text: z.string().min(1).nullable(),
    /** Last calendar day of the offer (UK local date, inclusive), when stated. */
    endsOn: z.iso.date().nullable(),
};

const MultibuySchema = z.strictObject({
    type: z.literal('multibuy'),
    ...common,
    retailerPromotionId: z.string().min(1),
    /** Number of qualifying items needed. */
    quantity: z.int().min(2),
    /** Price for `quantity` qualifying items together. */
    pricePence: pence,
});

const PriceReductionSchema = z
    .strictObject({ type: z.literal('price_reduction'), ...common, pricePence: pence, wasPricePence: pence })
    .refine((p) => p.pricePence < p.wasPricePence, { message: 'price must be below was-price', path: ['pricePence'] });

const ClearanceSchema = z
    .strictObject({ type: z.literal('clearance'), ...common, pricePence: pence, wasPricePence: pence.nullable() })
    .refine((p) => p.wasPricePence === null || p.pricePence < p.wasPricePence, { message: 'price must be below was-price', path: ['pricePence'] });

export const LOYALTY_SCHEMES = ['more_card', 'clubcard', 'nectar', 'lidl_plus', 'coop_membership', 'unspecified'] as const;

const LoyaltyPriceSchema = z.strictObject({
    type: z.literal('loyalty_price'),
    ...common,
    scheme: z.enum(LOYALTY_SCHEMES),
    pricePence: pence,
});

const UnparsedSchema = z
    .strictObject({
        type: z.literal('unparsed'),
        ...common,
        /** The source's own code for the discount, e.g. an Open Prices discount_type. */
        sourceCode: z.string().min(1).nullable(),
    })
    .refine((p) => p.text !== null || p.sourceCode !== null, { message: 'an unparsed promotion needs text or a source code', path: ['text'] });

export const PromotionSchema = z.discriminatedUnion('type', [
    MultibuySchema,
    PriceReductionSchema,
    ClearanceSchema,
    LoyaltyPriceSchema,
    UnparsedSchema,
]);

export type Promotion = z.infer<typeof PromotionSchema>;
export type PromotionType = Promotion['type'];
export type LoyaltyScheme = (typeof LOYALTY_SCHEMES)[number];
