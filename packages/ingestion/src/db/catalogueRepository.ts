/**
 * Batch persistence for the catalogue. Every write takes a whole batch and
 * costs a fixed number of round trips (one read of existing hashes, one
 * statement per table), passing the batch as a single JSON parameter.
 *
 * Change detection:
 *   source_record  payload_hash + mapper_version
 *   product        content_hash (the whole mapped product + tier): decides whether the row is rewritten
 *                  text_hash (semantic document): decides text_changed_at, i.e. future re-embedding
 * Unchanged rows are not touched at all, so importing the same data twice writes nothing.
 */
import {
    categoryLabel, ProductRecordSchema,
    type Nutrient, type ParseResult, type ProductRecord, type Provenance,
} from '../contract/index.js';
import { DOCUMENT_VERSION, productTextHash } from '../documents/productDocument.js';
import type { Db } from './client.js';
import { sha256, stableStringify } from './hash.js';

export type Tier = 'A' | 'B' | 'C';

// ---------- source records ----------

export type SourceRecordInput = {
    provenance: Provenance;
    payload: Record<string, unknown>;
    payloadVersion: number;
    mapperVersion: number;
};

export type SourceRecordWrite = { ids: Map<string, number>; inserted: number; updated: number; unchanged: number; changedIds: Set<string> };

export async function upsertSourceRecords(db: Db, rows: SourceRecordInput[], runId: string | null): Promise<SourceRecordWrite> {
    const result: SourceRecordWrite = { ids: new Map(), inserted: 0, updated: 0, unchanged: 0, changedIds: new Set() };
    if (!rows.length) return result;
    const source = rows[0]!.provenance.source;
    if (rows.some((r) => r.provenance.source !== source)) throw new Error('a batch must come from one source');

    const existing = new Map((await db.query<{ id: string; source_record_id: string; payload_hash: string; mapper_version: number }>(
        `SELECT id, source_record_id, payload_hash, mapper_version FROM source_record
         WHERE source = $1 AND source_record_id = ANY($2::text[])`,
        [source, rows.map((r) => r.provenance.sourceRecordId)],
    )).rows.map((r) => [r.source_record_id, r]));

    const writes = [];
    for (const row of rows) {
        const id = row.provenance.sourceRecordId;
        const payloadHash = sha256(stableStringify(row.payload));
        const before = existing.get(id);
        if (before && before.payload_hash === payloadHash && before.mapper_version === row.mapperVersion) {
            result.unchanged++;
            result.ids.set(id, Number(before.id));
            continue;
        }
        if (before) result.updated++;
        else result.inserted++;
        result.changedIds.add(id);
        const p = row.provenance;
        writes.push({
            source, source_record_id: id, source_url: p.sourceUrl, imported_at: p.importedAt, source_updated_at: p.sourceUpdatedAt,
            licence: p.licence, attribution: p.attribution, payload: row.payload, payload_version: row.payloadVersion,
            payload_hash: payloadHash, mapper_version: row.mapperVersion, last_run_id: runId,
        });
    }
    if (writes.length) {
        const written = await db.query<{ id: string; source_record_id: string }>(
            `INSERT INTO source_record (source, source_record_id, source_url, imported_at, source_updated_at, licence, attribution,
                                        payload, payload_version, payload_hash, mapper_version, last_run_id)
             SELECT source, source_record_id, source_url, imported_at, source_updated_at, licence, attribution,
                    payload, payload_version, payload_hash, mapper_version, last_run_id
             FROM jsonb_to_recordset($1::jsonb) AS r(source text, source_record_id text, source_url text, imported_at timestamptz,
                  source_updated_at timestamptz, licence text, attribution text, payload jsonb, payload_version int,
                  payload_hash text, mapper_version int, last_run_id uuid)
             ON CONFLICT (source, source_record_id) DO UPDATE SET
                 source_url = excluded.source_url, imported_at = excluded.imported_at, source_updated_at = excluded.source_updated_at,
                 licence = excluded.licence, attribution = excluded.attribution, payload = excluded.payload,
                 payload_version = excluded.payload_version, payload_hash = excluded.payload_hash,
                 mapper_version = excluded.mapper_version, last_run_id = excluded.last_run_id
             RETURNING id, source_record_id`,
            [JSON.stringify(writes)],
        );
        for (const r of written.rows) result.ids.set(r.source_record_id, Number(r.id));
    }
    return result;
}

// ---------- products ----------

const NUTRIENT_COLUMNS: Record<Nutrient, string> = {
    energyKcal: 'energy_kcal_100', fatG: 'fat_g_100', saturatesG: 'saturates_g_100', carbohydrateG: 'carbohydrate_g_100',
    sugarsG: 'sugars_g_100', fibreG: 'fibre_g_100', proteinG: 'protein_g_100', saltG: 'salt_g_100',
};

export type ProductInput = { record: ProductRecord; tier: Tier; recordId: number };
export type ProductWrite = { inserted: number; updated: number; unchanged: number; textChanged: number };

export function productContentHash(record: ProductRecord, tier: Tier): string {
    return sha256(stableStringify({ product: record.product, tier }));
}

