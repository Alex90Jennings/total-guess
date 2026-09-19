/**
 * A price observation is evidence that a price applied on a day. It is not a
 * current offer, and nothing built on it may say "the Tesco price is £2.50";
 * the honest sentence is "£2.50, observed at Tesco on 14 March 2026"
 * (describePriceObservation).
 *
 *   observedOn            the day the price applied (from a receipt, shelf tag or page)
 *   provenance.importedAt when we fetched it; always kept separate
 */
import { z } from 'zod';
import { OfferDataSchema } from './offer.js';
import { ProductReferenceSchema } from './product.js';
import { IsoDateSchema, IsoUtcSchema, ProvenanceSchema } from './provenance.js';
import { retailerName, RetailerIdSchema } from './retailer.js';
import { StoreSchema } from './store.js';

const nextDay = (isoDateTime: string) => new Date(Date.parse(isoDateTime) + 86_400_000).toISOString().slice(0, 10);

export const PriceObservationSchema = z
    .strictObject({
        productRef: ProductReferenceSchema,
        retailer: RetailerIdSchema.nullable(),
        store: StoreSchema.nullable(),
        channel: z.enum(['in_store', 'online', 'unknown']),
        offer: OfferDataSchema,
        observedOn: IsoDateSchema,
        /** The instant, when the source gives one (a page read at a known time). */
        observedAt: IsoUtcSchema.nullable(),
        evidence: z.enum(['receipt', 'price_tag', 'retailer_page', 'unknown']),
        provenance: ProvenanceSchema,
    })
    .refine((o) => o.store === null || o.store.retailer === o.retailer, {
        message: 'store and observation must name the same retailer', path: ['store', 'retailer'],
    })
    // A day's slack: a UK date can be a day ahead of the UTC import time.
    .refine((o) => o.observedOn <= nextDay(o.provenance.importedAt), {
        message: 'a price cannot be observed after it was imported', path: ['observedOn'],
    })
    .refine((o) => o.productRef.kind !== 'retailer_sku' || o.productRef.retailer === o.retailer, {
        message: 'a retailer SKU belongs to the observation retailer', path: ['productRef'],
    });
export type PriceObservation = z.infer<typeof PriceObservationSchema>;

/**
 * A representative price with no observation behind it (the legacy curated
 * catalogue). Deliberately not a PriceObservation: it has no date and is not
 * evidence of anything.
 */
export const ReferencePriceSchema = z.strictObject({
    productRef: ProductReferenceSchema,
    retailer: RetailerIdSchema.nullable(),
    pricePence: z.int().positive(),
    kind: z.literal('representative'),
    provenance: ProvenanceSchema,
});
export type ReferencePrice = z.infer<typeof ReferencePriceSchema>;

export function formatPence(pence: number): string {
    return pence < 100 ? `${pence}p` : `£${(pence / 100).toFixed(2)}`;
}

function formatDay(isoDate: string): string {
    return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** "£2.50 — observed at Tesco on 14 March 2026". Never phrased as a current price. */
export function describePriceObservation(observation: PriceObservation): string {
    const where = observation.retailer !== null
        ? retailerName(observation.retailer)
        : observation.store?.name ?? 'an unnamed shop';
    const condition = observation.offer.priceCondition === 'loyalty_member'
        ? ' with a loyalty card'
        : observation.offer.priceCondition === 'unknown' ? ' (discounted; terms not recorded)' : '';
    return `${formatPence(observation.offer.pricePence)}${condition} — observed at ${where} on ${formatDay(observation.observedOn)}`;
}

/** Whole days between observation and `today` (an ISO date). */
export function observationAgeDays(observation: PriceObservation, today: string): number {
    return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${observation.observedOn}T00:00:00Z`)) / 86_400_000);
}
