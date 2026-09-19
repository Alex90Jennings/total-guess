/**
 * Open Prices observation -> PriceObservation.
 *
 * Open Prices is crowdsourced evidence (a photographed receipt or shelf tag)
 * of a price on a day. It is mapped as exactly that, never as a current offer.
 *
 * Discounts, as far as Open Prices describes them:
 *   none               -> priceCondition "none"
 *   LOYALTY_PROGRAM    -> "loyalty_member": a member price, never a shelf price
 *   SALE, SEASONAL     -> "none" + price_reduction (when the regular price is given)
 *   EXPIRES_SOON       -> "none" + clearance (short-dated; not a typical price)
 *   anything else, or discounted with no type -> "unknown"
 *
 * The contributor username (`owner`) is deliberately never read.
 */
import { z } from 'zod';
import {
    PriceObservationSchema, provenanceFor, resolveRetailer, toBarcode, validate,
    type OfferData, type ParseResult, type PriceObservation, type Promotion, type Store,
} from '../../contract/index.js';
import { scaleDecimal } from '../../normalise/decimal.js';

export const OpenPriceSchema = z.object({
    id: z.number(),
    type: z.enum(['PRODUCT', 'CATEGORY']),
    product_code: z.string().nullish(),
    category_tag: z.string().nullish(),
    price: z.number(),
    currency: z.string(),
    price_is_discounted: z.boolean().nullish(),
    price_without_discount: z.number().nullish(),
    discount_type: z.string().nullish(),
    price_per: z.string().nullish(),
    date: z.iso.date(),
    location_id: z.number().nullish(),
    updated: z.string().nullish(),
    location: z.object({
        id: z.number().nullish(),
        type: z.string().nullish(),
        osm_id: z.number().nullish(),
        osm_type: z.string().nullish(),
        osm_name: z.string().nullish(),
        osm_brand: z.string().nullish(),
        osm_address_city: z.string().nullish(),
        osm_address_postcode: z.string().nullish(),
        osm_address_country_code: z.string().nullish(),
    }).nullish(),
    proof: z.object({ type: z.string().nullish() }).nullish(),
});
export type OpenPrice = z.infer<typeof OpenPriceSchema>;

export type OpenPricesContext = { importedAt: string };

function pence(value: number): number | null {
    try {
        const p = scaleDecimal(String(value), 2);
        return Number.isInteger(p) && p > 0 ? p : null;
    } catch {
        return null;
    }
}

const REDUCTION_FOR_EVERYONE = new Set(['SALE', 'SEASONAL']);

function offerFrom(p: OpenPrice, pricePence: number): OfferData {
    const regular = p.price_without_discount != null ? pence(p.price_without_discount) : null;
    const wasPricePence = regular !== null && regular > pricePence ? regular : null;
    const base = { pricePence, wasPricePence, retailerUnitPrice: null, availability: 'unknown' as const };

    if (!p.price_is_discounted) return { ...base, wasPricePence: null, priceCondition: 'none', promotions: [] };

    const type = p.discount_type ?? null;
    if (type === 'LOYALTY_PROGRAM') return { ...base, priceCondition: 'loyalty_member', promotions: [] };

    const common = { retailerPromotionId: null, text: null, endsOn: null };
    if (type !== null && REDUCTION_FOR_EVERYONE.has(type)) {
        const promotion: Promotion = wasPricePence !== null
            ? { type: 'price_reduction', ...common, pricePence, wasPricePence }
            : { type: 'unparsed', ...common, sourceCode: type };
        return { ...base, priceCondition: 'none', promotions: [promotion] };
    }
    if (type === 'EXPIRES_SOON') {
        return { ...base, priceCondition: 'none', promotions: [{ type: 'clearance', ...common, pricePence, wasPricePence }] };
    }
    return {
        ...base,
        priceCondition: 'unknown',
        promotions: type !== null ? [{ type: 'unparsed', ...common, sourceCode: type }] : [],
    };
}

function storeFrom(p: OpenPrice): Store | null {
    const loc = p.location;
    if (!loc) return null;
    const osmType = loc.osm_type?.toLowerCase();
    const countryCode = loc.osm_address_country_code?.toUpperCase() ?? null;
    return {
        retailer: resolveRetailer(loc.osm_brand, loc.osm_name),
        name: loc.osm_name ?? loc.osm_brand ?? null,
        sourceStoreId: loc.id != null ? String(loc.id) : p.location_id != null ? String(p.location_id) : null,
        osm: loc.osm_id && (osmType === 'node' || osmType === 'way' || osmType === 'relation') ? { type: osmType, id: loc.osm_id } : null,
        postcode: loc.osm_address_postcode ?? null,
        city: loc.osm_address_city ?? null,
        countryCode: countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : null,
    };
}

const EVIDENCE: Record<string, PriceObservation['evidence']> = { RECEIPT: 'receipt', PRICE_TAG: 'price_tag' };

export function mapOpenPrice(input: unknown, context: OpenPricesContext): ParseResult<PriceObservation> {
    const warnings: string[] = [];
    const parsed = OpenPriceSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`), warnings };
    }
    const p = parsed.data;

    if (p.currency !== 'GBP') return { ok: false, errors: [`currency ${p.currency} is not GBP`], warnings };
    if (p.type !== 'PRODUCT') {
        return { ok: false, errors: [`category price (${p.category_tag ?? '?'} per ${p.price_per ?? '?'}) has no product identity`], warnings };
    }
    const barcode = toBarcode(p.product_code);
    if (barcode.barcode === null) return { ok: false, errors: [barcode.reason], warnings };
    const pricePence = pence(p.price);
    if (pricePence === null) return { ok: false, errors: [`price is not a whole positive number of pence: ${p.price}`], warnings };

    const store = storeFrom(p);
    const observation: PriceObservation = {
        productRef: { kind: 'barcode', barcode: barcode.barcode },
        retailer: store?.retailer ?? null,
        store,
        channel: p.location?.type === 'ONLINE' ? 'online' : p.location?.type === 'OSM' ? 'in_store' : 'unknown',
        offer: offerFrom(p, pricePence),
        observedOn: p.date,
        observedAt: null,
        evidence: EVIDENCE[p.proof?.type ?? ''] ?? 'unknown',
        provenance: provenanceFor('open_prices', {
            sourceRecordId: String(p.id),
            sourceUrl: `https://prices.openfoodfacts.org/prices/${p.id}`,
            importedAt: context.importedAt,
            sourceUpdatedAt: p.updated ?? null,
        }),
    };
    if (p.price_is_discounted && !p.discount_type) warnings.push('discount_type_not_given');
    return validate(PriceObservationSchema, observation, warnings);
}