function productRow({ record, tier, recordId }: ProductInput) {
    const p = record.product;
    const q = p.quantity;
    const n = p.nutrition;
    return {
        barcode: p.barcode, record_id: recordId, name: p.name, brand: p.brand,
        quantity_kind: q?.kind ?? null, quantity_unit: q?.unit ?? null, quantity_per_pack: q?.perPack ?? null,
        quantity_pack_count: q?.packCount ?? null, quantity_total: q?.total ?? null, quantity_raw: q?.raw ?? null,
        quantity_min_g: q?.kind === 'mass' ? q.variableWeight?.min ?? null : null,
        quantity_max_g: q?.kind === 'mass' ? q.variableWeight?.max ?? null : null,
        category_text: p.categories.canonical.map(categoryLabel).join(', '),
        description: p.description, ingredients: p.ingredients,
        allergen_status: p.allergens.status, allergens_contains: p.allergens.contains,
        allergens_may_contain: p.allergens.mayContain, allergens_unrecognised: p.allergens.unrecognised,
        dietary_claims: p.dietary.claims, inferred_vegan: p.dietary.inferred.vegan,
        inferred_vegetarian: p.dietary.inferred.vegetarian, inferred_by: p.dietary.inferred.by,
        nutrition_per: n?.per ?? null,
        ...Object.fromEntries(Object.entries(NUTRIENT_COLUMNS).map(([k, col]) => [col, n?.values[k as Nutrient] ?? null])),
        nutrition_derived: n?.derived ?? [], nutrition_raw: n?.raw ?? null,
        quality_tier: tier, document_version: DOCUMENT_VERSION,
        text_hash: productTextHash(p), content_hash: productContentHash(record, tier),
    };
}

const PRODUCT_COLUMNS = `barcode char(14), record_id bigint, name text, brand text, quantity_kind text, quantity_unit text,
    quantity_per_pack double precision, quantity_pack_count int, quantity_total double precision, quantity_raw text,
    quantity_min_g double precision, quantity_max_g double precision, category_text text, description text, ingredients text,
    allergen_status text, allergens_contains text[], allergens_may_contain text[], allergens_unrecognised text[],
    dietary_claims text[], inferred_vegan text, inferred_vegetarian text, inferred_by text, nutrition_per text,
    energy_kcal_100 double precision, fat_g_100 double precision, saturates_g_100 double precision,
    carbohydrate_g_100 double precision, sugars_g_100 double precision, fibre_g_100 double precision,
    protein_g_100 double precision, salt_g_100 double precision, nutrition_derived text[], nutrition_raw jsonb,
    quality_tier text, document_version int, text_hash text, content_hash text`;
const PRODUCT_COLUMN_NAMES = PRODUCT_COLUMNS.split(',').map((c) => c.trim().split(/\s+/)[0]!);

export async function upsertProducts(db: Db, items: ProductInput[]): Promise<ProductWrite> {
    const result: ProductWrite = { inserted: 0, updated: 0, unchanged: 0, textChanged: 0 };
    if (!items.length) return result;
    const rows = items.map(productRow);
    const existing = new Map((await db.query<{ barcode: string; content_hash: string; text_hash: string }>(
        'SELECT barcode, content_hash, text_hash FROM product WHERE barcode = ANY($1::text[])',
        [rows.map((r) => r.barcode)],
    )).rows.map((r) => [r.barcode, r]));

    const changed = rows.filter((row) => {
        const before = existing.get(row.barcode);
        if (!before) {
            result.inserted++;
            result.textChanged++;
            return true;
        }
        if (before.content_hash === row.content_hash) {
            result.unchanged++;
            return false;
        }
        result.updated++;
        if (before.text_hash !== row.text_hash) result.textChanged++;
        return true;
    });
    if (!changed.length) return result;

    const assignments = PRODUCT_COLUMN_NAMES.filter((c) => c !== 'barcode').map((c) => `${c} = excluded.${c}`).join(', ');
    await db.query(
        `INSERT INTO product (${PRODUCT_COLUMN_NAMES.join(', ')})
         SELECT ${PRODUCT_COLUMN_NAMES.join(', ')} FROM jsonb_to_recordset($1::jsonb) AS r(${PRODUCT_COLUMNS})
         ON CONFLICT (barcode) DO UPDATE SET ${assignments}, updated_at = now(),
             text_changed_at = CASE WHEN product.text_hash IS DISTINCT FROM excluded.text_hash THEN now() ELSE product.text_changed_at END`,
        [JSON.stringify(changed)],
    );

    // Child rows of new/changed products are replaced wholesale.
    const barcodes = changed.map((r) => r.barcode);
    const byBarcode = new Map(items.map((i) => [i.record.product.barcode, i.record.product]));
    await db.query('DELETE FROM product_category WHERE barcode = ANY($1::text[])', [barcodes]);
    await db.query('DELETE FROM product_image WHERE barcode = ANY($1::text[])', [barcodes]);
    const categories = barcodes.flatMap((b) => byBarcode.get(b)!.categories.canonical.map((id, position) => ({ barcode: b, position, category_id: id })));
    const images = barcodes.flatMap((b) => byBarcode.get(b)!.images.map((img, position) => ({
        barcode: b, position, role: img.role, url: img.url, source: img.source, licence: img.licence,
        attribution: img.attribution, contributor: img.contributor, source_page_url: img.sourcePageUrl,
    })));
    if (categories.length) {
        await db.query(
            `INSERT INTO product_category (barcode, position, category_id)
             SELECT * FROM jsonb_to_recordset($1::jsonb) AS r(barcode char(14), position smallint, category_id text)`,
            [JSON.stringify(categories)],
        );
    }
    if (images.length) {
        await db.query(
            `INSERT INTO product_image (barcode, position, role, url, source, licence, attribution, contributor, source_page_url)
             SELECT * FROM jsonb_to_recordset($1::jsonb) AS r(barcode char(14), position smallint, role text, url text, source text,
                  licence text, attribution text, contributor text, source_page_url text)`,
            [JSON.stringify(images)],
        );
    }
    return result;
}

