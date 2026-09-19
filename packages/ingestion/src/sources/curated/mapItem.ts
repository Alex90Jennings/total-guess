/**
 * Legacy curated catalogue (src/data/items.js, the daily game's 268 items)
 * -> ProductListing + ReferencePrice.
 *
 * The catalogue has no barcodes, no dates and no product details beyond a
 * name, so:
 * - identity is the curated code (a source_record reference), not a barcode;
 * - the price is a ReferencePrice ("representative"), not a PriceObservation,
 *   because nobody recorded where or when it was seen;
 * - the quantity is read only from a size at the very end of the name;
 * - the legacy photos are left out: their licence is unknown.
 */
import { z } from 'zod';
import {
    NO_DIETARY_INFORMATION, ProductListingSchema, provenanceFor, ReferencePriceSchema, RetailerIdSchema, validate,
    type ParseResult, type ProductListing, type ReferencePrice,
} from '../../contract/index.js';
import { scaleDecimal } from '../../normalise/decimal.js';
import { parseQuantity } from '../../normalise/quantity.js';
import { cleanText } from '../../normalise/text.js';

export const CuratedItemSchema = z.object({
    _id: z.string().regex(/^[a-z]{2}\d{4}$/),
    description: z.string().min(1),
    price: z.number().positive(),
    /** Legacy store slug; these match retailer registry ids. */
    store: z.string(),
});

export type CuratedContext = { importedAt: string };

const CATALOGUE_URL = 'https://github.com/Alex90Jennings/total-guess/blob/main/src/data/items.js';
const TRAILING_SIZE = /((?:\d+\s*[x×]\s*)?\d+(?:\.\d+)?\s*(?:kg|g|ml|cl|l|litre|litres)|\d+\s*(?:pack|pk))$/i;

export function mapCuratedItem(input: unknown, context: CuratedContext): ParseResult<{ listing: ProductListing; referencePrice: ReferencePrice }> {
    const warnings: string[] = [];
    const parsed = CuratedItemSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`), warnings };
    }
    const item = parsed.data;
    const retailer = RetailerIdSchema.safeParse(item.store);
    if (!retailer.success) return { ok: false, errors: [`unknown store "${item.store}"`], warnings };

    const name = cleanText(item.description) ?? '';
    const size = TRAILING_SIZE.exec(name)?.[1];
    const quantity = size ? parseQuantity(size) : null;
    if (!quantity) warnings.push('quantity_not_in_name');

    const ref = { kind: 'source_record' as const, source: 'curated' as const, id: item._id };
    const provenance = provenanceFor('curated', {
        sourceRecordId: item._id, sourceUrl: CATALOGUE_URL, importedAt: context.importedAt, sourceUpdatedAt: null,
    });

    const listing = validate(ProductListingSchema, {
        ref,
        retailer: retailer.data,
        barcode: null,
        url: null,
        retailerCategoryPath: [],
        details: {
            name,
            brand: null,
            quantity,
            categories: { canonical: [] },
            description: null,
            ingredients: null,
            allergens: { status: 'unknown', contains: [], mayContain: [], unrecognised: [] },
            dietary: NO_DIETARY_INFORMATION,
            nutrition: null,
            images: [],
        },
        provenance,
    } satisfies ProductListing);
    if (!listing.ok) return { ...listing, warnings };

    let pricePence: number;
    try {
        pricePence = scaleDecimal(String(item.price), 2);
    } catch {
        return { ok: false, errors: [`price not a plain decimal: ${item.price}`], warnings };
    }
    const referencePrice = validate(ReferencePriceSchema, {
        productRef: ref, retailer: retailer.data, pricePence, kind: 'representative', provenance,
    } satisfies ReferencePrice);
    if (!referencePrice.ok) return { ...referencePrice, warnings };

    return { ok: true, value: { listing: listing.value, referencePrice: referencePrice.value }, warnings };
}
