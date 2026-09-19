/**
 * Stores, price observations (historical evidence), listings and reference
 * prices. Derived rows are rewritten only when their source record changed,
 * so re-importing the same data writes nothing.
 */
import {
    PriceObservationSchema,
    type ParseResult, type PriceObservation, type ProductListing, type ProductReference, type ReferencePrice, type Store,
} from '../contract/index.js';
import type { Db } from './client.js';

export function referenceColumns(ref: ProductReference) {
    return {
        ref_kind: ref.kind,
        ref_barcode: ref.kind === 'barcode' ? ref.barcode : null,
        ref_retailer_id: ref.kind === 'retailer_sku' ? ref.retailer : null,
        ref_sku: ref.kind === 'retailer_sku' ? ref.sku : null,
        ref_source: ref.kind === 'source_record' ? ref.source : null,
        ref_source_id: ref.kind === 'source_record' ? ref.id : null,
    };
}

const REF_COLUMNS = 'ref_kind text, ref_barcode char(14), ref_retailer_id text, ref_sku text, ref_source text, ref_source_id text';

/** Upserts stores keyed by (source, source_store_id); returns source_store_id -> id. */
export async function upsertStores(db: Db, source: string, stores: Store[]): Promise<Map<string, number>> {
    const unique = [...new Map(stores.filter((s) => s.sourceStoreId).map((s) => [s.sourceStoreId!, s])).values()];
    if (!unique.length) return new Map();
    const { rows } = await db.query<{ id: string; source_store_id: string }>(
        `INSERT INTO store (source, source_store_id, retailer_id, name, osm_type, osm_id, postcode, city, country_code)
         SELECT $1, source_store_id, retailer_id, name, osm_type, osm_id, postcode, city, country_code
         FROM jsonb_to_recordset($2::jsonb) AS r(source_store_id text, retailer_id text, name text, osm_type text, osm_id bigint,
              postcode text, city text, country_code text)
         ON CONFLICT (source, source_store_id) DO UPDATE SET retailer_id = excluded.retailer_id, name = excluded.name,
             osm_type = excluded.osm_type, osm_id = excluded.osm_id, postcode = excluded.postcode, city = excluded.city,
             country_code = excluded.country_code
         RETURNING id, source_store_id`,
        [source, JSON.stringify(unique.map((s) => ({
            source_store_id: s.sourceStoreId, retailer_id: s.retailer, name: s.name, osm_type: s.osm?.type ?? null,
            osm_id: s.osm?.id ?? null, postcode: s.postcode, city: s.city, country_code: s.countryCode,
        })))],
    );
    return new Map(rows.map((r) => [r.source_store_id, Number(r.id)]));
}

export async function upsertPriceObservations(
    db: Db,
    items: { observation: PriceObservation; recordId: number; storeId: number | null }[],
): Promise<number> {
    if (!items.length) return 0;
    const rows = items.map(({ observation: o, recordId, storeId }) => ({
        ...referenceColumns(o.productRef),
        retailer_id: o.retailer, store_id: storeId, channel: o.channel,
        price_pence: o.offer.pricePence, price_condition: o.offer.priceCondition, was_price_pence: o.offer.wasPricePence,
        retailer_unit_price_pence: o.offer.retailerUnitPrice?.pence ?? null,
        retailer_unit_price_basis: o.offer.retailerUnitPrice?.basis ?? null,
        promotions: o.offer.promotions, availability: o.offer.availability,
        observed_on: o.observedOn, observed_at: o.observedAt, evidence: o.evidence, record_id: recordId,
    }));
    const columns = ['ref_kind', 'ref_barcode', 'ref_retailer_id', 'ref_sku', 'ref_source', 'ref_source_id', 'retailer_id', 'store_id',
        'channel', 'price_pence', 'price_condition', 'was_price_pence', 'retailer_unit_price_pence', 'retailer_unit_price_basis',
        'promotions', 'availability', 'observed_on', 'observed_at', 'evidence', 'record_id'];
    await db.query(
        `INSERT INTO price_observation (${columns.join(', ')})
         SELECT ${columns.join(', ')} FROM jsonb_to_recordset($1::jsonb) AS r(${REF_COLUMNS}, retailer_id text, store_id bigint,
              channel text, price_pence int, price_condition text, was_price_pence int, retailer_unit_price_pence double precision,
              retailer_unit_price_basis text, promotions jsonb, availability text, observed_on date, observed_at timestamptz,
              evidence text, record_id bigint)
         ON CONFLICT (record_id) DO UPDATE SET ${columns.filter((c) => c !== 'record_id').map((c) => `${c} = excluded.${c}`).join(', ')}`,
        [JSON.stringify(rows)],
    );
    return rows.length;
}