// ---------- reading back ----------

type ProductDbRow = Record<string, unknown> & { barcode: string };

const iso = (v: unknown) => (v instanceof Date ? v.toISOString().replace(/\.\d{3}Z$/, 'Z') : v === null ? null : String(v));

/** Reassembles a ProductRecord from the database and validates it against the contract. */
export async function readProductRecord(db: Db, barcode: string): Promise<ParseResult<ProductRecord> | null> {
    return (await readProductRecords(db, [barcode])).get(barcode) ?? null;
}

/** Batch version: three queries for any number of products. Missing barcodes are absent from the map. */
export async function readProductRecords(db: Db, barcodes: string[]): Promise<Map<string, ParseResult<ProductRecord>>> {
    const out = new Map<string, ParseResult<ProductRecord>>();
    if (!barcodes.length) return out;
    const { rows } = await db.query<ProductDbRow>(
        `SELECT p.*, s.source, s.source_record_id, s.source_url, s.imported_at, s.source_updated_at, s.licence, s.attribution
         FROM product p JOIN source_record s ON s.id = p.record_id WHERE p.barcode = ANY($1::text[])`, [barcodes]);
    const categories = new Map<string, string[]>();
    for (const c of (await db.query<{ barcode: string; category_id: string }>(
        'SELECT barcode, category_id FROM product_category WHERE barcode = ANY($1::text[]) ORDER BY barcode, position', [barcodes])).rows) {
        categories.set(c.barcode, [...(categories.get(c.barcode) ?? []), c.category_id]);
    }
    const images = new Map<string, Record<string, string | null>[]>();
    for (const i of (await db.query<Record<string, string | null> & { barcode: string }>(
        `SELECT barcode, role, url, source, licence, attribution, contributor, source_page_url FROM product_image
         WHERE barcode = ANY($1::text[]) ORDER BY barcode, position`, [barcodes])).rows) {
        images.set(i.barcode, [...(images.get(i.barcode) ?? []), i]);
    }

    for (const row of rows) {
        const kind = row.quantity_kind as 'mass' | 'volume' | 'count' | null;
        const quantity = kind === null ? null : {
            kind, unit: row.quantity_unit, perPack: row.quantity_per_pack, packCount: row.quantity_pack_count,
            total: row.quantity_total, raw: row.quantity_raw,
            ...(kind === 'mass' ? { variableWeight: row.quantity_min_g === null ? null : { min: row.quantity_min_g, max: row.quantity_max_g } } : {}),
        };
        const record = {
            product: {
                barcode: row.barcode, name: row.name, brand: row.brand, quantity,
                categories: { canonical: categories.get(row.barcode) ?? [] },
                description: row.description, ingredients: row.ingredients,
                allergens: {
                    status: row.allergen_status, contains: row.allergens_contains,
                    mayContain: row.allergens_may_contain, unrecognised: row.allergens_unrecognised,
                },
                dietary: {
                    claims: row.dietary_claims,
                    inferred: { vegan: row.inferred_vegan, vegetarian: row.inferred_vegetarian, by: row.inferred_by },
                },
                nutrition: row.nutrition_per === null ? null : {
                    per: row.nutrition_per,
                    values: Object.fromEntries(Object.entries(NUTRIENT_COLUMNS).map(([k, col]) => [k, row[col]])),
                    derived: row.nutrition_derived, raw: row.nutrition_raw,
                },
                images: (images.get(row.barcode) ?? []).map((i) => ({
                    url: i.url, role: i.role, source: i.source, licence: i.licence, attribution: i.attribution,
                    contributor: i.contributor, sourcePageUrl: i.source_page_url,
                })),
            },
            provenance: {
                source: row.source, sourceRecordId: row.source_record_id, sourceUrl: row.source_url,
                importedAt: iso(row.imported_at), sourceUpdatedAt: iso(row.source_updated_at),
                licence: row.licence, attribution: row.attribution,
            },
        };
        const parsed = ProductRecordSchema.safeParse(record);
        out.set(row.barcode, parsed.success
            ? { ok: true, value: parsed.data, warnings: [] }
            : { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`), warnings: [] });
    }
    return out;
}
