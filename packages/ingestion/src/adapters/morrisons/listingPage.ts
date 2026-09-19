/**
 * Morrisons category listing -> PriceObservation per product.
 *
 * Listings carry prices, unit prices, promotions and pack sizes for up to 50
 * products per request, but no descriptions or ingredients. They therefore
 * produce price observations plus catalogue hints for discovery, never
 * ProductListings with half their fields missing.
 */
import {
    PriceObservationSchema, provenanceFor, validate,
    type DietaryClaim, type ParseResult, type PriceObservation, type ProductQuantity,
} from '../../contract/index.js';
import { cleanText } from '../../normalise/text.js';
import type { PageContext } from '../types.js';
import { ExtractionError, extractListingPage } from './extract.js';
import { catchWeightQuantity, dietaryClaims, sizeQuantity } from './mappings.js';
import { buildOffer, crossCheckUnitPrice } from './offer.js';
import { ukDate } from './productPage.js';
import { ListingEntitySchema, ListingStateSchema } from './raw.js';

/** Catalogue fields a listing does show; enough to queue a product page fetch. */
export type CatalogueHints = {
    name: string;
    brand: string | null;
    sizeText: string | null;
    quantity: ProductQuantity | null;
    retailerCategoryPath: string[];
    imageUrl: string | null;
    dietaryClaims: DietaryClaim[];
};

export type ListingEntry = {
    retailerSku: string | null;
    result: ParseResult<PriceObservation>;
    hints: CatalogueHints | null;
    /** The entity exactly as Morrisons sent it, for audits and PoC review. */
    raw: unknown;
};

export class ListingPageError extends Error {}

export function parseMorrisonsListingEntries(html: string, context: PageContext): ListingEntry[] {
    let blobs;
    try {
        blobs = extractListingPage(html, context.url);
    } catch (error) {
        if (error instanceof ExtractionError) throw new ListingPageError(error.message);
        throw error;
    }
    const state = ListingStateSchema.safeParse(blobs.initialState);
    if (!state.success) throw new ListingPageError('listing state has an unexpected shape');

    return Object.values(state.data.data.products.productEntities).map((raw): ListingEntry => {
        const errors: string[] = [];
        const warnings: string[] = [];
        const parsed = ListingEntitySchema.safeParse(raw);
        if (!parsed.success) {
            const sku = (raw as { retailerProductId?: unknown })?.retailerProductId;
            return {
                retailerSku: typeof sku === 'string' ? sku : null,
                result: { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`), warnings },
                hints: null,
                raw,
            };
        }
        const entity = parsed.data;
        const sku = entity.retailerProductId;
        const url = blobs.productUrls.get(sku);

        const sizeText = entity.size ? [entity.size.value, entity.size.uom].filter(Boolean).join(' ') : null;
        const quantity = entity.catchweight
            ? catchWeightQuantity(entity.catchweight, warnings)
            : sizeQuantity(entity.size?.uom ? `${entity.size.value}${entity.size.uom}` : entity.size?.value, warnings);

        const offer = buildOffer({
            price: entity.price.current,
            originalPrice: entity.price.original ?? null,
            unitPrice: entity.price.unit ? { price: entity.price.unit.current, label: entity.price.unit.label } : null,
            available: entity.available,
            promotions: (entity.offers ?? []).map((o) => ({ retailerPromotionId: o.retailerPromotionId ?? null, text: o.description })),
        }, errors, warnings);
        if (offer) crossCheckUnitPrice(offer, quantity, warnings);

        const hints: CatalogueHints = {
            name: cleanText(entity.name) ?? '',
            brand: cleanText(entity.brand),
            sizeText,
            quantity,
            retailerCategoryPath: (entity.categoryPath ?? []).map((c) => cleanText(c)).filter((c): c is string => c !== null),
            imageUrl: entity.image?.src ?? null,
            dietaryClaims: dietaryClaims(entity.attributes),
        };

        if (!url) errors.push('no product link for this SKU on the listing page');
        const result: ParseResult<PriceObservation> = !offer || !url || errors.length
            ? { ok: false, errors, warnings }
            : validate(PriceObservationSchema, {
                productRef: { kind: 'retailer_sku', retailer: 'morrisons', sku },
                retailer: 'morrisons',
                store: null,
                channel: 'online',
                offer,
                observedOn: ukDate(context.fetchedAt),
                observedAt: context.fetchedAt,
                evidence: 'retailer_page',
                provenance: provenanceFor('morrisons', { sourceRecordId: sku, sourceUrl: url, importedAt: context.fetchedAt, sourceUpdatedAt: null }),
            } satisfies PriceObservation, warnings);
        return { retailerSku: sku, result, hints, raw };
    });
}