export async function upsertListings(db: Db, items: { listing: ProductListing; recordId: number }[]): Promise<number> {
    if (!items.length) return 0;
    const rows = items.map(({ listing: l, recordId }) => ({
        ref_kind: l.ref.kind,
        ref_retailer_id: l.ref.kind === 'retailer_sku' ? l.ref.retailer : null,
        ref_sku: l.ref.kind === 'retailer_sku' ? l.ref.sku : null,
        ref_source: l.ref.kind === 'source_record' ? l.ref.source : null,
        ref_source_id: l.ref.kind === 'source_record' ? l.ref.id : null,
        retailer_id: l.retailer, barcode: l.barcode, url: l.url, retailer_category_path: l.retailerCategoryPath,
        name: l.details.name, details: l.details, record_id: recordId,
    }));
    const columns = ['ref_kind', 'ref_retailer_id', 'ref_sku', 'ref_source', 'ref_source_id', 'retailer_id', 'barcode', 'url',
        'retailer_category_path', 'name', 'details', 'record_id'];
    await db.query(
        `INSERT INTO product_listing (${columns.join(', ')})
         SELECT ${columns.join(', ')} FROM jsonb_to_recordset($1::jsonb) AS r(ref_kind text, ref_retailer_id text, ref_sku text,
              ref_source text, ref_source_id text, retailer_id text, barcode char(14), url text, retailer_category_path text[],
              name text, details jsonb, record_id bigint)
         ON CONFLICT (record_id) DO UPDATE SET ${columns.filter((c) => c !== 'record_id').map((c) => `${c} = excluded.${c}`).join(', ')}`,
        [JSON.stringify(rows)],
    );
    return rows.length;
}

export async function upsertReferencePrices(db: Db, items: { price: ReferencePrice; recordId: number }[]): Promise<number> {
    if (!items.length) return 0;
    const rows = items.map(({ price, recordId }) => ({
        ...referenceColumns(price.productRef), retailer_id: price.retailer, price_pence: price.pricePence, kind: price.kind, record_id: recordId,
    }));
    const columns = ['ref_kind', 'ref_barcode', 'ref_retailer_id', 'ref_sku', 'ref_source', 'ref_source_id', 'retailer_id', 'price_pence', 'kind', 'record_id'];
    await db.query(
        `INSERT INTO reference_price (${columns.join(', ')})
         SELECT ${columns.join(', ')} FROM jsonb_to_recordset($1::jsonb) AS r(${REF_COLUMNS}, retailer_id text, price_pence int, kind text, record_id bigint)
         ON CONFLICT (record_id) DO UPDATE SET ${columns.filter((c) => c !== 'record_id').map((c) => `${c} = excluded.${c}`).join(', ')}`,
        [JSON.stringify(rows)],
    );
    return rows.length;
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString().replace(/\.\d{3}Z$/, 'Z') : v === null ? null : String(v));

/** Reassembles a PriceObservation from the database and validates it against the contract. */
export async function readPriceObservation(db: Db, sourceRecordId: string, source = 'open_prices'): Promise<ParseResult<PriceObservation> | null> {
    const { rows } = await db.query<Record<string, any>>(
        `SELECT o.*, o.observed_on::text AS observed_on_text,
                s.source, s.source_record_id, s.source_url, s.imported_at, s.source_updated_at, s.licence, s.attribution,
                st.retailer_id AS store_retailer_id, st.name AS store_name, st.source_store_id, st.osm_type, st.osm_id,
                st.postcode, st.city, st.country_code
         FROM price_observation o
         JOIN source_record s ON s.id = o.record_id
         LEFT JOIN store st ON st.id = o.store_id
         WHERE s.source = $1 AND s.source_record_id = $2`,
        [source, sourceRecordId],
    );
    const r = rows[0];
    if (!r) return null;
    const productRef = r.ref_kind === 'barcode' ? { kind: 'barcode', barcode: r.ref_barcode }
        : r.ref_kind === 'retailer_sku' ? { kind: 'retailer_sku', retailer: r.ref_retailer_id, sku: r.ref_sku }
            : { kind: 'source_record', source: r.ref_source, id: r.ref_source_id };
    const candidate = {
        productRef,
        retailer: r.retailer_id,
        store: r.store_id === null ? null : {
            retailer: r.store_retailer_id, name: r.store_name, sourceStoreId: r.source_store_id,
            osm: r.osm_type === null ? null : { type: r.osm_type, id: Number(r.osm_id) },
            postcode: r.postcode, city: r.city, countryCode: r.country_code,
        },
        channel: r.channel,
        offer: {
            pricePence: r.price_pence, priceCondition: r.price_condition, wasPricePence: r.was_price_pence,
            retailerUnitPrice: r.retailer_unit_price_pence === null ? null
                : { pence: r.retailer_unit_price_pence, basis: r.retailer_unit_price_basis, source: 'retailer' },
            promotions: r.promotions, availability: r.availability,
        },
        observedOn: r.observed_on_text,
        observedAt: iso(r.observed_at),
        evidence: r.evidence,
        provenance: {
            source: r.source, sourceRecordId: r.source_record_id, sourceUrl: r.source_url, importedAt: iso(r.imported_at),
            sourceUpdatedAt: iso(r.source_updated_at), licence: r.licence, attribution: r.attribution,
        },
    };
    const parsed = PriceObservationSchema.safeParse(candidate);
    return parsed.success
        ? { ok: true, value: parsed.data, warnings: [] }
        : { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`), warnings: [] };
}
