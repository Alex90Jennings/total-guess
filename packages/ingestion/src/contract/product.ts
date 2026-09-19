/**
 * Products and how to refer to them.
 *
 *   ProductDetails   what a product is: name, size, ingredients, nutrition...
 *   Product          the canonical product, identified by barcode
 *   ProductListing   a product as one retailer (or one source) identifies it,
 *                    e.g. a Morrisons SKU, when no barcode is known
 *   ProductRecord    a Product plus the one source record it came from
 *
 * Every record is single-source: all of its values come from its
 * `provenance`. Nothing here depends on which source that was.
 */
import { z } from 'zod';
import { AllergenDataSchema } from './allergens.js';
import { BarcodeSchema } from './barcode.js';
import { ProductCategoriesSchema } from './categories.js';
import { DataSourceIdSchema } from './dataSource.js';
import { DietaryDataSchema } from './dietary.js';
import { ProductImageSchema } from './image.js';
import { NutritionDataSchema } from './nutrition.js';
import { ProvenanceSchema } from './provenance.js';
import { ProductQuantitySchema } from './quantity.js';
import { RetailerIdSchema } from './retailer.js';

const text = z.string().min(1);

export const ProductDetailsSchema = z.strictObject({
    name: text,
    brand: text.nullable(),
    quantity: ProductQuantitySchema.nullable(),
    categories: ProductCategoriesSchema,
    description: text.nullable(),
    ingredients: text.nullable(),
    allergens: AllergenDataSchema,
    dietary: DietaryDataSchema,
    nutrition: NutritionDataSchema.nullable(),
    images: z.array(ProductImageSchema),
});
export type ProductDetails = z.infer<typeof ProductDetailsSchema>;

export const ProductSchema = ProductDetailsSchema.extend({ barcode: BarcodeSchema });
export type Product = z.infer<typeof ProductSchema>;

// ---- references ----

export const BarcodeRefSchema = z.strictObject({ kind: z.literal('barcode'), barcode: BarcodeSchema });
export const RetailerSkuRefSchema = z.strictObject({ kind: z.literal('retailer_sku'), retailer: RetailerIdSchema, sku: text });
/** An id that only means something inside one source (e.g. a curated catalogue code). */
export const SourceRecordRefSchema = z.strictObject({ kind: z.literal('source_record'), source: DataSourceIdSchema, id: text });

export const ProductReferenceSchema = z.discriminatedUnion('kind', [BarcodeRefSchema, RetailerSkuRefSchema, SourceRecordRefSchema]);
export type ProductReference = z.infer<typeof ProductReferenceSchema>;

/** Stable string form, e.g. for map keys: "barcode:05000112637922", "retailer_sku:morrisons:112436491". */
export function referenceKey(ref: ProductReference): string {
    switch (ref.kind) {
        case 'barcode': return `barcode:${ref.barcode}`;
        case 'retailer_sku': return `retailer_sku:${ref.retailer}:${ref.sku}`;
        case 'source_record': return `source_record:${ref.source}:${ref.id}`;
    }
}

// ---- records ----

export const ProductRecordSchema = z.strictObject({
    product: ProductSchema,
    provenance: ProvenanceSchema,
});
export type ProductRecord = z.infer<typeof ProductRecordSchema>;

export const ProductListingSchema = z.strictObject({
    ref: z.discriminatedUnion('kind', [RetailerSkuRefSchema, SourceRecordRefSchema]),
    retailer: RetailerIdSchema.nullable(),
    /** Links the listing to a canonical Product when the source gives a barcode. */
    barcode: BarcodeSchema.nullable(),
    url: z.url().nullable(),
    /** The retailer's own breadcrumb; not a canonical category. */
    retailerCategoryPath: z.array(text),
    details: ProductDetailsSchema,
    provenance: ProvenanceSchema,
}).refine((l) => l.ref.kind !== 'retailer_sku' || l.ref.retailer === l.retailer, {
    message: 'a retailer SKU belongs to the listing retailer', path: ['retailer'],
});
export type ProductListing = z.infer<typeof ProductListingSchema>;
