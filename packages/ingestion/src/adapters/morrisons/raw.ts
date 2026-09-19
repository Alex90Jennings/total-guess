/**
 * Zod schemas for the Morrisons JSON we read, and only the parts we read.
 * These are the first validation layer: if Morrisons changes its page shape,
 * parsing fails loudly here rather than producing half-empty observations.
 *
 * Shapes were taken from real pages captured on 2026-09-18 (see README).
 * Fields marked "unverified" are read defensively but were not present in
 * any captured page.
 */
import { z } from 'zod';

const decimal = z.string().regex(/^\d+(\.\d+)?$/, 'expected a decimal string');

/** GBX = pence. Used for sub-pound unit prices. */
export const MoneySchema = z.object({ amount: decimal, currency: z.enum(['GBP', 'GBX']) });
export type Money = z.infer<typeof MoneySchema>;

const Measure = z.object({ value: decimal, uom: z.string() });

/** Weighed products: priced at a typical weight within a min/max range. */
export const CatchWeightSchema = z.object({
    minQuantity: Measure,
    typicalQuantity: Measure,
    maxQuantity: Measure,
});

export const AttributeSchema = z.object({ icon: z.string(), label: z.string().nullish() });

// ---- product page: window.__QUERY_INITIAL_STATE__, query key ["bop", <sku>] ----

const ProductPagePromotionSchema = z.object({
    promoId: z.string(),
    retailerPromotionId: z.string().nullish(),
    description: z.string(),
    type: z.string(),
    requiredProductQuantity: z.int().nullish(),
});

export const ProductPageProductSchema = z.object({
    retailerProductId: z.string().regex(/^\d+$/),
    name: z.string(),
    brand: z.string().nullish(),
    packSizeDescription: z.string().nullish(),
    price: MoneySchema,
    unitPrice: z.object({ price: MoneySchema, unit: z.string() }).nullish(),
    available: z.boolean(),
    promotions: z.array(ProductPagePromotionSchema).nullish(),
    image: z.object({ src: z.string() }).nullish(),
    categoryPath: z.array(z.string()).nullish(),
    /** Unverified on product pages (seen on listings only). */
    attributes: z.array(z.unknown()).nullish(),
    /** Present but empty on the captured page; item shape unverified. */
    iconAttributes: z.array(z.unknown()).nullish(),
    /** Unverified on product pages (seen on listings only). */
    catchweight: CatchWeightSchema.nullish(),
});

export const BopDataSchema = z.object({
    detailedDescription: z.string().nullish(),
    fields: z.array(z.object({ title: z.string(), content: z.string() })).nullish(),
});

export const BopPromotionSchema = z.object({
    promoId: z.string(),
    retailerPromotionId: z.string().nullish(),
    description: z.string(),
    longDescription: z.string().nullish(),
    isMultiBuy: z.boolean().nullish(),
});

export const BopQueryDataSchema = z.object({
    product: ProductPageProductSchema,
    bopData: BopDataSchema.nullish(),
    bopPromotions: z.array(BopPromotionSchema).nullish(),
});

export const QueryStateSchema = z.object({
    queries: z.array(z.object({
        queryKey: z.array(z.unknown()),
        state: z.object({ data: z.unknown() }),
    })),
});

export const JsonLdProductSchema = z.object({
    '@type': z.literal('Product'),
    sku: z.string().nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    image: z.union([z.string(), z.array(z.string())]).nullish(),
    offers: z.object({
        price: decimal,
        priceCurrency: z.literal('GBP'),
        availability: z.string().nullish(),
    }).nullish(),
});

// ---- listing page: window.__INITIAL_STATE__.data.products.productEntities ----

const ListingOfferSchema = z.object({
    id: z.string(),
    retailerPromotionId: z.string().nullish(),
    description: z.string(),
    type: z.string(),
});

export const ListingEntitySchema = z.object({
    retailerProductId: z.string().regex(/^\d+$/),
    name: z.string(),
    brand: z.string().nullish(),
    available: z.boolean(),
    price: z.object({
        current: MoneySchema,
        original: MoneySchema.nullish(),
        unit: z.object({ label: z.string(), current: MoneySchema, original: MoneySchema.nullish() }).nullish(),
    }),
    size: z.object({ value: z.string(), uom: z.string().nullish(), catchWeight: z.boolean().nullish() }).nullish(),
    catchweight: CatchWeightSchema.nullish(),
    offers: z.array(ListingOfferSchema).nullish(),
    attributes: z.array(z.unknown()).nullish(),
    image: z.object({ src: z.string() }).nullish(),
    categoryPath: z.array(z.string()).nullish(),
});
export type ListingEntity = z.infer<typeof ListingEntitySchema>;

export const ListingStateSchema = z.object({
    data: z.object({
        products: z.object({ productEntities: z.record(z.string(), z.unknown()) }),
    }),
});
